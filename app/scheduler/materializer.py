"""Materialization (§R8.1, §R8.5, §R8.13): turn :class:`DueSlot` values into queued tasks **only**
through the existing Stage-8 ``TaskProducer`` — the scheduler never inserts tasks directly and never
duplicates the queue engine (owner req 3/4).

Idempotency: each slot gets ``dedup_key = "slot:{channel}:{schedule}:{slot_iso}"`` (unique in
``tasks``), so re-scanning the same slot is a no-op at the DB level. LEAD_TIME (§R8.5): a pipeline
head starts at ``slot - lead``; the exact publish time is carried in ``payload.target_slot`` and
honored by the publish stage (Stage 16) — the Stage-8 chaining is untouched.
"""

from __future__ import annotations

import uuid
from collections.abc import Iterable, Mapping
from typing import Any

from app.scheduler.holidays import HolidayCalendar, select_plan
from app.scheduler.scanner import DueSlot
from app.scheduler.timing import apply_lead_time, resolve_tz
from app.workers.pipeline import next_stage
from app.workers.producer import TaskProducer


class Materializer:
    """Enqueues due slots via a :class:`TaskProducer`. Pure orchestration — no DB access itself."""

    def __init__(
        self,
        producer: TaskProducer,
        *,
        lead_time_minutes: int,
        calendars: Mapping[uuid.UUID, HolidayCalendar] | None = None,
    ) -> None:
        self._producer = producer
        self._lead_time_minutes = lead_time_minutes
        self._calendars = calendars or {}

    async def materialize(self, slots: Iterable[DueSlot]) -> int:
        """Enqueue every slot; returns the count handed to the producer."""
        count = 0
        for slot in slots:
            await self._enqueue(slot)
            count += 1
        return count

    async def _enqueue(self, slot: DueSlot) -> None:
        is_head = next_stage(slot.task_type) is not None  # content pipeline head vs. periodic task
        run_at = (
            apply_lead_time(slot.slot_utc, self._lead_time_minutes) if is_head else slot.slot_utc
        )
        await self._producer.enqueue(
            task_type=slot.task_type,
            channel_id=slot.channel_id,
            payload=self._payload(slot),
            run_at=run_at,
            dedup_key=slot_dedup_key(slot),
        )

    def _payload(self, slot: DueSlot) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "target_slot": slot.slot_utc.isoformat(),
            "schedule_id": str(slot.schedule_id),
            "slot_name": slot.slot_name,
        }
        calendar = self._calendars.get(slot.channel_id)
        if calendar is not None:
            local_date = slot.slot_utc.astimezone(resolve_tz(slot.timezone)).date()
            plan = select_plan(local_date, calendar)
            if plan is not None:
                payload["holiday"] = True
                payload["plan"] = plan  # tag only; content is chosen by the AI stage (§R8.13)
        return payload


def slot_dedup_key(slot: DueSlot) -> str:
    """Stable idempotency key: ``slot:{channel}:{schedule}:{slot_iso}`` (unique in ``tasks``).

    The scheduler pre-filters slots whose key already exists so a re-scan enqueues nothing; the
    UNIQUE index on ``tasks.dedup_key`` is the authoritative backstop against races.
    """
    return f"slot:{slot.channel_id}:{slot.schedule_id}:{slot.slot_utc.isoformat()}"
