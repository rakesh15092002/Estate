"""GET /api/properties — MongoDB listings."""

from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Query
from pymongo.errors import PyMongoError

from db.listings import clear_all_listings, doc_to_property, get_listings_collection

router = APIRouter(tags=["properties"])


def _mongo_list_filter(
    max_price: float | None,
    min_bedrooms: int | None,
    pet_friendly: bool | None,
    city: str | None,
) -> dict[str, Any]:
    q: dict[str, Any] = {}
    if max_price is not None:
        q["price"] = {"$lte": max_price}
    if min_bedrooms is not None:
        q["bedrooms"] = {"$gte": min_bedrooms}
    if city:
        q["address"] = {"$regex": city, "$options": "i"}
    if pet_friendly is not None:
        q["$or"] = [
            {"petFriendly": pet_friendly},
            {"pet_friendly": pet_friendly},
        ]
    return q


def _find_one_by_id(coll, property_id: str) -> dict[str, Any] | None:
    doc = coll.find_one({"_id": property_id})
    if doc is not None:
        return doc
    if len(property_id) == 24:
        try:
            oid = ObjectId(property_id)
        except InvalidId:
            return None
        return coll.find_one({"_id": oid})
    return None


@router.get("/properties")
async def list_properties(
    maxPrice: float | None = Query(None, alias="maxPrice"),
    minBedrooms: int | None = Query(None, alias="minBedrooms"),
    petFriendly: bool | None = Query(None, alias="petFriendly"),
    city: str | None = None,
) -> dict[str, Any]:
    try:
        coll = get_listings_collection()
        mongo_filter = _mongo_list_filter(maxPrice, minBedrooms, petFriendly, city)
        cursor = coll.find(mongo_filter).sort("addedAt", -1)
        properties = [doc_to_property(doc) for doc in cursor]
    except PyMongoError as e:
        raise HTTPException(
            status_code=503,
            detail={"error": "database_unavailable", "message": str(e)[:400]},
        ) from e
    return {"properties": properties}


@router.delete("/properties/clear")
async def clear_properties() -> dict[str, Any]:
    """Remove every document from the listings collection."""
    try:
        deleted = clear_all_listings()
    except PyMongoError as e:
        raise HTTPException(
            status_code=503,
            detail={"error": "database_unavailable", "message": str(e)[:400]},
        ) from e
    return {"deleted": deleted}


@router.get("/properties/{property_id}")
async def get_property(property_id: str) -> dict[str, Any]:
    try:
        coll = get_listings_collection()
        doc = _find_one_by_id(coll, property_id)
    except PyMongoError as e:
        raise HTTPException(
            status_code=503,
            detail={"error": "database_unavailable", "message": str(e)[:400]},
        ) from e
    if doc is None:
        raise HTTPException(status_code=404, detail="Not found")
    return doc_to_property(doc)
