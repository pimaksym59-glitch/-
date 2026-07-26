"""Health dashboard (owner reqs 10, 13) — read probe results through a public port; no business
logic.

The admin domain defines :class:`HealthReadPort` (adapted to the public ``HealthService`` in
composition). The dashboard performs only shaping — it does not run probes or inspect internal
implementations (owner reqs 10, 13).

"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol

from app.admin.dto import HealthView, ProbeView


class HealthReadPort(Protocol):
    """Read port for readiness probe results (adapted to ``HealthService`` in composition)."""

    def probes(self) -> Sequence[ProbeView]: ...


class HealthDashboard:
    """Shapes probe results into a health view — healthy iff every probe is healthy (no logic
    beyond)."""

    def __init__(self, port: HealthReadPort) -> None:
        self._port = port

    def view(self) -> HealthView:
        probes = tuple(self._port.probes())
        healthy = all(probe.healthy for probe in probes)
        return HealthView(healthy=healthy, probes=probes)
