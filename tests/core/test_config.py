"""Unit tests for app.core.config (offline). Covers §R3.4 (precedence), §R12.2 (secrets),
§Appendix B (defaults), and fail-fast validation.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from pydantic import ValidationError

from app.core import config as cfg
from app.core.config import AppEnv, LogLevel, Settings


@pytest.fixture
def config_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Isolate config: empty yaml dir + disable reading the real project .env (deterministic)."""
    monkeypatch.setattr(cfg, "CONFIG_DIR", tmp_path)
    monkeypatch.setitem(Settings.model_config, "env_file", None)
    return tmp_path


def _write(directory: Path, name: str, content: str) -> None:
    (directory / name).write_text(content, encoding="utf-8")


def _settings() -> Settings:
    return Settings()


def test_defaults_match_appendix_b(config_dir: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("APP_ENV", raising=False)
    settings = _settings()
    assert settings.similarity_threshold == 0.85
    assert settings.humanness_min == 75
    assert settings.history_window == 500
    assert settings.max_retries == 5
    assert settings.app_env is AppEnv.development
    assert settings.log_level is LogLevel.info
    assert settings.openai_api_key is None


def test_yaml_provides_business_defaults(config_dir: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "development")
    _write(config_dir, "global.yaml", "log_level: WARNING\nhistory_window: 250\n")
    settings = _settings()
    assert settings.log_level is LogLevel.warning
    assert settings.history_window == 250


def test_env_overrides_yaml(config_dir: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "development")
    _write(config_dir, "global.yaml", "log_level: WARNING\n")
    monkeypatch.setenv("LOG_LEVEL", "ERROR")
    assert _settings().log_level is LogLevel.error


def test_env_specific_yaml_overrides_global(
    config_dir: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    _write(config_dir, "global.yaml", "log_level: WARNING\n")
    _write(config_dir, "production.yaml", "log_level: ERROR\n")
    assert _settings().log_level is LogLevel.error


def test_secret_never_sourced_from_yaml(config_dir: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    _write(config_dir, "global.yaml", "openai_api_key: yaml-secret\n")
    assert _settings().openai_api_key is None  # §R12.2: secrets are not read from yaml


def test_secret_from_env(config_dir: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "env-secret")
    settings = _settings()
    assert settings.openai_api_key is not None
    assert settings.openai_api_key.get_secret_value() == "env-secret"


def test_missing_yaml_degrades_gracefully(
    config_dir: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("APP_ENV", raising=False)
    assert _settings().log_level is LogLevel.info  # empty config dir → code defaults


def test_validation_range_rejected(config_dir: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SIMILARITY_THRESHOLD", "2.0")
    with pytest.raises(ValidationError):
        _settings()


def test_validation_humanness_rejected(config_dir: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("HUMANNESS_MIN", "150")
    with pytest.raises(ValidationError):
        _settings()


def test_validation_bad_url_rejected(config_dir: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "not-a-url")
    with pytest.raises(ValidationError):
        _settings()


def test_validation_good_url_accepted(config_dir: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://u:p@localhost:5432/db")
    assert _settings().database_url == "postgresql+asyncpg://u:p@localhost:5432/db"


def test_to_safe_dict_masks_secrets(config_dir: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "super-secret-value")
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    safe = _settings().to_safe_dict()
    assert safe["openai_api_key"] == "************"
    assert safe["anthropic_api_key"] == "<unset>"
    assert "super-secret-value" not in repr(safe)


def test_secret_not_leaked_in_repr(config_dir: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "super-secret-value")
    settings = _settings()
    assert "super-secret-value" not in repr(settings)
    assert "super-secret-value" not in str(settings)


def test_storage_dir_created(
    config_dir: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    target = tmp_path / "store"
    monkeypatch.setenv("STORAGE_DIR", str(target))
    settings = _settings()
    assert settings.storage_dir == target
    assert target.is_dir()
