"""Mock / test providers (owner req: Mock/Test Providers) — reusable doubles for unit tests. These
are deterministic and offline; they exercise the error model and call-recording without any network.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.core.providers.base import Capability, ProviderKind
from app.core.providers.errors import ProviderError
from app.core.providers.health import ProviderHealth


@dataclass
class FailingProvider:
    """A provider whose operation raises a configured ``ProviderError`` — for error-path and retry-
    classification tests. Satisfies the base ``Provider`` structural contract."""

    error: ProviderError
    kind: ProviderKind = ProviderKind.llm
    name: str = "failing"

    def capabilities(self) -> frozenset[Capability]:
        return frozenset()

    async def health(self) -> ProviderHealth:
        return ProviderHealth(healthy=False, detail="test double")

    async def invoke(self) -> None:
        raise self.error


@dataclass
class RecordingProvider:
    """A provider that records the calls made to ``invoke`` — for interaction assertions."""

    kind: ProviderKind = ProviderKind.llm
    name: str = "recording"
    calls: list[str] = field(default_factory=list)

    def capabilities(self) -> frozenset[Capability]:
        return frozenset()

    async def health(self) -> ProviderHealth:
        return ProviderHealth(healthy=True)

    async def invoke(self, payload: str) -> str:
        self.calls.append(payload)
        return payload
