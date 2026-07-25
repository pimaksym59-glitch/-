"""Health use-case (§R12.10) — liveness and readiness. Lives in the service layer because readiness
probes touch infrastructure (PostgreSQL/Redis), which the API must not import directly (§R3.1).

Readiness is built around an injectable ``ReadinessProbe`` list so real PostgreSQL/Redis checks can
be added later **without changing the API** (owner req 8). Probes never raise — a failure/mis-config
maps to ``healthy=False``. Real connections require live services (Runtime Verification Pending,
RV-9); offline tests inject fake probes.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol

from sqlalchemy import text

from app.core.config import get_settings
from app.core.redis.manager import get_redis_manager
from app.db.session import get_engine


@dataclass(frozen=True, slots=True)
class ProbeResult:
    name: str
    healthy: bool
    detail: str | None = None


class ReadinessProbe(Protocol):
    """A named dependency check that never raises."""

    name: str

    async def check(self) -> ProbeResult: ...


class DatabaseProbe:
    """PostgreSQL readiness: config-only if unset; `SELECT 1` if configured (real I/O=RV-9)."""

    name = "postgresql"

    async def check(self) -> ProbeResult:
        if get_settings().database_url is None:
            return ProbeResult(self.name, healthy=False, detail="not configured")
        try:
            async with get_engine().connect() as conn:
                await conn.execute(text("SELECT 1"))
        except Exception as exc:  # readiness must never raise (§R12.10)
            return ProbeResult(self.name, healthy=False, detail=type(exc).__name__)
        return ProbeResult(self.name, healthy=True)


class RedisProbe:
    """Redis readiness: config-only when unconfigured; PING when configured (real I/O=RV-9)."""

    name = "redis"

    async def check(self) -> ProbeResult:
        if get_settings().redis_url is None:
            return ProbeResult(self.name, healthy=False, detail="not configured")
        try:
            healthy = await get_redis_manager().ping()
        except Exception as exc:  # readiness must never raise (§R12.10)
            return ProbeResult(self.name, healthy=False, detail=type(exc).__name__)
        return ProbeResult(self.name, healthy=healthy)


def default_readiness_probes() -> list[ReadinessProbe]:
    """The production probe set (PostgreSQL + Redis). Tests override with fakes."""
    return [DatabaseProbe(), RedisProbe()]


class HealthService:
    """Liveness (process is up) and readiness (dependencies usable) — §R12.10."""

    def __init__(self, probes: Sequence[ReadinessProbe]) -> None:
        self._probes = probes

    def liveness(self) -> bool:
        """The process is running and the event loop is servicing requests."""
        return True

    async def readiness(self) -> tuple[bool, list[ProbeResult]]:
        """Run every probe; ready only if all are healthy."""
        results = [await probe.check() for probe in self._probes]
        return all(result.healthy for result in results), results
