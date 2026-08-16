"""Offline HTTP tests for `GET /tasks` (Stage 21 Phase 2A).

A fake `TaskService` proves the HTTP contract — status codes, the BARE-ARRAY body (owner decision
D1-A), query forwarding and error mapping — without Postgres. The real service's authorization and
SQL are covered separately (`tests/services/test_tasks_service.py`, the integration tests).
"""

from __future__ import annotations

import datetime
from typing import Any

import httpx
import pytest
from fastapi import FastAPI

from app.admin.fakes import FakeClock, FakeSessionStore, FakeTokenFactory
from app.admin.sessions import SessionManager
from app.api.auth import AuthenticatedPrincipal, require_principal
from app.api.deps import get_session_manager, get_task_service
from app.core.errors import BadRequest, Forbidden
from app.schemas.task import TaskResponse

_RUN_AT = datetime.datetime(2026, 8, 15, 15, 0, tzinfo=datetime.UTC)


class _FakeTaskService:
    """Records the arguments the route passed and returns a canned page."""

    def __init__(self, error: Exception | None = None) -> None:
        self.calls: list[dict[str, Any]] = []
        self._error = error

    async def list_tasks(self, actor_id: str, actor_role: str, **kwargs: Any) -> list[TaskResponse]:
        self.calls.append({"actor_id": actor_id, "actor_role": actor_role, **kwargs})
        if self._error is not None:
            raise self._error
        return [
            TaskResponse(
                id="01a00000-0000-7000-8000-000000000001",
                type="publish",
                status="queued",
                channel_id="01a00000-0000-7000-8000-0000000000ff",
                attempts=0,
                run_at=_RUN_AT,
                created_at=_RUN_AT,
                error=None,
            )
        ]


@pytest.fixture
def service() -> _FakeTaskService:
    return _FakeTaskService()


@pytest.fixture
def authed_app(app: FastAPI, service: _FakeTaskService) -> FastAPI:
    app.dependency_overrides[get_task_service] = lambda: service
    app.dependency_overrides[require_principal] = lambda: AuthenticatedPrincipal(
        id="user-1", role="owner"
    )
    return app


@pytest.fixture
async def authed_client(authed_app: FastAPI) -> httpx.AsyncClient:
    transport = httpx.ASGITransport(app=authed_app, raise_app_exceptions=False)
    return httpx.AsyncClient(transport=transport, base_url="http://testserver")


async def test_tasks_require_a_session(app: FastAPI, client: httpx.AsyncClient) -> None:
    """No cookie -> 401 through the real `require_principal` over a fake (Redis-free) store."""
    app.dependency_overrides[get_session_manager] = lambda: SessionManager(
        FakeSessionStore(), FakeClock(), FakeTokenFactory()
    )

    response = await client.get("/api/v1/tasks")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"


async def test_tasks_return_a_bare_array_not_a_pagination_envelope(
    authed_client: httpx.AsyncClient,
) -> None:
    response = await authed_client.get("/api/v1/tasks")

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list), "D1-A: dashboard reads return bare arrays"
    assert body[0]["status"] == "queued"
    assert body[0]["error"] is None
    assert set(body[0]) == {
        "id",
        "type",
        "status",
        "channel_id",
        "attempts",
        "run_at",
        "created_at",
        "error",
    }


async def test_query_filters_reach_the_service(
    authed_client: httpx.AsyncClient, service: _FakeTaskService
) -> None:
    await authed_client.get(
        "/api/v1/tasks",
        params={"channel_id": "ch-1", "status": "queued", "type": "publish", "limit": 10},
    )

    call = service.calls[-1]
    assert call["channel_id"] == "ch-1"
    assert call["status"] == "queued"
    assert call["task_type"] == "publish"  # `?type=` alias
    assert call["limit"] == 10
    assert call["actor_id"] == "user-1"
    assert call["actor_role"] == "owner"


@pytest.mark.parametrize("params", [{"limit": 0}, {"limit": 101}, {"offset": -1}])
async def test_page_bounds_are_enforced_by_the_route(
    authed_client: httpx.AsyncClient, params: dict[str, int]
) -> None:
    response = await authed_client.get("/api/v1/tasks", params=params)
    assert response.status_code == 422


async def test_service_forbidden_maps_to_403(app: FastAPI) -> None:
    app.dependency_overrides[get_task_service] = lambda: _FakeTaskService(
        Forbidden("role lacks permission")
    )
    app.dependency_overrides[require_principal] = lambda: AuthenticatedPrincipal(
        id="user-1", role="viewer"
    )
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/api/v1/tasks")

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"


async def test_service_bad_request_maps_to_400(app: FastAPI) -> None:
    app.dependency_overrides[get_task_service] = lambda: _FakeTaskService(
        BadRequest("unknown task status: nonsense")
    )
    app.dependency_overrides[require_principal] = lambda: AuthenticatedPrincipal(
        id="user-1", role="owner"
    )
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/api/v1/tasks", params={"status": "nonsense"})

    assert response.status_code == 400
    assert response.json()["error"]["request_id"]
