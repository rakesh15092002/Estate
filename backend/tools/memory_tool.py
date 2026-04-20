"""In-process session preferences for EstateScout (no persistence across restarts)."""

from __future__ import annotations

_store: dict[str, dict[str, str]] = {}


def save_preference(session_id: str, key: str, value: str) -> None:
    """Store a string preference for ``session_id`` under ``key``."""
    if session_id not in _store:
        _store[session_id] = {}
    _store[session_id][key] = value


def get_preferences(session_id: str) -> dict:
    """Return all preferences for ``session_id`` as a shallow copy (empty if unknown)."""
    return dict(_store.get(session_id, {}))
