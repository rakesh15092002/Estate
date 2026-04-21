"""Groq LLM (free tier API) via LangChain ChatGroq."""

from functools import lru_cache

from langchain_groq import ChatGroq

from config import settings

SYSTEM_PROMPT = """You are EstateScout, a concise autonomous property-rental assistant.
You help users find apartments and houses: budget, bedrooms, location, pets, amenities.
Keep replies clear and actionable. If you lack listing data, ask one focused follow-up question.
Do not invent specific addresses or prices unless the user provided them."""


@lru_cache(maxsize=4)
def _cached_chat(api_key: str, model: str) -> ChatGroq:
    return ChatGroq(
        api_key=api_key,
        model=model,
        temperature=0.2,
        max_retries=2,
    )


def get_chat_model() -> ChatGroq | None:
    """Returns None when GROQ_API_KEY is not configured."""
    key = (settings.groq_api_key or "").strip()
    if not key:
        return None
    return _cached_chat(key, settings.groq_model)
