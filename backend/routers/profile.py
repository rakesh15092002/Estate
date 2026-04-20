"""GET/PATCH /api/profile/{user_id} — user preferences (stub)."""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["profile"])


class ProfilePatch(BaseModel):
    preferences: dict | None = None

    class Config:
        extra = "allow"


@router.get("/profile/{user_id}")
async def get_profile(user_id: str) -> dict:
    return {"user_id": user_id, "preferences": {}}


@router.patch("/profile/{user_id}")
async def patch_profile(user_id: str, body: ProfilePatch) -> dict:
    return {"user_id": user_id, "updated": True, "preferences": body.preferences or {}}
