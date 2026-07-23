"""Idempotency fast-path (§R7.4). Redis is only a fast, short-window guard —
the **source of truth stays PostgreSQL** (``tasks.dedup_key``). A Redis miss must never be treated
as authoritative; the DB unique constraint is the final arbiter.
"""

from __future__ import annotations

from redis.asyncio import Redis

from app.core.redis import ttl as ttl_constants


class IdempotencyStore:
    def __init__(self, client: Redis) -> None:
        self._client = client

    async def try_acquire(self, key: str, *, ttl: int = ttl_constants.IDEMPOTENCY) -> bool:
        """Claim ``key`` via ``SET NX EX``. True if newly claimed, False if already present."""
        acquired = await self._client.set(key, b"1", nx=True, ex=ttl)
        return bool(acquired)
