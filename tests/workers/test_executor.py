"""Executor decision-flow tests on fakes (offline, no DB/Redis) — §R8 all branches."""

from __future__ import annotations

import datetime
import uuid
from typing import Any

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from uuid6 import uuid7

from app.core.config import Settings
from app.core.redis.manager import RedisManager
from app.models.enums import TaskStatus, TaskType
from app.models.queue import Task
from app.workers.errors import PermanentError, TransientError
from app.workers.executor import Executor
from app.workers.handler import HandlerContext, TaskHandler
from app.workers.registry import TaskRegistry


def _ctx() -> HandlerContext:
    engine = create_async_engine("postgresql+asyncpg://u:p@localhost:5432/db")
    client: Redis = RedisManager("redis://localhost:6379/0").client()
    session = AsyncSession(engine)
    return HandlerContext(session=session, redis=client, settings=Settings())


def _task(*, task_type: TaskType = TaskType.generate_text, attempts: int = 0) -> Task:
    return Task(
        id=uuid7(),
        type=task_type,
        status=TaskStatus.pending,
        attempts=attempts,
        payload={},
        channel_id=None,
        run_at=datetime.datetime.now(datetime.UTC),
    )


class _Ok:
    async def handle(self, task: Task, ctx: HandlerContext) -> None:
        return None


class _Transient:
    async def handle(self, task: Task, ctx: HandlerContext) -> None:
        raise TransientError("boom")


class _Permanent:
    async def handle(self, task: Task, ctx: HandlerContext) -> None:
        raise PermanentError("nope")


class _FakeProducer:
    def __init__(self) -> None:
        self.enqueued: list[TaskType] = []

    async def enqueue(
        self,
        *,
        task_type: TaskType,
        channel_id: uuid.UUID | None,
        payload: dict[str, Any],
        run_at: datetime.datetime,
        dedup_key: str | None = None,
    ) -> None:
        self.enqueued.append(task_type)


class _RecordingHooks:
    def __init__(self) -> None:
        self.calls: list[str] = []

    async def before_execute(self, task: Task) -> None:
        self.calls.append("before")

    async def after_execute(self, task: Task) -> None:
        self.calls.append("after")

    async def on_success(self, task: Task) -> None:
        self.calls.append("success")

    async def on_failure(self, task: Task, error: BaseException) -> None:
        self.calls.append("failure")

    async def on_retry(self, task: Task, delay: float) -> None:
        self.calls.append("retry")

    async def on_cancel(self, task: Task) -> None:
        self.calls.append("cancel")


def _registry(task_type: TaskType, handler: TaskHandler) -> TaskRegistry:
    registry = TaskRegistry()
    registry.register(task_type, handler)
    return registry


async def test_success_chains_next_stage() -> None:
    executor = Executor(_registry(TaskType.generate_text, _Ok()))
    task = _task(task_type=TaskType.generate_text)
    producer = _FakeProducer()
    await executor.execute(task, _ctx(), producer)
    assert task.status is TaskStatus.succeeded
    assert producer.enqueued == [TaskType.validate]


async def test_terminal_stage_has_no_chain() -> None:
    executor = Executor(_registry(TaskType.collect_metrics, _Ok()))
    task = _task(task_type=TaskType.collect_metrics)
    producer = _FakeProducer()
    await executor.execute(task, _ctx(), producer)
    assert task.status is TaskStatus.succeeded
    assert producer.enqueued == []


async def test_transient_error_defers_with_backoff() -> None:
    executor = Executor(_registry(TaskType.generate_text, _Transient()), max_retries=5)
    task = _task(attempts=0)
    before = datetime.datetime.now(datetime.UTC)
    await executor.execute(task, _ctx(), _FakeProducer())
    assert task.status is TaskStatus.deferred
    assert task.attempts == 1
    assert task.last_error is not None
    assert task.run_at > before


async def test_transient_exhausted_goes_dead() -> None:
    executor = Executor(_registry(TaskType.generate_text, _Transient()), max_retries=3)
    task = _task(attempts=2)
    await executor.execute(task, _ctx(), _FakeProducer())
    assert task.status is TaskStatus.dead
    assert task.attempts == 3


async def test_permanent_error_needs_review() -> None:
    executor = Executor(_registry(TaskType.generate_text, _Permanent()))
    task = _task()
    await executor.execute(task, _ctx(), _FakeProducer())
    assert task.status is TaskStatus.needs_review


async def test_missing_handler_needs_review_not_crash() -> None:
    executor = Executor(TaskRegistry())  # empty registry
    task = _task()
    await executor.execute(task, _ctx(), _FakeProducer())  # must not raise
    assert task.status is TaskStatus.needs_review


async def test_cancelled_task_is_skipped() -> None:
    executor = Executor(TaskRegistry())
    task = _task()
    task.status = TaskStatus.cancelled
    producer = _FakeProducer()
    await executor.execute(task, _ctx(), producer)
    assert task.status is TaskStatus.cancelled
    assert producer.enqueued == []


async def test_hooks_called_on_success_and_retry() -> None:
    ok_hooks = _RecordingHooks()
    executor = Executor(_registry(TaskType.collect_metrics, _Ok()), hooks=ok_hooks)
    await executor.execute(_task(task_type=TaskType.collect_metrics), _ctx(), _FakeProducer())
    assert ok_hooks.calls == ["before", "success", "after"]

    retry_hooks = _RecordingHooks()
    executor2 = Executor(_registry(TaskType.generate_text, _Transient()), hooks=retry_hooks)
    await executor2.execute(_task(), _ctx(), _FakeProducer())
    assert "retry" in retry_hooks.calls
