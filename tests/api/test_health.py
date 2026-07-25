"""Health endpoint tests (§R12.10) — liveness always up; readiness reflects injected probes. Real
PostgreSQL/Redis probes are RV-9; here we override the service with fake probes via DI.
"""

from __future__ import annotations

import httpx
from fastapi import FastAPI

from app.api.deps import get_health_service
from app.services.health import HealthService, ProbeResult, default_readiness_probes


class _Probe:
    def __init__(self, name: str, healthy: bool, detail: str | None = None) -> None:
        self.name = name
        self._result = ProbeResult(name, healthy, detail)

    async def check(self) -> ProbeResult:
        return self._result


def _use_probes(app: FastAPI, *probes: _Probe) -> None:
    app.dependency_overrides[get_health_service] = lambda: HealthService(list(probes))


async def test_liveness_is_always_ok(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/v1/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "alive"}


async def test_readiness_ok_when_all_probes_healthy(
    app: FastAPI, client: httpx.AsyncClient
) -> None:
    _use_probes(app, _Probe("postgresql", True), _Probe("redis", True))
    response = await client.get("/api/v1/health/ready")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ready"
    assert all(check["healthy"] for check in body["checks"])


async def test_readiness_503_when_any_probe_unhealthy(
    app: FastAPI, client: httpx.AsyncClient
) -> None:
    _use_probes(app, _Probe("postgresql", True), _Probe("redis", False, "unreachable"))
    response = await client.get("/api/v1/health/ready")
    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "not_ready"
    assert {c["name"]: c["healthy"] for c in body["checks"]} == {
        "postgresql": True,
        "redis": False,
    }


def test_default_probes_are_postgres_and_redis() -> None:
    # Deterministic + env-independent: the production readiness set is DB + Redis (real I/O = RV-9).
    probes = default_readiness_probes()
    assert [probe.name for probe in probes] == ["postgresql", "redis"]
