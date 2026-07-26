"""Correlation ID model (owner req 9).

A standalone immutable identity linking events, metrics, spans and audit records across one
pipeline run. Identifiers come from an injected :class:`~app.analytics.ports.IdFactory` — no
``uuid4``/``random`` in the domain (owner req 17), which keeps generation deterministic under
test.

"""

from __future__ import annotations

from dataclasses import dataclass, replace

from app.analytics.ports import IdFactory


@dataclass(frozen=True, slots=True)
class CorrelationId:
    """Immutable correlation identity for a unit of work (owner req 9)."""

    correlation_id: str
    trace_id: str
    span_id: str
    parent_span_id: str | None = None
    causation_id: str | None = None


def new_correlation(ids: IdFactory) -> CorrelationId:
    """Create a fresh root correlation (new correlation/trace/span ids)."""

    return CorrelationId(correlation_id=ids.new_id(), trace_id=ids.new_id(), span_id=ids.new_id())


def child_span(parent: CorrelationId, ids: IdFactory) -> CorrelationId:
    """Derive a child span: same correlation/trace, new span id, parent linked via
    ``parent_span_id``.
    """

    return replace(
        parent,
        span_id=ids.new_id(),
        parent_span_id=parent.span_id,
        causation_id=parent.span_id,
    )
