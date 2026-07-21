"""Redis-based advisory lock so only one scheduler instance ticks at a time."""

from __future__ import annotations

import uuid
from contextlib import asynccontextmanager

import redis.asyncio as redis

# Release only if we still own the lock (atomic compare-and-delete).
_RELEASE_LUA = """
if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('del', KEYS[1])
else
    return 0
end
"""


@asynccontextmanager
async def try_lock(client: redis.Redis, key: str, ttl_seconds: int):
    """Acquire `key` if free; yields True if acquired, False otherwise.

    The lock auto-expires after `ttl_seconds` so a crashed holder can't wedge it.
    """
    token = uuid.uuid4().hex
    acquired = await client.set(key, token, nx=True, ex=ttl_seconds)
    try:
        yield bool(acquired)
    finally:
        if acquired:
            await client.eval(_RELEASE_LUA, 1, key, token)
