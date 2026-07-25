"""Error-model tests (owner req 6): unified provider exceptions classify compatibly with the
existing retry strategy (§R7.5)."""

from __future__ import annotations

from app.core.providers import errors
from app.workers.retry import ErrorClass, classify


def test_temporary_errors_classify_transient() -> None:
    for exc in (
        errors.TemporaryProviderError("x"),
        errors.RateLimitError("x", retry_after=1.0),
        errors.TimeoutError("x"),
    ):
        assert classify(exc) is ErrorClass.transient


def test_permanent_errors_classify_permanent() -> None:
    for exc in (
        errors.PermanentProviderError("x"),
        errors.AuthenticationError("x"),
        errors.UnsupportedCapabilityError("x"),
    ):
        assert classify(exc) is ErrorClass.permanent


def test_rate_limit_carries_retry_after_and_provider() -> None:
    exc = errors.RateLimitError("slow down", provider="fake", retry_after=2.5)
    assert exc.retry_after == 2.5
    assert exc.provider == "fake"
    assert exc.message == "slow down"


def test_hierarchy_rooted_at_provider_error() -> None:
    assert issubclass(errors.RateLimitError, errors.ProviderError)
    assert issubclass(errors.AuthenticationError, errors.ProviderError)
