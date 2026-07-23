"""Task execution error taxonomy (§R7.5). Handlers raise these; the Executor classifies them."""

from __future__ import annotations


class TaskError(Exception):
    """Base class for task execution errors."""


class TransientError(TaskError):
    """Temporary failure (network / 5xx / 429) — eligible for retry with backoff."""


class PermanentError(TaskError):
    """Non-retryable failure (config / permissions / validation) — route to needs_review."""


class NeedsReviewError(TaskError):
    """Handler explicitly requests human review (quality gate not passed, §R5)."""


class HandlerNotRegistered(PermanentError):
    """No handler registered for a task type — a configuration error, not a crash."""
