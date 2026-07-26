"""Deterministic fakes (owner reqs 16, 17) — in-memory, no randomness, no network, no real time.

Every fake advances only through explicit state (a monotonic fake clock, a sequential id factory),
so tests are fully reproducible. Fakes record what they receive; none of them export anything off-
process.

"""

from __future__ import annotations

import datetime
from collections.abc import Sequence

from app.analytics.audit import AuditEvent
from app.analytics.events import Event
from app.analytics.metrics import MetricsSnapshot
from app.analytics.observability import ObservabilityRecord
from app.analytics.tracing import Span

_EPOCH = datetime.datetime(2026, 1, 1, tzinfo=datetime.UTC)


class FakeClock:
    """Monotonic clock that advances by a fixed step on every :meth:`now` call."""

    def __init__(self, start: datetime.datetime | None = None, step_seconds: float = 1.0) -> None:
        self._current = start if start is not None else _EPOCH
        self._step = datetime.timedelta(seconds=step_seconds)

    def now(self) -> datetime.datetime:
        value = self._current
        self._current = self._current + self._step
        return value


class FakeIdFactory:
    """Sequential id factory: ``<prefix>-1``, ``<prefix>-2``, ..."""

    def __init__(self, prefix: str = "id") -> None:
        self._prefix = prefix
        self._n = 0

    def new_id(self) -> str:
        self._n += 1
        return f"{self._prefix}-{self._n}"


class FakeEventSink:
    """In-memory event buffer."""

    def __init__(self) -> None:
        self._events: list[Event] = []

    def put(self, event: Event) -> None:
        self._events.append(event)

    def drain(self) -> Sequence[Event]:
        drained = tuple(self._events)
        self._events.clear()
        return drained


class FakeEventExporter:
    """Records exported events in memory (no real export)."""

    def __init__(self, name: str = "fake_events") -> None:
        self.name = name
        self.exported: list[Event] = []

    def export(self, events: Sequence[Event]) -> None:
        self.exported.extend(events)


class FakeMetricExporter:
    """Records exported metrics snapshots in memory (no real export)."""

    def __init__(self, name: str = "fake_metrics") -> None:
        self.name = name
        self.exported: list[MetricsSnapshot] = []

    def export(self, snapshot: MetricsSnapshot) -> None:
        self.exported.append(snapshot)


class FakeMetricSink:
    """Records metrics snapshots handed to a sink (no real export)."""

    def __init__(self) -> None:
        self.recorded: list[MetricsSnapshot] = []

    def record(self, snapshot: MetricsSnapshot) -> None:
        self.recorded.append(snapshot)


class FakeAuditSink:
    """In-memory audit buffer."""

    def __init__(self) -> None:
        self._events: list[AuditEvent] = []

    def put(self, event: AuditEvent) -> None:
        self._events.append(event)

    def drain(self) -> Sequence[AuditEvent]:
        drained = tuple(self._events)
        self._events.clear()
        return drained


class FakeAuditExporter:
    """Records exported audit events in memory (no real export)."""

    def __init__(self, name: str = "fake_audit") -> None:
        self.name = name
        self.exported: list[AuditEvent] = []

    def export(self, events: Sequence[AuditEvent]) -> None:
        self.exported.extend(events)


class FakeSpanExporter:
    """Records exported spans in memory (no real export)."""

    def __init__(self, name: str = "fake_spans") -> None:
        self.name = name
        self.exported: list[Span] = []

    def export(self, span: Span) -> None:
        self.exported.append(span)


class RecordingObservability:
    """Deterministic observability hook that stores records in memory (for assertions)."""

    def __init__(self) -> None:
        self.records: list[ObservabilityRecord] = []

    def record(self, record: ObservabilityRecord) -> None:
        self.records.append(record)
