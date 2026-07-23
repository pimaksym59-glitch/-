"""Task Executor (§R8) — the single place execution logic, exception handling, status changes and
retry strategy live.

Design rules (owner req 3/4): all execution logic is here; a single ``except`` classifies every
failure; status changes go through the state machine (:mod:`app.workers.status`); the next stage is
looked up as data (:mod:`app.workers.pipeline`) — **no if/else on task type**. Status is applied to
the in-memory ``Task`` object (the caller commits); the next stage is enqueued via a TaskProducer.
"""

from __future__ import annotations

import datetime
from collections.abc import Callable

from app.models.enums import TaskStatus
from app.models.queue import Task
from app.workers import backoff, pipeline, retry, status
from app.workers.handler import HandlerContext
from app.workers.hooks import Hooks, NoOpHooks
from app.workers.log import EventLogger, StdlibEventLogger
from app.workers.metrics import Metrics, NoOpMetrics
from app.workers.producer import TaskProducer
from app.workers.registry import TaskRegistry


def _utcnow() -> datetime.datetime:
    return datetime.datetime.now(datetime.UTC)


class Executor:
    def __init__(
        self,
        registry: TaskRegistry,
        *,
        hooks: Hooks | None = None,
        logger: EventLogger | None = None,
        metrics: Metrics | None = None,
        max_retries: int = 5,
        clock: Callable[[], datetime.datetime] = _utcnow,
    ) -> None:
        self._registry = registry
        self._hooks: Hooks = hooks if hooks is not None else NoOpHooks()
        self._logger: EventLogger = logger if logger is not None else StdlibEventLogger()
        self._metrics: Metrics = metrics if metrics is not None else NoOpMetrics()
        self._max_retries = max_retries
        self._clock = clock

    async def execute(self, task: Task, ctx: HandlerContext, producer: TaskProducer) -> None:
        if task.status is TaskStatus.cancelled:
            await self._hooks.on_cancel(task)
            self._logger.event("task.cancelled", task_id=str(task.id))
            return

        self._set(task, TaskStatus.running)
        await self._hooks.before_execute(task)
        self._metrics.incr("task.started")
        started = self._clock()
        try:
            handler = self._registry.get(task.type)
            await handler.handle(task, ctx)
        except Exception as exc:  # single classification point (req 3); asyncio cancel propagates
            await self._on_failure(task, exc)
        else:
            await self._on_success(task, producer)
        finally:
            self._metrics.timing("task.duration", (self._clock() - started).total_seconds())
            await self._hooks.after_execute(task)

    async def _on_success(self, task: Task, producer: TaskProducer) -> None:
        self._set(task, TaskStatus.succeeded)
        self._metrics.incr("task.succeeded")
        self._logger.event("task.succeeded", task_id=str(task.id), type=task.type.value)
        await self._hooks.on_success(task)
        next_type = pipeline.next_stage(task.type)
        if next_type is not None:
            await producer.enqueue(
                task_type=next_type,
                channel_id=task.channel_id,
                payload=task.payload,
                run_at=self._clock(),
            )

    async def _on_failure(self, task: Task, exc: BaseException) -> None:
        task.last_error = str(exc)
        outcome = retry.decide(task.attempts, retry.classify(exc), max_retries=self._max_retries)
        if outcome is retry.RetryOutcome.needs_review:
            self._set(task, TaskStatus.needs_review)
            self._metrics.incr("task.needs_review")
            self._logger.event("task.needs_review", task_id=str(task.id), error=str(exc))
            await self._hooks.on_failure(task, exc)
            return

        self._set(task, TaskStatus.failed)
        task.attempts += 1
        if outcome is retry.RetryOutcome.dead:
            self._set(task, TaskStatus.dead)
            self._metrics.incr("task.dead")
            self._logger.event("task.dead", task_id=str(task.id), attempts=task.attempts)
            await self._hooks.on_failure(task, exc)
        else:
            delay = backoff.compute_delay(task.attempts)
            task.run_at = self._clock() + datetime.timedelta(seconds=delay)
            self._set(task, TaskStatus.deferred)
            self._metrics.incr("task.retry")
            self._logger.event(
                "task.retry", task_id=str(task.id), attempts=task.attempts, delay=delay
            )
            await self._hooks.on_retry(task, delay)

    def _set(self, task: Task, target: TaskStatus) -> None:
        status.assert_transition(task.status, target)
        task.status = target
