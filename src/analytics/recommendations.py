"""Turn a channel report into human-readable recommendations. Pure.

Recommendations are *suggestions* surfaced to the operator (controlled
self-improvement per the spec), never applied automatically.
"""

from __future__ import annotations

from .reports import ChannelReport

_MIN_POSTS_FOR_ADVICE = 3


def recommend(report: ChannelReport) -> list[str]:
    if report.total_posts < _MIN_POSTS_FOR_ADVICE:
        return [
            f"Not enough data yet ({report.total_posts} posts). "
            "Publish more to unlock recommendations."
        ]

    tips: list[str] = []
    if report.best_hour is not None:
        tips.append(
            f"Best posting time: around {report.best_hour:02d}:00 (highest average engagement)."
        )

    titles = [p.title for p in report.top_posts[:3] if p.title]
    if titles:
        tips.append("Top-performing topics to lean into: " + "; ".join(titles) + ".")

    if report.total_views and report.total_forwards / max(report.total_views, 1) < 0.01:
        tips.append("Low forward rate — try stronger hooks or calls to share.")

    return tips or ["Metrics look healthy; keep the current strategy."]
