"""Application configuration — single typed loader (§R3.4, §R12.2, §R3.7).

Source precedence (highest wins):

    CLI overrides (reserved) > env vars > .env > yaml (business config) > code defaults

Secrets come **only** from env / .env — the YAML source strips secret-typed fields, so a secret
can never be sourced from a committed config file (§R12.2). Platform defaults are taken from
MASTER_SPEC §Appendix B; platform constants from §R4.6. Invalid config fails fast on load (§R2.x
fail-safe): construction raises ``pydantic.ValidationError``.

Note (§R3.4): the per-channel DB override layer is the *highest* business-config source, but it is
NOT implemented here — that belongs to Stages 6-7. This module only reserves its place.
"""

from __future__ import annotations

import functools
import os
from enum import Enum, StrEnum
from pathlib import Path
from typing import Any, get_args
from urllib.parse import urlparse

import yaml
from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic.fields import FieldInfo
from pydantic_settings import BaseSettings, PydanticBaseSettingsSource, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[2]
CONFIG_DIR = PROJECT_ROOT / "config"

_DB_SCHEMES = frozenset({"postgresql", "postgresql+asyncpg"})
_REDIS_SCHEMES = frozenset({"redis", "rediss"})


class AppEnv(StrEnum):
    development = "development"
    testing = "testing"
    staging = "staging"
    production = "production"


class LogLevel(StrEnum):
    debug = "DEBUG"
    info = "INFO"
    warning = "WARNING"
    error = "ERROR"
    critical = "CRITICAL"


def _is_secret_annotation(annotation: Any) -> bool:
    return annotation is SecretStr or SecretStr in get_args(annotation)


def secret_field_names(settings_cls: type[BaseSettings]) -> frozenset[str]:
    """Field names typed as SecretStr — these are excluded from the YAML source (§R12.2)."""
    return frozenset(
        name
        for name, field in settings_cls.model_fields.items()
        if _is_secret_annotation(field.annotation)
    )


class _YamlBusinessConfigSource(PydanticBaseSettingsSource):
    """Loads non-secret business config from ``config/global.yaml`` + ``config/{app_env}.yaml``.

    Secret-typed fields are stripped: secrets come only from env (§R12.2). A missing file degrades
    gracefully to code defaults.
    """

    def __init__(self, settings_cls: type[BaseSettings]) -> None:
        super().__init__(settings_cls)
        self._secret_fields = secret_field_names(settings_cls)
        self._data = self._load()

    def _load(self) -> dict[str, Any]:
        app_env = os.environ.get("APP_ENV", AppEnv.development.value).lower()
        merged: dict[str, Any] = {}
        for stem in ("global", app_env):
            path = CONFIG_DIR / f"{stem}.yaml"
            if not path.is_file():
                continue
            raw = yaml.safe_load(path.read_text(encoding="utf-8"))
            if isinstance(raw, dict):
                merged.update({str(key).lower(): value for key, value in raw.items()})
        for secret in self._secret_fields:
            merged.pop(secret, None)  # secrets never come from YAML
        return merged

    def get_field_value(self, field: FieldInfo, field_name: str) -> tuple[Any, str, bool]:
        return self._data.get(field_name), field_name, False

    def __call__(self) -> dict[str, Any]:
        return dict(self._data)


class Settings(BaseSettings):
    """Typed application settings. See module docstring for precedence and secret handling."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- environment ---
    app_env: AppEnv = AppEnv.development
    log_level: LogLevel = LogLevel.info

    # --- infrastructure (declared; NOT connected this stage) ---
    database_url: str | None = None
    redis_url: str | None = None
    storage_dir: Path = PROJECT_ROOT / "storage"

    # --- API (§R13.1 stage 10) — CORS closed by default (empty allowlist) ---
    cors_origins: list[str] = Field(default_factory=list)
    cors_allow_credentials: bool = False

    # --- secrets: ONLY from env, no default value; None => provider fake (§R2.10) ---
    anthropic_api_key: SecretStr | None = None
    openai_api_key: SecretStr | None = None
    telegram_bot_token: SecretStr | None = None  # platform fallback; per-channel token lives in DB

    # --- platform constants (§R4.6) — NOT per-channel ---
    embedding_model: str = "text-embedding-3-small"
    embedding_dim_text: int = Field(default=1536, gt=0)
    clip_dim: int = Field(default=512, gt=0)

    # --- platform defaults (§Appendix B) — per-channel overridable later (DB) ---
    similarity_threshold: float = Field(default=0.85, ge=0.0, le=1.0)
    humanness_min: int = Field(default=75, ge=0, le=100)
    history_window: int = Field(default=500, gt=0)
    image_window: int = Field(default=30, gt=0)
    max_rewrites: int = Field(default=3, gt=0)
    image_max_regen: int = Field(default=3, gt=0)
    max_retries: int = Field(default=5, gt=0)
    lead_time_minutes: int = Field(default=45, gt=0)
    epsilon_min: float = Field(default=0.1, ge=0.0, le=1.0)
    max_context_tokens: int = Field(default=8000, gt=0)

    @field_validator("database_url")
    @classmethod
    def _validate_database_url(cls, value: str | None) -> str | None:
        return _validate_url(value, _DB_SCHEMES, "database_url")

    @field_validator("redis_url")
    @classmethod
    def _validate_redis_url(cls, value: str | None) -> str | None:
        return _validate_url(value, _REDIS_SCHEMES, "redis_url")

    @model_validator(mode="after")
    def _ensure_storage_dir(self) -> Settings:
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        return self

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        # highest -> lowest: init > env > .env > yaml(business) > code defaults(+file secrets)
        return (
            init_settings,
            env_settings,
            dotenv_settings,
            _YamlBusinessConfigSource(settings_cls),
            file_secret_settings,
        )

    def to_safe_dict(self) -> dict[str, Any]:
        """Config snapshot safe for logs: secrets masked, never their real value (§R12.2)."""
        safe: dict[str, Any] = {}
        for name in type(self).model_fields:
            value = getattr(self, name)
            if isinstance(value, SecretStr):
                safe[name] = "************"
            elif value is None and name in SECRET_FIELDS:
                safe[name] = "<unset>"
            elif isinstance(value, Enum):
                safe[name] = value.value
            elif isinstance(value, Path):
                safe[name] = str(value)
            else:
                safe[name] = value
        return safe


SECRET_FIELDS: frozenset[str] = secret_field_names(Settings)


def _validate_url(value: str | None, schemes: frozenset[str], field: str) -> str | None:
    if value is None:
        return None
    parsed = urlparse(value)
    if parsed.scheme not in schemes or not parsed.netloc:
        raise ValueError(f"{field} must be a URL with scheme in {sorted(schemes)} and a host")
    return value


@functools.lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached singleton accessor for application settings."""
    return Settings()
