"""Retry classification (§R7.5, owner req 11) — **reuses the existing retry infrastructure**; no new
retry mechanism here. Telegram send errors are provider errors (Stage 11 taxonomy), so
``app.workers.retry.classify`` already routes 429/network -> transient and auth/bad-token ->
permanent.
This module only exposes the classification and honors ``retry_after`` (§R7.5).
"""

from __future__ import annotations

from app.core.providers.errors import RateLimitError
from app.workers.retry import ErrorClass
from app.workers.retry import classify as _classify


def classify(exc: BaseException) -> ErrorClass:
    """Classify a Telegram/provider error via the shared retry taxonomy (transient/permanent)."""
    return _classify(exc)


def retry_after_seconds(exc: BaseException) -> float | None:
    """The provider-supplied ``retry_after`` for a rate-limit error (§R7.5), if any."""
    return exc.retry_after if isinstance(exc, RateLimitError) else None
