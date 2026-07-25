"""Selection tests (§R5.10, req 4/5): provider selection and model routing are independent."""

from __future__ import annotations

import pytest

from app.content.selection import ModelRouter, ProviderSelector
from app.content.types import Role
from app.core.config import Settings
from app.core.providers.base import ProviderKind
from app.core.providers.factory import ProviderFactory
from app.core.providers.registry import FAKE_NAME
from app.services.providers import build_provider_registry


@pytest.fixture(autouse=True)
def _no_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setitem(Settings.model_config, "env_file", None)
    for var in ("ANTHROPIC_API_KEY", "OPENAI_API_KEY", "TELEGRAM_BOT_TOKEN"):
        monkeypatch.delenv(var, raising=False)


def test_provider_selector_returns_llm_provider_only() -> None:
    factory = ProviderFactory(build_provider_registry(), Settings())
    provider = ProviderSelector(factory).select()
    assert provider.kind is ProviderKind.llm
    assert provider.name == FAKE_NAME


def test_model_router_is_declarative_and_role_based() -> None:
    router = ModelRouter()
    assert router.primary(Role.body) == "claude-opus-4-8"
    assert router.tiers(Role.body) == ("claude-opus-4-8", "claude-haiku-4-5")  # fallback tier
    for role in (Role.headline, Role.cta, Role.theme, Role.judge):
        assert router.tiers(role) == ("claude-haiku-4-5",)


def test_routing_is_independent_of_provider() -> None:
    # ModelRouter needs no provider/factory at all — proves independence (req 5).
    assert ModelRouter().primary(Role.judge) == "claude-haiku-4-5"
