"""Registry tests (owner req 3): typed, extensible, thread-safe, impl-agnostic, clear on unknown."""

from __future__ import annotations

import threading

import pytest

from app.core.config import Settings
from app.core.providers.base import Capability, ProviderKind
from app.core.providers.health import ProviderHealth
from app.core.providers.registry import FAKE_NAME, ProviderNotRegistered, ProviderRegistry


class _Stub:
    name = "stub"
    kind = ProviderKind.llm

    def capabilities(self) -> frozenset[Capability]:
        return frozenset()

    async def health(self) -> ProviderHealth:
        return ProviderHealth(healthy=True)


def _settings() -> Settings:
    return Settings()


def test_register_and_build() -> None:
    registry = ProviderRegistry()
    registry.register(ProviderKind.llm, FAKE_NAME, lambda _s: _Stub())
    provider = registry.get(ProviderKind.llm, FAKE_NAME)(_settings())
    assert provider.name == "stub"


def test_unknown_raises_provider_not_registered() -> None:
    registry = ProviderRegistry()
    with pytest.raises(ProviderNotRegistered, match="llm/missing"):
        registry.get(ProviderKind.llm, "missing")


def test_duplicate_register_refused_unless_replace() -> None:
    registry = ProviderRegistry()
    registry.register(ProviderKind.llm, "a", lambda _s: _Stub())
    with pytest.raises(ValueError, match="already registered"):
        registry.register(ProviderKind.llm, "a", lambda _s: _Stub())
    registry.register(ProviderKind.llm, "a", lambda _s: _Stub(), replace=True)  # ok


def test_names_and_default_real() -> None:
    registry = ProviderRegistry()
    registry.register(ProviderKind.llm, FAKE_NAME, lambda _s: _Stub())
    assert registry.default_real(ProviderKind.llm) is None  # only fake
    registry.register(ProviderKind.llm, "anthropic", lambda _s: _Stub())
    assert registry.default_real(ProviderKind.llm) == "anthropic"
    assert registry.names(ProviderKind.llm) == frozenset({FAKE_NAME, "anthropic"})


def test_thread_safe_registration() -> None:
    registry = ProviderRegistry()

    def worker(index: int) -> None:
        registry.register(ProviderKind.image, f"impl-{index}", lambda _s: _Stub())

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(50)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert len(registry.names(ProviderKind.image)) == 50
