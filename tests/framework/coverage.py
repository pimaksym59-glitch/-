"""Coverage component (owner req 17) — a standalone policy, not tied to pytest.

Evaluates externally supplied coverage numbers against thresholds; it does not run or import
any coverage tool or test runner (owner req 17). Real coverage-tool integration / CI
enforcement is a seam (RV-18).

"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True, slots=True)
class CoverageThreshold:
    """A minimum coverage fraction for a scope (e.g. overall / a domain package)."""

    scope: str
    floor: float


@dataclass(frozen=True, slots=True)
class CoverageResult:
    """Whether a scope met its floor, with the measured value."""

    scope: str
    measured: float
    floor: float
    passed: bool


class CoverageReadPort(Protocol):
    """Supplies measured coverage per scope (adapts a real coverage tool in future)."""

    def measured(self) -> Mapping[str, float]: ...


class CoveragePolicy:
    """Decides pass/fail per scope against thresholds (owner req 17)."""

    def __init__(self, thresholds: Sequence[CoverageThreshold]) -> None:
        self._thresholds = tuple(thresholds)

    def evaluate(self, measured: Mapping[str, float]) -> tuple[CoverageResult, ...]:
        results: list[CoverageResult] = []
        for threshold in self._thresholds:
            value = measured.get(threshold.scope, 0.0)
            results.append(
                CoverageResult(
                    scope=threshold.scope,
                    measured=value,
                    floor=threshold.floor,
                    passed=value >= threshold.floor,
                )
            )
        return tuple(results)

    def all_passed(self, measured: Mapping[str, float]) -> bool:
        return all(result.passed for result in self.evaluate(measured))


class CoverageToolSeam:
    """Seam for a future coverage-tool/CI-enforcement backend — not implemented (RV-18)."""

    implemented = False

    def collect(self) -> Mapping[str, float]:
        raise NotImplementedError("coverage tooling is Runtime Verification Pending (RV-18)")
