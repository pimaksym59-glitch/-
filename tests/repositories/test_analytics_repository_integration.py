"""Integration tests for the analytics/cost aggregation — require a live PostgreSQL
(§R11.8, Stage 21 Phase 2A).

NOT executed without RUN_INTEGRATION=1 and a DATABASE_URL; without a database these are Runtime
Verification Pending and are not counted as verified.

Every test seeds its OWN channel under a fresh UUID and deletes everything it created, so the file
is re-runnable against a persistent database and independent of execution order.
"""

from __future__ import annotations

import datetime
import os
import uuid
from collections.abc import AsyncIterator

import pytest
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_engine, get_sessionmaker
from app.models.analytics import AnalyticsSnapshot, ApiUsage, ImageUsage
from app.models.channel import Channel
from app.models.content import Post
from app.models.enums import PostStatus
from app.repositories.analytics_repository import AnalyticsRepository

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_INTEGRATION") != "1",
        reason="requires a live PostgreSQL (set RUN_INTEGRATION=1 and DATABASE_URL)",
    ),
]

# A historic window on purpose: `cost_by_day` is platform-wide by contract, so pinning these rows
# far away from "today" keeps the bucket assertions exact no matter what else lives in the database.
TODAY = datetime.date(2019, 3, 14)
_NOON = datetime.datetime(2019, 3, 14, 12, 0, tzinfo=datetime.UTC)
_YESTERDAY_NOON = _NOON - datetime.timedelta(days=1)


@pytest.fixture(autouse=True)
async def _engine_bound_to_this_loop() -> AsyncIterator[None]:
    """The engine factory is process-cached, and each test runs in its own event loop — bind a
    fresh engine per test so pooled connections never outlive the loop that created them."""
    get_engine.cache_clear()
    get_sessionmaker.cache_clear()
    yield
    await get_engine().dispose()
    get_engine.cache_clear()
    get_sessionmaker.cache_clear()


def _channel() -> Channel:
    return Channel(
        id=uuid.uuid4(),
        title=f"analytics-it-{uuid.uuid4().hex[:8]}",
        language="en",
        timezone="UTC",
        llm_provider="fake",
        image_provider="fake",
    )


async def _cleanup(session: AsyncSession, channel_id: uuid.UUID) -> None:
    await session.execute(
        delete(AnalyticsSnapshot).where(AnalyticsSnapshot.channel_id == channel_id)
    )
    await session.execute(delete(ApiUsage).where(ApiUsage.channel_id == channel_id))
    await session.execute(delete(ImageUsage).where(ImageUsage.channel_id == channel_id))
    await session.execute(delete(Post).where(Post.channel_id == channel_id))
    await session.execute(delete(Channel).where(Channel.id == channel_id))
    await session.commit()


async def test_cost_total_sums_llm_and_image_usage_for_that_day_only() -> None:
    channel = _channel()
    async with get_sessionmaker()() as session:
        session.add(channel)
        await session.flush()  # FK parent must exist first
        session.add(ApiUsage(channel_id=channel.id, cost_usd=1.50, created_at=_NOON))
        session.add(ApiUsage(channel_id=channel.id, cost_usd=0.25, created_at=_NOON))
        session.add(ImageUsage(channel_id=channel.id, cost_usd=3.00, created_at=_NOON))
        session.add(ApiUsage(channel_id=channel.id, cost_usd=99.00, created_at=_YESTERDAY_NOON))
        await session.commit()
        try:
            total = await AnalyticsRepository(session).cost_total(channel_id=channel.id, day=TODAY)
            assert float(total) == pytest.approx(4.75)  # 1.50 + 0.25 + 3.00; yesterday excluded
        finally:
            await _cleanup(session, channel.id)


async def test_cost_total_is_zero_without_usage_rows() -> None:
    channel = _channel()
    async with get_sessionmaker()() as session:
        session.add(channel)
        await session.commit()
        try:
            total = await AnalyticsRepository(session).cost_total(channel_id=channel.id, day=TODAY)
            assert float(total) == 0.0
        finally:
            await _cleanup(session, channel.id)


async def test_cost_by_day_buckets_and_orders_ascending() -> None:
    channel = _channel()
    async with get_sessionmaker()() as session:
        session.add(channel)
        await session.flush()  # FK parent must exist first
        session.add(ApiUsage(channel_id=channel.id, cost_usd=2.00, created_at=_YESTERDAY_NOON))
        session.add(ImageUsage(channel_id=channel.id, cost_usd=1.00, created_at=_YESTERDAY_NOON))
        session.add(ApiUsage(channel_id=channel.id, cost_usd=4.00, created_at=_NOON))
        await session.commit()
        try:
            buckets = dict(await AnalyticsRepository(session).cost_by_day())
            assert float(buckets["2019-03-13"]) == pytest.approx(3.00)  # both tables merged
            assert float(buckets["2019-03-14"]) == pytest.approx(4.00)
            keys = [key for key, _ in await AnalyticsRepository(session).cost_by_day()]
            assert keys == sorted(keys), "oldest first — the console plots the series as given"
        finally:
            await _cleanup(session, channel.id)


async def test_published_count_counts_only_published_posts_of_that_day() -> None:
    channel = _channel()
    async with get_sessionmaker()() as session:
        session.add(channel)
        await session.flush()  # FK parent must exist first
        session.add(
            Post(channel_id=channel.id, status=PostStatus.published, published_at=_NOON, title="a")
        )
        session.add(
            Post(channel_id=channel.id, status=PostStatus.published, published_at=_NOON, title="b")
        )
        session.add(
            Post(
                channel_id=channel.id,
                status=PostStatus.published,
                published_at=_YESTERDAY_NOON,
                title="old",
            )
        )
        session.add(Post(channel_id=channel.id, status=PostStatus.needs_review, title="draft"))
        await session.commit()
        try:
            count = await AnalyticsRepository(session).published_count(
                channel_id=channel.id, day=TODAY
            )
            assert count == 2
        finally:
            await _cleanup(session, channel.id)


async def test_views_total_is_none_when_nothing_was_measured() -> None:
    """The gated path (§R7.3): no engagement rows must NOT become a zero."""
    channel = _channel()
    async with get_sessionmaker()() as session:
        session.add(channel)
        await session.commit()
        try:
            assert (
                await AnalyticsRepository(session).views_total(channel_id=channel.id, day=TODAY)
            ) is None
        finally:
            await _cleanup(session, channel.id)


async def test_views_total_sums_captured_snapshots() -> None:
    channel = _channel()
    post = Post(channel_id=channel.id, status=PostStatus.published, published_at=_NOON, title="p")
    async with get_sessionmaker()() as session:
        session.add(channel)
        session.add(post)
        await session.flush()
        session.add(
            AnalyticsSnapshot(post_id=post.id, channel_id=channel.id, captured_at=_NOON, views=120)
        )
        session.add(
            AnalyticsSnapshot(post_id=post.id, channel_id=channel.id, captured_at=_NOON, views=80)
        )
        session.add(
            AnalyticsSnapshot(
                post_id=post.id, channel_id=channel.id, captured_at=_YESTERDAY_NOON, views=999
            )
        )
        await session.commit()
        try:
            total = await AnalyticsRepository(session).views_total(channel_id=channel.id, day=TODAY)
            assert total == 200
        finally:
            await _cleanup(session, channel.id)
