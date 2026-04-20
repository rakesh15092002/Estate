"""GET /api/agent/status/{session_id} — live run state from session store."""

from fastapi import APIRouter

from agent.session_store import snapshot

router = APIRouter(tags=["agent"])


@router.get("/agent/status/{session_id}")
async def agent_status(session_id: str) -> dict:
    return snapshot(session_id)
