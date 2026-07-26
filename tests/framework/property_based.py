"""Property-based testing strategy (owner req 8) — deterministic, independent of Hypothesis.

A minimal seeded property runner drives a predicate over generated cases and returns the first
counterexample (or ``None``). A ``HypothesisSeam`` marks where a real Hypothesis backend plugs
in later, **without** depending on it (owner req 8, RV-18).

"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from tests.framework.data import SeededGenerator
from tests.framework.seed import SeedManager


@dataclass(frozen=True, slots=True)
class PropertyResult[T]:
    """Outcome of a property run: held, or a counterexample with the case count checked."""

    held: bool
    checked: int
    counterexample: T | None = None


class PropertyStrategy:
    """Runs a predicate over deterministically generated cases (owner req 8)."""

    def __init__(self, seeds: SeedManager, cases: int = 50) -> None:
        self._seeds = seeds
        self._cases = cases

    def for_all[T](
        self, generate: Callable[[SeededGenerator], T], predicate: Callable[[T], bool]
    ) -> PropertyResult[T]:
        """Check ``predicate`` over generated cases; stop at the first counterexample."""

        gen = SeededGenerator(self._seeds, "property")
        for index in range(1, self._cases + 1):
            case = generate(gen)
            if not predicate(case):
                return PropertyResult(held=False, checked=index, counterexample=case)
        return PropertyResult(held=True, checked=self._cases)


class HypothesisSeam:
    """Seam for a future Hypothesis backend — declared, not implemented (owner req 8, RV-18)."""

    implemented = False

    def run(self, *args: object, **kwargs: object) -> None:
        raise NotImplementedError("Hypothesis integration is Runtime Verification Pending (RV-18)")
