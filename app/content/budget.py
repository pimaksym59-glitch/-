"""Token budgeting + context-window management (§R5.2, §R9.8, owner req 7). All math is
**deterministic** and goes through the ``TokenEstimator`` interface — no dependency on any concrete
tokenizer (a real one plugs in later). The default is a conservative char-based heuristic.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol

from app.content.sources import ContextItem


class TokenEstimator(Protocol):
    def estimate(self, text: str) -> int: ...


class HeuristicTokenEstimator:
    """Deterministic ~4-chars-per-token estimate (ceil); empty text is 0 tokens."""

    _CHARS_PER_TOKEN = 4

    def estimate(self, text: str) -> int:
        if not text:
            return 0
        return -(-len(text) // self._CHARS_PER_TOKEN)  # ceil division


def fit_within(
    items: Sequence[ContextItem], estimator: TokenEstimator, budget: int
) -> list[ContextItem]:
    """Greedily keep items (in order) whose cumulative token estimate stays within ``budget``.

    Deterministic: order preserved, later items dropped once the budget is exhausted. A negative or
    zero budget keeps nothing.
    """
    kept: list[ContextItem] = []
    remaining = budget
    for item in items:
        cost = estimator.estimate(item.text)
        if cost > remaining:
            break
        kept.append(item)
        remaining -= cost
    return kept
