# Node 2 - Computer Use, takes screenshots

from __future__ import annotations

from typing import Any

from tools.browser_tool import inspect_property

from .scout import EstateState


async def run_inspector(state: EstateState) -> dict[str, Any]:
    raw = state.get("properties") or []
    properties: list[dict[str, Any]] = [p for p in raw if isinstance(p, dict)]

    updated_properties: list[dict[str, Any]] = []
    for prop in properties:
        row = dict(prop)
        addr = (row.get("address") or "").strip() or (row.get("title") or "").strip() or "unknown"
        try:
            row["screenshot_path"] = await inspect_property(addr)
        except Exception:
            row["screenshot_path"] = ""
        updated_properties.append(row)

    prior = list(state.get("agent_steps") or [])
    updated_steps = prior + [
        {
            "node": "inspector",
            "status": "complete",
            "inspected": len(updated_properties),
        }
    ]
    return {"properties": updated_properties, "agent_steps": updated_steps}
