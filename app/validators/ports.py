"""External-check ports (owner req 8/9/13) — Protocol seams the Validation Engine depends on so it
stays independent of Memory/RAG and any LLM. The vector deduplication stage and the humanness score
are provided through these ports; real implementations (Memory/RAG public interfaces, LLM-judge) are
wired in composition and are Runtime Verification Pending (RV-13). ML validators plug in as
``Rule``.
"""

from __future__ import annotations

import uuid
from typing import Protocol


class DuplicationChecker(Protocol):
    """Semantic (embedding-based) duplication check — the expensive cascade stage (§R5.7). Real impl
    uses only the **public** Memory/RAG interfaces; never a store directly (owner req 8)."""

    async def max_similarity(self, text: str, *, channel_id: uuid.UUID | None) -> float: ...


class HumannessScorer(Protocol):
    """Humanness score in 0..100 (§R5.8) — real impl is the LLM-judge (no LLM in the rule
    itself)."""

    async def score(self, text: str) -> int: ...
