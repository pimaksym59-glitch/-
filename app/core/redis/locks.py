"""Distributed lock (infrastructure). ``SET NX PX`` + random token + Lua safe-release.

This is a Redis coordination primitive for the worker fleet. It is **not** a replacement for the
PostgreSQL advisory lock used by the scheduler for slot materialization (§R8.10) — different
mechanism, different purpose. No business logic here.
"""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from redis.asyncio import Redis

from app.core.redis import ttl as ttl_constants

# Release only if the stored token matches ours (prevents releasing someone else's lock).
_RELEASE_LUA = """
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
else
  return 0
end
"""


class DistributedLock:
    def __init__(self, client: Redis) -> None:
        self._client = client
        self._release = client.register_script(_RELEASE_LUA)

    async def acquire(self, key: str, *, ttl: int = ttl_constants.LOCK_DEFAULT) -> str | None:
        """Try to acquire ``key``. Return the ownership token, or None if already held."""
        token = uuid.uuid4().hex
        acquired = await self._client.set(key, token, nx=True, ex=ttl)
        return token if acquired else None

    async def release(self, key: str, token: str) -> bool:
        """Release ``key`` only if we still own it (token match)."""
        released = await self._release(keys=[key], args=[token])
        return bool(released)

    @asynccontextmanager
    async def hold(self, key: str, *, ttl: int = ttl_constants.LOCK_DEFAULT) -> AsyncIterator[bool]:
        """Context manager yielding whether the lock was acquired; auto-releases on exit."""
        token = await self.acquire(key, ttl=ttl)
        try:
            yield token is not None
        finally:
            if token is not None:
                await self.release(key, token)
