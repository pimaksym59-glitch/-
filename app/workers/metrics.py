"""Metrics integration points (§ req 10, §R12.10). No exporter here — default is no-op.

The Executor calls counters/timings; a concrete exporter (Prometheus/StatsD) is a later concern.
"""

from __future__ import annotations

from typing import Protocol


class Metrics(Protocol):
    def incr(self, name: str) -> None: ...
    def timing(self, name: str, seconds: float) -> None: ...


class NoOpMetrics:
    def incr(self, name: str) -> None: ...
    def timing(self, name: str, seconds: float) -> None: ...
