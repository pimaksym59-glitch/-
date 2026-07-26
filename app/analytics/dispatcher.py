"""Event Dispatcher (owner req 5) — delivers events to registered exporters only.

The dispatcher performs no acceptance/sampling (that is the collector's job). Exporters are fanned
out in deterministic (sorted-by-name) order; a failing exporter is isolated — its error is
recorded via the observability hook and the remaining exporters still run (owner reqs 5, 7).

"""

from __future__ import annotations

from collections.abc import Sequence

from app.analytics.events import Event, EventExporter
from app.analytics.observability import (
    NoOpObservability,
    ObservabilityHook,
    ObservabilityRecord,
)


class EventDispatcher:
    """Fans a batch of events out to registered exporters (owner req 5)."""

    def __init__(self, hook: ObservabilityHook | None = None) -> None:
        self._exporters: dict[str, EventExporter] = {}
        self._hook: ObservabilityHook = hook if hook is not None else NoOpObservability()

    def register(self, exporter: EventExporter) -> None:
        """Register an exporter. Raises ``ValueError`` on a duplicate name."""

        if exporter.name in self._exporters:
            raise ValueError(f"exporter already registered: {exporter.name}")
        self._exporters[exporter.name] = exporter

    def exporters(self) -> tuple[str, ...]:
        """Registered exporter names in deterministic order."""

        return tuple(sorted(self._exporters))

    def dispatch(self, events: Sequence[Event]) -> None:
        """Deliver ``events`` to every exporter; isolate and record per-exporter failures."""

        for name in sorted(self._exporters):
            exporter = self._exporters[name]
            try:
                exporter.export(events)
            except Exception as exc:  # isolate one exporter's failure from the rest
                self._hook.record(ObservabilityRecord(source=f"dispatch:{name}", detail=str(exc)))
