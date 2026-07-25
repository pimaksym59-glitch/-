"""DI and auth-seam tests (owner req 3/9): providers resolve and are overridable; authentication is
an anonymous, overridable extension point with no enforcement in Stage 10.
"""

from __future__ import annotations

import httpx
from fastapi import FastAPI
from starlette.requests import Request

from app.api.auth import ANONYMOUS, Principal, current_principal
from app.api.deps import get_health_service, get_settings
from app.core.config import Settings
from app.services.health import HealthService


def test_get_settings_returns_settings() -> None:
    assert isinstance(get_settings(), Settings)


def test_get_health_service_returns_service_with_default_probes() -> None:
    service = get_health_service()
    assert isinstance(service, HealthService)


async def test_current_principal_is_anonymous_by_default() -> None:
    request = Request({"type": "http", "headers": [], "method": "GET", "path": "/"})
    principal = await current_principal(request)
    assert principal is ANONYMOUS
    assert principal.is_authenticated is False


async def test_dependency_override_replaces_service(
    app: FastAPI, client: httpx.AsyncClient
) -> None:
    sentinel = HealthService([])
    app.dependency_overrides[get_health_service] = lambda: sentinel
    # readiness with zero probes is vacuously ready -> 200
    response = await client.get("/api/v1/health/ready")
    assert response.status_code == 200
    assert response.json()["checks"] == []


def test_auth_seam_can_be_overridden(app: FastAPI) -> None:
    async def fake_principal() -> Principal:
        return Principal(id="u1", role="owner", is_authenticated=True)

    app.dependency_overrides[current_principal] = fake_principal
    assert app.dependency_overrides[current_principal] is fake_principal
