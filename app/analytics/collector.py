"""Event Collector (owner req 4) — accepts events only; it does not route or dispatch.

The collector normalises acceptance (optional registry check), applies the sampling strategy, and
writes kept events into an :class:`~app.analytics.events.EventSink`. Delivery to exporters is the
dispatcher's job (owner reqs 4, 7).

"""

from __future__ import annotations

from app.analytics.events import Event, EventEmitter, EventSink
from app.analytics.registry import EventNotRegistered, EventRegistry
from app.analytics.sampling import AlwaysSample, SamplingStrategy


class EventCollector(EventEmitter):
    """Accepts events, applies sampling, buffers the kept ones (owner req 4)."""

    def __init__(
        self,
        sink: EventSink,
        sampling: SamplingStrategy | None = None,
        registry: EventRegistry | None = None,
        *,
        strict: bool = False,
    ) -> None:
        self._sink = sink
        self._sampling: SamplingStrategy = sampling if sampling is not None else AlwaysSample()
        self._registry = registry
        self._strict = strict

    def emit(self, event: Event) -> None:
        """Accept an event: validate (optional), sample, and buffer if kept. No routing here."""

        if self._strict and self._registry is not None and event.name not in self._registry:
            raise EventNotRegistered(event.name)
        if not self._sampling.should_sample(event):
            return
        self._sink.put(event)
