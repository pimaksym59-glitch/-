"""Analytics — metrics, reports, recommendations, controlled self-learning.

Layout:
- metrics_provider.py  MetricsProvider protocol + FakeMetricsProvider
- reports.py           aggregate PostStats → ChannelReport (pure)
- recommendations.py   report → operator suggestions (pure, not auto-applied)
- service.py           build a channel report from stored metrics (DB)
- handler.py           registers the `collect_metrics` task handler

Call `register()` at startup. Depends on: db, scheduler, telegram_engine.
"""

from __future__ import annotations


def register() -> None:
    """Register the analytics task handler into scheduler.registry."""
    from app.models.enums import TaskType
    from scheduler.registry import register as register_handler

    from .handler import handle_collect_metrics

    register_handler(TaskType.collect_metrics)(handle_collect_metrics)
