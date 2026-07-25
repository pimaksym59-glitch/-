"""Context assembly (owner req 7, §R9.8) — works **only** on already-ranked results; it never
touches
a store. It packs the top results into ``ContextItem``s (the AI-Engine context port, Stage 12)
under a
token budget and a few-shot ``limit`` (K=3-5). Deterministic.
"""

from __future__ import annotations

from collections.abc import Sequence

from app.content.budget import TokenEstimator
from app.content.sources import ContextItem
from app.rag.types import SearchResult


class ContextAssembler:
    def __init__(self, estimator: TokenEstimator, *, kind: str = "knowledge") -> None:
        self._estimator = estimator
        self._kind = kind

    def assemble(
        self, results: Sequence[SearchResult], *, budget: int, limit: int
    ) -> list[ContextItem]:
        items: list[ContextItem] = []
        used = 0
        for result in results[:limit]:
            cost = self._estimator.estimate(result.chunk.text)
            if used + cost > budget:
                break
            items.append(
                ContextItem(
                    kind=self._kind,
                    text=result.chunk.text,
                    source=str(result.chunk.document_id),
                )
            )
            used += cost
        return items
