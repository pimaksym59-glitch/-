"""Regression test strategy (owner req 15) — kept separate from snapshot (owner req 7).

Regression works over **named numeric/serialisable baselines** and detects change against a
captured baseline, independently of the snapshot serialization mechanism. A baseline is
captured once, then compared; tolerance is explicit.

"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class RegressionResult:
    """Whether a metric regressed against its baseline, with the observed delta."""

    metric: str
    regressed: bool
    delta: float


class RegressionBaseline:
    """A captured baseline of named metric values."""

    def __init__(self, values: Mapping[str, float] | None = None) -> None:
        self._values: dict[str, float] = dict(values or {})

    def capture(self, metric: str, value: float) -> None:
        self._values[metric] = value

    def get(self, metric: str) -> float | None:
        return self._values.get(metric)


class RegressionStrategy:
    """Compares current metric values to a baseline within a tolerance (owner req 15)."""

    def __init__(self, baseline: RegressionBaseline, tolerance: float = 0.0) -> None:
        self._baseline = baseline
        self._tolerance = tolerance

    def check(self, metric: str, value: float, *, higher_is_worse: bool = True) -> RegressionResult:
        """Regression if the value worsens beyond tolerance vs the baseline (first sight
        captures)."""

        base = self._baseline.get(metric)
        if base is None:
            self._baseline.capture(metric, value)
            return RegressionResult(metric=metric, regressed=False, delta=0.0)
        delta = value - base
        worsened = delta > self._tolerance if higher_is_worse else delta < -self._tolerance
        return RegressionResult(metric=metric, regressed=worsened, delta=delta)
