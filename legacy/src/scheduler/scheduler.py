"""Scheduler: turn due `Schedule` rows into queued tasks.

Each active schedule whose `next_run_at` is due enqueues the pipeline-entry task
(text generation) and advances `next_run_at`. First sighting of a schedule only
initializes `next_run_at` (no immediate run). Guarded by a Redis lock in the
runner so concurrent instances don't double-enqueue.
"""

from __future__ import annotations

from datetime import UTC, datetime

import structlog
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Schedule, Task
from app.models.enums import TaskStatus, TaskType

from .timing import compute_next_run

log = structlog.get_logger(__name__)

# The task type that begins the publication pipeline for a channel.
PIPELINE_ENTRY = TaskType.generate_text


def _now() -> datetime:
    return datetime.now(tz=UTC)


async def tick(session: AsyncSession, *, now: datetime | None = None) -> int:
    """Process due schedules once. Returns the number of tasks enqueued."""
    now = now or _now()
    due = (
        (
            await session.execute(
                select(Schedule).where(
                    Schedule.is_active.is_(True),
                    or_(Schedule.next_run_at.is_(None), Schedule.next_run_at <= now),
                )
            )
        )
        .scalars()
        .all()
    )

    enqueued = 0
    for schedule in due:
        next_run = compute_next_run(
            cron=schedule.cron,
            interval_seconds=schedule.interval_seconds,
            timezone=schedule.timezone,
            after=now,
        )
        if schedule.next_run_at is None:
            # First time we see it — arm it, don't fire retroactively.
            schedule.next_run_at = next_run
            continue

        session.add(
            Task(
                type=PIPELINE_ENTRY,
                status=TaskStatus.pending,
                payload={"channel_id": schedule.channel_id, "schedule_id": schedule.id},
            )
        )
        schedule.next_run_at = next_run
        enqueued += 1

    await session.commit()
    if enqueued:
        log.info("scheduler_tick", enqueued=enqueued)
    return enqueued
