"""Task enqueue primitive (§R7.4). Idempotency source of truth is Postgres ``tasks.dedup_key``
(unique); a Redis fast-path may short-circuit earlier but is never authoritative. The caller owns
the transaction (does not commit here).
"""

from __future__ import annotations

import datetime
import uuid
from typing import Any, Protocol

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import TaskType
from app.models.queue import Task


class TaskProducer(Protocol):
    async def enqueue(
        self,
        *,
        task_type: TaskType,
        channel_id: uuid.UUID | None,
        payload: dict[str, Any],
        run_at: datetime.datetime,
        dedup_key: str | None = None,
    ) -> None: ...


class SqlTaskProducer:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def enqueue(
        self,
        *,
        task_type: TaskType,
        channel_id: uuid.UUID | None,
        payload: dict[str, Any],
        run_at: datetime.datetime,
        dedup_key: str | None = None,
    ) -> None:
        self._session.add(
            Task(
                type=task_type,
                channel_id=channel_id,
                payload=payload,
                run_at=run_at,
                dedup_key=dedup_key,
            )
        )
