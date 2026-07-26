"""Regeneration decision (§R6.5, owner req analogous to rewrite) — **decision only**. The engine
owns
the regen loop; this returns accept / regenerate / needs_review from the validation result and the
attempt count. ``IMAGE_MAX_REGEN`` (quality/uniqueness) is distinct from infra ``MAX_RETRIES``.
"""

from __future__ import annotations

from enum import StrEnum

from app.images.validation import ImageValidationResult


class RegenDecision(StrEnum):
    accept = "accept"
    regenerate = "regenerate"
    needs_review = "needs_review"


def should_regenerate(attempt: int, validation: ImageValidationResult, *, max_regen: int) -> bool:
    return not validation.passed and attempt < max_regen


def decide(validation: ImageValidationResult, attempt: int, *, max_regen: int) -> RegenDecision:
    if validation.passed:
        return RegenDecision.accept
    if attempt >= max_regen:
        return RegenDecision.needs_review
    return RegenDecision.regenerate
