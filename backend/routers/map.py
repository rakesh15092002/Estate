"""POST /api/map/search — map simulator notification (stub)."""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["map"])


class MapSearchBody(BaseModel):
    address: str


@router.post("/map/search")
async def map_search(body: MapSearchBody) -> dict:
    return {"ok": True, "address": body.address}
