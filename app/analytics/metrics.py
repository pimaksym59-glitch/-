"""Metrics architecture (owner reqs 7, 8) — abstract interfaces + immutable snapshots + a typed
registry.

Metrics are read through :class:`Metric`/:class:`MetricSink`/:class:`MetricExporter` Protocols
only (owner req 8). Snapshots are immutable value objects. Counter/Timer/Histogram implementations
live in their own modules (owner reqs 7, 9); aggregation and export live elsewhere (owner req 8 —
do not mix).

"""

from __future__ import annotations

import threading
from collections.abc import Mapping
from dataclasses import dataclass, field
from enum import StrEnum
from types import MappingProxyType
from typing import Protocol


class MetricKind(StrEnum):
    """Discriminates the three metric component types (owner req 9)."""

    COUNTER = "counter"
    TIMER = "timer"
    HISTOGRAM = "histogram"


def _empty_tags() -> Mapping[str, str]:
    return MappingProxyType({})


@dataclass(frozen=True, slots=True)
class CounterSnapshot:
    """Immutable snapshot of a counter."""

    name: str
    value: int
    tags: Mapping[str, str] = field(default_factory=_empty_tags)


@dataclass(frozen=True, slots=True)
class TimerSnapshot:
    """Immutable snapshot of a timer (count of samples + total seconds)."""

    name: str
    count: int
    total_seconds: float
    tags: Mapping[str, str] = field(default_factory=_empty_tags)


@dataclass(frozen=True, slots=True)
class HistogramSnapshot:
    """Immutable histogram snapshot (bucket upper-bound -> cumulative count, plus count/sum)."""

    name: str
    count: int
    sum: float
    buckets: Mapping[float, int] = field(default_factory=lambda: MappingProxyType({}))
    tags: Mapping[str, str] = field(default_factory=_empty_tags)


type MetricSnapshot = CounterSnapshot | TimerSnapshot | HistogramSnapshot


@dataclass(frozen=True, slots=True)
class MetricsSnapshot:
    """An immutable point-in-time collection of all metric snapshots."""

    counters: tuple[CounterSnapshot, ...] = ()
    timers: tuple[TimerSnapshot, ...] = ()
    histograms: tuple[HistogramSnapshot, ...] = ()


class Metric(Protocol):
    """Common metric interface — only accessed through this Protocol (owner req 8)."""

    name: str

    def kind(self) -> MetricKind: ...

    def snapshot(self) -> MetricSnapshot: ...


class MetricSink(Protocol):
    """Receives a metrics snapshot (owner req 8). Concrete sinks are RV-16."""

    def record(self, snapshot: MetricsSnapshot) -> None: ...


class MetricExporter(Protocol):
    """Exports a metrics snapshot to a backend (owner req 13). Concrete backends are RV-16."""

    name: str

    def export(self, snapshot: MetricsSnapshot) -> None: ...


class MetricRegistry:
    """Typed, thread-safe registry of live metrics (owner reqs 6-style, 8)."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._metrics: dict[str, Metric] = {}

    def register(self, metric: Metric) -> None:
        """Register a metric by name. Raises ``ValueError`` on a duplicate."""

        with self._lock:
            if metric.name in self._metrics:
                raise ValueError(f"metric already registered: {metric.name}")
            self._metrics[metric.name] = metric

    def get(self, name: str) -> Metric:
        with self._lock:
            return self._metrics[name]

    def all(self) -> tuple[Metric, ...]:
        """All registered metrics in deterministic (sorted-by-name) order."""

        with self._lock:
            return tuple(self._metrics[name] for name in sorted(self._metrics))
