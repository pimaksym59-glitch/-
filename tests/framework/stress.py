"""Stress test strategy (owner reqs 12, 20) — a model only, no real stress.

Models a workload (arrival rate, duration, concurrency) against a capacity and decides whether
the system would degrade. It never generates real traffic; a real stress backend is a seam
(RV-18).

"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class WorkloadSpec:
    """A modelled workload."""

    rate_per_second: float
    duration_seconds: float
    concurrency: int


@dataclass(frozen=True, slots=True)
class StressDecision:
    """Whether the workload stays within capacity, and the modelled peak load."""

    within_capacity: bool
    peak_inflight: float


class StressStrategy:
    """Decides whether a workload exceeds a modelled capacity (owner req 12)."""

    def __init__(self, capacity_inflight: float) -> None:
        if capacity_inflight <= 0:
            raise ValueError("capacity must be positive")
        self._capacity = capacity_inflight

    def evaluate(self, workload: WorkloadSpec) -> StressDecision:
        """Peak in-flight ~ rate x concurrency; compare to capacity (model)."""

        peak = workload.rate_per_second * workload.concurrency
        return StressDecision(within_capacity=peak <= self._capacity, peak_inflight=peak)


class StressToolSeam:
    """Seam for a future real stress backend — not implemented (owner req 20, RV-18)."""

    implemented = False

    def run(self, *args: object, **kwargs: object) -> None:
        raise NotImplementedError("stress testing is Runtime Verification Pending (RV-18)")
