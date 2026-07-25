"""Ranking (owner req 6, §R9.7) — takes already-found candidates and returns them sorted. It never
re-retrieves and never touches a store. ``ScoreRanker`` sorts by score; reranking / Reciprocal Rank
Fusion for hybrid search is an extension point (owner req 13).
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol

from app.rag.types import SearchResult


class Ranker(Protocol):
    def rank(self, results: Sequence[SearchResult]) -> list[SearchResult]: ...


class ScoreRanker:
    """Descending by score; stable for equal scores (deterministic)."""

    def rank(self, results: Sequence[SearchResult]) -> list[SearchResult]:
        return sorted(results, key=lambda result: result.score, reverse=True)
