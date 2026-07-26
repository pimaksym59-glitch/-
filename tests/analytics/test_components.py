"""Analytics component tests (§R11): taxonomy, events, correlation, registry, sampling, collector,
dispatcher, metrics, tracing, audit, observability, retention, export seams. Offline."""

from __future__ import annotations

import dataclasses
import math
from collections.abc import MutableMapping
from typing import cast

import pytest

from app.analytics.aggregation import MetricsAggregator
from app.analytics.audit import AuditEvent
from app.analytics.collector import EventCollector
from app.analytics.correlation import child_span, new_correlation
from app.analytics.counters import Counter
from app.analytics.dispatcher import EventDispatcher
from app.analytics.events import Event
from app.analytics.export import (
    ExternalAnalyticsSink,
    ExternalAuditSink,
    OpenTelemetrySpanExporter,
    PrometheusMetricsExporter,
)
from app.analytics.fakes import (
    FakeClock,
    FakeEventExporter,
    FakeEventSink,
    FakeIdFactory,
    FakeSpanExporter,
    RecordingObservability,
)
from app.analytics.histograms import Histogram
from app.analytics.metrics import (
    CounterSnapshot,
    HistogramSnapshot,
    MetricKind,
    MetricRegistry,
    TimerSnapshot,
)
from app.analytics.observability import ObservabilityRecord
from app.analytics.registry import EventNotRegistered, EventRegistry
from app.analytics.retention import AgeRetention, CategoryRetention, CountRetention
from app.analytics.sampling import (
    AlwaysSample,
    CategorySampler,
    NeverSample,
    RateSampler,
)
from app.analytics.taxonomy import (
    DEFAULT_DESCRIPTORS,
    Availability,
    EventCategory,
    EventDescriptor,
    EventName,
    EventSeverity,
    default_descriptors,
)
from app.analytics.timers import Timer
from app.analytics.tracing import NoOpTracer, Span

# --- helpers -------------------------------------------------------------------------------------


def _readonly_set(mapping: object, key: str, value: object) -> None:
    """Attempt a write through a read-only mapping proxy (raises ``TypeError`` at runtime)."""

    cast(MutableMapping[str, object], mapping)[key] = value


def _event(
    name: EventName = EventName.TASK_STARTED,
    category: EventCategory = EventCategory.SYSTEM,
    *,
    ids: FakeIdFactory | None = None,
    clock: FakeClock | None = None,
) -> Event:
    ids = ids if ids is not None else FakeIdFactory()
    clock = clock if clock is not None else FakeClock()
    return Event(
        name=name,
        category=category,
        severity=EventSeverity.INFO,
        occurred_at=clock.now(),
        correlation=new_correlation(ids),
        source="test",
        attributes={"k": "v"},
    )


# --- correlation (req 9) -------------------------------------------------------------------------


def test_new_correlation_and_child_span_deterministic() -> None:
    ids = FakeIdFactory()
    root = new_correlation(ids)
    assert (root.correlation_id, root.trace_id, root.span_id) == ("id-1", "id-2", "id-3")
    child = child_span(root, ids)
    assert child.correlation_id == root.correlation_id
    assert child.trace_id == root.trace_id
    assert child.span_id == "id-4"
    assert child.parent_span_id == root.span_id
    assert child.causation_id == root.span_id


def test_correlation_is_frozen() -> None:
    root = new_correlation(FakeIdFactory())
    field_name = "correlation_id"
    with pytest.raises(dataclasses.FrozenInstanceError):
        setattr(root, field_name, "x")  # variable name avoids read-only mypy/ruff flags


# --- event model (reqs 2, 4) ---------------------------------------------------------------------


def test_event_attributes_are_readonly_and_immutable() -> None:
    event = _event()
    assert event.attributes["k"] == "v"
    with pytest.raises(TypeError):
        _readonly_set(event.attributes, "k", "z")  # MappingProxyType is read-only


def test_event_default_attributes_empty() -> None:
    ids = FakeIdFactory()
    event = Event(
        name=EventName.TASK_STARTED,
        category=EventCategory.SYSTEM,
        severity=EventSeverity.INFO,
        occurred_at=FakeClock().now(),
        correlation=new_correlation(ids),
        source="s",
    )
    assert dict(event.attributes) == {}


# --- taxonomy (req 3) ----------------------------------------------------------------------------


def test_default_descriptors_cover_all_event_names() -> None:
    described = {d.name for d in DEFAULT_DESCRIPTORS}
    assert described == set(EventName)
    assert tuple(default_descriptors()) == DEFAULT_DESCRIPTORS


def test_engagement_events_are_gated() -> None:
    gated = {d.name for d in DEFAULT_DESCRIPTORS if d.availability is Availability.GATED}
    assert gated == {EventName.POST_VIEWS_SAMPLED, EventName.SUBSCRIBER_DELTA}
    for descriptor in DEFAULT_DESCRIPTORS:
        if descriptor.category is EventCategory.ENGAGEMENT:
            assert descriptor.availability is Availability.GATED


