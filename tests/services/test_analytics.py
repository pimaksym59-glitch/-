"""Analytics composition tests (§R11): build helpers + workers adapters (reuse). Offline."""

from __future__ import annotations

from app.analytics.audit import AuditEvent
from app.analytics.correlation import new_correlation
from app.analytics.events import Event
from app.analytics.fakes import FakeClock, FakeEventExporter, FakeIdFactory
from app.analytics.taxonomy import (
    DEFAULT_DESCRIPTORS,
    EventCategory,
    EventName,
    EventSeverity,
)
from app.services.analytics import (
    WorkersLogEventExporter,
    WorkersMetricsAdapter,
    build_analytics_engine,
    build_analytics_pipeline,
    build_audit_pipeline,
    build_event_registry,
)
from app.workers.metrics import Metrics


def _event() -> Event:
    ids, clock = FakeIdFactory(), FakeClock()
    return Event(
        name=EventName.LLM_CALL_COMPLETED,
        category=EventCategory.COST,
        severity=EventSeverity.INFO,
        occurred_at=clock.now(),
        correlation=new_correlation(ids),
        source="composition",
    )


def test_build_event_registry_has_full_catalogue() -> None:
    registry = build_event_registry()
    assert set(registry.known()) == {d.name for d in DEFAULT_DESCRIPTORS}


def test_build_pipeline_with_exporter() -> None:
    exporter = FakeEventExporter()
    pipeline = build_analytics_pipeline(exporters=[exporter])
    pipeline.emit(_event())
    pipeline.flush()
    assert len(exporter.exported) == 1


def test_build_audit_pipeline_and_engine() -> None:
    assert build_audit_pipeline() is not None
    engine = build_analytics_engine()
    engine.emit_event(_event())
    engine.flush_events()  # no exporters registered by default — should not raise
    engine.audit(AuditEvent(actor="admin", action="x", occurred_at=FakeClock().now()))
    engine.flush_audit()


class _RecordingMetrics:
    """Minimal ``Metrics`` implementation capturing calls (deterministic)."""

    def __init__(self) -> None:
        self.counters: list[str] = []
        self.timings: list[tuple[str, float]] = []

    def incr(self, name: str) -> None:
        self.counters.append(name)

    def timing(self, name: str, seconds: float) -> None:
        self.timings.append((name, seconds))


def test_workers_metrics_adapter_bridges_snapshot() -> None:
    from app.analytics.aggregation import MetricsAggregator
    from app.analytics.counters import Counter
    from app.analytics.metrics import MetricRegistry
    from app.analytics.timers import Timer

    registry = MetricRegistry()
    counter = Counter("posts")
    counter.increment(2)
    timer = Timer("latency", FakeClock())
    timer.record(1.5)
    registry.register(counter)
    registry.register(timer)
    snapshot = MetricsAggregator().collect(registry.all())

    metrics: Metrics = _RecordingMetrics()
    adapter = WorkersMetricsAdapter(metrics)
    adapter.record(snapshot)
    recording = metrics
    assert isinstance(recording, _RecordingMetrics)
    assert recording.counters == ["posts"]
    assert recording.timings == [("latency", 1.5)]


class _RecordingLogger:
    def __init__(self) -> None:
        self.events: list[str] = []

    def event(self, name: str, **fields: object) -> None:
        self.events.append(name)


def test_workers_log_exporter_bridges_events() -> None:
    logger = _RecordingLogger()
    exporter = WorkersLogEventExporter(logger)
    assert exporter.name == "workers_log"
    exporter.export([_event(), _event()])
    assert logger.events == [EventName.LLM_CALL_COMPLETED, EventName.LLM_CALL_COMPLETED]


def test_default_metrics_adapter_is_noop() -> None:
    WorkersMetricsAdapter().record(build_analytics_engine().record_metrics())
