"""Resilience integration points (owner req 9) — **seams only**. This module implements no retry,
timeout, or circuit-breaker logic of its own: it delegates to existing infrastructure (asyncio for
the deadline; an injected circuit breaker; queue ``Metrics`` via observability) and leaves retries
to the Executor (§R8/§R7.5). ``call_with_resilience`` is where adapters wrap a provider call.
"""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Protocol

from app.core.providers import errors
from app.core.providers.observability import ProviderObservability


@dataclass(frozen=True, slots=True)
class Timeout:
    """Deadline seam. ``None`` means no timeout is applied here."""

    seconds: float | None = None


class CircuitBreaker(Protocol):
    """Breaker seam — a real implementation plugs in later; the default no-ops."""

    def allow(self) -> bool: ...
    def record_success(self) -> None: ...
    def record_failure(self) -> None: ...


class NoOpCircuitBreaker:
    """Default breaker: always closed (allows), records nothing."""

    def allow(self) -> bool:
        return True

    def record_success(self) -> None: ...

    def record_failure(self) -> None: ...


async def call_with_resilience[T](
    call: Callable[[], Awaitable[T]],
    *,
    timeout: Timeout | None = None,
    breaker: CircuitBreaker | None = None,
    observability: ProviderObservability | None = None,
) -> T:
    """Run ``call`` through the resilience seams. Delegates the deadline to ``asyncio.wait_for`` and
    failure/success accounting to the injected breaker; emits metric hooks. Owns no retry loop."""
    breaker = breaker if breaker is not None else NoOpCircuitBreaker()
    obs = observability if observability is not None else ProviderObservability()
    if not breaker.allow():
        raise errors.TemporaryProviderError("circuit breaker open")
    obs.metrics.incr("provider.call")
    try:
        if timeout is not None and timeout.seconds is not None:
            result = await asyncio.wait_for(call(), timeout.seconds)
        else:
            result = await call()
    except TimeoutError as exc:  # asyncio deadline (builtin TimeoutError since 3.11)
        breaker.record_failure()
        obs.metrics.incr("provider.timeout")
        raise errors.TimeoutError("provider call timed out") from exc
    except Exception:
        breaker.record_failure()
        obs.metrics.incr("provider.error")
        raise
    breaker.record_success()
    obs.metrics.incr("provider.success")
    return result
