"""Load settings from environment (.env) and defaults."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # MongoDB (optional until you wire the CRM node)
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db: str = "estatescout"

    # Agent tools (optional for initial setup)
    tavily_api_key: str | None = None

    # Groq (free tier): https://console.groq.com/
    groq_api_key: str | None = None
    groq_model: str = "llama-3.1-8b-instant"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
