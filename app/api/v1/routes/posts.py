"""Post review routes (API_SPEC §"Content / Posts") — Stage 21 Phase 3A.

Both routes are queue intents: they answer `202 Accepted` with `{task_id}` (§R10.1, owner decision
D7) — acknowledged and enqueued, never "done". The `Idempotency-Key` header is passed straight
through to the service, which maps it onto `tasks.dedup_key` (§R7.4).
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, status

from app.api.auth import AuthenticatedPrincipal, require_principal
from app.api.deps import get_post_service
from app.schemas.post import TaskIntentResponse
from app.services.posts import PostService

router = APIRouter(prefix="/posts", tags=["posts"])

PostServiceDep = Annotated[PostService, Depends(get_post_service)]
PrincipalDep = Annotated[AuthenticatedPrincipal, Depends(require_principal)]
IdempotencyKey = Annotated[str | None, Header(alias="Idempotency-Key")]


@router.post(
    "/{post_id}/approve",
    response_model=TaskIntentResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def approve_post(
    post_id: str,
    principal: PrincipalDep,
    service: PostServiceDep,
    idempotency_key: IdempotencyKey = None,
) -> TaskIntentResponse:
    """`POST /posts/{id}/approve` (approval mode §R7.8) -> `202 {task_id}`."""

    return await service.approve(
        principal.id, principal.role, post_id, idempotency_key=idempotency_key
    )


@router.post(
    "/{post_id}/reject",
    response_model=TaskIntentResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def reject_post(
    post_id: str,
    principal: PrincipalDep,
    service: PostServiceDep,
    idempotency_key: IdempotencyKey = None,
) -> TaskIntentResponse:
    """`POST /posts/{id}/reject` (approval mode §R7.8) -> `202 {task_id}`."""

    return await service.reject(
        principal.id, principal.role, post_id, idempotency_key=idempotency_key
    )
