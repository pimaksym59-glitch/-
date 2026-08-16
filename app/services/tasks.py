"""Task Monitor use-case (§R3.1, §R10.6) — Stage 21 Phase 2A.

RBAC lives here, not in the route (API_SPEC: "RBAC — на бэкенде; проверка в `services`"). The
service owns its own DB session for the same reason `AuthService` does: the api layer may not
import `app.db`/`sqlalchemy` (mechanically enforced by `tests/test_layering.py`).

Vocabulary translation (owner decision D2-A) is a WIRE concern and therefore lives in this layer:
the database keeps the §R4.11 states, the console contract speaks `queued`/`completed`. The map is
deliberately tiny and total — anything not named crosses unchanged, so a state this table has never
heard of stays honest rather than being coerced into a neighbour.
"""

from __future__ import annotations

import uuid
from collections.abc import Mapping

from app.admin.authorization import RbacAuthorization
from app.admin.rbac import Permission, Role
from app.admin.types import AdminActor
from app.core.errors import BadRequest, Forbidden
from app.db.session import get_sessionmaker
from app.models.enums import TaskStatus, TaskType
from app.models.queue import Task
from app.repositories.task_repository import TaskRepository
from app.schemas.task import TaskResponse

#: DB state -> wire state. Everything absent from this map crosses unchanged.
_DB_TO_WIRE: Mapping[str, str] = {
    TaskStatus.pending.value: "queued",
    TaskStatus.succeeded.value: "completed",
}
#: The exact inverse, so a client may filter using the vocabulary it was served.
_WIRE_TO_DB: Mapping[str, str] = {wire: db for db, wire in _DB_TO_WIRE.items()}


def status_to_wire(status: str) -> str:
    """Translate one DB task state into the console vocabulary (D2-A)."""
    return _DB_TO_WIRE.get(status, status)


def to_wire(task: Task) -> TaskResponse:
    """Map one ORM task onto the frozen wire shape (`last_error` surfaces as `error`, D4)."""
    return TaskResponse(
        id=str(task.id),
        type=task.type.value,
        status=status_to_wire(task.status.value),
        channel_id=str(task.channel_id) if task.channel_id is not None else None,
        attempts=task.attempts,
        run_at=task.run_at,
        created_at=task.created_at,
        error=task.last_error,
    )


def _parse_uuid(value: str, field: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError:
        raise BadRequest(f"{field} is not a valid UUID") from None


def _parse_status(value: str) -> TaskStatus:
    """Accept either vocabulary: a client may filter by what it was served (`queued`) or by the
    §R4.11 state (`pending`)."""
    candidate = _WIRE_TO_DB.get(value, value)
    try:
        return TaskStatus(candidate)
    except ValueError:
        raise BadRequest(f"unknown task status: {value}") from None


def _parse_type(value: str) -> TaskType:
    try:
        return TaskType(value)
    except ValueError:
        raise BadRequest(f"unknown task type: {value}") from None


class TaskService:
    """`GET /tasks` — the read half of §"Scheduler & Tasks" (owner/admin per the RBAC matrix)."""

    def __init__(self, authz: RbacAuthorization | None = None) -> None:
        self._authz = authz if authz is not None else RbacAuthorization()

    def _authorize(self, actor_id: str, actor_role: str) -> None:
        actor = AdminActor(id=actor_id, role=Role(actor_role), is_authenticated=True)
        decision = self._authz.check(actor, Permission.JOBS_READ)
        if not decision.allowed:
            raise Forbidden(decision.reason)

    async def list_tasks(
        self,
        actor_id: str,
        actor_role: str,
        *,
        channel_id: str | None = None,
        status: str | None = None,
        task_type: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[TaskResponse]:
        """Filtered task listing. Authorization and input parsing happen before any I/O."""

        self._authorize(actor_id, actor_role)
        parsed_channel = _parse_uuid(channel_id, "channel_id") if channel_id else None
        parsed_status = _parse_status(status) if status else None
        parsed_type = _parse_type(task_type) if task_type else None

        async with get_sessionmaker()() as session:
            tasks = await TaskRepository(session).list_for_monitor(
                channel_id=parsed_channel,
                status=parsed_status,
                task_type=parsed_type,
                limit=limit,
                offset=offset,
            )
            return [to_wire(task) for task in tasks]
