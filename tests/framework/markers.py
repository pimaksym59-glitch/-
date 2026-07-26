"""Centralised pytest markers + integration gating (§R3.9/§R12.12).

One place that names the markers and decides whether gated levels run (``RUN_INTEGRATION=1``).
Keeps the gating rule out of individual test files.

"""

from __future__ import annotations

import os

INTEGRATION = "integration"
E2E = "e2e"
CONTRACT = "contract"
SLOW = "slow"

ALL_MARKERS: tuple[str, ...] = (INTEGRATION, E2E, CONTRACT, SLOW)


def integration_enabled(env: dict[str, str] | None = None) -> bool:
    """True iff live-service integration is enabled (``RUN_INTEGRATION=1``)."""

    source = env if env is not None else dict(os.environ)
    return source.get("RUN_INTEGRATION") == "1"


def skip_reason(dependency: str) -> str:
    """Uniform skip reason for a gated integration test."""

    return f"requires a live {dependency} (set RUN_INTEGRATION=1)"


class MarkerRegistry:
    """Registry of known markers (owner req 2 — data only)."""

    def __init__(self, markers: tuple[str, ...] = ALL_MARKERS) -> None:
        self._markers = markers

    def known(self) -> tuple[str, ...]:
        return tuple(sorted(self._markers))

    def is_known(self, name: str) -> bool:
        return name in self._markers
