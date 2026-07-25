"""Capability discovery tests (owner req 7): declarative, membership-based (no class checks)."""

from __future__ import annotations

import pytest

from app.core.providers.base import Capability, ProviderKind
from app.core.providers.capabilities import require, supports
from app.core.providers.errors import UnsupportedCapabilityError
from app.core.providers.health import ProviderHealth


class _Provider:
    name = "fake"
    kind = ProviderKind.llm

    def capabilities(self) -> frozenset[Capability]:
        return frozenset({Capability.text_generation})

    async def health(self) -> ProviderHealth:
        return ProviderHealth(healthy=True)


def test_supports() -> None:
    provider = _Provider()
    assert supports(provider, Capability.text_generation)
    assert not supports(provider, Capability.vision)


def test_require_passes_when_declared() -> None:
    require(_Provider(), Capability.text_generation)  # no raise


def test_require_raises_when_missing() -> None:
    with pytest.raises(UnsupportedCapabilityError, match="vision"):
        require(_Provider(), Capability.text_generation, Capability.vision)
