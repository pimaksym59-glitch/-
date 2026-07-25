"""Provider composition root (§R2.10, §R3.8). This is the one place that knows the concrete fakes:
it registers them into a :class:`ProviderRegistry` and exposes the ``get_*_provider(settings)``
accessors (§R2.10). The generic factory/registry (``app.core.providers``) stay implementation-
agnostic; real adapters register alongside the fakes in their stages (12/15/16) without touching
this selection logic.
"""

from __future__ import annotations

from typing import cast

from app.core.config import Settings
from app.core.providers.base import ProviderKind
from app.core.providers.factory import ProviderFactory
from app.core.providers.registry import FAKE_NAME, ProviderRegistry
from app.images.base import ImageProvider
from app.images.fakes import FakeImageProvider
from app.llm.base import EmbeddingProvider, LLMProvider
from app.llm.fakes import FakeEmbeddingProvider, FakeLLMProvider
from app.telegram.base import TelegramProvider
from app.telegram.fakes import FakeTelegramProvider
from app.workers.metrics import Metrics, NoOpMetrics


def build_provider_registry() -> ProviderRegistry:
    """Registry with every domain fake registered under ``"fake"`` (real adapters add later)."""
    registry = ProviderRegistry()
    registry.register(ProviderKind.llm, FAKE_NAME, lambda _settings: FakeLLMProvider())
    registry.register(ProviderKind.embedding, FAKE_NAME, lambda _settings: FakeEmbeddingProvider())
    registry.register(ProviderKind.image, FAKE_NAME, lambda _settings: FakeImageProvider())
    registry.register(ProviderKind.telegram, FAKE_NAME, lambda _settings: FakeTelegramProvider())
    return registry


def build_provider_factory(settings: Settings) -> ProviderFactory:
    """A factory bound to the default registry and ``settings`` (§R2.10)."""
    return ProviderFactory(build_provider_registry(), settings)


def get_llm_provider(settings: Settings) -> LLMProvider:
    return cast(LLMProvider, build_provider_factory(settings).create(ProviderKind.llm))


def get_embedding_provider(settings: Settings) -> EmbeddingProvider:
    return cast(EmbeddingProvider, build_provider_factory(settings).create(ProviderKind.embedding))


def get_image_provider(settings: Settings) -> ImageProvider:
    return cast(ImageProvider, build_provider_factory(settings).create(ProviderKind.image))


def get_telegram_provider(settings: Settings) -> TelegramProvider:
    return cast(TelegramProvider, build_provider_factory(settings).create(ProviderKind.telegram))


def get_metrics_provider(settings: Settings) -> Metrics:
    """Metrics provider (§R2.10). No-op fake now; a real exporter registers later."""
    return NoOpMetrics()
