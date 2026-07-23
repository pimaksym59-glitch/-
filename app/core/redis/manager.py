"""RedisManager: lazy singleton async client over a connection pool (§R2.8/§R7.6).

Nothing connects on import or construction; the pool opens a connection only on the first command.
Provides a config-only readiness check (``is_configured``) that does **not** connect, an explicit
``ping`` health check that does, and ``aclose`` for graceful shutdown.
"""

from __future__ import annotations

import functools

from redis.asyncio import ConnectionPool, Redis

from app.core.config import get_settings

_MAX_CONNECTIONS = 50
_HEALTH_CHECK_INTERVAL = 30
_SOCKET_TIMEOUT = 5.0


class RedisManager:
    """Owns a lazily-created async Redis client and its connection pool."""

    def __init__(self, url: str) -> None:
        self._url = url
        self._pool: ConnectionPool | None = None
        self._client: Redis | None = None

    def client(self) -> Redis:
        """Return the shared client, creating the pool lazily (no network I/O here)."""
        if self._client is None:
            self._pool = ConnectionPool.from_url(
                self._url,
                max_connections=_MAX_CONNECTIONS,
                health_check_interval=_HEALTH_CHECK_INTERVAL,
                socket_timeout=_SOCKET_TIMEOUT,
                decode_responses=False,
            )
            self._client = Redis(connection_pool=self._pool)
        return self._client

    @property
    def is_configured(self) -> bool:
        """Config-only readiness — does NOT connect."""
        return bool(self._url)

    async def ping(self) -> bool:
        """Explicit health check (opens a connection). Never called at import time."""
        return bool(await self.client().ping())

    async def aclose(self) -> None:
        """Graceful shutdown: close client and pool."""
        if self._client is not None:
            await self._client.aclose()
            self._client = None
        if self._pool is not None:
            await self._pool.aclose()
            self._pool = None


@functools.lru_cache(maxsize=1)
def get_redis_manager() -> RedisManager:
    """Cached singleton RedisManager built from settings (§R12.2)."""
    url = get_settings().redis_url
    if url is None:
        raise RuntimeError("redis_url is not configured (set REDIS_URL, §R12.2)")
    return RedisManager(url)
