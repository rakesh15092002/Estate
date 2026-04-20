# Node 3 - System Ops, creates folders and lease files

from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Any

from tools.text_editor_tool import write_lease_draft

from .scout import EstateState

_BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
# Verify it ends with 'backend'
if _BACKEND_ROOT.name != 'backend':
    # Go up one more level if needed
    _BACKEND_ROOT = _BACKEND_ROOT.parent
_LISTINGS_ROOT = _BACKEND_ROOT / "data" / "listings"


def _sanitize_address(raw: str) -> str:
    s = (raw or "").strip().lower().replace(" ", "_")
    s = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", s)
    s = re.sub(r"_+", "_", s).strip("._")
    return s or "unknown"


def _mkdir_listing_rel(sanitized: str) -> dict:
    target = _LISTINGS_ROOT / sanitized
    target.mkdir(parents=True, exist_ok=True)
    return {"stdout": str(target), "stderr": "", "returncode": 0}


def run_broker(state: EstateState) -> dict[str, Any]:
    raw = state.get("properties") or []
    properties: list[dict[str, Any]] = [p for p in raw if isinstance(p, dict)]

    updated_properties: list[dict[str, Any]] = []
    for prop in properties:
        row = dict(prop)
        address = (row.get("address") or row.get("title") or "").strip()
        price = (row.get("price") or "").strip() or "—"

        sanitized = _sanitize_address(address)
        folder_abs = _LISTINGS_ROOT / sanitized
        folder_path = str(folder_abs.resolve())

        _mkdir_listing_rel(sanitized)
        write_lease_draft(address or "—", price, folder_path)
        row["folder_path"] = folder_path
        updated_properties.append(row)

    prior = list(state.get("agent_steps") or [])
    updated_steps = prior + [
        {
            "node": "broker",
            "status": "complete",
            "listings": len(updated_properties),
        }
    ]
    return {"properties": updated_properties, "agent_steps": updated_steps}
