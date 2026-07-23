"""RedisManager tests: lazy, singleton, config-only readiness. Offline (no connection)."""

from __future__ import annotations

import pytest
from redis.asyncio import Redis

from app.core.redis import manager as manager_module
from app.core.redis.manager import RedisManager


def test_manager_is_lazy_and_configured() -> None:
    manager = RedisManager("redis://localhost:6379/0")
    assert manager.is_configured is True
    client = manager.client()  # created without connecting
    assert isinstance(client, Redis)
    assert manager.client() is client  # shared singleton client


def test_get_redis_manager_requires_url(monkeypatch: pytest.MonkeyPatch) -> None:
    class _StubSettings:
        redis_url: str | None = None

    monkeypatch.setattr(manager_module, "get_settings", lambda: _StubSettings())
    manager_module.get_redis_manager.cache_clear()
    try:
        with pytest.raises(RuntimeError):
            manager_module.get_redis_manager()
    finally:
        manager_module.get_redis_manager.cache_clear()
