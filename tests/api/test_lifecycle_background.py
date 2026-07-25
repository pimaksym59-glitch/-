"""Lifespan + background-task seam tests (owner req 2/9). Offline: lifespan opens no connections and
shutdown is a no-op when nothing was created; the background helper runs trivial side-effects. Real
teardown against live connections is RV-9.
"""

from __future__ import annotations

from fastapi import BackgroundTasks

from app.api.app import create_app
from app.api.background import run_after_response
from app.api.lifespan import lifespan
from app.core.config import Settings
from app.core.redis.manager import get_redis_manager
from app.db.session import get_engine
from app.services.lifecycle import lifespan_resources, shutdown_resources


async def test_shutdown_is_noop_when_resources_never_created() -> None:
    get_engine.cache_clear()
    get_redis_manager.cache_clear()
    await shutdown_resources()  # must neither raise nor create a connection
    assert get_engine.cache_info().currsize == 0
    assert get_redis_manager.cache_info().currsize == 0


async def test_lifespan_resources_yields_without_connecting() -> None:
    get_engine.cache_clear()
    get_redis_manager.cache_clear()
    async with lifespan_resources():
        pass
    assert get_engine.cache_info().currsize == 0
    assert get_redis_manager.cache_info().currsize == 0


async def test_app_lifespan_context_runs() -> None:
    get_engine.cache_clear()
    get_redis_manager.cache_clear()
    app = create_app(Settings())
    async with lifespan(app):
        pass  # startup + shutdown must complete without connecting
    assert get_engine.cache_info().currsize == 0


async def test_run_after_response_executes_side_effect() -> None:
    calls: list[int] = []

    async def side_effect() -> None:
        calls.append(1)

    background = BackgroundTasks()
    run_after_response(background, side_effect)
    await background()  # simulate FastAPI running background tasks after the response
    assert calls == [1]
