"""MongoDB `listings` collection — serialize documents for the API."""

from datetime import datetime
from pathlib import Path
from typing import Any

from bson import ObjectId
from pymongo.collection import Collection

from db.connection import get_db

LISTINGS_COLLECTION = "listings"


def get_listings_collection() -> Collection:
    return get_db()[LISTINGS_COLLECTION]


def doc_to_property(doc: dict[str, Any]) -> dict[str, Any]:
    """Map a Mongo listing document to the shape expected by the frontend."""
    if not doc:
        return {}

    raw_id = doc.get("_id", doc.get("id"))
    if isinstance(raw_id, ObjectId):
        prop_id = str(raw_id)
    else:
        prop_id = str(raw_id) if raw_id is not None else ""

    out: dict[str, Any] = {}
    for key, val in doc.items():
        if key in ("_id", "id"):
            continue
        out[key] = val

    out["id"] = prop_id

    if "leaseFolder" not in out and "folder" in out:
        out["leaseFolder"] = out.get("folder")
    if "pet_friendly" in out and "petFriendly" not in out:
        out["petFriendly"] = bool(out.pop("pet_friendly"))
    elif "pet_friendly" in out:
        out.pop("pet_friendly", None)

    added = out.get("addedAt")
    if isinstance(added, datetime):
        out["addedAt"] = added.isoformat()

    out.setdefault("amenities", [])
    out.setdefault("screenshot", "")
    out.setdefault("status", "available")
    out.setdefault("source", "default")

    screenshot_path = str(out.get("screenshot_path") or "").strip()
    folder_path = str(out.get("folder_path") or "").strip()
    screenshot_exists = False

    if screenshot_path:
        screenshot_exists = Path(screenshot_path).is_file()
    elif folder_path:
        screenshot_exists = (Path(folder_path) / "screenshot.png").is_file()

    # Avoid emitting broken screenshot paths that cause repeated 404 requests.
    if not screenshot_exists:
        out["screenshot_path"] = ""
        out["folder_path"] = ""

    return out


def insert_listing(property_data: dict[str, Any]) -> str:
    """
    Insert or update a listing by ``address`` and return the document ``_id`` as a string.

    If a document with the same ``address`` already exists, it is updated with ``$set``;
    otherwise a new document is inserted.
    """
    collection = get_listings_collection()
    payload = dict(property_data or {})
    payload.pop("_id", None)
    payload.pop("id", None)

    address = (payload.get("address") or "").strip()
    if address:
        existing = collection.find_one({"address": address})
        if existing is not None:
            doc_id = existing["_id"]
            collection.update_one({"_id": doc_id}, {"$set": payload})
            return str(doc_id)

    result = collection.insert_one(payload)
    return str(result.inserted_id)


def clear_all_listings() -> int:
    """Delete all documents from the ``listings`` collection. Returns the number deleted."""
    collection = get_listings_collection()
    result = collection.delete_many({})
    return int(result.deleted_count)
