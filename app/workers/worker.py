"""Worker lifecycle (§R8, §R12.4): startup, poll loop, graceful shutdown, drain, resource release.

The worker is decoupled from I/O: it drives an injected ``process_batch`` coroutine (which claims +
executes one batch and returns how many tasks it handled). ``request_stop`` triggers a graceful
shutdown — the current batch finishes (drain) before the loop exits; idle polling wakes early.
"""

from __future__ import annotations

import asyncio
import contextlib
from collections.abc import Awaitable, Callable


class Worker:
    def __init__(
        self,
        process_batch: Callable[[], Awaitable[int]],
        *,
        poll_interval: float = 1.0,
    ) -> None:
        self._process_batch = process_batch
        self._poll_interval = poll_interval
        self._stop = asyncio.Event()

    def request_stop(self) -> None:
        """Signal graceful shutdown; the current batch drains before the loop exits."""
        self._stop.set()

    async def run(self) -> None:
        while not self._stop.is_set():
            processed = await self._process_batch()  # completes (drains) before next stop check
            if processed == 0 and not self._stop.is_set():
                await self._idle_wait(self._poll_interval)

    async def _idle_wait(self, seconds: float) -> None:
        with contextlib.suppress(TimeoutError):
            await asyncio.wait_for(self._stop.wait(), timeout=seconds)
