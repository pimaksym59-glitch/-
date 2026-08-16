"""Task queue data-access (§R3.1, §R8). Dispatch uses FOR UPDATE SKIP LOCKED (§R8.10).

Only the SELECT/claim is here (data access); status transitions belong to the scheduler/worker
(later stages), which own the transaction.
"""

from __future__ import annotations

import datetime
import uuid
from collections.abc import Collection, Sequence

from sqlalchemy import select

from app.models.enums import TaskStatus, TaskType
from app.models.queue import Task
from app.repositories.base import EntityRepository


class TaskRepository(EntityRepository[Task]):
    model = Task

    async def list_for_monitor(
        self,
        *,
        channel_id: uuid.UUID | None = None,
        status: TaskStatus | None = None,
        task_type: TaskType | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Sequence[Task]:
        """Task Monitor listing (§R10.6, API_SPEC `GET /tasks?status=&type=&channel_id=`).

        Read-only and filter-only: every filter is optional and narrows the same query, ordered by
        `run_at` so the caller sees the queue in the order it will actually be worked.
        """
        stmt = select(Task).where(Task.deleted_at.is_(None))
        if channel_id is not None:
            stmt = stmt.where(Task.channel_id == channel_id)
        if status is not None:
            stmt = stmt.where(Task.status == status)
        if task_type is not None:
            stmt = stmt.where(Task.type == task_type)
        stmt = stmt.order_by(Task.run_at.asc()).limit(limit).offset(offset)
        result = await self.session.scalars(stmt)
        return result.all()

    async def claim_pending(self, *, now: datetime.datetime, limit: int = 1) -> Sequence[Task]:
        """Select due pending tasks with row locks, skipping locked rows (§R8.10)."""
        stmt = (
            select(Task)
            .where(Task.status == TaskStatus.pending, Task.run_at <= now)
            .order_by(Task.priority, Task.run_at)
            .limit(limit)
            .with_for_update(skip_locked=True)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_id_by_dedup_key(self, dedup_key: str) -> uuid.UUID | None:
        """The id of the task already holding ``dedup_key``, if any (§R7.4).

        This is what makes a queue intent idempotent at the API edge: a repeated request carrying
        the same ``Idempotency-Key`` finds the first task instead of enqueuing a second one. The
        UNIQUE index on ``tasks.dedup_key`` remains the authoritative backstop against races.
        """
        stmt = select(Task.id).where(Task.dedup_key == dedup_key).limit(1)
        task_id: uuid.UUID | None = await self.session.scalar(stmt)
        return task_id

    async def existing_dedup_keys(self, keys: Collection[str]) -> set[str]:
        """Subset of ``keys`` already present in ``tasks`` (§R8.10). Read-only; lets the scheduler
        skip re-materializing slots so a re-scan enqueues nothing. Empty input short-circuits."""
        if not keys:
            return set()
        stmt = select(Task.dedup_key).where(Task.dedup_key.in_(keys), Task.deleted_at.is_(None))
        result = await self.session.scalars(stmt)
        return {key for key in result.all() if key is not None}
