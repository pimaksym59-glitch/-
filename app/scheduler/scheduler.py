"""Scheduler engine (§R8.1, §R8.10) — a single tick: advisory-lock, scan, materialize, commit.

The tick logic holds no I/O of its own; its per-tick collaborators (advisory lock, view fetch,
materializer, commit) are injected via :class:`TickResources` so the whole engine is unit-testable
offline with fakes. Multi-instance safety comes from the advisory lock (skip if another instance
holds it) plus the task ``dedup_key`` as the authoritative backstop. Logger/metrics reuse the
Stage-8 interfaces (no-op by default) — one-directional reuse of :mod:`app.workers`.
"""

from __future__ import annotations

import datetime
from collections.abc import Awaitable, Callable
from contextlib import AbstractAsyncContextManager
from dataclasses import dataclass
from typing import Protocol

from app.scheduler.materializer import Materializer
from app.scheduler.missed import DEFAULT_GRACE
from app.scheduler.scanner import DueSlot, ScheduleView, due_slots
from app.workers.log import EventLogger, StdlibEventLogger
from app.workers.metrics import Metrics, NoOpMetrics


class SlotLock(Protocol):
    """Structural view of :class:`app.scheduler.advisory.AdvisoryLock` used by the engine."""

    def hold(self, key: int) -> AbstractAsyncContextManager[bool]: ...


@dataclass(frozen=True, slots=True)
class TickResources:
    """Per-tick collaborators bound to one session (wired by the runner)."""

    advisory: SlotLock
    fetch_views: Callable[[], Awaitable[list[ScheduleView]]]
    filter_new: Callable[[list[DueSlot]], Awaitable[list[DueSlot]]]
    materializer: Materializer
    commit: Callable[[], Awaitable[None]]


def _utcnow() -> datetime.datetime:
    return datetime.datetime.now(datetime.UTC)


class SchedulerEngine:
    def __init__(
        self,
        *,
        lock_key: int,
        grace: datetime.timedelta = DEFAULT_GRACE,
        clock: Callable[[], datetime.datetime] = _utcnow,
        logger: EventLogger | None = None,
        metrics: Metrics | None = None,
    ) -> None:
        self._lock_key = lock_key
        self._grace = grace
        self._clock = clock
        self._logger: EventLogger = logger if logger is not None else StdlibEventLogger()
        self._metrics: Metrics = metrics if metrics is not None else NoOpMetrics()

    async def tick(self, resources: TickResources) -> int:
        """Run one scan/materialize cycle. Returns the number of slots materialized (0 if another
        instance holds the lock, i.e. this tick was skipped)."""
        async with resources.advisory.hold(self._lock_key) as acquired:
            if not acquired:
                self._logger.event("scheduler.tick.skipped_locked")
                self._metrics.incr("scheduler.tick.skipped")
                return 0
            now = self._clock()
            views = await resources.fetch_views()
            slots = due_slots(views, now=now, grace=self._grace)
            fresh = await resources.filter_new(slots)  # drop already-materialized slots
            count = await resources.materializer.materialize(fresh)
            await resources.commit()
            self._metrics.incr("scheduler.tick")
            self._logger.event(
                "scheduler.tick", schedules=len(views), due=len(slots), materialized=count
            )
            return count
