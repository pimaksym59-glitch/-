"""Analytics Pipeline (owner req 7) — wires Collector -> Sink -> Dispatcher -> Exporters.

This is the event flow only. It is completely independent of the audit pipeline (owner req 10): it
does not import :mod:`app.analytics.audit_pipeline`, and vice versa.

"""

from __future__ import annotations

from app.analytics.dispatcher import EventDispatcher
from app.analytics.events import Event, EventEmitter, EventSink


class AnalyticsPipeline:
    """Composes the event flow from independent components via public Protocols (owner req 7)."""

    def __init__(
        self, collector: EventEmitter, dispatcher: EventDispatcher, sink: EventSink
    ) -> None:
        self._collector = collector
        self._dispatcher = dispatcher
        self._sink = sink

    def emit(self, event: Event) -> None:
        """Submit an event (collector applies acceptance/sampling and buffers it)."""

        self._collector.emit(event)

    def flush(self) -> None:
        """Drain the buffer and dispatch the batch to all exporters."""

        self._dispatcher.dispatch(self._sink.drain())
