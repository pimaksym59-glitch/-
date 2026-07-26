"""Test factories (owner reqs 4, 5) — deterministic builders of public DTOs, separate from
fixtures.

Factories construct valid immutable DTOs from **public** subsystem types only (owner req 3),
with all values drawn from a :class:`~tests.framework.seed.SeedManager` via
:class:`~tests.framework.data.SeededGenerator` (owner reqs 6, 7). They contain no production
business logic and do not build environments (that is the fixtures subsystem's job, owner req
4).

"""

from __future__ import annotations

import uuid

from app.admin.dto import ChannelRecord, UserRecord
from app.admin.rbac import Role
from app.analytics.audit import AuditEvent
from app.analytics.correlation import new_correlation
from app.analytics.events import Event
from app.analytics.fakes import FakeIdFactory
from app.analytics.taxonomy import EventCategory, EventName, EventSeverity
from app.telegram.types import ParseMode, PublishRequest
from tests.framework.data import SeededGenerator
from tests.framework.seed import SeedManager


def make_event(seeds: SeedManager, *, name: EventName = EventName.TASK_STARTED) -> Event:
    """A deterministic analytics :class:`Event`."""

    gen = SeededGenerator(seeds, "event")
    return Event(
        name=name,
        category=EventCategory.SYSTEM,
        severity=EventSeverity.INFO,
        occurred_at=gen.timestamp(),
        correlation=new_correlation(FakeIdFactory()),
        source=gen.text("src"),
        channel_id=gen.identifier("ch"),
    )


def make_audit_event(seeds: SeedManager, *, action: str = "update") -> AuditEvent:
    """A deterministic :class:`AuditEvent`."""

    gen = SeededGenerator(seeds, "audit")
    return AuditEvent(
        actor=gen.identifier("actor"),
        action=action,
        occurred_at=gen.timestamp(),
        entity="channel",
        entity_id=gen.identifier("ent"),
    )


def make_channel_record(seeds: SeedManager, *, status: str = "active") -> ChannelRecord:
    """A deterministic admin :class:`ChannelRecord` (secret ref present, never surfaced in
    views)."""

    gen = SeededGenerator(seeds, "channel")
    return ChannelRecord(
        id=gen.identifier("c"),
        title=gen.text("Channel"),
        status=status,
        language="en",
        bot_token_ref=gen.identifier("secret"),
    )


def make_user_record(seeds: SeedManager, *, role: Role = Role.viewer) -> UserRecord:
    """A deterministic admin :class:`UserRecord`."""

    gen = SeededGenerator(seeds, "user")
    return UserRecord(
        id=gen.identifier("u"),
        email=f"{gen.text('user')}@example.com",
        role=role,
        status="active",
        password_hash=f"h:{gen.text('pw')}",
    )


def make_publish_request(seeds: SeedManager, *, draft: bool = False) -> PublishRequest:
    """A deterministic Telegram :class:`PublishRequest`."""

    gen = SeededGenerator(seeds, "publish")
    return PublishRequest(
        chat_id=gen.integer(1000, 9999),
        dedup_key=gen.identifier("dedup"),
        channel_id=uuid.UUID(int=gen.integer(1, 2**63)),
        text=gen.text("post"),
        parse_mode=ParseMode.markdown_v2,
        draft=draft,
    )
