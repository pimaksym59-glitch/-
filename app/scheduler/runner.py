"""Scheduler runner (§R8.1, §R12.4): a fixed-cadence async loop around an injected ``tick``.

Decoupled from I/O like the worker: it drives a zero-arg ``tick`` coroutine (which runs one full
advisory-lock/scan/materialize cycle against a fresh session) and waits a fixed interval between
ticks. ``request_stop`` triggers graceful shutdown — the in-flight tick finishes (drain) before the
loop exits, and the idle wait wakes early. Recovery is implicit: the scheduler is stateless, so a
restart simply re-scans on the next tick; the missed-execution policy closes gaps and ``dedup_key``
prevents re-materializing slots already queued.
"""

from __future__ import annotations

import asyncio
import contextlib
from collections.abc import Awaitable, Callable


class SchedulerRunner:
    def __init__(
        self,
        tick: Callable[[], Awaitable[int]],
        *,
        interval: float = 60.0,
    ) -> None:
        self._tick = tick
        self._interval = interval
        self._stop = asyncio.Event()

    def request_stop(self) -> None:
        """Signal graceful shutdown; the in-flight tick drains before the loop exits."""
        self._stop.set()

    async def run(self) -> None:
        while not self._stop.is_set():
            await self._tick()  # completes (drains) before the next stop check
            if not self._stop.is_set():
                await self._idle_wait(self._interval)

    async def _idle_wait(self, seconds: float) -> None:
        with contextlib.suppress(TimeoutError):
            await asyncio.wait_for(self._stop.wait(), timeout=seconds)
