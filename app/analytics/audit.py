"""Audit event model and audit-flow ports (§R10.8, owner req 10).

``AuditEvent`` mirrors the ``audit_log`` columns (actor/action/entity/before/after) as an
immutable value object — the domain does not import ORM models or open the DB (persistence is
composition/RV-16). The audit flow is deliberately separate from the analytics event flow (owner
req 10).

"""

from __future__ import annotations

import datetime
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from types import MappingProxyType
from typing import Protocol

from app.analytics.correlation import CorrelationId

type AuditValue = str | int | float | bool | None


def _empty() -> Mapping[str, AuditValue]:
    return MappingProxyType({})


@dataclass(frozen=True, slots=True)
class AuditEvent:
    """An immutable audit record of an action (§R10.8)."""

    actor: str
    action: str
    occurred_at: datetime.datetime
    correlation: CorrelationId | None = None
    entity: str | None = None
    entity_id: str | None = None
    before: Mapping[str, AuditValue] = field(default_factory=_empty)
    after: Mapping[str, AuditValue] = field(default_factory=_empty)

    def __post_init__(self) -> None:
        for name in ("before", "after"):
            value = getattr(self, name)
            if not isinstance(value, MappingProxyType):
                object.__setattr__(self, name, MappingProxyType(dict(value)))


class AuditSink(Protocol):
    """Buffer that the audit pipeline writes to and drains (owner req 10)."""

    def put(self, event: AuditEvent) -> None: ...

    def drain(self) -> Sequence[AuditEvent]: ...


class AuditExporter(Protocol):
    """Delivers audit records to a backend (owner req 13). Concrete backends are RV-16."""

    name: str

    def export(self, events: Sequence[AuditEvent]) -> None: ...
