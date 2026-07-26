"""Export interfaces + future-integration seams (owner reqs 11, 15).

The export Protocols are re-exported here for discoverability; concrete backends live nowhere in
this stage. The seams for OpenTelemetry / Prometheus / external analytics / external audit are
declared so wiring points exist, but are **not implemented** — every ``export`` raises
``NotImplementedError`` and is Runtime Verification Pending (RV-16). No SDKs are imported (owner
req 11).

"""

from __future__ import annotations

from collections.abc import Sequence

from app.analytics.audit import AuditEvent, AuditExporter
from app.analytics.events import Event, EventExporter
from app.analytics.metrics import MetricExporter, MetricsSnapshot
from app.analytics.tracing import Span, SpanExporter

__all__ = [
    "AuditExporter",
    "EventExporter",
    "ExternalAnalyticsSink",
    "ExternalAuditSink",
    "MetricExporter",
    "OpenTelemetrySpanExporter",
    "PrometheusMetricsExporter",
    "SpanExporter",
]

_RV16 = "Runtime Verification Pending (RV-16): no real telemetry/analytics export in this stage"


class OpenTelemetrySpanExporter:
    """Seam for OpenTelemetry span export (owner reqs 15, 16). Not implemented — RV-16."""

    name = "opentelemetry"
    implemented = False

    def export(self, span: Span) -> None:
        raise NotImplementedError(_RV16)


class PrometheusMetricsExporter:
    """Seam for Prometheus metrics export (owner reqs 15, 16). Not implemented — RV-16."""

    name = "prometheus"
    implemented = False

    def export(self, snapshot: MetricsSnapshot) -> None:
        raise NotImplementedError(_RV16)


class ExternalAnalyticsSink:
    """Seam for external analytics backends (owner req 15). Not implemented — RV-16."""

    name = "external_analytics"
    implemented = False

    def export(self, events: Sequence[Event]) -> None:
        raise NotImplementedError(_RV16)


class ExternalAuditSink:
    """Seam for external audit sinks (owner req 15). Not implemented — RV-16."""

    name = "external_audit"
    implemented = False

    def export(self, events: Sequence[AuditEvent]) -> None:
        raise NotImplementedError(_RV16)
