"""Provider observability hooks (owner req 10) — integration points only, **no real metrics sent**.
Reuses the queue's ``Metrics``/``EventLogger`` interfaces (owner req 9: use existing infrastructure;
no duplication); defaults are no-op metrics + stdlib logging. Concrete exporters plug in later.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.workers.log import EventLogger, StdlibEventLogger
from app.workers.metrics import Metrics, NoOpMetrics


def _default_metrics() -> Metrics:
    return NoOpMetrics()


def _default_logger() -> EventLogger:
    return StdlibEventLogger()


@dataclass(frozen=True, slots=True)
class ProviderObservability:
    """Metrics + logging hooks passed to provider call sites. No-op / stdlib by default."""

    metrics: Metrics = field(default_factory=_default_metrics)
    logger: EventLogger = field(default_factory=_default_logger)
