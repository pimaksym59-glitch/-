"""Composition tests (§R2.10): get_*_provider(settings) returns offline fakes with no API keys."""

from __future__ import annotations

import pytest

from app.core.config import Settings
from app.core.providers.base import ProviderKind
from app.core.providers.registry import FAKE_NAME
from app.services.providers import (
    build_provider_factory,
    get_embedding_provider,
    get_image_provider,
    get_llm_provider,
    get_metrics_provider,
    get_telegram_provider,
)
from app.workers.metrics import NoOpMetrics


@pytest.fixture(autouse=True)
def _no_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setitem(Settings.model_config, "env_file", None)
    for var in ("ANTHROPIC_API_KEY", "OPENAI_API_KEY", "TELEGRAM_BOT_TOKEN"):
        monkeypatch.delenv(var, raising=False)


def test_accessors_return_fakes_without_keys() -> None:
    settings = Settings()
    assert get_llm_provider(settings).name == FAKE_NAME
    assert get_embedding_provider(settings).name == FAKE_NAME
    assert get_image_provider(settings).name == FAKE_NAME
    assert get_telegram_provider(settings).name == FAKE_NAME


def test_accessors_return_correct_kinds() -> None:
    settings = Settings()
    assert get_llm_provider(settings).kind is ProviderKind.llm
    assert get_embedding_provider(settings).kind is ProviderKind.embedding
    assert get_image_provider(settings).kind is ProviderKind.image
    assert get_telegram_provider(settings).kind is ProviderKind.telegram


def test_metrics_provider_is_noop() -> None:
    assert isinstance(get_metrics_provider(Settings()), NoOpMetrics)


def test_factory_builds_all_fake_kinds() -> None:
    factory = build_provider_factory(Settings())
    for kind in (
        ProviderKind.llm,
        ProviderKind.embedding,
        ProviderKind.image,
        ProviderKind.telegram,
    ):
        assert factory.create(kind).name == FAKE_NAME
