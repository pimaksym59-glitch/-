"""Channel routes (API_SPEC §"Channels", §"Content / Posts") — Stage 21 Phase 3A. Thin: parse,
call one service use-case, return its DTOs (§R3.1).

Both responses are BARE ARRAYS, not the `{items, total, next_cursor}` envelope (owner decision
D1-A — the deliberate, minimal exception for the dashboard reads).
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.auth import AuthenticatedPrincipal, require_principal
from app.api.deps import get_channel_service
from app.schemas.channel import ChannelResponse
from app.schemas.post import PostResponse
from app.services.channels import ChannelService

router = APIRouter(prefix="/channels", tags=["channels"])

ChannelServiceDep = Annotated[ChannelService, Depends(get_channel_service)]
PrincipalDep = Annotated[AuthenticatedPrincipal, Depends(require_principal)]


@router.get("", response_model=list[ChannelResponse])
async def list_channels(
    principal: PrincipalDep,
    service: ChannelServiceDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[ChannelResponse]:
    """`GET /channels` — readable by every role (API_SPEC RBAC matrix)."""

    return await service.list_channels(principal.id, principal.role, limit=limit, offset=offset)


@router.get("/{channel_id}/posts", response_model=list[PostResponse])
async def list_channel_posts(
    channel_id: str,
    principal: PrincipalDep,
    service: ChannelServiceDep,
    status: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[PostResponse]:
    """`GET /channels/{id}/posts?status=` — scoped to one channel by construction (§R2.6)."""

    return await service.list_posts(
        principal.id,
        principal.role,
        channel_id,
        status=status,
        limit=limit,
        offset=offset,
    )
