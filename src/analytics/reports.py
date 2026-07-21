"""Aggregate post metrics into a channel report. Pure, unit-tested."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime

# Engagement weights: a reaction is worth more than a view, a forward more still.
VIEW_W, REACTION_W, FORWARD_W = 1, 3, 5


@dataclass
class PostStat:
    post_id: int
    title: str | None
    published_at: datetime
    views: int
    reactions: int
    forwards: int

    @property
    def engagement(self) -> int:
        return self.views * VIEW_W + self.reactions * REACTION_W + self.forwards * FORWARD_W


@dataclass
class ChannelReport:
    total_posts: int = 0
    total_views: int = 0
    total_reactions: int = 0
    total_forwards: int = 0
    avg_engagement: float = 0.0
    best_hour: int | None = None
    by_hour_avg: dict[int, float] = field(default_factory=dict)
    top_posts: list[PostStat] = field(default_factory=list)


def build_report(stats: list[PostStat], *, top_n: int = 5) -> ChannelReport:
    if not stats:
        return ChannelReport()

    sums: dict[int, float] = defaultdict(float)
    counts: dict[int, int] = defaultdict(int)
    for s in stats:
        hour = s.published_at.hour
        sums[hour] += s.engagement
        counts[hour] += 1

    by_hour_avg = {h: sums[h] / counts[h] for h in sums}
    best_hour = max(by_hour_avg, key=lambda h: by_hour_avg[h]) if by_hour_avg else None
    total_engagement = sum(s.engagement for s in stats)

    return ChannelReport(
        total_posts=len(stats),
        total_views=sum(s.views for s in stats),
        total_reactions=sum(s.reactions for s in stats),
        total_forwards=sum(s.forwards for s in stats),
        avg_engagement=total_engagement / len(stats),
        best_hour=best_hour,
        by_hour_avg=by_hour_avg,
        top_posts=sorted(stats, key=lambda s: s.engagement, reverse=True)[:top_n],
    )
