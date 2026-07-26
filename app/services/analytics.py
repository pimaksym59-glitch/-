"""Composition root for Analytics & Observability (integrations live only here).

The domain (:mod:`app.analytics`) is stdlib-only and independent. This module is the single place
allowed to wire it to the rest of the app: it builds an offline engine on deterministic fakes by
default, and provides thin adapters so existing emit-side infrastructure (:mod:`app.workers`
``Metrics``/``EventLogger``) can feed the subsystem without duplication (reuse). No real
telemetry/analytics export happens here (RV-16).

"""

from __future__ import annotations

from collections.abc import Sequence

from app.analytics.aggregation import MetricsAggregator
from app.analytics.audit_pipeline import AuditPipeline
from app.analytics.collector import EventCollector
from app.analytics.dispatcher import EventDispatcher
from app.analytics.engine import AnalyticsEngine
from app.analytics.events import Event, EventExporter
from app.analytics.fakes import FakeAuditSink, FakeEventSink, FakeIdFactory
from app.analytics.metrics import MetricRegistry, MetricSink, MetricsSnapshot
from app.analytics.pipeline import AnalyticsPipeline
from app.analytics.registry import EventRegistry
from app.analytics.sampling import SamplingStrategy
from app.analytics.taxonomy import default_descriptors
from app.workers.log import EventLogger, StdlibEventLogger
from app.workers.metrics import Metrics, NoOpMetrics


class WorkersMetricsAdapter:
    """Adapter: feed an analytics ``MetricsSnapshot`` into the queue's ``Metrics`` hook (reuse).

    A bridge seam — it signals counter occurrences and timer totals through the existing minimal
    metrics interface. A high-fidelity exporter (Prometheus) is RV-16.

    """

    def __init__(self, metrics: Metrics | None = None) -> None:
        self._metrics: Metrics = metrics if metrics is not None else NoOpMetrics()

    def record(self, snapshot: MetricsSnapshot) -> None:
        for counter in snapshot.counters:
            self._metrics.incr(counter.name)
        for timer in snapshot.timers:
            self._metrics.timing(timer.name, timer.total_seconds)


class WorkersLogEventExporter:
    """Adapter: export analytics events through the queue's structured ``EventLogger`` (reuse,
    §R12.9).
    """

    name = "workers_log"

    def __init__(self, logger: EventLogger | None = None) -> None:
        self._logger: EventLogger = logger if logger is not None else StdlibEventLogger()

    def export(self, events: Sequence[Event]) -> None:
        for event in events:
            self._logger.event(
                event.name,
                category=event.category,
                severity=event.severity,
                source=event.source,
                channel_id=event.channel_id,
                correlation_id=event.correlation.correlation_id,
            )


def build_event_registry() -> EventRegistry:
    """A registry pre-populated with the default taxonomy catalogue."""

    registry = EventRegistry()
    registry.register_all(default_descriptors())
    return registry


def build_analytics_pipeline(
    sink: FakeEventSink | None = None,
    exporters: Sequence[EventExporter] | None = None,
    sampling: SamplingStrategy | None = None,
) -> AnalyticsPipeline:
    """Assemble the event pipeline (collector -> sink -> dispatcher -> exporters) on fakes by
    default.
    """

    event_sink = sink if sink is not None else FakeEventSink()
    collector = EventCollector(event_sink, sampling=sampling)
    dispatcher = EventDispatcher()
    for exporter in exporters or ():
        dispatcher.register(exporter)
    return AnalyticsPipeline(collector, dispatcher, event_sink)


def build_audit_pipeline() -> AuditPipeline:
    """Assemble the (independent) audit pipeline on a fake sink."""

    return AuditPipeline(FakeAuditSink())


def build_analytics_engine(metric_sink: MetricSink | None = None) -> AnalyticsEngine:
    """Assemble a complete offline :class:`AnalyticsEngine` on deterministic fakes."""

    pipeline = build_analytics_pipeline()
    audit = build_audit_pipeline()
    return AnalyticsEngine(
        pipeline=pipeline,
        registry=MetricRegistry(),
        aggregator=MetricsAggregator(),
        audit=audit,
        ids=FakeIdFactory(),
        metric_sink=metric_sink,
    )
