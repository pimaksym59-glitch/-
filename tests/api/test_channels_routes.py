"""Offline HTTP tests for `GET /channels` and `GET /channels/{id}/posts` (Stage 21 Phase 3A)."""

from __future__ import annotations

import datetime
from typing import Any

import httpx
import pytest
from fastapi import FastAPI

from app.admin.fakes import FakeClock, FakeSessionStore, FakeTokenFactory
from app.admin.sessions import SessionManager
from app.api.auth import AuthenticatedPrincipal, require_principal
from app.api.deps import get_channel_service, get_session_manager
from app.core.errors import BadRequest, NotFound
from app.schemas.channel import ChannelResponse
from app.schemas.post import PostResponse

_CHANNEL_ID = "01a00000-0000-7000-8000-0000000000ff"
_CREATED = datetime.datetime(2026, 8, 15, 12, 0, tzinfo=datetime.UTC)


class _FakeChannelService:
    def __init__(self, error: Exception | None = None) -> None:
        self.calls: list[dict[str, Any]] = []
        self._error = error

    async def list_channels(
        self, actor_id: str, actor_role: str, **kw: Any
    ) -> list[ChannelResponse]:
        self.calls.append({"op": "channels", "actor_role": actor_role, **kw})
        if self._error is not None:
            raise self._error
        return [
            ChannelResponse(
                id=_CHANNEL_ID, name="Tech Digest", status="active", description="Daily brief"
            )
        ]

    async def list_posts(
        self, actor_id: str, actor_role: str, channel_id: str, **kw: Any
    ) -> list[PostResponse]:
        self.calls.append({"op": "posts", "actor_role": actor_role, "channel_id": channel_id, **kw})
        if self._error is not None:
            raise self._error
        return [
            PostResponse(
                id="01a00000-0000-7000-8000-000000000001",
                channel_id=channel_id,
                status="needs_review",
                title="Quantum-safe TLS",
                body_preview="Three vendors now ship hybrid TLS by default",
                created_at=_CREATED,
            )
        ]


@pytest.fixture
def service() -> _FakeChannelService:
    return _FakeChannelService()


@pytest.fixture
async def authed_client(app: FastAPI, service: _FakeChannelService) -> httpx.AsyncClient:
    app.dependency_overrides[get_channel_service] = lambda: service
    app.dependency_overrides[require_principal] = lambda: AuthenticatedPrincipal(
        id="user-1", role="viewer"
    )
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    return httpx.AsyncClient(transport=transport, base_url="http://testserver")


@pytest.mark.parametrize("path", ["/api/v1/channels", f"/api/v1/channels/{_CHANNEL_ID}/posts"])
async def test_channel_reads_require_a_session(
    app: FastAPI, client: httpx.AsyncClient, path: str
) -> None:
    app.dependency_overrides[get_session_manager] = lambda: SessionManager(
        FakeSessionStore(), FakeClock(), FakeTokenFactory()
    )

    response = await client.get(path)

    assert response.status_code == 401


async def test_channels_return_a_bare_array_with_the_contract_fields(
    authed_client: httpx.AsyncClient,
) -> None:
    response = await authed_client.get("/api/v1/channels")

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list), "D1-A: dashboard reads return bare arrays"
    assert set(body[0]) == {"id", "name", "status", "description"}
    assert body[0]["name"] == "Tech Digest"


async def test_posts_return_a_bare_array_with_the_contract_fields(
    authed_client: httpx.AsyncClient,
) -> None:
    response = await authed_client.get(f"/api/v1/channels/{_CHANNEL_ID}/posts")

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert set(body[0]) == {"id", "channel_id", "status", "title", "body_preview", "created_at"}
    assert "body" not in body[0]


async def test_status_filter_and_paging_reach_the_service(
    authed_client: httpx.AsyncClient, service: _FakeChannelService
) -> None:
    await authed_client.get(
        f"/api/v1/channels/{_CHANNEL_ID}/posts",
        params={"status": "needs_review", "limit": 5, "offset": 2},
    )

    call = service.calls[-1]
    assert call["channel_id"] == _CHANNEL_ID
    assert call["status"] == "needs_review"
    assert call["limit"] == 5
    assert call["offset"] == 2


@pytest.mark.parametrize("params", [{"limit": 0}, {"limit": 101}, {"offset": -1}])
async def test_page_bounds_are_enforced(
    authed_client: httpx.AsyncClient, params: dict[str, int]
) -> None:
    response = await authed_client.get("/api/v1/channels", params=params)
    assert response.status_code == 422


async def test_unknown_channel_maps_to_404(app: FastAPI) -> None:
    app.dependency_overrides[get_channel_service] = lambda: _FakeChannelService(
        NotFound("channel not found")
    )
    app.dependency_overrides[require_principal] = lambda: AuthenticatedPrincipal(
        id="user-1", role="owner"
    )
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(f"/api/v1/channels/{_CHANNEL_ID}/posts")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


async def test_unknown_status_filter_maps_to_400(app: FastAPI) -> None:
    app.dependency_overrides[get_channel_service] = lambda: _FakeChannelService(
        BadRequest("unknown post status: nonsense")
    )
    app.dependency_overrides[require_principal] = lambda: AuthenticatedPrincipal(
        id="user-1", role="owner"
    )
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            f"/api/v1/channels/{_CHANNEL_ID}/posts", params={"status": "nonsense"}
        )

    assert response.status_code == 400
