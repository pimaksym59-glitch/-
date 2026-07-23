"""Integration tests for the Redis layer — require a live Redis (§R2.8/§R7.6).

NOT executed without ``RUN_INTEGRATION=1`` and a ``REDIS_URL``; in environments without Redis these
are **Runtime Verification Pending** and are not counted as verified.
"""

from __future__ import annotations

import os
import time

import pytest
from redis.asyncio import Redis

from app.core.redis.cache import Cache
from app.core.redis.rate_limiter import RateLimiter

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_INTEGRATION") != "1",
        reason="requires a live Redis (set RUN_INTEGRATION=1 and REDIS_URL)",
    ),
]


async def test_cache_roundtrip() -> None:
    async with Redis.from_url(os.environ["REDIS_URL"]) as client:
        cache = Cache(client)
        key = "tai:test:cache:roundtrip"
        await cache.set(key, {"a": 1}, ttl=10)
        assert await cache.get(key) == {"a": 1}
        assert await cache.exists(key) is True
        await cache.delete(key)
        assert await cache.get(key) is None


async def test_rate_limiter_blocks_over_burst() -> None:
    async with Redis.from_url(os.environ["REDIS_URL"]) as client:
        limiter = RateLimiter(client)
        now = time.time()
        key = "tai:test:ratelimit:burst"
        await client.delete(key)
        first = await limiter.try_acquire(key, rate=0.0, burst=1, now=now)
        second = await limiter.try_acquire(key, rate=0.0, burst=1, now=now)
        assert first is True
        assert second is False
