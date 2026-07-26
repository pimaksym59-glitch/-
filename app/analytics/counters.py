"""Counter metric (owner reqs 7, 9) — a standalone monotonic counter component."""

from __future__ import annotations

import threading
from collections.abc import Mapping
from types import MappingProxyType

from app.analytics.metrics import CounterSnapshot, MetricKind


class Counter:
    """Monotonic, thread-safe counter. Satisfies the ``Metric`` Protocol."""

    def __init__(self, name: str, tags: Mapping[str, str] | None = None) -> None:
        self.name = name
        self._tags: Mapping[str, str] = MappingProxyType(dict(tags) if tags else {})
        self._lock = threading.Lock()
        self._value = 0

    def increment(self, amount: int = 1) -> None:
        """Add ``amount`` (must be non-negative — a counter never decreases)."""

        if amount < 0:
            raise ValueError("counter increment must be non-negative")
        with self._lock:
            self._value += amount

    def kind(self) -> MetricKind:
        return MetricKind.COUNTER

    def snapshot(self) -> CounterSnapshot:
        with self._lock:
            return CounterSnapshot(name=self.name, value=self._value, tags=self._tags)
