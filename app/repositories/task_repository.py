"""Task queue data-access (§R3.1, §R8). Dispatch uses FOR UPDATE SKIP LOCKED (§R8.10).

Only the SELECT/claim is here (data access); status transitions belong to the scheduler/worker
(later stages), which own the transaction.
"""

from __future__ import annotations

import datetime
from collections.abc import Sequence

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