# --- registry (req 6) ----------------------------------------------------------------------------


def test_registry_register_get_known_sorted() -> None:
    registry = EventRegistry()
    registry.register_all(DEFAULT_DESCRIPTORS)
    assert registry.known() == tuple(sorted(registry.known()))
    assert EventName.TASK_STARTED in registry
    assert registry.get(EventName.TASK_FAILED).category is EventCategory.SYSTEM


def test_registry_duplicate_and_unknown() -> None:
    registry = EventRegistry()
    descriptor = EventDescriptor(
        EventName.TASK_STARTED, EventCategory.SYSTEM, EventSeverity.INFO, Availability.ALWAYS
    )
    registry.register(descriptor)
    with pytest.raises(ValueError, match="already registered"):
        registry.register(descriptor)
    with pytest.raises(EventNotRegistered):
        registry.get(EventName.TASK_FAILED)


# --- sampling (req 12) ---------------------------------------------------------------------------


def test_always_never_and_category_samplers() -> None:
    event = _event()
    assert AlwaysSample().should_sample(event) is True
    assert NeverSample().should_sample(event) is False
    assert CategorySampler(frozenset({EventCategory.SYSTEM})).should_sample(event) is True
    assert CategorySampler(frozenset({EventCategory.COST})).should_sample(event) is False


def test_rate_sampler_is_deterministic() -> None:
    event = _event()
    sampler = RateSampler(1, 2)
    first = sampler.should_sample(event)
    assert sampler.should_sample(event) is first  # stable for same correlation id
    assert RateSampler(2, 2).should_sample(event) is True  # keep-all
    assert RateSampler(0, 2).should_sample(event) is False  # keep-none


def test_rate_sampler_validates_bounds() -> None:
    with pytest.raises(ValueError, match="denominator"):
        RateSampler(1, 0)
    with pytest.raises(ValueError, match="numerator"):
        RateSampler(3, 2)


# --- collector (req 4) ---------------------------------------------------------------------------


def test_collector_accepts_and_samples() -> None:
    sink = FakeEventSink()
    collector = EventCollector(sink, sampling=AlwaysSample())
    collector.emit(_event())
    assert len(sink.drain()) == 1
    collector_drop = EventCollector(sink, sampling=NeverSample())
    collector_drop.emit(_event())
    assert len(sink.drain()) == 0


def test_collector_strict_rejects_unknown() -> None:
    registry = EventRegistry()  # empty
    collector = EventCollector(FakeEventSink(), registry=registry, strict=True)
    with pytest.raises(EventNotRegistered):
        collector.emit(_event())


# --- dispatcher (req 5) --------------------------------------------------------------------------


def test_dispatcher_fans_out_sorted_and_isolates_failure() -> None:
    hook = RecordingObservability()
    dispatcher = EventDispatcher(hook=hook)
    good = FakeEventExporter(name="b_good")

    class _Boom:
        name = "a_boom"

        def export(self, events: object) -> None:
            raise RuntimeError("boom")

    dispatcher.register(_Boom())
    dispatcher.register(good)
    assert dispatcher.exporters() == ("a_boom", "b_good")
    dispatcher.dispatch([_event()])
    assert len(good.exported) == 1  # good exporter still ran despite the failing one
    assert hook.records and hook.records[0].source == "dispatch:a_boom"


def test_dispatcher_duplicate_exporter() -> None:
    dispatcher = EventDispatcher()
    dispatcher.register(FakeEventExporter(name="x"))
    with pytest.raises(ValueError, match="already registered"):
        dispatcher.register(FakeEventExporter(name="x"))


# --- metrics: counters / timers / histograms / aggregation (reqs 7, 8, 9) ------------------------


def test_counter_increments_and_snapshots() -> None:
    counter = Counter("hits", tags={"ch": "1"})
    counter.increment()
    counter.increment(4)
    snap = counter.snapshot()
    assert isinstance(snap, CounterSnapshot)
    assert snap.value == 5
    assert counter.kind() is MetricKind.COUNTER
    with pytest.raises(ValueError, match="non-negative"):
        counter.increment(-1)


def test_timer_measures_with_injected_clock() -> None:
    clock = FakeClock(step_seconds=2.0)
    timer = Timer("latency", clock)
    with timer.measure():
        pass
    timer.record(3.0)
    snap = timer.snapshot()
    assert isinstance(snap, TimerSnapshot)
    assert snap.count == 2
    assert snap.total_seconds == pytest.approx(5.0)  # 2.0 measured + 3.0 recorded
    assert timer.kind() is MetricKind.TIMER
    with pytest.raises(ValueError, match="non-negative"):
        timer.record(-1.0)


def test_histogram_buckets_and_overflow() -> None:
    hist = Histogram("size", bounds=[10.0, 20.0])
    for value in (5.0, 15.0, 25.0):
        hist.observe(value)
    snap = hist.snapshot()
    assert isinstance(snap, HistogramSnapshot)
    assert snap.count == 3
    assert snap.sum == pytest.approx(45.0)
    assert snap.buckets[10.0] == 1
    assert snap.buckets[20.0] == 2
    assert snap.buckets[math.inf] == 3
    assert hist.kind() is MetricKind.HISTOGRAM


