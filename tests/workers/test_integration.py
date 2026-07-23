"""Integration tests for the queue — require a live PostgreSQL + Redis (§R8).

NOT executed without ``RUN_INTEGRATION=1`` and ``DATABASE_URL``/``REDIS_URL``; in environments
without them these are **Runtime Verification Pending** and are not counted as verified.
"""

from __future__ import annotations

import datetime
import os

import pytest
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models
from app.core.config import Settings, get_settings
from app.core.redis.manager import get_redis_manager
from app.models.enums import TaskStatus, TaskType
from app.models.queue import Task
from app.workers.dispatcher import Dispatcher
from app.workers.executor import Executor
from app.workers.handler import HandlerContext
from app.workers.producer import SqlTaskProducer
from app.workers.registry import TaskRegistry

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_INTEGRATION") != "1",
        reason="requires a live PostgreSQL + Redis (RUN_INTEGRATION=1, DATABASE_URL, REDIS_URL)",
    ),
]


class _Ok:
    async def handle(self, task: Task, ctx: HandlerContext) -> None:
        return None


def _redis() -> Redis:
    return get_redis_manager().client()


def _settings() -> Settings:
    return get_settings()


async def test_dispatch_execute_roundtrip() -> None:
    engine = create_async_engine(os.environ["DATABASE_URL"])
    try:
        async with engine.begin() as conn:
            await conn.run_sync(app.models.Base.metadata.create_all)
        sessionmaker = async_sessionmaker(engine, expire_on_commit=False)
        registry = TaskRegistry()
        registry.register(TaskType.collect_metrics, _Ok())
        executor = Executor(registry)
        now = datetime.datetime.now(datetime.UTC)
        async with sessionmaker() as session:
            session.add(
                Task(
                    type=TaskType.collect_metrics,
                    status=TaskStatus.pending,
                    payload={},
                    run_at=now,
                )
            )
            await session.commit()
            claimed = await Dispatcher(session).claim(now=now, limit=10)
            ctx = HandlerContext(session=session, redis=_redis(), settings=_settings())
            producer = SqlTaskProducer(session)
            for task in claimed:
                await executor.execute(task, ctx, producer)
            await session.commit()
            assert claimed
            assert claimed[0].status is TaskStatus.succeeded
    finally:
        await engine.dispose()
