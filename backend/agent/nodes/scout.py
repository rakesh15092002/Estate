# Node 1 - Research, finds properties

from __future__ import annotations

from typing import Any, TypedDict

from tools.search_tool import search_properties


class EstateState(TypedDict, total=False):
    question: str
    answer: str
    properties: list
    user_preferences: dict
    agent_steps: list


def run_scout(state: EstateState) -> dict[str, Any]:
    query = (state.get("question") or "").strip()
    result_list = search_properties(query)
    prior = list(state.get("agent_steps") or [])
    updated_steps = prior + [
        {
            "node": "scout",
            "status": "complete",
            "results": len(result_list),
        }
    ]
    return {"properties": result_list, "agent_steps": updated_steps}
