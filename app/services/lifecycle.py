"""Infrastructure lifecycle (§R12.4) — startup/shutdown of shared resources, in the service layer so
the API lifespan need not import ``app.db`` (§R3.1). Nothing connects here: engine/Redis are created
lazily on first use, and shutdown disposes them **only if** created — so importing or booting the
app never opens a connection. Real teardown of live connections is RV-9.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from app.core.redis.manager import get_redis_manager
from app.db.session import get_engine


@asynccontextmanager
async def lifespan_resources() -> AsyncIterator[None]:
    """Manage infrastructure resources for the app's lifetime. Startup is lazy (no connections)."""
    try:
        yield
    finally:
        await shutdown_resources()


async def shutdown_resources() -> None:
    """Dispose the DB engine and Redis pool if (and only if) they were created."""
    if get_engine.cache_info().currsize:
        await get_engine().dispose()
    if get_redis_manager.cache_info().currsize:
        await get_redis_manager().aclose()
