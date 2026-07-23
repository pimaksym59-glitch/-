"""Integration tests for the persistence layer — require a live PostgreSQL (§R4).

NOT executed without ``RUN_INTEGRATION=1`` and a ``DATABASE_URL``; in environments without a
database these are **Runtime Verification Pending** and are not counted as verified.
"""

from __future__ import annotations

import os

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.base import Base
from app.models import Channel
from app.repositories.channel_repository import ChannelRepository

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_INTEGRATION") != "1",
        reason="requires a live PostgreSQL (set RUN_INTEGRATION=1 and DATABASE_URL)",
    ),
]


async def test_channel_insert_and_fetch() -> None:
    engine = create_async_engine(os.environ["DATABASE_URL"])
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        sessionmaker = async_sessionmaker(engine, expire_on_commit=False)
        async with sessionmaker() as session:
            repo = ChannelRepository(session)
            channel = Channel(
                language="en",
                timezone="UTC",
                llm_provider="fake",
                image_provider="fake",
            )
            repo.add(channel)
            await session.commit()
            fetched = await repo.get(channel.id)
            assert fetched is not None
            assert fetched.language == "en"
    finally:
        await engine.dispose()
