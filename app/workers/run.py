"""Worker entrypoint: ``python -m app.workers.run``. Wires DB/Redis/registry into a Worker.

Running requires a live PostgreSQL and Redis — that is Runtime Verification Pending. Domain handlers
register on the shared ``registry`` from their stages (12-17) — the extension point.
"""

from __future__ import annotations

import asyncio
import contextlib
import datetime
import signal
from collections.abc import Awaitable, Callable

from app.core.config import get_settings
from app.core.redis.manager import get_redis_manager
from app.db.session import get_sessionmaker
from app.workers.dispatcher import Dispatcher
from app.workers.executor import Executor
from app.workers.handler import HandlerContext
from app.workers.producer import SqlTaskProducer
from app.workers.registry import TaskRegistry
from app.workers.worker import Worker

_BATCH_SIZE = 10

registry = TaskRegistry()  # domain handlers register here on their stages (extension point)


def _build_process_batch() -> Callable[[], Awaitable[int]]:
    settings = get_settings()
    manager = get_redis_manager()
    sessionmaker = get_sessionmaker()
    executor = Executor(registry, max_retries=settings.max_retries)

    async def process_batch() -> int:
        now = datetime.datetime.now(datetime.UTC)
        async with sessionmaker() as session:
            dispatcher = Dispatcher(session)
            tasks = await dispatcher.claim(now=now, limit=_BATCH_SIZE)
            producer = SqlTaskProducer(session)
            ctx = HandlerContext(session=session, redis=manager.client(), settings=settings)
            for task in tasks:
                await executor.execute(task, ctx, producer)
            await session.commit()
            return len(tasks)

    return process_batch


async def main() -> None:
    manager = get_redis_manager()
    worker = Worker(_build_process_batch())
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        # signal handlers are unavailable on some platforms (e.g. Windows)
        with contextlib.suppress(NotImplementedError):
            loop.add_signal_handler(sig, worker.request_stop)
    try:
        await worker.run()
    finally:
        await manager.aclose()


if __name__ == "__main__":
    asyncio.run(main())
