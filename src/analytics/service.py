"""DB-facing analytics: assemble a channel report from stored metrics.

Used by the admin panel (Stage 10). Picks the latest PostMetric snapshot per
published post, builds the aggregate report, and derives recommendations.
"""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Post, PostMetric
from app.models.enums import PostStatus

from .recommendations import recommend
from .reports import ChannelReport, PostStat, build_report


@dataclass
class ChannelAnalytics:
    report: ChannelReport
    recommendations: list[str]


async def build_channel_report(session: AsyncSession, channel_id: int) -> ChannelAnalytics:
    posts = (
        (
            await session.execute(
                select(Post).where(
                    Post.channel_id == channel_id,
                    Post.status == PostStatus.published,
                    Post.published_at.is_not(None),
                )
            )
        )
        .scalars()
        .all()
    )
    if not posts:
        report = build_report([])
        return ChannelAnalytics(report=report, recommendations=recommend(report))

    post_ids = [p.id for p in posts]
    metrics = (
        (
            await session.execute(
                select(PostMetric)
                .where(PostMetric.post_id.in_(post_ids))
                .order_by(PostMetric.captured_at.asc())
            )
        )
        .scalars()
        .all()
    )
    # Latest snapshot per post (ascending order → last write wins).
    latest: dict[int, PostMetric] = {m.post_id: m for m in metrics}

    stats = [
        PostStat(
            post_id=p.id,
            title=p.title,
            published_at=p.published_at,
            views=latest[p.id].views,
            reactions=latest[p.id].reactions,
            forwards=latest[p.id].forwards,
        )
        for p in posts
        if p.id in latest
    ]
    report = build_report(stats)
    return ChannelAnalytics(report=report, recommendations=recommend(report))
