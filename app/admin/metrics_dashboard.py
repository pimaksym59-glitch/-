"""Metrics dashboard integration (owner req 15) — read through a public Protocol only.

The admin domain defines :class:`MetricsReadPort`; composition adapts it to the **public**
Analytics metrics snapshot. The dashboard only shapes counters/timers into a view — no business
logic.

"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol

from app.admin.dto import MetricsView


class MetricsReadPort(Protocol):
    """Read port for metric summaries (adapted to Analytics ``MetricsSnapshot`` in composition)."""

    def counters(self) -> Sequence[tuple[str, int]]: ...

    def timers(self) -> Sequence[tuple[str, float]]: ...


class MetricsDashboard:
    """Shapes metric read values into a view (owner req 15)."""

    def __init__(self, port: MetricsReadPort) -> None:
        self._port = port

    def view(self) -> MetricsView:
        """Build the metrics view (sorted by name for determinism)."""

        counters = tuple(sorted(self._port.counters()))
        timers = tuple(sorted(self._port.timers()))
        return MetricsView(counters=counters, timers=timers)
