"""Offline HTTP tests for `POST /posts/{id}/approve|reject` (Stage 21 Phase 3A).

The queue-intent contract is what matters at this boundary: 202 (never 200), a body of exactly
`{task_id}`, and the `Idempotency-Key` header reaching the service (§R7.4, §R10.1, D7).
"""

from __future__ import annotations

from typing import Any

import httpx
import pytest
from fastapi import FastAPI

from app.admin.fakes import FakeClock, FakeSessionStore, FakeTokenFactory
from app.admin.sessions import SessionManager
from app.api.auth import AuthenticatedPrincipal, require_principal
from app.api.deps import get_post_service, get_session_manager
from app.core.errors import Forbidden, NotFound, UnprocessableEntity
from app.schemas.post import TaskIntentResponse

_POST_ID = "01a00000-0000-7000-8000-000000000001"
_TASK_ID = "01a00000-0000-7000-8000-0000000000aa"


class _FakePostService:
    def __init__(self, error: Exception | None = None) -> None:
        self.calls: list[dict[str, Any]] = []
        self._error = error

    async def _record(self, action: str, actor_role: str, post_id: str, key: str | None) -> Any:
        self.calls.append(
            {"action": action, "actor_role": actor_role, "post_id": post_id, "key": key}
        )
        if self._error is not None:
            raise self._error
        return TaskIntentResponse(task_id=_TASK_ID)

    async def approve(
        self, actor_id: str, actor_role: str, post_id: str, *, idempotency_key: str | None = None
    ) -> Any:
        return await self._record("approve", actor_role, post_id, idempotency_key)

    async def reject(
        self, actor_id: str, actor_role: str, post_id: str, *, idempotency_key: str | None = None
    ) -> Any:
        return await self._record("reject", actor_role, post_id, idempotency_key)


@pytest.fixture
def service() -> _FakePostService:
    return _FakePostService()


@pytest.fixture
async def authed_client(app: FastAPI, service: _FakePostService) -> httpx.AsyncClient:
    app.dependency_overrides[get_post_service] = lambda: service
    app.dependency_overrides[require_principal] = lambda: AuthenticatedPrincipal(
        id="user-1", role="editor"
    )
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    return httpx.AsyncClient(transport=transport, base_url="http://testserver")


@pytest.mark.parametrize("action", ["approve", "reject"])
async def test_review_requires_a_session(
    app: FastAPI, client: httpx.AsyncClient, action: str
) -> None:
    app.dependency_overrides[get_session_manager] = lambda: SessionManager(
        FakeSessionStore(), FakeClock(), FakeTokenFactory()
    )

    response = await client.post(f"/api/v1/posts/{_POST_ID}/{action}")

    assert response.status_code == 401


@pytest.mark.parametrize("action", ["approve", "reject"])
async def test_review_answers_202_with_exactly_a_task_id(
    authed_client: httpx.AsyncClient, action: str
) -> None:
    """D7 + §R10.1: acknowledged and queued, never "done", and no extra fields."""
    response = await authed_client.post(f"/api/v1/posts/{_POST_ID}/{action}")

    assert response.status_code == 202
    assert response.json() == {"task_id": _TASK_ID}


@pytest.mark.parametrize("action", ["approve", "reject"])
async def test_idempotency_key_header_reaches_the_service(
    authed_client: httpx.AsyncClient, service: _FakePostService, action: str
) -> None:
    await authed_client.post(
        f"/api/v1/posts/{_POST_ID}/{action}", headers={"Idempotency-Key": "client-key-123"}
    )

    call = service.calls[-1]
    assert call["action"] == action
    assert call["key"] == "client-key-123"
    assert call["post_id"] == _POST_ID


@pytest.mark.parametrize("action", ["approve", "reject"])
async def test_missing_idempotency_key_is_allowed(
    authed_client: httpx.AsyncClient, service: _FakePostService, action: str
) -> None:
    response = await authed_client.post(f"/api/v1/posts/{_POST_ID}/{action}")

    assert response.status_code == 202
    assert service.calls[-1]["key"] is None


@pytest.mark.parametrize("action", ["approve", "reject"])
async def test_forbidden_role_maps_to_403(app: FastAPI, action: str) -> None:
    app.dependency_overrides[get_post_service] = lambda: _FakePostService(
        Forbidden("role lacks permission")
    )
    app.dependency_overrides[require_principal] = lambda: AuthenticatedPrincipal(
        id="user-1", role="viewer"
    )
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(f"/api/v1/posts/{_POST_ID}/{action}")

    assert response.status_code == 403


@pytest.mark.parametrize("action", ["approve", "reject"])
async def test_unknown_post_maps_to_404(app: FastAPI, action: str) -> None:
    app.dependency_overrides[get_post_service] = lambda: _FakePostService(
        NotFound("post not found")
    )
    app.dependency_overrides[require_principal] = lambda: AuthenticatedPrincipal(
        id="user-1", role="owner"
    )
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(f"/api/v1/posts/{_POST_ID}/{action}")

    assert response.status_code == 404


async def test_reviewing_a_post_that_is_not_awaiting_review_maps_to_422(app: FastAPI) -> None:
    app.dependency_overrides[get_post_service] = lambda: _FakePostService(
        UnprocessableEntity("post is not awaiting review (status: published)")
    )
    app.dependency_overrides[require_principal] = lambda: AuthenticatedPrincipal(
        id="user-1", role="owner"
    )
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(f"/api/v1/posts/{_POST_ID}/approve")

    assert response.status_code == 422
