"""Audit Pipeline (§R10.8, owner req 10) — fully separate from the Analytics Pipeline.

This module does not import :mod:`app.analytics.pipeline` (or the collector/dispatcher). Audit
records flow through their own sink and exporters; per-exporter failures are isolated and recorded
via the observability hook. Real persistence to ``audit_log`` is composition/RV-16.

"""

from __future__ import annotations

from app.analytics.audit import AuditEvent, AuditExporter, AuditSink
from app.analytics.observability import (
    NoOpObservability,
    ObservabilityHook,
    ObservabilityRecord,
)


class AuditPipeline:
    """Accepts audit events, buffers them, and flushes to registered exporters (owner req 10)."""

    def __init__(self, sink: AuditSink, hook: ObservabilityHook | None = None) -> None:
        self._sink = sink
        self._exporters: dict[str, AuditExporter] = {}
        self._hook: ObservabilityHook = hook if hook is not None else NoOpObservability()

    def register(self, exporter: AuditExporter) -> None:
        """Register an audit exporter. Raises ``ValueError`` on a duplicate name."""

        if exporter.name in self._exporters:
            raise ValueError(f"audit exporter already registered: {exporter.name}")
        self._exporters[exporter.name] = exporter

    def submit(self, event: AuditEvent) -> None:
        """Buffer an audit event."""

        self._sink.put(event)

    def flush(self) -> None:
        """Drain buffered audit events and deliver them to every exporter (failures isolated)."""

        events = self._sink.drain()
        for name in sorted(self._exporters):
            exporter = self._exporters[name]
            try:
                exporter.export(events)
            except Exception as exc:  # isolate one exporter's failure from the rest
                self._hook.record(ObservabilityRecord(source=f"audit:{name}", detail=str(exc)))