def test_histogram_requires_bounds() -> None:
    with pytest.raises(ValueError, match="at least one bound"):
        Histogram("x", bounds=[])


def test_metric_registry_and_aggregator() -> None:
    registry = MetricRegistry()
    counter = Counter("c")
    counter.increment(2)
    timer = Timer("t", FakeClock())
    timer.record(1.5)
    hist = Histogram("h", bounds=[1.0])
    hist.observe(0.5)
    registry.register(counter)
    registry.register(timer)
    registry.register(hist)
    with pytest.raises(ValueError, match="already registered"):
        registry.register(Counter("c"))
    assert registry.get("c") is counter
    snapshot = MetricsAggregator().collect(registry.all())
    assert [c.name for c in snapshot.counters] == ["c"]
    assert [t.name for t in snapshot.timers] == ["t"]
    assert [h.name for h in snapshot.histograms] == ["h"]


def test_fake_metric_exporter_and_sink_record() -> None:
    from app.analytics.fakes import FakeMetricExporter, FakeMetricSink

    snapshot = MetricsAggregator().collect([])
    exporter = FakeMetricExporter()
    exporter.export(snapshot)
    assert exporter.exported == [snapshot]
    sink = FakeMetricSink()
    sink.record(snapshot)
    assert sink.recorded == [snapshot]


# --- tracing (req 14) ----------------------------------------------------------------------------


def test_noop_tracer_returns_spans() -> None:
    tracer = NoOpTracer()
    correlation = new_correlation(FakeIdFactory())
    span = tracer.start_span("op", correlation)
    assert isinstance(span, Span)
    assert tracer.end_span(span) is span
    exporter = FakeSpanExporter()
    exporter.export(span)
    assert exporter.exported == [span]


# --- audit (req 10) ------------------------------------------------------------------------------


def test_audit_event_is_immutable() -> None:
    event = AuditEvent(
        actor="admin",
        action="update_channel",
        occurred_at=FakeClock().now(),
        before={"a": 1},
        after={"a": 2},
    )
    assert event.before["a"] == 1
    with pytest.raises(TypeError):
        _readonly_set(event.after, "a", 9)  # read-only proxy


# --- observability (§R11.9) ----------------------------------------------------------------------


def test_observability_record_fields() -> None:
    record = ObservabilityRecord(
        source="retrieval", algorithm_version="2", filters={"channel": "1"}, duration_seconds=0.2
    )
    assert record.algorithm_version == "2"
    assert record.filters["channel"] == "1"
    with pytest.raises(TypeError):
        _readonly_set(record.filters, "channel", "2")  # read-only proxy


# --- retention (req 13) --------------------------------------------------------------------------


def test_age_retention_keeps_recent() -> None:
    clock = FakeClock()
    old = _event(clock=FakeClock(step_seconds=0.0))  # occurred at epoch
    # advance the retention clock far past the epoch
    for _ in range(100):
        clock.now()
    result = AgeRetention(max_age_seconds=10.0, clock=clock).partition([old])
    assert result.dropped == (old,)
    assert result.kept == ()


def test_count_retention_keeps_newest() -> None:
    clock = FakeClock()
    events = [_event(clock=clock) for _ in range(3)]  # occurred_at strictly increasing
    result = CountRetention(max_count=2).partition(events)
    assert len(result.kept) == 2
    assert len(result.dropped) == 1
    assert result.dropped[0] is events[0]  # oldest dropped


def test_category_retention() -> None:
    system_event = _event(EventName.TASK_STARTED, EventCategory.SYSTEM)
    cost_event = _event(EventName.LLM_CALL_COMPLETED, EventCategory.COST)
    result = CategoryRetention(frozenset({EventCategory.SYSTEM})).partition(
        [system_event, cost_event]
    )
    assert result.kept == (system_event,)
    assert result.dropped == (cost_event,)


def test_retention_validation() -> None:
    with pytest.raises(ValueError, match="non-negative"):
        AgeRetention(-1.0, FakeClock())
    with pytest.raises(ValueError, match="non-negative"):
        CountRetention(-1)


# --- export seams (reqs 11, 15, 16) --------------------------------------------------------------


def test_export_seams_are_unimplemented() -> None:
    span = NoOpTracer().start_span("op", new_correlation(FakeIdFactory()))
    with pytest.raises(NotImplementedError, match="RV-16"):
        OpenTelemetrySpanExporter().export(span)
    with pytest.raises(NotImplementedError, match="RV-16"):
        PrometheusMetricsExporter().export(MetricsAggregator().collect([]))
    with pytest.raises(NotImplementedError, match="RV-16"):
        ExternalAnalyticsSink().export([_event()])
    with pytest.raises(NotImplementedError, match="RV-16"):
        ExternalAuditSink().export([])
    assert OpenTelemetrySpanExporter().implemented is False
    assert PrometheusMetricsExporter().name == "prometheus"
