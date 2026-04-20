"""
EstateScout — FastAPI application entrypoint.
Run locally:  uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from db.connection import check_mongo_connection
from routers import agent, chat, files, map as map_router, profile, properties

app = FastAPI(
    title="EstateScout API",
    description="Autonomous property agent backend (FastAPI + LangGraph).",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api")
app.include_router(properties.router, prefix="/api")
app.include_router(agent.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(map_router.router, prefix="/api")
app.include_router(files.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/db")
def health_db() -> dict:
    """Verify MongoDB URI from .env (Atlas or local)."""
    result = check_mongo_connection()
    if not result.get("ok"):
        raise HTTPException(
            status_code=503,
            detail=result,
        )
    return {"status": "ok", "mongo": result}