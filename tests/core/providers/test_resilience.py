"""Resilience seam tests (owner req 9): passthrough + delegated timeout/breaker/metrics hooks; no
retry loop of its own."""

from __future__ import annotations

import asyncio

import pytest

from app.core.providers import errors
from app.core.providers.observability import ProviderObservability
from app.core.providers.resilience import (
    NoOpCircuitBreaker,
    Timeout,
    call_with_resilience,
)


class _RecordingMetrics:
    def __init__(self) -> None:
        self.counts: list[str] = []

    def incr(self, name: str) -> None:
        self.counts.append(name)

    def timing(self, name: str, seconds: float) -> None: ...


class _RecordingBreaker:
    def __init__(self, *, allow: bool = True) -> None:
        self._allow = allow
        self.successes = 0
        self.failures = 0

    def allow(self) -> bool:
        return self._allow

    def record_success(self) -> None:
        self.successes += 1

    def record_failure(self) -> None:
        self.failures += 1


async def test_passthrough_returns_value_and_counts_success() -> None:
    metrics = _RecordingMetrics()
    breaker = _RecordingBreaker()

    async def call() -> int:
        return 42

    result = await call_with_resilience(
        call, breaker=breaker, observability=ProviderObservability(metrics=metrics)
    )
    assert result == 42
    assert breaker.successes == 1 and breaker.failures == 0
    assert "provider.call" in metrics.counts and "provider.success" in metrics.counts


async def test_timeout_maps_to_provider_timeout() -> None:
    breaker = _RecordingBreaker()

    async def slow() -> int:
        await asyncio.sleep(1.0)
        return 1

    with pytest.raises(errors.TimeoutError):
        await call_with_resilience(slow, timeout=Timeout(seconds=0.01), breaker=breaker)
    assert breaker.failures == 1


async def test_open_breaker_short_circuits() -> None:
    breaker = _RecordingBreaker(allow=False)

    async def call() -> int:
        return 1

    with pytest.raises(errors.TemporaryProviderError):
        await call_with_resilience(call, breaker=breaker)


async def test_non_timeout_error_propagates_and_records_failure() -> None:
    breaker = _RecordingBreaker()

    async def boom() -> int:
        raise ValueError("boom")

    with pytest.raises(ValueError, match="boom"):
        await call_with_resilience(boom, breaker=breaker)
    assert breaker.failures == 1


async def test_default_breaker_is_noop() -> None:
    async def call() -> str:
        return "ok"

    assert await call_with_resilience(call) == "ok"
    assert NoOpCircuitBreaker().allow() is True
