"""EstateScout LangGraph pipeline with intent gate before property workflow."""

from __future__ import annotations

import asyncio
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph
from langchain_core.messages import HumanMessage, SystemMessage

from agent.groq_model import SYSTEM_PROMPT, get_chat_model
from agent.nodes.broker import run_broker
from agent.nodes.crm import run_crm
from agent.nodes.inspector import run_inspector
from agent.nodes.scout import run_scout


class EstateState(TypedDict, total=False):
    question: str
    answer: str
    properties: list
    user_preferences: dict
    agent_steps: list
    intent_route: str


def _inspector_sync(state: EstateState) -> dict[str, Any]:
    """Bridge async inspector node for sync graph invocation."""
    return asyncio.run(run_inspector(state))


_INTENT_PROMPT = """Classify the user message for a real-estate assistant.
Return EXACTLY one token:
- SEARCH (if user asks to find/list/recommend/filter properties OR mentions location, budget/price, bedrooms, bathrooms, rent, home/apartment/condo/studio)
- CHAT (greetings, chit-chat, generic questions not requesting a property search)
No extra words."""


def run_intent_check(state: EstateState) -> dict[str, Any]:
    question = (state.get("question") or "").strip()
    llm = get_chat_model()

    route = "search"
    reason = "llm_classification"
    if llm is None:
        # Keep existing behavior when model is unavailable: default to agent pipeline.
        route = "search"
        reason = "missing_groq_api_key_default_search"
    else:
        try:
            raw = llm.invoke(
                [
                    SystemMessage(content=_INTENT_PROMPT),
                    HumanMessage(content=question),
                ]
            )
            verdict = str(getattr(raw, "content", "") or "").strip().upper()
            route = "search" if "SEARCH" in verdict else "chat"
        except Exception:
            route = "search"
            reason = "intent_check_failed_default_search"

    prior = list(state.get("agent_steps") or [])
    updated_steps = prior + [
        {
            "node": "intent_check",
            "status": "complete",
            "route": route,
            "reason": reason,
        }
    ]
    return {"intent_route": route, "agent_steps": updated_steps}


def _route_after_intent(state: EstateState) -> str:
    return "scout" if state.get("intent_route") == "search" else "llm_response"


def run_llm_response(state: EstateState) -> dict[str, Any]:
    question = (state.get("question") or "").strip()
    llm = get_chat_model()

    if llm is None:
        reply = (
            "Hello! I can help with rental/property searches. Tell me your city, budget, and "
            "bedroom count, and I will find options for you."
        )
    else:
        prompt = (
            "The user message is not a direct property-search request. Reply helpfully and "
            "concisely. If suitable, invite them to share location, budget, bedrooms, and "
            "property type so you can start searching."
        )
        msg = llm.invoke(
            [
                SystemMessage(content=SYSTEM_PROMPT),
                SystemMessage(content=prompt),
                HumanMessage(content=question),
            ]
        )
        reply = str(getattr(msg, "content", "") or "").strip()
        if not reply:
            reply = (
                "Hi! I can help you find homes. Share your location, budget, bedrooms, and "
                "property type to begin."
            )

    prior = list(state.get("agent_steps") or [])
    updated_steps = prior + [{"node": "llm_response", "status": "complete", "provider": "groq"}]
    return {"answer": reply, "properties": [], "agent_steps": updated_steps}


_builder = StateGraph(EstateState)
_builder.add_node("intent_check", run_intent_check)
_builder.add_node("scout", run_scout)
_builder.add_node("inspector", _inspector_sync)
_builder.add_node("broker", run_broker)
_builder.add_node("crm", run_crm)
_builder.add_node("llm_response", run_llm_response)
_builder.add_edge(START, "intent_check")
_builder.add_conditional_edges(
    "intent_check",
    _route_after_intent,
    {
        "scout": "scout",
        "llm_response": "llm_response",
    },
)
_builder.add_edge("scout", "inspector")
_builder.add_edge("inspector", "broker")
_builder.add_edge("broker", "crm")
_builder.add_edge("crm", END)
_builder.add_edge("llm_response", END)
estate_graph = _builder.compile()


def run_chat(question: str, user_preferences: dict = {}) -> tuple[str, list, list]:
    llm = get_chat_model()
    if llm is None:
        return (
            "I am not connected to a language model yet. Add `GROQ_API_KEY` to `backend/.env` "
            "(get a free key at https://console.groq.com/) and restart the API.",
            [],
            [{"node": "llm", "status": "skipped", "reason": "missing_groq_api_key"}],
        )

    # Keep SYSTEM_PROMPT in active use for this pipeline.
    _ = SYSTEM_PROMPT

    out = estate_graph.invoke(
        {
            "question": question,
            "user_preferences": dict(user_preferences or {}),
            "agent_steps": [{"node": "llm", "status": "ready", "provider": "groq"}],
        }
    )
    return (
        str(out.get("answer") or ""),
        list(out.get("properties") or []),
        list(out.get("agent_steps") or []),
    )
