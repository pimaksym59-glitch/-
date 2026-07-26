"""Retention strategies (owner req 13) — a strategy separate from collection/export.

A strategy only *decides* which events to keep vs. drop; it never deletes real data (actual
deletion is composition/RV-16). :class:`AgeRetention` reads time from an injected
:class:`~app.analytics.ports.Clock` (owner req 17), so decisions are deterministic under test.

"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol

from app.analytics.events import Event
from app.analytics.ports import Clock
from app.analytics.taxonomy import EventCategory


@dataclass(frozen=True, slots=True)
class RetentionResult:
    """Immutable partition of events into kept vs. dropped."""

    kept: tuple[Event, ...]
    dropped: tuple[Event, ...]


class RetentionStrategy(Protocol):
    """Decides which events are retained (owner req 13). Decision only — no deletion."""

    def partition(self, events: Sequence[Event]) -> RetentionResult: ...


class AgeRetention:
    """Keep events younger than ``max_age_seconds`` relative to the injected clock."""

    def __init__(self, max_age_seconds: float, clock: Clock) -> None:
        if max_age_seconds < 0:
            raise ValueError("max_age_seconds must be non-negative")
        self._max_age = max_age_seconds
        self._clock = clock

    def partition(self, events: Sequence[Event]) -> RetentionResult:
        now = self._clock.now()
        kept: list[Event] = []
        dropped: list[Event] = []
        for event in events:
            age = (now - event.occurred_at).total_seconds()
            (kept if age <= self._max_age else dropped).append(event)
        return RetentionResult(kept=tuple(kept), dropped=tuple(dropped))


class CountRetention:
    """Keep the newest ``max_count`` events by ``occurred_at`` (drops the oldest overflow)."""

    def __init__(self, max_count: int) -> None:
        if max_count < 0:
            raise ValueError("max_count must be non-negative")
        self._max_count = max_count

    def partition(self, events: Sequence[Event]) -> RetentionResult:
        ordered = sorted(events, key=lambda e: e.occurred_at, reverse=True)
        kept = tuple(ordered[: self._max_count])
        dropped = tuple(ordered[self._max_count :])
        return RetentionResult(kept=kept, dropped=dropped)


class CategoryRetention:
    """Keep only events whose category is in the allow-list."""

    def __init__(self, allowed: frozenset[EventCategory]) -> None:
        self._allowed = allowed

    def partition(self, events: Sequence[Event]) -> RetentionResult:
        kept: list[Event] = []
        dropped: list[Event] = []
        for event in events:
            (kept if event.category in self._allowed else dropped).append(event)
        return RetentionResult(kept=tuple(kept), dropped=tuple(dropped))
