"""Performance test strategy (owner reqs 10, 20) — a model only, no real load.

Measures a callable's duration against a budget using an injected
:class:`~tests.framework.ports.Clock` (deterministic). It never generates real load; a real
load-testing backend is a seam (RV-18).

"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from tests.framework.ports import Clock


@dataclass(frozen=True, slots=True)
class PerfBudget:
    """A latency budget in seconds."""

    max_seconds: float


@dataclass(frozen=True, slots=True)
class PerfResult:
    """A measured duration and whether it met the budget."""

    seconds: float
    within_budget: bool


class PerformanceStrategy:
    """Times a callable against a budget using the injected clock (owner req 10)."""

    def __init__(self, clock: Clock) -> None:
        self._clock = clock

    def measure(self, budget: PerfBudget, fn: Callable[[], object]) -> PerfResult:
        """Run ``fn`` once; the clock's advance between start and end is the modelled duration."""

        start = self._clock.now()
        fn()
        end = self._clock.now()
        seconds = (end - start).total_seconds()
        return PerfResult(seconds=seconds, within_budget=seconds <= budget.max_seconds)


class LoadToolSeam:
    """Seam for a future load-testing backend — not implemented (owner req 20, RV-18)."""

    implemented = False

    def run(self, *args: object, **kwargs: object) -> None:
        raise NotImplementedError("load testing is Runtime Verification Pending (RV-18)")
