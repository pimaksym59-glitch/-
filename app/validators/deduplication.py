"""Deduplication rule (§R5.7, owner req 8) — cheap-to-expensive cascade: (1) trigram Jaccard,
(2) sentence overlap — both pure text over ``recent_texts`` supplied by composition — then (3) the
semantic stage via the ``DuplicationChecker`` port (Memory/RAG public interface, RV-13). The rule
never touches a store. Deterministic.
"""

from __future__ import annotations

import re

from app.validators.models import Finding, Severity
from app.validators.rules import RuleContext

_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")


def _trigrams(text: str) -> set[str]:
    norm = " ".join(text.lower().split())
    if len(norm) < 3:
        return {norm} if norm else set()
    return {norm[i : i + 3] for i in range(len(norm) - 2)}


def _jaccard(a: str, b: str) -> float:
    ta, tb = _trigrams(a), _trigrams(b)
    if not ta or not tb:
        return 0.0
    union = len(ta | tb)
    return len(ta & tb) / union if union else 0.0


def _sentence_overlap(a: str, b: str) -> float:
    sa = {s.strip().lower() for s in _SENTENCE_SPLIT.split(a) if s.strip()}
    sb = {s.strip().lower() for s in _SENTENCE_SPLIT.split(b) if s.strip()}
    if not sa:
        return 0.0
    return len(sa & sb) / len(sa)


class DeduplicationRule:
    name = "deduplication"

    async def check(self, ctx: RuleContext) -> list[Finding]:
        threshold = ctx.similarity_threshold
        for past in ctx.recent_texts:
            jaccard = _jaccard(ctx.text, past)
            if jaccard >= threshold:
                return [_finding(f"near-duplicate (trigram Jaccard {jaccard:.2f})")]
            overlap = _sentence_overlap(ctx.text, past)
            if overlap >= threshold:
                return [_finding(f"duplicate sentences (overlap {overlap:.2f})")]
        if ctx.checker is not None:
            similarity = await ctx.checker.max_similarity(ctx.text, channel_id=ctx.channel_id)
            if similarity >= threshold:
                return [_finding(f"semantic duplicate (similarity {similarity:.2f})")]
        return []


def _finding(message: str) -> Finding:
    return Finding(rule="deduplication", severity=Severity.error, message=message)
