"""Pydantic models for EstateScout Mongo document payloads."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ListingModel(BaseModel):
    title: str
    address: str
    price: str
    description: str = ""
    bedrooms: int = 0
    bathrooms: int = 0
    sqft: int = 0
    amenities: list[str] = Field(default_factory=list)
    screenshot: str = ""
    folder: str = ""
    petFriendly: bool = False
    status: str = "available"
    source: str = "agent"
    addedAt: datetime = Field(default_factory=datetime.utcnow)


class UserProfileModel(BaseModel):
    session_id: str
    has_pet: bool = False
    max_budget: float | None = None
    preferred_area: str = ""
    preferences: dict = Field(default_factory=dict)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)
