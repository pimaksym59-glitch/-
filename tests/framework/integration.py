"""Integration test architecture (§R3.9/§R12.12) — the gated harness.

Integration tests touch live DB/queue/network and therefore only run under
``RUN_INTEGRATION=1``; offline they are skipped and not counted (RV). This module centralises
the gate so individual tests just declare a dependency. It never opens a connection itself
(owner req 21).

"""

from __future__ import annotations

from dataclasses import dataclass

from tests.framework.markers import integration_enabled, skip_reason


@dataclass(frozen=True, slots=True)
class GateDecision:
    """Whether a gated test should run, and why not if skipped."""

    run: bool
    reason: str | None


def gate(dependency: str, env: dict[str, str] | None = None) -> GateDecision:
    """Decide whether a live-``dependency`` integration test runs (offline → skip, RV)."""

    if integration_enabled(env):
        return GateDecision(run=True, reason=None)
    return GateDecision(run=False, reason=skip_reason(dependency))
