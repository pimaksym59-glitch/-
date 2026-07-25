"""Provider registry (§R3.8, owner req 3) — fully typed, thread-safe, extensible, and independent of
concrete implementations. It maps ``(kind, name)`` to a *builder* ``(Settings) -> Provider``. New
providers register a builder without touching existing modules; unknown lookups raise a clear
``ProviderNotRegistered`` rather than crashing.
"""

from __future__ import annotations

import threading
from collections.abc import Callable

from app.core.config import Settings
from app.core.providers.base import Provider, ProviderKind

ProviderBuilder = Callable[[Settings], Provider]

FAKE_NAME = "fake"


class ProviderNotRegistered(LookupError):
    """No builder registered for the requested ``(kind, name)``."""


class ProviderRegistry:
    """Thread-safe registry of provider builders keyed by ``(kind, name)``."""

    def __init__(self) -> None:
        self._builders: dict[tuple[ProviderKind, str], ProviderBuilder] = {}
        self._lock = threading.Lock()

    def register(
        self, kind: ProviderKind, name: str, builder: ProviderBuilder, *, replace: bool = False
    ) -> None:
        """Register ``builder`` for ``(kind, name)``. Refuses to clobber unless ``replace=True``."""
        key = (kind, name)
        with self._lock:
            if key in self._builders and not replace:
                raise ValueError(f"provider already registered: {kind.value}/{name}")
            self._builders[key] = builder

    def get(self, kind: ProviderKind, name: str) -> ProviderBuilder:
        """Return the builder for ``(kind, name)`` or raise ``ProviderNotRegistered``."""
        with self._lock:
            try:
                return self._builders[(kind, name)]
            except KeyError as exc:
                raise ProviderNotRegistered(f"{kind.value}/{name}") from exc

    def has(self, kind: ProviderKind, name: str) -> bool:
        with self._lock:
            return (kind, name) in self._builders

    def names(self, kind: ProviderKind) -> frozenset[str]:
        """All registered implementation names for ``kind``."""
        with self._lock:
            return frozenset(name for (k, name) in self._builders if k == kind)

    def default_real(self, kind: ProviderKind) -> str | None:
        """A registered non-fake implementation name for ``kind`` (first, sorted), or None."""
        with self._lock:
            reals = sorted(name for (k, name) in self._builders if k == kind and name != FAKE_NAME)
        return reals[0] if reals else None
