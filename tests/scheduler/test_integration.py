"""Scheduler integration tests — require a live PostgreSQL (§R8.10). Runtime Verification Pending
(RV-8). NOT executed without ``RUN_INTEGRATION=1`` + ``DATABASE_URL``; not counted as verified.

Covers: advisory lock, ``list_enabled_with_channel``, real materialization through the Producer, and
idempotency (a second identical tick creates no duplicate task — UNIQUE ``dedup_key``).
"""

from __future__ import annotations

import datetime
import os

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import app.models
from app.models.channel import Channel
from app.models.content import Schedule
from app.models.enums import ChannelStatus, TaskType
from app.models.queue import Task
from app.repositories.schedule_repository import ScheduleRepository
from app.repositories.task_repository import TaskRepository
from app.scheduler.advisory import AdvisoryLock, lock_key
from app.scheduler.materializer import Materializer, slot_dedup_key
from app.scheduler.scanner import DueSlot, ScheduleView, view_from_row
from app.scheduler.scheduler import SchedulerEngine, TickResources
from app.workers.producer import SqlTaskProducer

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_INTEGRATION") != "1",
        reason="requires a live PostgreSQL (RUN_INTEGRATION=1, DATABASE_URL)",
    ),
]

_NOW = datetime.datetime(2026, 7, 24, 12, 30, tzinfo=datetime.UTC)


def _seed_channel_and_schedule() -> tuple[Channel, Schedule]:
    channel = Channel(
        language="ru",
        timezone="Europe/Berlin",
        status=ChannelStatus.active,
        llm_provider="fake",
        image_provider="fake",
    )
    schedule = Schedule(
        channel=None,  # set via channel_id after flush
        cron="0 12 * * *",  # daily noon local
        slot_name="noon",
        task_type=None,  # content head
        enabled=True,
    )
    return channel, schedule


async def _run_tick(
    sessionmaker: async_sessionmaker[AsyncSession], engine_clock: datetime.datetime
) -> int:
    scheduler = SchedulerEngine(lock_key=lock_key("scheduler:tick"), clock=lambda: engine_clock)
    async with sessionmaker() as session:
        schedules = ScheduleRepository(session)
        tasks = TaskRepository(session)
        materializer = Materializer(SqlTaskProducer(session), lead_time_minutes=45)

        async def fetch_views() -> list[ScheduleView]:
            rows = await schedules.list_enabled_with_channel()
            return [view_from_row(*row.tuple()) for row in rows]

        async def filter_new(slots: list[DueSlot]) -> list[DueSlot]:
            keys = {slot_dedup_key(slot): slot for slot in slots}
            existing = await tasks.existing_dedup_keys(keys.keys())
            return [slot for key, slot in keys.items() if key not in existing]

        async def commit() -> None:
            await session.commit()

        resources = TickResources(
            advisory=AdvisoryLock(session),
            fetch_views=fetch_views,
            filter_new=filter_new,
            commit=commit,
            materializer=materializer,
        )
        return await scheduler.tick(resources)


async def test_materialization_is_idempotent() -> None:
    engine = create_async_engine(os.environ["DATABASE_URL"])
    try:
        async with engine.begin() as conn:
            await conn.run_sync(app.models.Base.metadata.create_all)
        sessionmaker = async_sessionmaker(engine, expire_on_commit=False)

        async with sessionmaker() as session:
            channel, schedule = _seed_channel_and_schedule()
            session.add(channel)
            await session.flush()
            schedule.channel_id = channel.id
            session.add(schedule)
            await session.commit()

        first = await _run_tick(sessionmaker, _NOW)
        second = await _run_tick(sessionmaker, _NOW)  # identical tick -> pre-filtered, no new tasks

        assert first > 0
        assert second == 0  # graceful idempotency: the re-scan enqueues nothing (no IntegrityError)
        async with sessionmaker() as session:
            total = await session.scalar(select(func.count()).select_from(Task))
            heads = await session.scalars(select(Task).where(Task.type == TaskType.generate_text))
            assert total == first  # second tick added nothing
            assert all(t.dedup_key is not None for t in heads.all())
    finally:
        await engine.dispose()
