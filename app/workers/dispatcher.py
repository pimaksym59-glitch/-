"""Task dispatcher — orchestration only (§R3.1, req 1). No business logic, no handler knowledge.

It claims due pending tasks with ``FOR UPDATE SKIP LOCKED`` (§R8.10) via the repository and hands
them to the Executor. Status transitions belong to the Executor.
"""

from __future__ import annotations

import datetime
from collections.abc import Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.queue import Task
from app.repositories.task_repository import TaskRepository


class Dispatcher:
    def __init__(self, session: AsyncSession) -> None:
        self._repo = TaskRepository(session)

    async def claim(self, *, now: datetime.datetime, limit: int = 1) -> Sequence[Task]:
        return await self._repo.claim_pending(now=now, limit=limit)
