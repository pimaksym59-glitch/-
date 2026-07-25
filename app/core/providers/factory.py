"""Provider factory (§R2.10, owner req 4/5) — impl-agnostic. It knows no concrete class: it selects
an implementation name from configuration and builds it through the registry.

Configuration binding (§R2.10): a *real* client is chosen only when its API key is present **and** a
real adapter is registered; otherwise the *fake* is returned. Missing keys never raise (owner req 5)
— the system always has a working, offline fake.
"""

from __future__ import annotations

from app.core.config import Settings
from app.core.providers.base import Provider, ProviderKind
from app.core.providers.registry import FAKE_NAME, ProviderRegistry


def _has_api_key(kind: ProviderKind, settings: Settings) -> bool:
    """Whether the credential that would gate a *real* client for ``kind`` is configured (§R2.10).

    Mappings are refined by the real adapters (stages 12/15/16); absence always yields the fake.
    """
    match kind:
        case ProviderKind.telegram:
            return settings.telegram_bot_token is not None
        case ProviderKind.llm:
            return settings.anthropic_api_key is not None
        case ProviderKind.embedding | ProviderKind.image:
            return settings.openai_api_key is not None
        case ProviderKind.metrics:
            return False  # metrics exporter is opt-in later; default fake (NoOp)


class ProviderFactory:
    """Builds providers via a registry + configuration. Never references concrete classes."""

    def __init__(self, registry: ProviderRegistry, settings: Settings) -> None:
        self._registry = registry
        self._settings = settings

    def resolve_name(self, kind: ProviderKind, *, name: str | None = None) -> str:
        """Pick the implementation name: explicit override, else real-if-configured, else fake."""
        if name is not None:
            return name
        if _has_api_key(kind, self._settings):
            real = self._registry.default_real(kind)
            if real is not None:
                return real
        return FAKE_NAME  # no key or no real adapter yet -> fake (never raises, owner req 5)

    def create(self, kind: ProviderKind, *, name: str | None = None) -> Provider:
        """Construct the selected provider through its registered builder."""
        builder = self._registry.get(kind, self.resolve_name(kind, name=name))
        return builder(self._settings)
