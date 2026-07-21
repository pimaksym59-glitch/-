"""Worker loop: claim a task, run its handler, record the outcome."""

from __future__ import annotations

import asyncio

import structlog
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.config import Settings

from . import queue
from .registry import TaskContext, get_handler

log = structlog.get_logger(__name__)


class Worker:
    def __init__(
        self,
        sessionmaker: async_sessionmaker,
        settings: Settings,
        *,
        poll_interval: float = 1.0,
    ) -> None:
        self._sessionmaker = sessionmaker
        self._settings = settings
        self._poll_interval = poll_interval

    async def run(self, stop: asyncio.Event) -> None:
        log.info("worker_started", poll_interval=self._poll_interval)
        while not stop.is_set():
            processed = await self._process_one()
            if not processed:
                await self._sleep(stop)
        log.info("worker_stopped")

    async def _process_one(self) -> bool:
        async with self._sessionmaker() as session:
            await queue.cancel_broken_dependents(session)

        async with self._sessionmaker() as session:
            task = await queue.claim_next(session)
            if task is None:
                return False

            handler = get_handler(task.type)
            if handler is None:
                await queue.mark_failed_or_retry(session, task, "no handler registered")
                log.warning("no_handler", task_id=task.id, task_type=task.type.value)
                return True

            ctx = TaskContext(self._sessionmaker, self._settings)
            try:
                result = await handler(task, ctx)
                await queue.mark_succeeded(session, task, result)
                log.info("task_succeeded", task_id=task.id, task_type=task.type.value)
            except Exception as exc:  # noqa: BLE001 - any handler error is a task failure
                status = await queue.mark_failed_or_retry(session, task, repr(exc))
                log.warning(
                    "task_failed",
                    task_id=task.id,
                    task_type=task.type.value,
                    status=status.value,
                    attempts=task.attempts,
                    error=str(exc),
                )
            return True

    async def _sleep(self, stop: asyncio.Event) -> None:
        try:
            await asyncio.wait_for(stop.wait(), timeout=self._poll_interval)
        except TimeoutError:
            pass
