"""Unit tests for Analytics pure logic (reports, recommendations, provider)."""

from datetime import UTC, datetime

from analytics.metrics_provider import FakeMetricsProvider
from analytics.recommendations import recommend
from analytics.reports import PostStat, build_report


def _stat(post_id, hour, views, reactions=0, forwards=0, title=None):
    return PostStat(
        post_id=post_id,
        title=title,
        published_at=datetime(2026, 7, 1, hour, 0, tzinfo=UTC),
        views=views,
        reactions=reactions,
        forwards=forwards,
    )


# ── reports ──────────────────────────────────────────────────────────────
def test_empty_report():
    r = build_report([])
    assert r.total_posts == 0
    assert r.best_hour is None
    assert r.top_posts == []


def test_report_totals_and_best_hour():
    stats = [
        _stat(1, hour=9, views=100),
        _stat(2, hour=20, views=100, reactions=50, forwards=20),  # high engagement
        _stat(3, hour=9, views=50),
    ]
    r = build_report(stats)
    assert r.total_posts == 3
    assert r.total_views == 250
    assert r.best_hour == 20  # post 2 dominates
    assert r.top_posts[0].post_id == 2  # highest engagement first


def test_engagement_weighting():
    s = _stat(1, hour=1, views=10, reactions=2, forwards=1)
    assert s.engagement == 10 * 1 + 2 * 3 + 1 * 5  # 21


# ── recommendations ──────────────────────────────────────────────────────
def test_recommend_needs_min_data():
    tips = recommend(build_report([_stat(1, 9, 100)]))
    assert len(tips) == 1
    assert "Not enough data" in tips[0]


def test_recommend_suggests_hour_and_topics():
    stats = [
        _stat(1, hour=20, views=200, reactions=40, forwards=10, title="Great topic"),
        _stat(2, hour=20, views=150, reactions=30, forwards=8, title="Another hit"),
        _stat(3, hour=8, views=50, title="Meh"),
    ]
    tips = recommend(build_report(stats))
    joined = " ".join(tips)
    assert "20:00" in joined
    assert "Great topic" in joined


# ── provider ─────────────────────────────────────────────────────────────
async def test_fake_metrics_deterministic():
    provider = FakeMetricsProvider()
    a = await provider.fetch(chat_id="@c", message_id=42)
    b = await provider.fetch(chat_id="@c", message_id=42)
    c = await provider.fetch(chat_id="@c", message_id=99)
    assert (a.views, a.reactions, a.forwards) == (b.views, b.reactions, b.forwards)
    assert a.views != c.views
    assert a.reactions == a.views // 20
