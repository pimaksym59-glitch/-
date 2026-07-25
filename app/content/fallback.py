"""Model fallback strategy (§R2.9/§R5.10, owner req 11) — **only at the AI-Engine level**. It tries
the role's model tiers in order; a temporary provider error advances to the next tier, a permanent
error stops at once (no tier helps auth/bad-request), and exhaustion raises ``GenerationExhausted``
(temporary) so the queue reschedules (§R2.9) — the queue never chooses the model.
"""

from __future__ import annotations

from collections.abc import Sequence

from app.core.providers.errors import (
    PermanentProviderError,
    ProviderError,
    TemporaryProviderError,
)
from app.llm.base import LLMProvider, LLMResult


class GenerationExhausted(TemporaryProviderError):
    """All model tiers failed with temporary errors — caller (queue) reschedules (§R2.9)."""


async def generate_with_fallback(
    provider: LLMProvider,
    prompt: str,
    model_tiers: Sequence[str],
    *,
    json_mode: bool = False,
) -> LLMResult:
    """Generate against ``model_tiers`` in order; fall back on temporary errors only."""
    last_error: ProviderError | None = None
    for model in model_tiers:
        try:
            return await provider.generate(prompt, model=model, json_mode=json_mode)
        except PermanentProviderError:
            raise  # permanent failure — fallback cannot help
        except TemporaryProviderError as exc:
            last_error = exc
    raise GenerationExhausted("all model tiers exhausted", provider=provider.name) from last_error
