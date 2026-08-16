"""Analytics & cost routes (API_SPEC §"Analytics & Cost") — Stage 21 Phase 2A. Thin: one service
use-case per route (§R3.1); the availability policy (§R7.3/§R10.3) lives in the service.

Two paths share this module because they share one use-case family, but they sit under different
prefixes in the contract (`/analytics/...` and `/cost`), so the router carries no prefix and the
paths are written out in full.

`GET /cost` serves `group_by=day` in this slice — the grouping the console dashboard asks for.
`channel`, `model` and `provider` are named by the contract but each needs a semantic decision the
schema does not answer on its own (`api_usage` has a model and no provider, `image_usage` the
reverse), so they are rejected with a clear `400` rather than guessed at.

`GET /analytics/channels/{id}` serves today's snapshot. The contract's `?from=&to=` range is not
accepted yet: every field of this DTO is a *today* figure (`cost_today`, `published_today`), so a
range has no defined meaning for it — that too is a contract decision, not an implementation one.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.auth import AuthenticatedPrincipal, require_principal
from app.api.deps import get_dashboard_analytics_service
from app.schemas.analytics import AnalyticsSnapshotResponse, CostEntryResponse
from app.services.dashboard import DashboardAnalyticsService

router = APIRouter(tags=["analytics"])

AnalyticsServiceDep = Annotated[DashboardAnalyticsService, Depends(get_dashboard_analytics_service)]
PrincipalDep = Annotated[AuthenticatedPrincipal, Depends(require_principal)]


@router.get("/analytics/channels/{channel_id}", response_model=AnalyticsSnapshotResponse)
async def channel_snapshot(
    channel_id: str, principal: PrincipalDep, service: AnalyticsServiceDep
) -> AnalyticsSnapshotResponse:
    """`GET /analytics/channels/{id}` — today's metrics, gated fields flagged (§R7.3)."""

    return await service.channel_snapshot(principal.id, principal.role, channel_id)


@router.get("/cost", response_model=list[CostEntryResponse])
async def cost(
    principal: PrincipalDep,
    service: AnalyticsServiceDep,
    group_by: Annotated[str, Query()] = "day",
) -> list[CostEntryResponse]:
    """`GET /cost?group_by=day` — spend per UTC day (§R11.8). Bare array per owner decision D1-A."""

    return await service.cost(principal.id, principal.role, group_by=group_by)
