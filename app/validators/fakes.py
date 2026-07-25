"""Deterministic fake check-ports (owner req 16) — offline stand-ins for the semantic duplication
checker and the humanness scorer. They return configured constants (no randomness, no I/O), so tests
and offline runs are fully deterministic. Real implementations (Memory/RAG, LLM-judge) are RV-13.
"""

from __future__ import annotations

import uuid


class FakeDuplicationChecker:
    def __init__(self, similarity: float = 0.0) -> None:
        self._similarity = similarity

    async def max_similarity(self, text: str, *, channel_id: uuid.UUID | None) -> float:
        return self._similarity


class FakeHumannessScorer:
    def __init__(self, score: int = 100) -> None:
        self._score = score

    async def score(self, text: str) -> int:
        return self._score
