"""Immutable Event model and event-flow ports (owner reqs 2, 4).

``Event`` is frozen and normalises its attributes into a read-only mapping in ``__post_init__`` so
an event cannot be mutated after creation (owner req 2). The event-flow Protocols
(emitter/sink/exporter) live here, beside the DTO they carry, keeping the package acyclic.

"""

from __future__ import annotations

import datetime
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from types import MappingProxyType
from typing import Protocol

from app.analytics.correlation import CorrelationId
from app.analytics.taxonomy import EventCategory, EventName, EventSeverity

type AttrValue = str | int | float | bool | None
"""Allowed event-attribute value types (immutable scalars)."""


def _empty_attrs() -> Mapping[str, AttrValue]:
    return MappingProxyType({})


@dataclass(frozen=True, slots=True)
class Event:
    """An immutable analytics event (owner reqs 2, 4)."""

    name: EventName
    category: EventCategory
    severity: EventSeverity
    occurred_at: datetime.datetime
    correlation: CorrelationId
    source: str
    channel_id: str | None = None
    attributes: Mapping[str, AttrValue] = field(default_factory=_empty_attrs)

    def __post_init__(self) -> None:
        # Freeze attributes into a read-only proxy so the event is truly immutable (owner req 2).
        if not isinstance(self.attributes, MappingProxyType):
            object.__setattr__(self, "attributes", MappingProxyType(dict(self.attributes)))


class EventEmitter(Protocol):
    """Public entry point for producing events (owner req 3)."""

    def emit(self, event: Event) -> None: ...


class EventSink(Protocol):
    """Buffer that a collector writes to and a dispatcher drains (owner reqs 4, 7)."""

    def put(self, event: Event) -> None: ...

    def drain(self) -> Sequence[Event]: ...


class EventExporter(Protocol):
    """Delivers a batch of events to a backend (owner req 13). Concrete backends are RV-16."""

    name: str

    def export(self, events: Sequence[Event]) -> None: ...
