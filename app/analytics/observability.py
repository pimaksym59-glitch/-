"""Observability hooks (§R11.9, owner req 14) — hooks only, no implementation.

Each computation/export may emit an immutable :class:`ObservabilityRecord` capturing source,
filters, algorithm version, duration and time (§R11.9). The default hook is a no-op; a concrete
hook (structured logger, metrics sink) plugs in at composition — RV-16.

"""

from __future__ import annotations

import datetime
from collections.abc import Mapping
from dataclasses import dataclass, field
from types import MappingProxyType
from typing import Protocol


def _empty_filters() -> Mapping[str, str]:
    return MappingProxyType({})


@dataclass(frozen=True, slots=True)
class ObservabilityRecord:
    """Immutable provenance of a computation/export (§R11.9)."""

    source: str
    algorithm_version: str = "1"
    filters: Mapping[str, str] = field(default_factory=_empty_filters)
    duration_seconds: float | None = None
    computed_at: datetime.datetime | None = None
    detail: str | None = None

    def __post_init__(self) -> None:
        if not isinstance(self.filters, MappingProxyType):
            object.__setattr__(self, "filters", MappingProxyType(dict(self.filters)))


class ObservabilityHook(Protocol):
    """Hook invoked by pipeline/metrics components to record provenance (§R11.9)."""

    def record(self, record: ObservabilityRecord) -> None: ...


class NoOpObservability:
    """Default no-op hook — records nothing (owner req 14; real backend is RV-16)."""

    def record(self, record: ObservabilityRecord) -> None: ...
