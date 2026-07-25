"""Observability + test-double tests (owner req 10 + Mock/Test providers)."""

from __future__ import annotations

from app.core.providers import errors
from app.core.providers.observability import ProviderObservability
from app.core.providers.testing import FailingProvider, RecordingProvider
from app.workers.metrics import NoOpMetrics
from app.workers.retry import ErrorClass, classify


def test_observability_defaults_are_noop() -> None:
    obs = ProviderObservability()
    assert isinstance(obs.metrics, NoOpMetrics)
    obs.metrics.incr("provider.call")  # no-op, must not raise
    obs.logger.event("provider.event", detail="x")  # stdlib, must not raise


async def test_failing_provider_raises_configured_error() -> None:
    provider = FailingProvider(error=errors.AuthenticationError("bad key"))
    try:
        await provider.invoke()
    except errors.ProviderError as exc:
        assert classify(exc) is ErrorClass.permanent
    else:  # pragma: no cover - must raise
        raise AssertionError("expected ProviderError")


async def test_recording_provider_records_calls() -> None:
    provider = RecordingProvider()
    assert await provider.invoke("a") == "a"
    await provider.invoke("b")
    assert provider.calls == ["a", "b"]
