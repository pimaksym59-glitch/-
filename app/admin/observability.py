"""Admin metrics/logging hooks (owner req 16) — hooks only, no implementation.

Services call these hooks on actions; the defaults are no-ops. Concrete metrics/log backends
plug in at composition (reuse of the queue/analytics infrastructure) — RV-17. Defined locally
so the subsystem stays fully independent (owner req 1).

"""

from __future__ import annotations

from typing import Any, Protocol


class AdminMetricsHook(Protocol):
    """Increment-style metrics hook for admin actions."""

    def incr(self, name: str) -> None: ...


class AdminLoggingHook(Protocol):
    """Structured logging hook for admin actions."""

    def event(self, name: str, **fields: Any) -> None: ...


class NoOpMetrics:
    """Default no-op metrics hook."""

    def incr(self, name: str) -> None: ...


class NoOpLogger:
    """Default no-op logging hook."""

    def event(self, name: str, **fields: Any) -> None: ...
