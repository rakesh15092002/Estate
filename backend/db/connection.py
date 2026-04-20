"""MongoClient singleton — use after wiring CRM node."""

from typing import Any

from pymongo import MongoClient
from pymongo.errors import PyMongoError

from config import settings

_client: MongoClient | None = None


def _mongo_client_kwargs() -> dict[str, Any]:
    """TLS options for Atlas / mongodb+srv (cert bundle fixes some Windows SSL errors)."""
    opts: dict[str, Any] = {"serverSelectionTimeoutMS": 30_000}
    uri = (settings.mongo_uri or "").lower()
    if "mongodb+srv://" in uri or "tls=true" in uri or "ssl=true" in uri:
        try:
            import certifi

            opts["tlsCAFile"] = certifi.where()
        except ImportError:
            pass
    return opts


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(settings.mongo_uri, **_mongo_client_kwargs())
    return _client


def get_db():
    return get_client()[settings.mongo_db]


def check_mongo_connection(timeout_ms: int = 10_000) -> dict[str, Any]:
    """
    Ping Atlas/local MongoDB without using the singleton (safe for health checks).
    Returns {"ok": True, "database": ...} or {"ok": False, "error": "...", "detail": "..."}.
    """
    try:
        kw = _mongo_client_kwargs()
        kw["serverSelectionTimeoutMS"] = timeout_ms
        client = MongoClient(settings.mongo_uri, **kw)
        client.admin.command("ping")
        db_name = settings.mongo_db
        db = client[db_name]
        db.list_collection_names()
        client.close()
        return {"ok": True, "database": db_name}
    except PyMongoError as e:
        return {"ok": False, "error": type(e).__name__, "detail": str(e)[:400]}
    except Exception as e:
        return {"ok": False, "error": type(e).__name__, "detail": str(e)[:400]}
