"""Task handler protocol + execution context — the extension point for future workers (§R2.5).

A handler does its work and returns ``None`` on success, or raises a
:mod:`app.workers.errors` exception on failure — the Executor is the single place that classifies
and reacts. Handlers are registered per :class:`~app.models.enums.TaskType` in the registry.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.models.queue import Task


@dataclass
class HandlerContext:
    """Dependencies injected into a handler (bound to one unit-of-work)."""

    session: AsyncSession
    redis: Redis
    settings: Settings


class TaskHandler(Protocol):
    async def handle(self, task: Task, ctx: HandlerContext) -> None: ...
