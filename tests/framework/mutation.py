"""Mutation testing strategy (owner req 9) — a model only, no real mutmut/cosmic-ray.

Models mutation operators and classifies each mutant as *killed* (the test suite fails on it)
or *survived* (a coverage gap). A ``MutationToolSeam`` marks where a real mutmut/cosmic-ray
backend plugs in later, without any integration (owner req 9, RV-18).

"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from enum import StrEnum


class MutationOperator(StrEnum):
    """A sample of mutation operators (model)."""

    NEGATE_CONDITIONAL = "negate_conditional"
    SWAP_OPERATOR = "swap_operator"
    CONSTANT_BUMP = "constant_bump"
    REMOVE_CALL = "remove_call"


@dataclass(frozen=True, slots=True)
class Mutant:
    """A modelled mutant: an operator + a predicate that is ``True`` when the suite kills it."""

    operator: MutationOperator
    killed_by_suite: bool


@dataclass(frozen=True, slots=True)
class MutationOutcome:
    """Aggregate mutation result: killed vs survived, and the score."""

    killed: int
    survived: int

    @property
    def total(self) -> int:
        return self.killed + self.survived

    @property
    def score(self) -> float:
        return self.killed / self.total if self.total else 1.0


class MutationStrategy:
    """Classifies mutants using an injected 'suite kills mutant?' oracle (owner req 9)."""

    def evaluate(
        self, mutants: Sequence[Mutant], oracle: Callable[[Mutant], bool] | None = None
    ) -> MutationOutcome:
        """Return the killed/survived tally. ``oracle`` overrides each mutant's own flag if
        given."""

        killed = 0
        survived = 0
        for mutant in mutants:
            is_killed = oracle(mutant) if oracle is not None else mutant.killed_by_suite
            if is_killed:
                killed += 1
            else:
                survived += 1
        return MutationOutcome(killed=killed, survived=survived)


class MutationToolSeam:
    """Seam for a future mutmut/cosmic-ray backend — not implemented (owner req 9, RV-18)."""

    implemented = False

    def run(self, *args: object, **kwargs: object) -> None:
        raise NotImplementedError("mutation tooling is Runtime Verification Pending (RV-18)")
