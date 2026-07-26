"""Snapshot testing strategy (owner req 7) — kept fully separate from regression (owner req 15).

Serialises a value deterministically and compares it to a stored snapshot via a
:class:`SnapshotStore` port. Offline and reproducible; there is no filesystem/network
requirement (the default store is in-memory).

"""

from __future__ import annotations

from typing import Protocol


class SnapshotMismatch(AssertionError):
    """Raised when a value does not match its stored snapshot."""


class SnapshotStore(Protocol):
    """Persistence port for snapshots (real file/store backend is a later concern)."""

    def get(self, name: str) -> str | None: ...

    def put(self, name: str, value: str) -> None: ...


class InMemorySnapshotStore(SnapshotStore):
    """Deterministic in-memory snapshot store."""

    def __init__(self) -> None:
        self._by_name: dict[str, str] = {}

    def get(self, name: str) -> str | None:
        return self._by_name.get(name)

    def put(self, name: str, value: str) -> None:
        self._by_name[name] = value


def serialize(value: object) -> str:
    """Deterministic serialization of a value for snapshotting."""

    return repr(value)


class SnapshotStrategy:
    """Compares values to stored snapshots (owner req 7)."""

    def __init__(self, store: SnapshotStore, *, update: bool = False) -> None:
        self._store = store
        self._update = update

    def assert_match(self, name: str, value: object) -> None:
        """Store on first sight (or in update mode); otherwise raise on mismatch."""

        serialized = serialize(value)
        existing = self._store.get(name)
        if existing is None or self._update:
            self._store.put(name, serialized)
            return
        if existing != serialized:
            raise SnapshotMismatch(f"snapshot '{name}' changed")
