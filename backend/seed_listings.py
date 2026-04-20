"""
Upsert demo listings into MongoDB (same sample as frontend dummy data).

Usage (from the `backend` directory):
    python seed_listings.py
"""

from datetime import datetime, timedelta, timezone

from pymongo import MongoClient

from config import settings

LISTINGS = [
    {
        "id": "prop_001",
        "title": "Luxe Studio — South Congress",
        "address": "1402 South Congress Ave, Austin, TX 78704",
        "price": 1850,
        "bedrooms": 0,
        "bathrooms": 1,
        "sqft": 520,
        "type": "Studio",
        "petFriendly": True,
        "amenities": ["Rooftop Access", "Gym", "Concierge", "EV Charging"],
        "description": (
            "A sleek studio in the heart of SoCo. Floor-to-ceiling windows flood the space "
            "with natural light. Steps from renowned restaurants, boutiques, and live music venues."
        ),
        "screenshot": "/placeholders/property_1.jpg",
        "leaseFolder": "./data/listings/austin_studio_01",
        "status": "available",
        "source": "zillow",
        "addedAt": datetime.now(timezone.utc) - timedelta(hours=1),
        "agentNotes": "Pet deposit: $300. Cats & dogs under 25lbs allowed.",
    },
    {
        "id": "prop_002",
        "title": "Modern 2BD — East Riverside",
        "address": "3200 East Riverside Dr #204, Austin, TX 78741",
        "price": 2200,
        "bedrooms": 2,
        "bathrooms": 2,
        "sqft": 980,
        "type": "2 Bedroom",
        "petFriendly": True,
        "amenities": ["Pool", "Covered Parking", "In-Unit Laundry", "Dog Park"],
        "description": (
            "Spacious two-bedroom with an open-concept kitchen and private balcony overlooking "
            "Lady Bird Lake. Updated fixtures, quartz countertops, and smart home features throughout."
        ),
        "screenshot": "/placeholders/property_2.jpg",
        "leaseFolder": "./data/listings/austin_2bd_02",
        "status": "available",
        "source": "apartments.com",
        "addedAt": datetime.now(timezone.utc) - timedelta(hours=2),
        "agentNotes": "Large dog park on premises. Up to 2 pets allowed.",
    },
    {
        "id": "prop_003",
        "title": "Designer 1BD — Domain",
        "address": "11410 Century Oaks Terrace, Austin, TX 78758",
        "price": 2350,
        "bedrooms": 1,
        "bathrooms": 1,
        "sqft": 720,
        "type": "1 Bedroom",
        "petFriendly": False,
        "amenities": ["Resort Pool", "Co-working Space", "Wine Lounge", "Valet"],
        "description": (
            "Sophisticated one-bedroom in The Domain tech corridor. High ceilings, Bosch appliances, "
            "and designer finishes. Walking distance to Apple, Google, and Amazon campuses."
        ),
        "screenshot": "/placeholders/property_3.jpg",
        "leaseFolder": "./data/listings/austin_1bd_03",
        "status": "pending",
        "source": "trulia",
        "addedAt": datetime.now(timezone.utc) - timedelta(hours=3),
        "agentNotes": "No pets policy. Application under review.",
    },
]


def main() -> None:
    client = MongoClient(settings.mongo_uri, serverSelectionTimeoutMS=10_000)
    coll = client[settings.mongo_db]["listings"]
    for item in LISTINGS:
        _id = item["id"]
        body = {k: v for k, v in item.items() if k != "id"}
        body["_id"] = _id
        coll.replace_one({"_id": _id}, body, upsert=True)
    client.close()
    print(f"Seeded {len(LISTINGS)} listings into {settings.mongo_db}.listings")


if __name__ == "__main__":
    main()
