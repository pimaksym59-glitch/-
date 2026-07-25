"""Provider selection and model routing — **two independent mechanisms** (owner req 4/5, §R5.10).

``ProviderSelector`` chooses only the LLM *provider* (via the Stage-11 factory) and knows nothing
about models. ``ModelRouter`` chooses only the *model* from a declarative role->tiers table and
knows nothing about providers. The body/selling role routes to the strong model with a fast-model
fallback tier; other roles route to the fast model (§R5.10).
"""

from __future__ import annotations

from typing import cast

from app.content.types import Role
from app.core.providers.base import ProviderKind
from app.core.providers.factory import ProviderFactory
from app.llm.base import LLMProvider

_STRONG_MODEL = "claude-opus-4-8"  # §R5.10 body / selling
_FAST_MODEL = "claude-haiku-4-5"  # §R5.10 title / cta / theme / judge

# Declarative routing: role -> ordered model tiers (primary first, then fallback) — §R5.10.
_MODEL_TIERS: dict[Role, tuple[str, ...]] = {
    Role.body: (_STRONG_MODEL, _FAST_MODEL),
    Role.headline: (_FAST_MODEL,),
    Role.cta: (_FAST_MODEL,),
    Role.theme: (_FAST_MODEL,),
    Role.judge: (_FAST_MODEL,),
}


class ProviderSelector:
    """Selects the LLM provider only (never the model, owner req 4)."""

    def __init__(self, factory: ProviderFactory) -> None:
        self._factory = factory

    def select(self) -> LLMProvider:
        return cast(LLMProvider, self._factory.create(ProviderKind.llm))


class ModelRouter:
    """Selects the model only, via declarative role rules (never the provider, owner req 5)."""

    def primary(self, role: Role) -> str:
        return _MODEL_TIERS[role][0]

    def tiers(self, role: Role) -> tuple[str, ...]:
        return _MODEL_TIERS[role]
