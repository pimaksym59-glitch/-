"""Sampling strategies (owner req 12) — a strategy separate from collection.

All strategies are deterministic: :class:`RateSampler` buckets on a stable hash of the correlation
id (``hashlib``, not the salted builtin ``hash``) so the same event is always sampled the same
way, with no randomness (owner req 17).

"""

from __future__ import annotations

import hashlib
from typing import Protocol

from app.analytics.events import Event
from app.analytics.taxonomy import EventCategory


class SamplingStrategy(Protocol):
    """Decides whether an event is kept (owner req 12)."""

    def should_sample(self, event: Event) -> bool: ...


class AlwaysSample:
    """Keep every event."""

    def should_sample(self, event: Event) -> bool:
        return True


class NeverSample:
    """Drop every event."""

    def should_sample(self, event: Event) -> bool:
        return False


def _stable_bucket(key: str, denominator: int) -> int:
    """Deterministic bucket in ``[0, denominator)`` from a stable SHA-256 hash."""

    digest = hashlib.sha256(key.encode("utf-8")).digest()
    return int.from_bytes(digest[:8], "big") % denominator


class RateSampler:
    """Keep ``numerator/denominator`` of events, chosen deterministically by correlation id."""

    def __init__(self, numerator: int, denominator: int) -> None:
        if denominator <= 0:
            raise ValueError("denominator must be positive")
        if not 0 <= numerator <= denominator:
            raise ValueError("numerator must be within [0, denominator]")
        self._numerator = numerator
        self._denominator = denominator

    def should_sample(self, event: Event) -> bool:
        return _stable_bucket(event.correlation.correlation_id, self._denominator) < self._numerator


class CategorySampler:
    """Keep only events whose category is in the allow-list."""

    def __init__(self, allowed: frozenset[EventCategory]) -> None:
        self._allowed = allowed

    def should_sample(self, event: Event) -> bool:
        return event.category in self._allowed
