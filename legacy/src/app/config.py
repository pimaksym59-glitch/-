"""Centralized configuration loaded from environment / .env.

All modules read settings via `get_settings()` — never from os.environ directly,
so configuration stays in one place and is easy to override in tests.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Application
    app_env: str = "development"
    log_level: str = "INFO"
    log_json: bool = False

    # Admin API. Requests must send X-Admin-Token matching this value.
    # When unset, the admin API is disabled (returns 503).
    admin_token: str | None = None

    # PostgreSQL
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "telegram_ai"
    postgres_user: str = "app"
    postgres_password: str = "app"

    # Redis
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0

    # AI Engine (Anthropic). Without a key the engine uses a deterministic
    # fake client (dev / offline). See ai_engine.client.get_llm_client.
    anthropic_api_key: str | None = None
    ai_model: str = "claude-opus-4-8"
    ai_effort: str = "high"  # low | medium | high | xhigh | max

    # Memory / RAG. Without an embedding key a deterministic fake embedder is
    # used (dev / offline). embedding_dim must match the Vector() column (1536).
    embedding_provider: str = "openai"  # openai | fake
    embedding_api_key: str | None = None
    embedding_model: str = "text-embedding-3-small"
    embedding_dim: int = 1536
    rag_top_k: int = 5

    # Image Engine. Without a key a deterministic fake provider is used.
    image_provider: str = "openai"  # openai | fake
    image_api_key: str | None = None
    image_model: str = "gpt-image-1"
    image_size: str = "1024x1024"
    media_root: str = "media"
    image_similarity_threshold: int = 5  # max Hamming distance treated as duplicate
    image_max_regen: int = 3  # regeneration attempts to escape a near-duplicate

    # Telegram Engine. Without a token a fake client is used (dev / offline).
    telegram_bot_token: str | None = None
    # Delay before collecting post metrics after publication (Stage 9 consumes it).
    metrics_delay_seconds: int = 3600

    # Analytics. Bot metric access is limited, so a fake provider is the default
    # source until a channel with the needed permissions is connected.
    metrics_provider: str = "fake"  # fake | telegram

    # Validation layer (pre-publication guard).
    validation_min_chars: int = 10
    validation_max_chars: int = 4096
    validation_banned_patterns: list[str] = []  # case-insensitive substrings (env: JSON)
    validation_duplicate_threshold: float = 0.9  # Jaccard word-set similarity

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def redis_url(self) -> str:
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    """Cached singleton so settings are parsed once per process."""
    return Settings()
