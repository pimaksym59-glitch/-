"""Validation observability (owner req 14) — **hooks only**, no implementation. Defined locally
(stdlib-only) so the Validation Engine stays fully independent of every other app package. Defaults
are no-op.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol


class MetricsHook(Protocol):
    def incr(self, name: str) -> None: ...


class LoggingHook(Protocol):
    def event(self, name: str, **fields: Any) -> None: ...


class NoOpMetrics:
    def incr(self, name: str) -> None: ...


class NoOpLogger:
    def event(self, name: str, **fields: Any) -> None: ...


@dataclass(slots=True)
class ValidationObservability:
    metrics: MetricsHook = field(default_factory=NoOpMetrics)
    logger: LoggingHook = field(default_factory=NoOpLogger)
