"""POST /api/chat and /api/chat/stream — Groq + LangGraph + session status for agent polling."""

import asyncio
import json
import uuid
from typing import AsyncIterator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from agent.graph import run_chat
from agent.groq_model import SYSTEM_PROMPT, get_chat_model
from agent.session_store import record_completed, record_failed, record_started, record_stream_phase

router = APIRouter(tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None


class ChatResponse(BaseModel):
    reply: str
    session_id: str
    agent_steps: list[dict] = Field(default_factory=list)
    properties: list[dict] = Field(default_factory=list)


@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest) -> ChatResponse:
    sid = body.session_id or str(uuid.uuid4())
    record_started(sid)
    try:
        reply, properties, steps = await asyncio.to_thread(run_chat, body.message, {})
    except Exception as e:
        record_failed(sid, str(e))
        raise
    record_completed(sid, steps)
    return ChatResponse(reply=reply, session_id=sid, agent_steps=steps, properties=properties)


def _chunk_text(text: str) -> str:
    if isinstance(text, list):
        return "".join(str(p) for p in text)
    return str(text or "")


async def _sse_stream(body: ChatRequest) -> AsyncIterator[bytes]:
    sid = body.session_id or str(uuid.uuid4())
    record_stream_phase(sid, "Streaming tokens from Groq…")

    llm = get_chat_model()
    if llm is None:
        msg = (
            "Add `GROQ_API_KEY` to backend/.env (free at https://console.groq.com/) and restart."
        )
        yield f"data: {json.dumps({'type': 'chunk', 'text': msg, 'session_id': sid})}\n\n".encode()
        record_failed(sid, "missing_groq_api_key")
        yield f"data: {json.dumps({'type': 'done', 'session_id': sid})}\n\n".encode()
        return

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=body.message),
    ]
    try:
        async for chunk in llm.astream(messages):
            piece = _chunk_text(getattr(chunk, "content", "") or "")
            if piece:
                payload = {"type": "chunk", "text": piece, "session_id": sid}
                yield f"data: {json.dumps(payload)}\n\n".encode()
    except Exception as e:
        err = {"type": "chunk", "text": f"Groq error: {e!s}"[:2000], "session_id": sid}
        yield f"data: {json.dumps(err)}\n\n".encode()
        record_failed(sid, str(e))
        yield f"data: {json.dumps({'type': 'done', 'session_id': sid})}\n\n".encode()
        return

    record_completed(sid, [{"node": "llm", "status": "complete", "provider": "groq"}])
    yield f"data: {json.dumps({'type': 'done', 'session_id': sid})}\n\n".encode()


@router.post("/chat/stream")
async def chat_stream(body: ChatRequest) -> StreamingResponse:
    return StreamingResponse(
        _sse_stream(body),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
