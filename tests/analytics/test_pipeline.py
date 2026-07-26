"""Analytics/Audit pipeline + engine tests (§R11, owner reqs 7, 10). Offline and deterministic."""

from __future__ import annotations

import pytest

from app.analytics.aggregation import MetricsAggregator
from app.analytics.audit import AuditEvent
from app.analytics.audit_pipeline import AuditPipeline
from app.analytics.collector import EventCollector
from app.analytics.correlation import new_correlation
from app.analytics.counters import Counter
from app.analytics.dispatcher import EventDispatcher
from app.analytics.engine import AnalyticsEngine
from app.analytics.events import Event
from app.analytics.fakes import (
    FakeAuditExporter,
    FakeAuditSink,
    FakeClock,
    FakeEventExporter,
    FakeEventSink,
    FakeIdFactory,
    FakeMetricSink,
    RecordingObservability,
)
from app.analytics.metrics import MetricRegistry
from app.analytics.pipeline import AnalyticsPipeline
from app.analytics.taxonomy import EventCategory, EventName, EventSeverity


def _event(ids: FakeIdFactory, clock: FakeClock) -> Event:
    return Event(
        name=EventName.TASK_STARTED,
        category=EventCategory.SYSTEM,
        severity=EventSeverity.INFO,
        occurred_at=clock.now(),
        correlation=new_correlation(ids),
        source="test",
    )


def test_analytics_pipeline_end_to_end() -> None:
    ids, clock = FakeIdFactory(), FakeClock()
    sink = FakeEventSink()
    exporter = FakeEventExporter()
    dispatcher = EventDispatcher()
    dispatcher.register(exporter)
    pipeline = AnalyticsPipeline(EventCollector(sink), dispatcher, sink)
    pipeline.emit(_event(ids, clock))
    pipeline.emit(_event(ids, clock))
    assert exporter.exported == []  # nothing exported until flush
    pipeline.flush()
    assert len(exporter.exported) == 2
    pipeline.flush()  # buffer drained — no duplicates
    assert len(exporter.exported) == 2


def test_audit_pipeline_is_independent_and_isolates_failure() -> None:
    hook = RecordingObservability()
    pipeline = AuditPipeline(FakeAuditSink(), hook=hook)
    good = FakeAuditExporter(name="b_good")

    class _Boom:
        name = "a_boom"

        def export(self, events: object) -> None:
            raise RuntimeError("down")

    pipeline.register(_Boom())
    pipeline.register(good)
    with pytest.raises(ValueError, match="already registered"):
        pipeline.register(FakeAuditExporter(name="b_good"))
    pipeline.submit(AuditEvent(actor="admin", action="delete", occurred_at=FakeClock().now()))
    pipeline.flush()
    assert len(good.exported) == 1
    assert hook.records and hook.records[0].source == "audit:a_boom"


def test_engine_facade_offline() -> None:
    ids, clock = FakeIdFactory(), FakeClock()
    event_sink = FakeEventSink()
    event_exporter = FakeEventExporter()
    dispatcher = EventDispatcher()
    dispatcher.register(event_exporter)
    pipeline = AnalyticsPipeline(EventCollector(event_sink), dispatcher, event_sink)
    registry = MetricRegistry()
    counter = Counter("posts")
    counter.increment(3)
    registry.register(counter)
    audit_sink = FakeAuditSink()
    audit_exporter = FakeAuditExporter()
    audit = AuditPipeline(audit_sink)
    audit.register(audit_exporter)
    metric_sink = FakeMetricSink()
    engine = AnalyticsEngine(
        pipeline=pipeline,
        registry=registry,
        aggregator=MetricsAggregator(),
        audit=audit,
        ids=ids,
        metric_sink=metric_sink,
    )

    correlation = engine.new_correlation()
    span = engine.start_span("run", correlation)
    assert engine.end_span(span) is span

    engine.emit_event(_event(ids, clock))
    engine.flush_events()
    assert len(event_exporter.exported) == 1

    snapshot = engine.record_metrics()
    assert snapshot.counters[0].value == 3
    assert metric_sink.recorded == [snapshot]

    engine.audit(AuditEvent(actor="admin", action="publish", occurred_at=clock.now()))
    engine.flush_audit()
    assert len(audit_exporter.exported) == 1
