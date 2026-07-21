"""Metrics provider abstraction.

Telegram exposes limited post metrics to bots, so `FakeMetricsProvider`
(deterministic pseudo-metrics) is the default source; a real Telegram-backed
provider can be added once a channel with the required permissions is connected.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, runtime_checkable

from app.config import Settings


@dataclass
class MetricSnapshot:
    views: int
    reactions: int
    forwards: int


@runtime_checkable
class MetricsProvider(Protocol):
    async def fetch(self, *, chat_id: str, message_id: int) -> MetricSnapshot: ...


class FakeMetricsProvider:
    """Deterministic plausible metrics derived from the message id."""

    async def fetch(self, *, chat_id: str, message_id: int) -> MetricSnapshot:
        views = 100 + (message_id * 37) % 900
        return MetricSnapshot(views=views, reactions=views // 20, forwards=views // 50)


def get_metrics_provider(settings: Settings) -> MetricsProvider:
    # Only the fake provider exists today; a telegram provider slots in here.
    return FakeMetricsProvider()
