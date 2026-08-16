"""Offline HTTP tests for `GET /analytics/channels/{id}` and `GET /cost` (Stage 21 Phase 2A).

The gated-metric contract (§R7.3/§R10.3) is asserted at the HTTP boundary, because that is where a
regression would actually reach the console: a gated field must arrive as `null` + `"gated"`, never
as a zero.
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
from app.api.deps import get_dashboard_analytics_service, get_session_manager
from app.core.errors import BadRequest, NotFound
from app.schemas.analytics import (
    AnalyticsSnapshotResponse,
    CostEntryResponse,
    available_metric,
    gated_metric,
)

_CHANNEL_ID = "01a00000-0000-7000-8000-0000000000ff"
_TODAY = datetime.date(2026, 8, 15)


class _FakeAnalyticsService:
    def __init__(self, error: Exception | None = None) -> None:
        self.calls: list[dict[str, Any]] = []
        self._error = error

    async def channel_snapshot(
        self, actor_id: str, actor_role: str, channel_id: str
    ) -> AnalyticsSnapshotResponse:
        self.calls.append({"actor_role": actor_role, "channel_id": channel_id})
        if self._error is not None:
            raise self._error
        return AnalyticsSnapshotResponse(
            channel_id=channel_id,
            date=_TODAY,
            cost_today=available_metric(4.82),
            published_today=available_metric(3),
            views=gated_metric(),
            reactions=gated_metric(),
        )

    async def cost(
        self, actor_id: str, actor_role: str, *, group_by: str
    ) -> list[CostEntryResponse]:
        self.calls.append({"actor_role": actor_role, "group_by": group_by})
        if self._error is not None:
            raise self._error
        return [CostEntryResponse(key="2026-08-14", amount_usd=5.4)]


@pytest.fixture
def service() -> _FakeAnalyticsService:
    return _FakeAnalyticsService()


@pytest.fixture
async def authed_client(app: FastAPI, service: _FakeAnalyticsService) -> httpx.AsyncClient:
    app.dependency_overrides[get_dashboard_analytics_service] = lambda: service
    app.dependency_overrides[require_principal] = lambda: AuthenticatedPrincipal(
        id="user-1", role="viewer"
    )
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    return httpx.AsyncClient(transport=transport, base_url="http://testserver")


@pytest.mark.parametrize("path", [f"/api/v1/analytics/channels/{_CHANNEL_ID}", "/api/v1/cost"])
async def test_analytics_requires_a_session(
    app: FastAPI, client: httpx.AsyncClient, path: str
) -> None:
    app.dependency_overrides[get_session_manager] = lambda: SessionManager(
        FakeSessionStore(), FakeClock(), FakeTokenFactory()
    )

    response = await client.get(path)

    assert response.status_code == 401


async def test_snapshot_shape_matches_the_console_contract(
    authed_client: httpx.AsyncClient,
) -> None:
    response = await authed_client.get(f"/api/v1/analytics/channels/{_CHANNEL_ID}")

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {
        "channel_id",
        "date",
        "cost_today",
        "published_today",
        "views",
        "reactions",
    }
    assert body["date"] == "2026-08-15"
    assert body["cost_today"] == {"value": 4.82, "availability": "available"}


async def test_gated_metrics_are_null_and_flagged_never_zero(
    authed_client: httpx.AsyncClient,
) -> None:
    """§R7.3/§R10.3 at the wire boundary — the console renders the honest Gated tile from this."""
    body = (await authed_client.get(f"/api/v1/analytics/channels/{_CHANNEL_ID}")).json()

    for field in ("views", "reactions"):
        assert body[field] == {"value": None, "availability": "gated"}, field


async def test_cost_returns_a_bare_array_and_forwards_group_by(
    authed_client: httpx.AsyncClient, service: _FakeAnalyticsService
) -> None:
    response = await authed_client.get("/api/v1/cost", params={"group_by": "day"})

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list), "D1-A: dashboard reads return bare arrays"
    assert body == [{"key": "2026-08-14", "amount_usd": 5.4}]
    assert service.calls[-1]["group_by"] == "day"


async def test_cost_defaults_to_day_grouping(
    authed_client: httpx.AsyncClient, service: _FakeAnalyticsService
) -> None:
    await authed_client.get("/api/v1/cost")
    assert service.calls[-1]["group_by"] == "day"


async def test_unknown_channel_maps_to_404(app: FastAPI) -> None:
    app.dependency_overrides[get_dashboard_analytics_service] = lambda: _FakeAnalyticsService(
        NotFound("channel not found")
    )
    app.dependency_overrides[require_principal] = lambda: AuthenticatedPrincipal(
        id="user-1", role="owner"
    )
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(f"/api/v1/analytics/channels/{_CHANNEL_ID}")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


async def test_unsupported_grouping_maps_to_400(app: FastAPI) -> None:
    app.dependency_overrides[get_dashboard_analytics_service] = lambda: _FakeAnalyticsService(
        BadRequest("unsupported group_by: provider")
    )
    app.dependency_overrides[require_principal] = lambda: AuthenticatedPrincipal(
        id="user-1", role="owner"
    )
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/api/v1/cost", params={"group_by": "provider"})

    assert response.status_code == 400
