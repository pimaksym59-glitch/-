"""Compatibility test strategy (owner req 14) — a version/matrix model.

Decides whether a (Python version, package set) row is compatible with the project's declared
floors (Python ``>=3.13``). Pure decision over data; real cross-version runs are a later
concern (RV-18).

"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field

MIN_PYTHON: tuple[int, int] = (3, 13)


@dataclass(frozen=True, slots=True)
class CompatibilityRow:
    """A compatibility matrix row."""

    python: tuple[int, int]
    packages: tuple[str, ...] = field(default_factory=tuple)


@dataclass(frozen=True, slots=True)
class CompatibilityVerdict:
    """Compatibility decision for a row, with a reason on failure."""

    row: CompatibilityRow
    compatible: bool
    reason: str | None = None


class CompatibilityStrategy:
    """Evaluates rows against the project's floors (owner req 14)."""

    def __init__(self, min_python: tuple[int, int] = MIN_PYTHON) -> None:
        self._min_python = min_python

    def evaluate(self, row: CompatibilityRow) -> CompatibilityVerdict:
        if row.python < self._min_python:
            return CompatibilityVerdict(row, compatible=False, reason="python below floor")
        return CompatibilityVerdict(row, compatible=True)

    def evaluate_all(self, rows: Sequence[CompatibilityRow]) -> tuple[CompatibilityVerdict, ...]:
        return tuple(self.evaluate(row) for row in rows)
