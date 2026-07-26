"""Error recovery pipeline (§R7.4, owner req 13) — a standalone pipeline (not inside handlers). It
decides how a failed send recovers: an **ambiguous** failure (request sent, response unknown)
maps to
``needs_review`` with **no auto-retry** (§R7.4); otherwise it defers to the shared retry decision
(transient -> retry, permanent -> needs_review, exhausted -> dead).
"""

from __future__ import annotations

from enum import StrEnum

from app.telegram.retry import classify
from app.workers.retry import RetryOutcome, decide


class RecoveryOutcome(StrEnum):
    retry = "retry"
    needs_review = "needs_review"
    dead = "dead"


_OUTCOME = {
    RetryOutcome.retry: RecoveryOutcome.retry,
    RetryOutcome.dead: RecoveryOutcome.dead,
    RetryOutcome.needs_review: RecoveryOutcome.needs_review,
}


class ErrorRecoveryPipeline:
    def __init__(self, *, max_retries: int = 5) -> None:
        self._max_retries = max_retries

    def recover(
        self, exc: BaseException, attempts: int, *, ambiguous: bool = False
    ) -> RecoveryOutcome:
        if ambiguous:  # §R7.4 at-least-once: unknown outcome -> human review, never auto-retry
            return RecoveryOutcome.needs_review
        return _OUTCOME[decide(attempts, classify(exc), max_retries=self._max_retries)]
