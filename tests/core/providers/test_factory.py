"""Factory tests (§R2.10, owner req 4/5): config-bound selection, impl-agnostic, never raises on
missing keys — the fake is always available offline.
"""

from __future__ import annotations

import pytest
from pydantic import SecretStr

from app.core.config import Settings
from app.core.providers.base import Capability, ProviderKind
from app.core.providers.factory import ProviderFactory
from app.core.providers.health import ProviderHealth
from app.core.providers.registry import FAKE_NAME, ProviderRegistry


@pytest.fixture(autouse=True)
def _no_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setitem(Settings.model_config, "env_file", None)
    for var in ("ANTHROPIC_API_KEY", "OPENAI_API_KEY", "TELEGRAM_BOT_TOKEN"):
        monkeypatch.delenv(var, raising=False)


class _Fake:
    name = FAKE_NAME
    kind = ProviderKind.llm

    def capabilities(self) -> frozenset[Capability]:
        return frozenset()

    async def health(self) -> ProviderHealth:
        return ProviderHealth(healthy=True)


class _Real(_Fake):
    name = "anthropic"


def _registry(*, with_real: bool = False) -> ProviderRegistry:
    registry = ProviderRegistry()
    registry.register(ProviderKind.llm, FAKE_NAME, lambda _s: _Fake())
    if with_real:
        registry.register(ProviderKind.llm, "anthropic", lambda _s: _Real())
    return registry


def test_fake_when_no_api_key() -> None:
    factory = ProviderFactory(_registry(with_real=True), Settings())
    assert factory.resolve_name(ProviderKind.llm) == FAKE_NAME
    assert factory.create(ProviderKind.llm).name == FAKE_NAME


def test_real_when_key_present_and_registered() -> None:
    factory = ProviderFactory(
        _registry(with_real=True), Settings(anthropic_api_key=SecretStr("sk-test"))
    )
    assert factory.resolve_name(ProviderKind.llm) == "anthropic"
    assert factory.create(ProviderKind.llm).name == "anthropic"


def test_fake_when_key_present_but_no_real_registered() -> None:
    # No real adapter yet (Stage 11): key present must still fall back to fake, never raise.
    factory = ProviderFactory(
        _registry(with_real=False), Settings(anthropic_api_key=SecretStr("sk-test"))
    )
    assert factory.resolve_name(ProviderKind.llm) == FAKE_NAME
    assert factory.create(ProviderKind.llm).name == FAKE_NAME


def test_explicit_name_override() -> None:
    factory = ProviderFactory(_registry(with_real=True), Settings())
    assert factory.resolve_name(ProviderKind.llm, name="anthropic") == "anthropic"


def test_missing_key_never_raises_for_any_kind() -> None:
    registry = ProviderRegistry()
    for kind in ProviderKind:
        registry.register(kind, FAKE_NAME, lambda _s: _Fake())
    factory = ProviderFactory(registry, Settings())
    for kind in ProviderKind:
        assert factory.create(kind).name == FAKE_NAME  # no exception, always a fake
