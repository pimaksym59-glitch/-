"""Test pyramid model (TEST_PLAN §Levels) — target proportions and coverage thresholds.

Immutable data describing the intended shape of the suite (many unit, fewer integration, few
E2E) and the line-coverage floors. Pure model; enforcement is the coverage component's job
(owner req 17).

"""

from __future__ import annotations

from dataclasses import dataclass

from tests.framework.architecture import TestLevel


@dataclass(frozen=True, slots=True)
class PyramidTier:
    """A pyramid tier: level, its intended weight, and its coverage floor (fraction)."""

    level: TestLevel
    weight: int
    coverage_floor: float


DEFAULT_PYRAMID: tuple[PyramidTier, ...] = (
    PyramidTier(TestLevel.UNIT, weight=100, coverage_floor=0.90),
    PyramidTier(TestLevel.CONTRACT, weight=30, coverage_floor=0.85),
    PyramidTier(TestLevel.INTEGRATION, weight=20, coverage_floor=0.0),
    PyramidTier(TestLevel.API, weight=15, coverage_floor=0.0),
    PyramidTier(TestLevel.MIGRATION, weight=5, coverage_floor=0.0),
    PyramidTier(TestLevel.E2E, weight=10, coverage_floor=0.0),
)

OVERALL_LINE_FLOOR = 0.85
"""Overall line-coverage floor (TEST_PLAN §Levels)."""


class TestPyramid:
    """Read model over the pyramid tiers (owner req 2 — data only, no execution)."""

    __test__ = False  # not a pytest test class

    def __init__(self, tiers: tuple[PyramidTier, ...] = DEFAULT_PYRAMID) -> None:
        self._tiers = tiers

    def tiers(self) -> tuple[PyramidTier, ...]:
        return self._tiers

    def floor_for(self, level: TestLevel) -> float:
        for tier in self._tiers:
            if tier.level is level:
                return tier.coverage_floor
        return 0.0

    def is_bottom_heavy(self) -> bool:
        """True iff unit is the heaviest tier (a healthy pyramid)."""

        heaviest = max(self._tiers, key=lambda t: t.weight)
        return heaviest.level is TestLevel.UNIT
