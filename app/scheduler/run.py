"""Scheduler entrypoint: ``python -m app.scheduler.run``. Wires DB/settings into engine + runner.

Running requires a live PostgreSQL (advisory lock + ``schedules``/``tasks`` I/O) — Runtime
Verification Pending. Importing this module connects to nothing.
"""

from __future__ import annotations

import asyncio
import contextlib
import signal

from app.core.config import get_settings
from app.db.session import get_sessionmaker
from app.repositories.schedule_repository import ScheduleRepository
from app.repositories.task_repository import TaskRepository
from app.scheduler.advisory import AdvisoryLock, lock_key
from app.scheduler.materializer import Materializer, slot_dedup_key
from app.scheduler.runner import SchedulerRunner
from app.scheduler.scanner import DueSlot, ScheduleView, view_from_row
from app.scheduler.scheduler import SchedulerEngine, TickResources
from app.workers.producer import SqlTaskProducer

_TICK_INTERVAL = 60.0
_LOCK_NAME = "scheduler:tick"


async def main() -> None:
    settings = get_settings()
    sessionmaker = get_sessionmaker()
    engine = SchedulerEngine(lock_key=lock_key(_LOCK_NAME))

    async def tick_once() -> int:
        async with sessionmaker() as session:
            schedules = ScheduleRepository(session)
            tasks = TaskRepository(session)
            materializer = Materializer(
                SqlTaskProducer(session), lead_time_minutes=settings.lead_time_minutes
            )

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
            return await engine.tick(resources)

    runner = SchedulerRunner(tick_once, interval=_TICK_INTERVAL)
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        # signal handlers are unavailable on some platforms (e.g. Windows)
        with contextlib.suppress(NotImplementedError):
            loop.add_signal_handler(sig, runner.request_stop)
    await runner.run()


if __name__ == "__main__":
    asyncio.run(main())
