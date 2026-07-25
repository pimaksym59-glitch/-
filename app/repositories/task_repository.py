"""Task queue data-access (§R3.1, §R8). Dispatch uses FOR UPDATE SKIP LOCKED (§R8.10).

Only the SELECT/claim is here (data access); status transitions belong to the scheduler/worker
(later stages), which own the transaction.
"""

from __future__ import annotations

import datetime
from collections.abc import Collection, Sequence

from sqlalchemy import select

from app.models.enums import TaskStatus
from app.models.queue import Task
from app.repositories.base import EntityRepository


class TaskRepository(EntityRepository[Task]):
    model = Task

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

    async def existing_dedup_keys(self, keys: Collection[str]) -> set[str]:
        """Subset of ``keys`` already present in ``tasks`` (§R8.10). Read-only; lets the scheduler
        skip re-materializing slots so a re-scan enqueues nothing. Empty input short-circuits."""
        if not keys:
            return set()
        stmt = select(Task.dedup_key).where(Task.dedup_key.in_(keys), Task.deleted_at.is_(None))
        result = await self.session.scalars(stmt)
        return {key for key in result.all() if key is not None}
