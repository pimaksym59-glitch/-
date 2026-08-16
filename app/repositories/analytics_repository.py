"""Analytics & cost aggregation data-access (§R3.1, §R11.8) — Stage 21 Phase 2A.

The console dashboard reads figures that exist in the schema only as raw rows: spend lives in
`api_usage`/`image_usage` (§R11.8 names both as the reliable cost source), publication counts in
`posts`, engagement in `analytics_snapshots`. This repository owns that aggregation SQL and nothing
else — no domain decisions, no availability policy (that is §R7.3 and belongs to the service).

Day bucketing is done in explicit UTC (`timezone('UTC', ts)` before the date cast) so a bucket does
not silently shift with the database session's timezone.
"""

from __future__ import annotations

import datetime
import uuid
from collections.abc import Sequence
from decimal import Decimal
from typing import Any

from sqlalchemy import ColumnElement, Date, SQLColumnExpression, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics import AnalyticsSnapshot, ApiUsage, ImageUsage
from app.models.content import Post
from app.models.enums import PostStatus

#: Upper bound on `GET /cost` buckets in one response (API_SPEC caps page size at 100).
MAX_COST_BUCKETS = 100


def _utc_day(column: SQLColumnExpression[Any]) -> ColumnElement[datetime.date]:
    """The UTC calendar day of a timestamptz column, as a `date`.

    The parameter is a `SQLColumnExpression` (not a `ColumnElement`) because mapped attributes
    arrive as `InstrumentedAttribute`, which is a sibling of `ColumnElement` rather than a subclass;
    `Any` covers the nullability difference between `Post.published_at` and `ApiUsage.created_at`.
    The emitted SQL is identical either way.
    """
    return cast(func.timezone("UTC", column), Date)


class AnalyticsRepository:
    """Read-only aggregates over the usage/content tables. Never writes."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def cost_total(self, *, channel_id: uuid.UUID, day: datetime.date) -> Decimal:
        """Total spend for one channel on one UTC day: LLM usage plus image usage."""
        total = Decimal(0)
        for model in (ApiUsage, ImageUsage):
            stmt = select(func.coalesce(func.sum(model.cost_usd), 0)).where(
                model.channel_id == channel_id, _utc_day(model.created_at) == day
            )
            total += Decimal(str(await self.session.scalar(stmt) or 0))
        return total

    async def cost_by_day(self, *, limit: int = MAX_COST_BUCKETS) -> Sequence[tuple[str, Decimal]]:
        """Platform-wide spend per UTC day, oldest first, capped to the most recent `limit` days.

        The two usage tables are summed separately and merged here rather than in one UNION query:
        the row counts per day are tiny and the merge keeps the SQL readable.
        """
        buckets: dict[datetime.date, Decimal] = {}
        for model in (ApiUsage, ImageUsage):
            day = _utc_day(model.created_at).label("day")
            stmt = select(day, func.coalesce(func.sum(model.cost_usd), 0)).group_by(day)
            for bucket_day, amount in await self.session.execute(stmt):
                buckets[bucket_day] = buckets.get(bucket_day, Decimal(0)) + Decimal(str(amount))
        recent = sorted(buckets.items())[-limit:]
        return [(day.isoformat(), amount) for day, amount in recent]

    async def published_count(self, *, channel_id: uuid.UUID, day: datetime.date) -> int:
        """Posts of one channel actually published on one UTC day (soft-deleted excluded)."""
        stmt = select(func.count()).where(
            Post.channel_id == channel_id,
            Post.deleted_at.is_(None),
            Post.status == PostStatus.published,
            Post.published_at.is_not(None),
            _utc_day(Post.published_at) == day,
        )
        return int(await self.session.scalar(stmt) or 0)

    async def views_total(self, *, channel_id: uuid.UUID, day: datetime.date) -> int | None:
        """Summed post views captured for one channel on one UTC day.

        `None` means "nothing measured" — no snapshot rows, or every row's `views` is NULL. The
        caller turns that into the gated metric (§R7.3); this method never invents a zero.
        """
        stmt = select(func.sum(AnalyticsSnapshot.views)).where(
            AnalyticsSnapshot.channel_id == channel_id,
            AnalyticsSnapshot.views.is_not(None),
            _utc_day(AnalyticsSnapshot.captured_at) == day,
        )
        total = await self.session.scalar(stmt)
        return None if total is None else int(total)
