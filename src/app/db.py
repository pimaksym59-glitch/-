"""Async SQLAlchemy engine and session factory.

Stage 1 provides connection wiring and a `ping()` used by the health check.
ORM models and migrations are added in Stage 2 (Data layer).
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from .config import get_settings

_engine: AsyncEngine | None = None
_sessionmaker: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        _engine = create_async_engine(
            get_settings().database_url,
            pool_pre_ping=True,
            future=True,
        )
    return _engine


def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    global _sessionmaker
    if _sessionmaker is None:
        _sessionmaker = async_sessionmaker(get_engine(), expire_on_commit=False)
    return _sessionmaker


async def get_session() -> AsyncIterator[AsyncSession]:
    """FastAPI/worker dependency yielding a session bound to a transaction scope."""
    async with get_sessionmaker()() as session:
        yield session


async def ping() -> bool:
    """Return True if the database answers a trivial query."""
    async with get_engine().connect() as conn:
        await conn.execute(text("SELECT 1"))
    return True


async def dispose() -> None:
    global _engine
    if _engine is not None:
        await _engine.dispose()
        _engine = None
