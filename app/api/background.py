"""Background-tasks integration point (§R10.1) — infrastructure seam only.

FastAPI ``BackgroundTasks`` is for **trivial, non-domain** post-response side-effects (a log line or
in-process notification). It is **not** an async execution path for domain work:
generation/validation/publishing and every other domain operation go **exclusively** through the
task queue (§R8, §R10.1). There is no second publish path. This helper makes that boundary explicit
at the call site.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable

from fastapi import BackgroundTasks

SideEffect = Callable[[], Awaitable[None] | None]


def run_after_response(background: BackgroundTasks, side_effect: SideEffect) -> None:
    """Queue a trivial side-effect to run after the response is sent (never domain work, §R10.1)."""
    background.add_task(side_effect)
