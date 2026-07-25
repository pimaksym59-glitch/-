"""Materializer tests (§R8.1, §R8.5, §R8.13) — offline on a fake producer. Verifies dedup_key,
payload, run_at (lead-time for pipeline heads, exact slot for periodic), and holiday tagging.
"""

from __future__ import annotations

import datetime
import uuid
from dataclasses import dataclass, field
from typing import Any

from uuid6 import uuid7

from app.models.enums import TaskType
from app.scheduler.holidays import HolidayCalendar
from app.scheduler.materializer import Materializer
from app.scheduler.scanner import DueSlot

UTC = datetime.UTC


@dataclass
class _Enqueued:
    task_type: TaskType
    channel_id: uuid.UUID | None
    payload: dict[str, Any]
    run_at: datetime.datetime
    dedup_key: str | None


@dataclass
class _FakeProducer:
    calls: list[_Enqueued] = field(default_factory=list)

    async def enqueue(
        self,
        *,
        task_type: TaskType,
        channel_id: uuid.UUID | None,
        payload: dict[str, Any],
        run_at: datetime.datetime,
        dedup_key: str | None = None,
    ) -> None:
        self.calls.append(_Enqueued(task_type, channel_id, payload, run_at, dedup_key))


def _slot(
    *,
    task_type: TaskType = TaskType.generate_text,
    slot_utc: datetime.datetime | None = None,
    channel_id: uuid.UUID | None = None,
    schedule_id: uuid.UUID | None = None,
) -> DueSlot:
    return DueSlot(
        channel_id=channel_id or uuid7(),
        schedule_id=schedule_id or uuid7(),
        task_type=task_type,
        slot_utc=slot_utc or datetime.datetime(2026, 7, 24, 10, 0, tzinfo=UTC),
        slot_name="noon",
        timezone="Europe/Berlin",
    )


async def test_head_task_gets_lead_time_run_at() -> None:
    producer = _FakeProducer()
    slot = _slot(task_type=TaskType.generate_text)
    await Materializer(producer, lead_time_minutes=45).materialize([slot])
    (call,) = producer.calls
    assert call.task_type is TaskType.generate_text
    assert call.run_at == slot.slot_utc - datetime.timedelta(minutes=45)
    assert call.payload["target_slot"] == slot.slot_utc.isoformat()


async def test_periodic_task_runs_at_exact_slot() -> None:
    producer = _FakeProducer()
    slot = _slot(task_type=TaskType.backup)  # not a pipeline head
    await Materializer(producer, lead_time_minutes=45).materialize([slot])
    (call,) = producer.calls
    assert call.run_at == slot.slot_utc  # no lead-time for standalone/periodic


async def test_dedup_key_is_slot_scoped() -> None:
    producer = _FakeProducer()
    slot = _slot()
    await Materializer(producer, lead_time_minutes=30).materialize([slot])
    (call,) = producer.calls
    expected = f"slot:{slot.channel_id}:{slot.schedule_id}:{slot.slot_utc.isoformat()}"
    assert call.dedup_key == expected


async def test_payload_carries_schedule_metadata() -> None:
    producer = _FakeProducer()
    slot = _slot()
    await Materializer(producer, lead_time_minutes=30).materialize([slot])
    payload = producer.calls[0].payload
    assert payload["schedule_id"] == str(slot.schedule_id)
    assert payload["slot_name"] == "noon"
    assert "holiday" not in payload  # no calendar -> no tag


async def test_holiday_tag_added_when_calendar_matches() -> None:
    producer = _FakeProducer()
    cid = uuid7()
    # 2026-07-24 10:00 UTC == 12:00 Berlin -> local date 2026-07-24.
    slot = _slot(channel_id=cid, slot_utc=datetime.datetime(2026, 7, 24, 10, 0, tzinfo=UTC))
    calendars: dict[uuid.UUID, HolidayCalendar] = {
        cid: HolidayCalendar({datetime.date(2026, 7, 24): "summer_special"})
    }
    await Materializer(producer, lead_time_minutes=30, calendars=calendars).materialize([slot])
    payload = producer.calls[0].payload
    assert payload["holiday"] is True
    assert payload["plan"] == "summer_special"


async def test_materialize_returns_count() -> None:
    producer = _FakeProducer()
    count = await Materializer(producer, lead_time_minutes=30).materialize(
        [_slot(), _slot(), _slot()]
    )
    assert count == 3
    assert len(producer.calls) == 3
