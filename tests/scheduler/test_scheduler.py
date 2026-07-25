"""Scheduler engine tick tests (§R8.1, §R8.10) — offline on fakes. Lock-acquired vs skipped-locked,
scan->materialize->commit ordering, multi-instance skip.
"""

from __future__ import annotations

import datetime
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from typing import Any

from uuid6 import uuid7

from app.models.enums import ChannelStatus, TaskType
from app.scheduler.materializer import Materializer
from app.scheduler.scanner import DueSlot, ScheduleView
from app.scheduler.scheduler import SchedulerEngine, TickResources

UTC = datetime.UTC
FIXED_NOW = datetime.datetime(2026, 7, 24, 12, 30, tzinfo=UTC)


@dataclass
class _FakeProducer:
    count: int = 0

    async def enqueue(
        self,
        *,
        task_type: TaskType,
        channel_id: uuid.UUID | None,
        payload: dict[str, Any],
        run_at: datetime.datetime,
        dedup_key: str | None = None,
    ) -> None:
        self.count += 1


@dataclass
class _FakeLock:
    acquired: bool
    entered: bool = False
    released: bool = False

    @asynccontextmanager
    async def hold(self, key: int) -> AsyncIterator[bool]:
        self.entered = True
        try:
            yield self.acquired
        finally:
            if self.acquired:
                self.released = True


@dataclass
class _Recorder:
    committed: bool = False
    fetched: bool = False
    filtered: bool = False
    drop_all: bool = False  # simulate every slot already materialized
    views: list[ScheduleView] = field(default_factory=list)

    async def fetch_views(self) -> list[ScheduleView]:
        self.fetched = True
        return self.views

    async def filter_new(self, slots: list[DueSlot]) -> list[DueSlot]:
        self.filtered = True
        return [] if self.drop_all else slots

    async def commit(self) -> None:
        self.committed = True


def _view() -> ScheduleView:
    return ScheduleView(
        schedule_id=uuid7(),
        channel_id=uuid7(),
        channel_status=ChannelStatus.active,
        timezone="Europe/Berlin",
        task_type=None,
        slot_name="noon",
        cron="0 12 * * *",
        day_of_week=None,
        time_local=None,
    )


def _resources(lock: _FakeLock, rec: _Recorder, producer: _FakeProducer) -> TickResources:
    return TickResources(
        advisory=lock,
        fetch_views=rec.fetch_views,
        filter_new=rec.filter_new,
        materializer=Materializer(producer, lead_time_minutes=45),
        commit=rec.commit,
    )


async def test_tick_materializes_and_commits_when_locked() -> None:
    lock = _FakeLock(acquired=True)
    rec = _Recorder(views=[_view()])
    producer = _FakeProducer()
    engine = SchedulerEngine(lock_key=123, clock=lambda: FIXED_NOW)

    count = await engine.tick(_resources(lock, rec, producer))

    assert lock.entered and lock.released
    assert rec.fetched and rec.filtered and rec.committed
    assert count == producer.count > 0


async def test_tick_skipped_when_lock_not_acquired() -> None:
    lock = _FakeLock(acquired=False)
    rec = _Recorder(views=[_view()])
    producer = _FakeProducer()
    engine = SchedulerEngine(lock_key=123, clock=lambda: FIXED_NOW)

    count = await engine.tick(_resources(lock, rec, producer))

    assert lock.entered and not lock.released
    assert not rec.fetched and not rec.committed  # no scan, no materialize, no commit
    assert count == 0
    assert producer.count == 0


async def test_tick_with_no_schedules_commits_zero() -> None:
    lock = _FakeLock(acquired=True)
    rec = _Recorder(views=[])
    producer = _FakeProducer()
    engine = SchedulerEngine(lock_key=123, clock=lambda: FIXED_NOW)

    count = await engine.tick(_resources(lock, rec, producer))

    assert count == 0
    assert rec.committed  # still commits an empty tick
    assert producer.count == 0


async def test_tick_materializes_nothing_when_all_slots_already_exist() -> None:
    # Idempotency: filter_new drops every slot (already materialized) -> producer untouched.
    lock = _FakeLock(acquired=True)
    rec = _Recorder(views=[_view()], drop_all=True)
    producer = _FakeProducer()
    engine = SchedulerEngine(lock_key=123, clock=lambda: FIXED_NOW)

    count = await engine.tick(_resources(lock, rec, producer))

    assert rec.fetched and rec.filtered and rec.committed
    assert count == 0
    assert producer.count == 0
