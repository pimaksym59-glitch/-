"""Concurrency test strategy (owner reqs 11, 20) — a model only, no real threads.

Enumerates interleavings of two step-sequences deterministically and checks an invariant
predicate against every resulting order. It never starts threads/processes; a real
concurrency-stress backend is a seam (RV-18).

"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from itertools import permutations


@dataclass(frozen=True, slots=True)
class InterleavingResult:
    """Whether the invariant held across all interleavings; a violating order if not."""

    safe: bool
    checked: int
    violation: tuple[str, ...] | None = None


class ConcurrencyStrategy:
    """Checks an invariant across deterministic interleavings of labelled steps (owner req 11)."""

    def check_interleavings(
        self, steps: Sequence[str], invariant: Callable[[tuple[str, ...]], bool]
    ) -> InterleavingResult:
        """Enumerate orderings of ``steps`` and assert ``invariant`` holds for each."""

        checked = 0
        for order in sorted(set(permutations(steps))):
            checked += 1
            if not invariant(order):
                return InterleavingResult(safe=False, checked=checked, violation=order)
        return InterleavingResult(safe=True, checked=checked)


class ConcurrencyToolSeam:
    """Seam for a future real concurrency-stress backend — not implemented (owner req 20, RV-18)."""

    implemented = False

    def run(self, *args: object, **kwargs: object) -> None:
        raise NotImplementedError("concurrency stress is Runtime Verification Pending (RV-18)")
