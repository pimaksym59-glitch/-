"""Tracing hooks (owner req 14) — hooks only, no real tracing/export.

A :class:`Tracer` produces immutable :class:`Span` values linked to a :class:`CorrelationId`;
nesting is expressed by deriving a child span (:func:`~app.analytics.correlation.child_span`). The
default :class:`NoOpTracer` does nothing. Real tracing backends (OpenTelemetry) are RV-16.

"""

from __future__ import annotations

import datetime
from collections.abc import Mapping
from dataclasses import dataclass, field
from types import MappingProxyType
from typing import Protocol

from app.analytics.correlation import CorrelationId


def _empty_attrs() -> Mapping[str, str]:
    return MappingProxyType({})


@dataclass(frozen=True, slots=True)
class Span:
    """An immutable tracing span."""

    name: str
    correlation: CorrelationId
    started_at: datetime.datetime | None = None
    ended_at: datetime.datetime | None = None
    attributes: Mapping[str, str] = field(default_factory=_empty_attrs)

    def __post_init__(self) -> None:
        if not isinstance(self.attributes, MappingProxyType):
            object.__setattr__(self, "attributes", MappingProxyType(dict(self.attributes)))


class Tracer(Protocol):
    """Tracing hook (owner req 14)."""

    def start_span(self, name: str, correlation: CorrelationId) -> Span: ...

    def end_span(self, span: Span) -> Span: ...


class SpanExporter(Protocol):
    """Exports a finished span to a backend (owner req 13). Concrete backends are RV-16."""

    name: str

    def export(self, span: Span) -> None: ...


class NoOpTracer:
    """Default no-op tracer — returns spans but performs no real tracing (owner req 14)."""

    def start_span(self, name: str, correlation: CorrelationId) -> Span:
        return Span(name=name, correlation=correlation)

    def end_span(self, span: Span) -> Span:
        return span
