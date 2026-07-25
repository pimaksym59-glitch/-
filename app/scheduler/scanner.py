"""Schedule scanner (§R8.1, §R8.14) — pure due-slot computation over plain schedule *views*.

The scanner holds no I/O: it takes a list of :class:`ScheduleView` (mapped from DB rows by
:func:`view_from_row`, the only ORM touch) plus the current time, and returns the :class:`DueSlot`
set to materialize. Paused/archived channels are skipped (§R8.14). Timezone/DST math is delegated to
:mod:`app.scheduler.timing`; the missed-slot horizon to :mod:`app.scheduler.missed`.
"""

from __future__ import annotations

import datetime
import uuid
from dataclasses import dataclass

from app.models.channel import Channel
from app.models.content import Schedule
from app.models.enums import ChannelStatus, TaskType
from app.scheduler import missed, timing


@dataclass(frozen=True, slots=True)
class ScheduleView:
    """Everything the scanner needs from a schedule + its channel — no ORM, no session."""

    schedule_id: uuid.UUID
    channel_id: uuid.UUID
    channel_status: ChannelStatus
    timezone: str
    task_type: TaskType | None
    slot_name: str | None
    cron: str | None
    day_of_week: int | None
    time_local: datetime.time | None


@dataclass(frozen=True, slots=True)
class DueSlot:
    """A slot that should be materialized into a task."""

    channel_id: uuid.UUID
    schedule_id: uuid.UUID
    task_type: TaskType
    slot_utc: datetime.datetime
    slot_name: str | None
    timezone: str


def view_from_row(schedule: Schedule, channel: Channel) -> ScheduleView:
    """Map an ORM (Schedule, Channel) join row to a pure :class:`ScheduleView`."""
    return ScheduleView(
        schedule_id=schedule.id,
        channel_id=schedule.channel_id,
        channel_status=channel.status,
        timezone=channel.timezone,
        task_type=schedule.task_type,
        slot_name=schedule.slot_name,
        cron=schedule.cron,
        day_of_week=schedule.day_of_week,
        time_local=schedule.time_local,
    )


def due_slots(
    views: list[ScheduleView],
    *,
    now: datetime.datetime,
    grace: datetime.timedelta = missed.DEFAULT_GRACE,
) -> list[DueSlot]:
    """Compute due slots across all active schedules (recently-missed + nearest upcoming).

    A stateless scheduler recovers by re-scanning one grace window each tick; ``dedup_key`` prevents
    duplicate materialization downstream. Paused/archived channels are skipped (§R8.14).
    """
    result: list[DueSlot] = []
    for view in views:
        if view.channel_status is not ChannelStatus.active:
            continue  # §R8.14 pause/resume — paused/archived channels produce nothing
        result.extend(_slots_for_view(view, now=now, grace=grace))
    return result


def _slots_for_view(
    view: ScheduleView, *, now: datetime.datetime, grace: datetime.timedelta
) -> list[DueSlot]:
    rule = timing.build_rule(
        cron=view.cron, day_of_week=view.day_of_week, time_local=view.time_local
    )
    tz = timing.resolve_tz(view.timezone)
    task_type = view.task_type or TaskType.generate_text  # None => content head of the pipeline
    slots = missed.slots_to_materialize(rule, tz, since=now - grace, now=now, grace=grace)
    return [
        DueSlot(
            channel_id=view.channel_id,
            schedule_id=view.schedule_id,
            task_type=task_type,
            slot_utc=slot,
            slot_name=view.slot_name,
            timezone=view.timezone,
        )
        for slot in slots
    ]
