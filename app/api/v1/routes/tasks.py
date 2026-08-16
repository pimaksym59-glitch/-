"""Task routes (API_SPEC §"Scheduler & Tasks") — Stage 21 Phase 2A. Thin: parse the query, call one
service use-case, return its DTOs (§R3.1). No SQL, no RBAC decision, no vocabulary mapping here.

Response shape: a BARE ARRAY, not the `{items, total, next_cursor}` envelope (owner decision D1-A —
a deliberate, minimal exception for the dashboard read endpoints so the frozen console contract is
met without touching frontend source). `limit`/`offset` are still accepted and still capped.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.auth import AuthenticatedPrincipal, require_principal
from app.api.deps import get_task_service
from app.schemas.task import TaskResponse
from app.services.tasks import TaskService

router = APIRouter(prefix="/tasks", tags=["tasks"])

TaskServiceDep = Annotated[TaskService, Depends(get_task_service)]
PrincipalDep = Annotated[AuthenticatedPrincipal, Depends(require_principal)]


@router.get("", response_model=list[TaskResponse])
async def list_tasks(
    principal: PrincipalDep,
    service: TaskServiceDep,
    channel_id: Annotated[str | None, Query()] = None,
    status: Annotated[str | None, Query()] = None,
    task_type: Annotated[str | None, Query(alias="type")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[TaskResponse]:
    """`GET /tasks?status=&type=&channel_id=` (Task Monitor §R10.6; owner/admin)."""

    return await service.list_tasks(
        principal.id,
        principal.role,
        channel_id=channel_id,
        status=status,
        task_type=task_type,
        limit=limit,
        offset=offset,
    )
