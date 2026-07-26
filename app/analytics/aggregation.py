"""Metrics aggregation (owner req 8) — a standalone component, kept separate from export.

The aggregator turns a set of live metrics into an immutable :class:`MetricsSnapshot`. It never
exports anything (owner req 8 — do not mix aggregation with export).

"""

from __future__ import annotations

from collections.abc import Iterable

from app.analytics.metrics import (
    CounterSnapshot,
    HistogramSnapshot,
    Metric,
    MetricsSnapshot,
    TimerSnapshot,
)


def _sort_key(name: str, tags: object) -> tuple[str, str]:
    return name, repr(tags)


class MetricsAggregator:
    """Collects metric snapshots into a single immutable :class:`MetricsSnapshot` (owner req 8)."""

    def collect(self, metrics: Iterable[Metric]) -> MetricsSnapshot:
        """Snapshot every metric and group by kind, deterministically ordered by (name, tags)."""

        counters: list[CounterSnapshot] = []
        timers: list[TimerSnapshot] = []
        histograms: list[HistogramSnapshot] = []
        for metric in metrics:
            snapshot = metric.snapshot()
            if isinstance(snapshot, CounterSnapshot):
                counters.append(snapshot)
            elif isinstance(snapshot, TimerSnapshot):
                timers.append(snapshot)
            else:
                histograms.append(snapshot)
        counters.sort(key=lambda s: _sort_key(s.name, s.tags))
        timers.sort(key=lambda s: _sort_key(s.name, s.tags))
        histograms.sort(key=lambda s: _sort_key(s.name, s.tags))
        return MetricsSnapshot(
            counters=tuple(counters), timers=tuple(timers), histograms=tuple(histograms)
        )
