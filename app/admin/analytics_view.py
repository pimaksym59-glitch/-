"""Analytics integration (owner req 12, §R10.3) — read through a public port; flag gated metrics.

The admin domain defines :class:`AnalyticsReadPort`; composition adapts it to the **public**
Analytics interface. The dashboard only *shapes* read values into views and honours §R10.3:
metrics unavailable on Bot API (engagement) are flagged unavailable, never fabricated.

"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol

from app.admin.dto import AnalyticsView, MetricEntry


class AnalyticsReadPort(Protocol):
    """Read port for analytics entries (adapted to Analytics' public interface in composition)."""

    def entries(self) -> Sequence[MetricEntry]: ...


class AnalyticsDashboard:
    """Shapes analytics read values into a view, preserving availability flags (§R10.3)."""

    def __init__(self, port: AnalyticsReadPort) -> None:
        self._port = port

    def view(self, *, include_unavailable: bool = True) -> AnalyticsView:
        """Build the analytics view. Gated metrics keep their flag (never fabricated)."""

        entries = tuple(
            entry for entry in self._port.entries() if include_unavailable or entry.available
        )
        return AnalyticsView(entries=entries)
