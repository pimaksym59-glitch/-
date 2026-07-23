"""Retry classification and decision (§R7.5, §R1.10, §Appendix B) — pure functions.

Classify an exception as transient/permanent, then decide retry vs DLQ vs needs_review.
"""

from __future__ import annotations

from enum import Enum, auto

from app.workers.errors import NeedsReviewError, PermanentError, TransientError


class ErrorClass(Enum):
    transient = auto()
    permanent = auto()


class RetryOutcome(Enum):
    retry = auto()  # -> failed -> deferred (with backoff)
    dead = auto()  # -> failed -> dead (DLQ)
    needs_review = auto()  # -> needs_review (permanent, no retry)


def classify(exc: BaseException) -> ErrorClass:
    """Map an exception to a class. Unknown errors default to transient (retry, then DLQ)."""
    if isinstance(exc, (PermanentError, NeedsReviewError)):
        return ErrorClass.permanent
    if isinstance(exc, TransientError):
        return ErrorClass.transient
    return ErrorClass.transient


def decide(attempts: int, error_class: ErrorClass, *, max_retries: int) -> RetryOutcome:
    """Decide the outcome given the number of attempts already made and the error class."""
    if error_class is ErrorClass.permanent:
        return RetryOutcome.needs_review
    if attempts + 1 >= max_retries:
        return RetryOutcome.dead
    return RetryOutcome.retry
