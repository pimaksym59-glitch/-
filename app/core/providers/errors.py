"""Unified provider error model (owner req 6). Every provider failure maps to one of these internal
exceptions — adapters translate vendor SDK errors into them, so the rest of the system never sees a
vendor-specific type.

Classification is **compatible with the existing retry strategy** (§R7.5): the temporary/permanent
bases subclass ``app.workers.errors`` ``TransientError``/``PermanentError``, so
``app.workers.retry.classify`` already routes provider errors correctly (transient -> retry with
backoff; permanent -> needs_review) with no change to the Executor.
"""

from __future__ import annotations

from app.workers.errors import PermanentError, TransientError


class ProviderError(Exception):
    """Base for all provider errors. Carries the offending provider name for diagnostics."""

    def __init__(self, message: str, *, provider: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.provider = provider


class TemporaryProviderError(ProviderError, TransientError):
    """Retryable provider failure (network / 5xx / overload). Classified transient (§R7.5)."""


class PermanentProviderError(ProviderError, PermanentError):
    """Non-retryable provider failure (auth / bad request / unsupported). Classified permanent."""


class AuthenticationError(PermanentProviderError):
    """Invalid or missing credentials at the provider — permanent."""


class RateLimitError(TemporaryProviderError):
    """Provider rate limit hit (429). Honors ``retry_after`` (§R7.5)."""

    def __init__(
        self, message: str, *, provider: str | None = None, retry_after: float | None = None
    ) -> None:
        super().__init__(message, provider=provider)
        self.retry_after = retry_after


class TimeoutError(TemporaryProviderError):
    """Provider call exceeded its deadline — temporary (shadows builtin by design, req 6)."""


class UnsupportedCapabilityError(PermanentProviderError):
    """A required capability is not supported by the selected provider — permanent."""
