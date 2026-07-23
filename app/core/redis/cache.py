"""Typed Redis cache primitive (§R2 CACHE / §R9). Only get/set/delete/exists/invalidate.

No domain logic — *what* to cache (embeddings, prompts, settings, history) is wired by callers on
their stages. Values are JSON-serialized; keys must come from :mod:`app.core.redis.keys`.
"""

from __future__ import annotations

import json
from typing import Any

from redis.asyncio import Redis

from app.core.redis import ttl as ttl_constants


class Cache:
    def __init__(self, client: Redis) -> None:
        self._client = client

    async def get(self, key: str) -> Any | None:
        raw: bytes | str | None = await self._client.get(key)
        if raw is None:
            return None
        return json.loads(raw)

    async def set(self, key: str, value: Any, *, ttl: int = ttl_constants.CACHE_DEFAULT) -> None:
        await self._client.set(key, json.dumps(value).encode(), ex=ttl)

    async def delete(self, key: str) -> None:
        await self._client.delete(key)

    async def exists(self, key: str) -> bool:
        return bool(await self._client.exists(key))

    async def invalidate(self, *keys: str) -> None:
        if keys:
            await self._client.delete(*keys)
