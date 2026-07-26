"""Audit integration (owner req 13, §R10.8) — the admin side records actions through a port only.

The admin domain defines :class:`AuditPort`; composition adapts it to the **public** Analytics
audit interface (``AuditPipeline``/``AuditEvent``) — the domain never imports Analytics (owner
req 1). Recording an action here does not open the DB; persistence to ``audit_log`` is
composition/RV-17.

"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Protocol

from app.admin.ports import Clock
from app.admin.types import AdminActor

type AuditValue = str | int | float | bool | None


class AuditPort(Protocol):
    """Sink for admin audit records (adapted to Analytics' public audit interface)."""

    def record(
        self,
        actor: str,
        action: str,
        entity: str | None,
        entity_id: str | None,
        before: Mapping[str, AuditValue],
        after: Mapping[str, AuditValue],
    ) -> None: ...


class AdminAuditRecorder:
    """Builds audit records for admin actions and forwards them through the port (§R10.8)."""

    def __init__(self, port: AuditPort, clock: Clock) -> None:
        self._port = port
        self._clock = clock

    def record(
        self,
        actor: AdminActor,
        action: str,
        *,
        entity: str | None = None,
        entity_id: str | None = None,
        before: Mapping[str, AuditValue] | None = None,
        after: Mapping[str, AuditValue] | None = None,
    ) -> None:
        """Record an admin action (actor/action/entity/before/after) via the audit port."""

        self._port.record(
            actor=actor.id or "anonymous",
            action=action,
            entity=entity,
            entity_id=entity_id,
            before=before or {},
            after=after or {},
        )
