"""Typed, thread-safe, extensible, deterministic Event Registry (owner req 6)."""

from __future__ import annotations

import threading
from collections.abc import Iterable

from app.analytics.taxonomy import EventDescriptor, EventName


class EventNotRegistered(KeyError):
    """Raised when an unknown event name is requested from the registry."""


class EventRegistry:
    """Registry of :class:`EventDescriptor` keyed by :class:`EventName` (owner req 6).

    Fully typed, guarded by a lock (thread-safe), extensible via :meth:`register`, and
    deterministic — :meth:`known` returns names in sorted order.

    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._by_name: dict[EventName, EventDescriptor] = {}

    def register(self, descriptor: EventDescriptor) -> None:
        """Register a descriptor. Raises ``ValueError`` on a duplicate name."""

        with self._lock:
            if descriptor.name in self._by_name:
                raise ValueError(f"event already registered: {descriptor.name}")
            self._by_name[descriptor.name] = descriptor

    def register_all(self, descriptors: Iterable[EventDescriptor]) -> None:
        """Register several descriptors (order-independent)."""

        for descriptor in descriptors:
            self.register(descriptor)

    def get(self, name: EventName) -> EventDescriptor:
        """Return the descriptor for ``name`` or raise :class:`EventNotRegistered`."""

        with self._lock:
            try:
                return self._by_name[name]
            except KeyError as exc:
                raise EventNotRegistered(name) from exc

    def known(self) -> tuple[EventName, ...]:
        """Return all registered names in deterministic (sorted) order."""

        with self._lock:
            return tuple(sorted(self._by_name))

    def __contains__(self, name: object) -> bool:
        with self._lock:
            return name in self._by_name
