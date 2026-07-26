"""Histogram metric (owner reqs 7, 9) — a standalone bucketed-distribution component."""

from __future__ import annotations

import math
import threading
from collections.abc import Mapping, Sequence
from types import MappingProxyType

from app.analytics.metrics import HistogramSnapshot, MetricKind


class Histogram:
    """Bucketed distribution. Satisfies the :class:`~app.analytics.metrics.Metric` Protocol.

    ``bounds`` are finite upper bounds; an implicit ``+inf`` bucket captures the overflow. Buckets
    are cumulative (Prometheus-style) in the snapshot.

    """

    def __init__(
        self, name: str, bounds: Sequence[float], tags: Mapping[str, str] | None = None
    ) -> None:
        if not bounds:
            raise ValueError("histogram requires at least one bound")
        self.name = name
        self._bounds: tuple[float, ...] = tuple(sorted(bounds))
        self._tags: Mapping[str, str] = MappingProxyType(dict(tags) if tags else {})
        self._lock = threading.Lock()
        self._counts = [0] * (len(self._bounds) + 1)  # one extra for the +inf overflow bucket
        self._count = 0
        self._sum = 0.0

    def observe(self, value: float) -> None:
        """Record a single observation into the first bucket whose bound it does not exceed."""

        with self._lock:
            self._count += 1
            self._sum += value
            for index, bound in enumerate(self._bounds):
                if value <= bound:
                    self._counts[index] += 1
                    return
            self._counts[-1] += 1  # +inf overflow

    def kind(self) -> MetricKind:
        return MetricKind.HISTOGRAM

    def snapshot(self) -> HistogramSnapshot:
        with self._lock:
            cumulative = 0
            buckets: dict[float, int] = {}
            for index, bound in enumerate(self._bounds):
                cumulative += self._counts[index]
                buckets[bound] = cumulative
            cumulative += self._counts[-1]
            buckets[math.inf] = cumulative
            return HistogramSnapshot(
                name=self.name,
                count=self._count,
                sum=self._sum,
                buckets=MappingProxyType(buckets),
                tags=self._tags,
            )
