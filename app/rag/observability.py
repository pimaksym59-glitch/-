"""Retrieval observability (owner req 15, §R9.13) — **hooks only**. Reuses the queue's
metrics/logging
interfaces (no duplication); defaults are no-op. Sources emit per-query stats: search time,
found/used
counts, assembly time, context size (§R9.13).
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.workers.log import EventLogger, StdlibEventLogger
from app.workers.metrics import Metrics, NoOpMetrics


@dataclass(slots=True)
class RagObservability:
    metrics: Metrics = field(default_factory=NoOpMetrics)
    logger: EventLogger = field(default_factory=StdlibEventLogger)
