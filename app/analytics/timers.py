"""Timer metric (owner reqs 7, 9) — a standalone duration component.

Durations come from an injected :class:`~app.analytics.ports.Clock` (owner req 17) so timing is
deterministic under test; there is no ``time.time`` in the domain.

"""

from __future__ import annotations

import threading
from collections.abc import Iterator, Mapping
from contextlib import contextmanager
from types import MappingProxyType

from app.analytics.metrics import MetricKind, TimerSnapshot
from app.analytics.ports import Clock


class Timer:
    """Records sample durations. Satisfies the :class:`~app.analytics.metrics.Metric` Protocol."""

    def __init__(self, name: str, clock: Clock, tags: Mapping[str, str] | None = None) -> None:
        self.name = name
        self._clock = clock
        self._tags: Mapping[str, str] = MappingProxyType(dict(tags) if tags else {})
        self._lock = threading.Lock()
        self._count = 0
        self._total = 0.0

    def record(self, seconds: float) -> None:
        """Record a single duration sample (must be non-negative)."""

        if seconds < 0:
            raise ValueError("timer duration must be non-negative")
        with self._lock:
            self._count += 1
            self._total += seconds

    @contextmanager
    def measure(self) -> Iterator[None]:
        """Time the wrapped block using the injected clock."""

        start = self._clock.now()
        try:
            yield
        finally:
            end = self._clock.now()
            self.record((end - start).total_seconds())

    def kind(self) -> MetricKind:
        return MetricKind.TIMER

    def snapshot(self) -> TimerSnapshot:
        with self._lock:
            return TimerSnapshot(
                name=self.name, count=self._count, total_seconds=self._total, tags=self._tags
            )
