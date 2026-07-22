"""Runner: starts the worker loop and the scheduler loop until signalled.

Run as a separate process:  python -m scheduler.run
"""

from __future__ import annotations

import asyncio
import signal

import structlog

from app.config import get_settings
from app.db import get_sessionmaker
from app.logging import configure_logging
from app.redis_client import get_client

from .locks import try_lock
from .scheduler import tick
from .stub_handlers import register_stubs
from .worker import Worker

log = structlog.get_logger(__name__)

SCHEDULER_LOCK_KEY = "scheduler:tick:lock"
SCHEDULER_INTERVAL = 5.0


async def _scheduler_loop(stop: asyncio.Event) -> None:
    settings = get_settings()  # noqa: F841 - reserved for future use
    sessionmaker = get_sessionmaker()
    redis = get_client()
    log.info("scheduler_started", interval=SCHEDULER_INTERVAL)
    while not stop.is_set():
        # Only one instance ticks per interval; TTL guards against a crash.
        async with try_lock(redis, SCHEDULER_LOCK_KEY, ttl_seconds=int(SCHEDULER_INTERVAL)) as got:
            if got:
                async with sessionmaker() as session:
                    await tick(session)
        try:
            await asyncio.wait_for(stop.wait(), timeout=SCHEDULER_INTERVAL)
        except TimeoutError:
            pass
    log.info("scheduler_stopped")


def _install_signal_handlers(stop: asyncio.Event) -> None:
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, stop.set)
        except NotImplementedError:
            # Windows: add_signal_handler for SIGTERM is unsupported; SIGINT still works.
            signal.signal(sig, lambda *_: stop.set())


async def main() -> None:
    configure_logging()
    import ai_engine
    import analytics
    import image_engine
    import telegram_engine
    import validation

    ai_engine.register()  # generate_text
    image_engine.register()  # generate_image
    validation.register()  # validate
    telegram_engine.register()  # publish
    analytics.register()  # collect_metrics
    register_stubs()  # safety net: covers any TaskType no engine claimed
    settings = get_settings()
    stop = asyncio.Event()
    _install_signal_handlers(stop)

    worker = Worker(get_sessionmaker(), settings)
    await asyncio.gather(worker.run(stop), _scheduler_loop(stop))


if __name__ == "__main__":
    asyncio.run(main())
