"""Offline HTTP tests for the auth routes (§R3.9, Stage 21 Phase 0).

A fake `AuthService` and a `SessionManager` over `FakeSessionStore` prove routing/cookie/
status-code behavior without touching real Postgres/Redis. The real adapters
(`BcryptPasswordHasher`, `UserRepository`, `RedisSessionStore`) are proven separately: offline unit
tests for pure logic (`tests/core/test_security.py`, `tests/core/test_sessions.py`), and
RUN_INTEGRATION=1 tests for real persistence/network
(`tests/repositories/test_user_repository_integration.py`,
`tests/redis/test_session_store_integration.py`, `tests/api/test_auth_integration.py`).
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from types import SimpleNamespace
from typing import Any

import httpx
import pytest
from fastapi import FastAPI

from app.admin.fakes import FakeClock, FakeSessionStore, FakeTokenFactory
from app.admin.rbac import Role
from app.admin.sessions import Session, SessionManager
from app.api.auth import SESSION_COOKIE_NAME
from app.api.deps import get_auth_service, get_session_manager
from app.core.errors import Unauthorized

_OWNER_EMAIL = "owner@example.com"
_OWNER_PASSWORD = "correct horse battery staple"
_OWNER_ID = "user-1"


class _FakeAuthService:
    """A minimal `AuthService` double for HTTP-layer tests — no DB, no Redis."""

    def __init__(self, sessions: SessionManager) -> None:
        self._sessions = sessions

    async def login(self, email: str, password: str, otp: str | None) -> tuple[Any, Session]:
        if email != _OWNER_EMAIL or password != _OWNER_PASSWORD:
            raise Unauthorized("invalid email or password")
        session = self._sessions.create(_OWNER_ID, Role.owner)
        return SimpleNamespace(id=_OWNER_ID, email=_OWNER_EMAIL), session

    async def logout(self, token: str) -> None:
        self._sessions.revoke(token)

    async def get_user(self, user_id: str) -> Any | None:
        if user_id == _OWNER_ID:
            return SimpleNamespace(id=_OWNER_ID, email=_OWNER_EMAIL)
        return None

    async def revoke_user_sessions(self, user_id: str) -> int:
        result: int = self._sessions.revoke_all(user_id)
        return result


@pytest.fixture
def sessions() -> SessionManager:
    return SessionManager(FakeSessionStore(), FakeClock(), FakeTokenFactory())


@pytest.fixture(autouse=True)
def _override_auth(app: FastAPI, sessions: SessionManager) -> None:
    app.dependency_overrides[get_session_manager] = lambda: sessions
    app.dependency_overrides[get_auth_service] = lambda: _FakeAuthService(sessions)


@pytest.fixture
async def client(app: FastAPI) -> AsyncIterator[httpx.AsyncClient]:
    # Shadows the shared http://testserver fixture: the session cookie is Secure (API_SPEC), so a
    # real client only resends it over https — an http base_url would silently drop it and every
    # request past login would look unauthenticated.
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    async with httpx.AsyncClient(transport=transport, base_url="https://testserver") as http_client:
        yield http_client


async def test_login_success_sets_cookie_and_returns_user(client: httpx.AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/login", json={"email": _OWNER_EMAIL, "password": _OWNER_PASSWORD}
    )
    assert response.status_code == 200
    assert response.json() == {"user": {"id": _OWNER_ID, "email": _OWNER_EMAIL}}
    assert SESSION_COOKIE_NAME in response.cookies
    set_cookie = response.headers["set-cookie"]
    assert "HttpOnly" in set_cookie
    assert "Secure" in set_cookie
    assert "samesite=lax" in set_cookie.lower()


async def test_login_wrong_password_returns_401(client: httpx.AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/login", json={"email": _OWNER_EMAIL, "password": "wrong"}
    )
    assert response.status_code == 401
    body = response.json()
    assert body["error"]["code"] == "unauthorized"


async def test_me_with_valid_cookie_returns_user_and_role(client: httpx.AsyncClient) -> None:
    login_response = await client.post(
        "/api/v1/auth/login", json={"email": _OWNER_EMAIL, "password": _OWNER_PASSWORD}
    )
    assert login_response.status_code == 200

    me_response = await client.get("/api/v1/auth/me")
    assert me_response.status_code == 200
    assert me_response.json() == {
        "user": {"id": _OWNER_ID, "email": _OWNER_EMAIL},
        "role": "owner",
    }


async def test_me_without_cookie_returns_401(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


async def test_logout_clears_cookie_and_revokes_session(client: httpx.AsyncClient) -> None:
    await client.post(
        "/api/v1/auth/login", json={"email": _OWNER_EMAIL, "password": _OWNER_PASSWORD}
    )
    logout_response = await client.post("/api/v1/auth/logout")
    assert logout_response.status_code == 204

    me_response = await client.get("/api/v1/auth/me")
    assert me_response.status_code == 401


async def test_owner_can_revoke_a_users_sessions(
    client: httpx.AsyncClient, sessions: SessionManager
) -> None:
    await client.post(
        "/api/v1/auth/login", json={"email": _OWNER_EMAIL, "password": _OWNER_PASSWORD}
    )
    target = sessions.create("some-other-user", Role.viewer)
    assert sessions.validate(target.token) is not None

    response = await client.post(
        "/api/v1/auth/sessions/revoke", json={"user_id": "some-other-user"}
    )
    assert response.status_code == 204
    assert sessions.validate(target.token) is None


async def test_non_owner_cannot_revoke_sessions(
    client: httpx.AsyncClient, sessions: SessionManager
) -> None:
    viewer_session = sessions.create("viewer-1", Role.viewer)
    client.cookies.set(SESSION_COOKIE_NAME, viewer_session.token)

    response = await client.post(
        "/api/v1/auth/sessions/revoke", json={"user_id": "some-other-user"}
    )
    assert response.status_code == 403
