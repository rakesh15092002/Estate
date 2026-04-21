"""In-memory agent run state per chat session (for GET /api/agent/status)."""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from threading import Lock
from typing import Any

_MAX_SESSIONS = 500


@dataclass
class _Session:
    running: bool = False
    current_node: str | None = None
    steps: list[dict[str, Any]] = field(default_factory=list)
    error: str | None = None
    updated_at: float = field(default_factory=time.time)


_lock = Lock()
_sessions: dict[str, _Session] = {}


def _touch(s: _Session) -> None:
    s.updated_at = time.time()


def _prune_if_needed() -> None:
    if len(_sessions) <= _MAX_SESSIONS:
        return
    # drop oldest ~20% by updated_at
    items = sorted(_sessions.items(), key=lambda kv: kv[1].updated_at)
    for sid, _ in items[: max(1, len(items) // 5)]:
        _sessions.pop(sid, None)


def record_started(session_id: str) -> None:
    with _lock:
        _prune_if_needed()
        s = _sessions.setdefault(session_id, _Session())
        s.running = True
        s.error = None
        s.current_node = "llm"
        s.steps = [
            {
                "id": "llm",
                "node": "llm",
                "status": "active",
                "detail": "Invoking language model…",
                "ts": time.time(),
            }
        ]
        _touch(s)


def record_stream_phase(session_id: str, detail: str) -> None:
    with _lock:
        s = _sessions.get(session_id)
        if not s:
            return
        s.running = True
        s.current_node = "llm"
        s.steps = [
            {
                "id": "llm",
                "node": "llm",
                "status": "active",
                "detail": detail,
                "ts": time.time(),
            }
        ]
        _touch(s)


def record_completed(session_id: str, graph_steps: list[dict[str, Any]]) -> None:
    with _lock:
        s = _sessions.get(session_id)
        if not s:
            s = _sessions.setdefault(session_id, _Session())
        s.running = False
        s.current_node = None
        s.error = None
        s.steps = _normalize_steps(graph_steps)
        _touch(s)


def record_failed(session_id: str, message: str) -> None:
    with _lock:
        s = _sessions.setdefault(session_id, _Session())
        s.running = False
        s.current_node = None
        s.error = message[:2000]
        s.steps = [
            {
                "id": "llm",
                "node": "llm",
                "status": "error",
                "detail": message[:2000],
                "ts": time.time(),
            }
        ]
        _touch(s)


def _normalize_steps(graph_steps: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for gs in graph_steps:
        node = str(gs.get("node", "llm"))
        raw = gs.get("status", "complete")
        if raw == "complete":
            status = "complete"
        elif raw == "skipped":
            status = "skipped"
        else:
            status = str(raw)
        out.append(
            {
                "id": node,
                "node": node,
                "status": status,
                "detail": gs.get("reason") or gs.get("provider") or "",
                "ts": time.time(),
            }
        )
    if not out:
        out.append(
            {
                "id": "llm",
                "node": "llm",
                "status": "complete",
                "detail": "ok",
                "ts": time.time(),
            }
        )
    return out


def snapshot(session_id: str) -> dict[str, Any]:
    with _lock:
        s = _sessions.get(session_id)
        if not s:
            return {
                "session_id": session_id,
                "running": False,
                "current_node": None,
                "steps": [],
                "error": None,
            }
        return {
            "session_id": session_id,
            "running": s.running,
            "current_node": s.current_node,
            "steps": [dict(x) for x in s.steps],
            "error": s.error,
        }
