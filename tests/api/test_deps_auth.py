"""DI and auth-seam tests (owner req 3/9): providers resolve and are overridable. Stage 21 Phase 0:
`current_principal` resolves a real session cookie via a `SessionManager` — exercised here over the
existing offline fakes (`FakeSessionStore`/`FakeClock`/`FakeTokenFactory`), never real Redis.
"""

from __future__ import annotations

import httpx
from fastapi import FastAPI
from starlette.requests import Request

from app.admin.fakes import FakeClock, FakeSessionStore, FakeTokenFactory
from app.admin.rbac import Role
from app.admin.sessions import SessionManager
from app.api.auth import ANONYMOUS, SESSION_COOKIE_NAME, Principal, current_principal
from app.api.deps import get_health_service, get_settings
from app.core.config import Settings
from app.services.health import HealthService


def _fake_session_manager() -> SessionManager:
    return SessionManager(FakeSessionStore(), FakeClock(), FakeTokenFactory())


def test_get_settings_returns_settings() -> None:
    assert isinstance(get_settings(), Settings)


def test_get_health_service_returns_service_with_default_probes() -> None:
    service = get_health_service()
    assert isinstance(service, HealthService)


async def test_current_principal_is_anonymous_without_a_cookie() -> None:
    request = Request({"type": "http", "headers": [], "method": "GET", "path": "/"})
    principal = await current_principal(request, _fake_session_manager())
    assert principal is ANONYMOUS
    assert principal.is_authenticated is False


async def test_current_principal_resolves_a_valid_session_cookie() -> None:
    sessions = _fake_session_manager()
    session = sessions.create("user-1", Role.owner)
    request = Request(
        {
            "type": "http",
            "headers": [(b"cookie", f"{SESSION_COOKIE_NAME}={session.token}".encode())],
            "method": "GET",
            "path": "/",
        }
    )
    principal = await current_principal(request, sessions)
    assert principal == Principal(id="user-1", role="owner", is_authenticated=True)


async def test_current_principal_is_anonymous_for_an_unknown_token() -> None:
    request = Request(
        {
            "type": "http",
            "headers": [(b"cookie", f"{SESSION_COOKIE_NAME}=not-a-real-token".encode())],
            "method": "GET",
            "path": "/",
        }
    )
    principal = await current_principal(request, _fake_session_manager())
    assert principal is ANONYMOUS


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
