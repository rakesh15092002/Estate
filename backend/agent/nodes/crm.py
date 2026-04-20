# Node 4 - Persistence, saves to MongoDB

from __future__ import annotations

from typing import Any

from pymongo.errors import PyMongoError

from db.listings import get_listings_collection, insert_listing
from tools.memory_tool import get_preferences, save_preference

from .scout import EstateState


def run_crm(state: EstateState) -> dict[str, Any]:
    get_listings_collection().delete_many({})

    properties_raw = state.get("properties") or []
    properties: list[dict[str, Any]] = [p for p in properties_raw if isinstance(p, dict)]

    saved_count = 0
    persist_failed = 0
    for prop in properties:
        try:
            insert_listing(prop)
            saved_count += 1
        except PyMongoError:
            persist_failed += 1

    prefs = state.get("user_preferences") or {}
    if isinstance(prefs, dict):
        for key, value in prefs.items():
            save_preference("default_user", str(key), str(value))

    persisted_prefs = get_preferences("default_user")

    prior_steps = list(state.get("agent_steps") or [])
    crm_step: dict[str, Any] = {
        "node": "crm",
        "status": "complete",
        "saved_listings": saved_count,
        "saved_preferences": len(persisted_prefs),
    }
    if persist_failed:
        crm_step["persist_failed"] = persist_failed
        crm_step["mongo_note"] = "MongoDB unreachable or TLS error — listings not saved"

    n = len(properties)
    if n and saved_count == 0 and persist_failed:
        answer = (
            f"Found {n} propert{'y' if n == 1 else 'ies'}, but MongoDB could not be reached "
            "(check connection string, network, and TLS). Results are still shown in chat."
        )
    elif persist_failed:
        answer = (
            f"Saved {saved_count} of {n} listing(s) to MongoDB; "
            f"{persist_failed} could not be persisted (database error)."
        )
    else:
        answer = f"Found {saved_count} propert{'y' if saved_count == 1 else 'ies'} and saved their dossiers."

    updated_steps = prior_steps + [crm_step]

    return {
        "agent_steps": updated_steps,
        "answer": answer,
    }
