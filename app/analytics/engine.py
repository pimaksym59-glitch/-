"""Analytics Engine (owner req 7 composition) — an offline facade over the independent flows.

The engine ties the event pipeline, metric registry/aggregator, audit pipeline and tracer together
behind one surface (``emit_event``/``record_metrics``/``audit``/``span``), without any engine
business logic. It depends only on the subsystem's own Protocols and value types; real backends
are RV-16.

"""

from __future__ import annotations

from app.analytics.aggregation import MetricsAggregator
from app.analytics.audit import AuditEvent
from app.analytics.audit_pipeline import AuditPipeline
from app.analytics.correlation import CorrelationId, new_correlation
from app.analytics.events import Event
from app.analytics.metrics import MetricRegistry, MetricSink, MetricsSnapshot
from app.analytics.pipeline import AnalyticsPipeline
from app.analytics.ports import IdFactory
from app.analytics.tracing import NoOpTracer, Span, Tracer


class AnalyticsEngine:
    """Offline facade unifying the analytics/metrics/audit/tracing flows (owner req 7)."""

    def __init__(
        self,
        pipeline: AnalyticsPipeline,
        registry: MetricRegistry,
        aggregator: MetricsAggregator,
        audit: AuditPipeline,
        ids: IdFactory,
        tracer: Tracer | None = None,
        metric_sink: MetricSink | None = None,
    ) -> None:
        self._pipeline = pipeline
        self._registry = registry
        self._aggregator = aggregator
        self._audit = audit
        self._ids = ids
        self._tracer: Tracer = tracer if tracer is not None else NoOpTracer()
        self._metric_sink = metric_sink

    def new_correlation(self) -> CorrelationId:
        """Mint a fresh correlation identity for a unit of work."""

        return new_correlation(self._ids)

    def emit_event(self, event: Event) -> None:
        """Submit an analytics event to the pipeline."""

        self._pipeline.emit(event)

    def flush_events(self) -> None:
        """Dispatch buffered events to exporters."""

        self._pipeline.flush()

    def record_metrics(self) -> MetricsSnapshot:
        """Aggregate live metrics into a snapshot; hand it to the sink if one is configured."""

        snapshot = self._aggregator.collect(self._registry.all())
        if self._metric_sink is not None:
            self._metric_sink.record(snapshot)
        return snapshot

    def audit(self, event: AuditEvent) -> None:
        """Submit an audit record to the (independent) audit pipeline."""

        self._audit.submit(event)

    def flush_audit(self) -> None:
        """Dispatch buffered audit records to audit exporters."""

        self._audit.flush()

    def start_span(self, name: str, correlation: CorrelationId) -> Span:
        """Start a tracing span via the configured tracer (no-op by default)."""

        return self._tracer.start_span(name, correlation)

    def end_span(self, span: Span) -> Span:
        """End a tracing span via the configured tracer."""

        return self._tracer.end_span(span)
