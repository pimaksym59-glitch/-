"""Wiring tests for Redis primitives — construct without connecting; Lua present. Offline."""

from __future__ import annotations

from redis.asyncio import Redis

from app.core.redis.cache import Cache
from app.core.redis.idempotency import IdempotencyStore
from app.core.redis.locks import _RELEASE_LUA, DistributedLock
from app.core.redis.manager import RedisManager
from app.core.redis.pubsub import Publisher, Subscriber
from app.core.redis.rate_limiter import _TOKEN_BUCKET_LUA, RateLimiter


def _client() -> Redis:
    return RedisManager("redis://localhost:6379/0").client()


def test_primitives_construct_without_connecting() -> None:
    client = _client()
    assert isinstance(Cache(client), Cache)
    assert isinstance(IdempotencyStore(client), IdempotencyStore)
    assert isinstance(RateLimiter(client), RateLimiter)  # register_script, no I/O
    assert isinstance(DistributedLock(client), DistributedLock)
    assert isinstance(Publisher(client), Publisher)
    assert isinstance(Subscriber(client), Subscriber)


def test_lua_scripts_present() -> None:
    assert "redis.call" in _TOKEN_BUCKET_LUA
    assert "'DEL'" in _RELEASE_LUA  # safe-release deletes only on token match
