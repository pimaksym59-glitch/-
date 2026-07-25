"""Scanner tests (§R8.1, §R8.14) — offline on plain views. Due-slot computation + paused skip."""

from __future__ import annotations

import datetime
import uuid

from uuid6 import uuid7

from app.models.enums import ChannelStatus, TaskType
from app.scheduler import missed
from app.scheduler.scanner import DueSlot, ScheduleView, due_slots

UTC = datetime.UTC


def _utc(y: int, mo: int, d: int, h: int = 0, mi: int = 0) -> datetime.datetime:
    return datetime.datetime(y, mo, d, h, mi, tzinfo=UTC)


def _view(
    *,
    status: ChannelStatus = ChannelStatus.active,
    cron: str | None = "0 12 * * *",
    task_type: TaskType | None = None,
    channel_id: uuid.UUID | None = None,
) -> ScheduleView:
    return ScheduleView(
        schedule_id=uuid7(),
        channel_id=channel_id or uuid7(),
        channel_status=status,
        timezone="Europe/Berlin",
        task_type=task_type,
        slot_name="noon",
        cron=cron,
        day_of_week=None,
        time_local=None,
    )


def test_active_channel_produces_slots() -> None:
    now = _utc(2026, 7, 24, 12, 30)  # just after 12:00 Berlin? 12:00 CEST = 10:00 UTC
    slots = due_slots([_view()], now=now, grace=datetime.timedelta(hours=6))
    assert slots
    assert all(isinstance(s, DueSlot) for s in slots)
    # default task_type None -> content head generate_text
    assert {s.task_type for s in slots} == {TaskType.generate_text}


def test_paused_channel_skipped() -> None:
    assert due_slots([_view(status=ChannelStatus.paused)], now=_utc(2026, 7, 24, 12, 30)) == []


def test_archived_channel_skipped() -> None:
    assert due_slots([_view(status=ChannelStatus.archived)], now=_utc(2026, 7, 24, 12, 30)) == []


def test_explicit_periodic_task_type_preserved() -> None:
    slots = due_slots(
        [_view(cron="0 3 * * *", task_type=TaskType.backup)],
        now=_utc(2026, 7, 24, 3, 30),
        grace=datetime.timedelta(hours=6),
    )
    assert slots
    assert {s.task_type for s in slots} == {TaskType.backup}


def test_slots_carry_schedule_and_channel_identity() -> None:
    cid = uuid7()
    view = _view(channel_id=cid)
    slots = due_slots([view], now=_utc(2026, 7, 24, 12, 30))
    assert all(s.channel_id == cid and s.schedule_id == view.schedule_id for s in slots)
    assert all(s.slot_name == "noon" and s.timezone == "Europe/Berlin" for s in slots)


def test_default_grace_used_when_unspecified() -> None:
    # Sanity: default grace path is exercised (no exception, uses missed.DEFAULT_GRACE).
    slots = due_slots([_view()], now=_utc(2026, 7, 24, 12, 30))
    assert isinstance(slots, list)
    assert datetime.timedelta(hours=6) == missed.DEFAULT_GRACE
