"""Handler registry (owner req 4) — fully typed, thread-safe, extensible, deterministic. Maps a name
to a handler (Command/Callback/Message); adding a handler needs no dispatcher change. ``names()`` is
sorted for deterministic iteration; unknown lookups raise ``HandlerNotRegistered``.
"""

from __future__ import annotations

import threading

from app.telegram.handlers import TelegramHandler


class HandlerNotRegistered(LookupError):
    """No handler registered under the requested name."""


class HandlerRegistry:
    def __init__(self) -> None:
        self._handlers: dict[str, TelegramHandler] = {}
        self._lock = threading.Lock()

    def register(self, name: str, handler: TelegramHandler, *, replace: bool = False) -> None:
        with self._lock:
            if name in self._handlers and not replace:
                raise ValueError(f"handler already registered: {name}")
            self._handlers[name] = handler

    def get(self, name: str) -> TelegramHandler:
        with self._lock:
            try:
                return self._handlers[name]
            except KeyError as exc:
                raise HandlerNotRegistered(name) from exc

    def names(self) -> tuple[str, ...]:
        with self._lock:
            return tuple(sorted(self._handlers))
