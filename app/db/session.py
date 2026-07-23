"""Async engine + session factory (§R4.1). Lazy: nothing connects on import.

Transaction ownership (§R4.11): repositories receive a session and DO NOT commit; the caller
(a service / unit-of-work, later stages) manages the transaction via ``async with session.begin()``.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from functools import lru_cache

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings


@lru_cache(maxsize=1)
def get_engine() -> AsyncEngine:
    """Create the async engine from settings (§R4.1). Requires ``database_url`` (asyncpg URL)."""
    database_url = get_settings().database_url
    if database_url is None:
        raise RuntimeError("database_url is not configured (set DATABASE_URL, §R12.2)")
    return create_async_engine(database_url, pool_pre_ping=True, future=True)


@lru_cache(maxsize=1)
def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    """Cached async session factory bound to the engine."""
    return async_sessionmaker(get_engine(), expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    """Yield an ``AsyncSession`` (FastAPI dependency, later stages). Caller owns the transaction."""
    async with get_sessionmaker()() as session:
        yield session
