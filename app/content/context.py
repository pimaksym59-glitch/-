"""Prompt context builder (§R5.2, §R9.8, owner req 6). Gathers few-shot examples (K=3-5) from the
spec plus the Memory/Knowledge **ports** — never the DB directly — and fits them within the token
budget (``MAX_CONTEXT_TOKENS`` minus what the rest of the prompt already reserves). Deterministic.

Note (§R5.2): the "500 window" (``HISTORY_WINDOW``) is a vector-similarity concern (dedup, Stage 14)
and does **not** enter the prompt; only the few-shot examples do.
"""

from __future__ import annotations

from app.content.budget import TokenEstimator, fit_within
from app.content.sources import ContextItem, KnowledgeContextSource, MemoryContextSource
from app.content.types import GenerationRequest

_DEFAULT_FEW_SHOT_K = 5  # §R5.2 K=3-5


class ContextBuilder:
    def __init__(
        self,
        memory: MemoryContextSource,
        knowledge: KnowledgeContextSource,
        estimator: TokenEstimator,
        *,
        few_shot_k: int = _DEFAULT_FEW_SHOT_K,
    ) -> None:
        self._memory = memory
        self._knowledge = knowledge
        self._estimator = estimator
        self._k = few_shot_k

    async def build(
        self, request: GenerationRequest, *, reserved_tokens: int = 0
    ) -> list[ContextItem]:
        spec = request.spec
        gathered: list[ContextItem] = [
            ContextItem(kind="example", text=example, source="persona") for example in spec.examples
        ]
        gathered.extend(
            await self._memory.few_shot(
                channel_id=request.channel_id, topic=spec.topic, limit=self._k
            )
        )
        gathered.extend(
            await self._knowledge.relevant(
                channel_id=request.channel_id, query=spec.topic or spec.task, limit=self._k
            )
        )
        capped = gathered[: self._k]
        budget = max(0, request.max_context_tokens - reserved_tokens)
        return fit_within(capped, self._estimator, budget)
