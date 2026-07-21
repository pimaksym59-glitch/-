"""Postgres-backed task queue operations.

Postgres is the source of truth. Multiple workers stay safe via
`SELECT ... FOR UPDATE SKIP LOCKED` on claim. All functions take an
`AsyncSession` and commit their own unit of work.
"""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.models import Task
from app.models.enums import TaskStatus, TaskType

from .backoff import compute_backoff
from .rules import RUNNABLE_STATUSES, should_retry


def _now() -> datetime:
    return datetime.now(tz=UTC)


async def enqueue(
    session: AsyncSession,
    *,
    task_type: TaskType,
    payload: dict | None = None,
    priority: int = 0,
    available_at: datetime | None = None,
    depends_on_id: int | None = None,
    max_attempts: int = 3,
) -> Task:
    task = Task(
        type=task_type,
        status=TaskStatus.pending,
        payload=payload or {},
        priority=priority,
        available_at=available_at,
        depends_on_id=depends_on_id,
        max_attempts=max_attempts,
    )
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task


async def claim_next(session: AsyncSession) -> Task | None:
    """Atomically claim the highest-priority runnable task and mark it running.

    Runnable = status in (pending, ready), available_at due, and either no
    dependency or the dependency has succeeded.
    """
    now = _now()
    dep = aliased(Task)
    stmt = (
        select(Task)
        .outerjoin(dep, Task.depends_on_id == dep.id)
        .where(
            Task.status.in_(RUNNABLE_STATUSES),
            or_(Task.available_at.is_(None), Task.available_at <= now),
            or_(Task.depends_on_id.is_(None), dep.status == TaskStatus.succeeded),
        )
        .order_by(Task.priority.desc(), Task.id.asc())
        .limit(1)
        .with_for_update(skip_locked=True, of=Task)
    )
    task = (await session.execute(stmt)).scalar_one_or_none()
    if task is None:
        await session.rollback()
        return None

    task.status = TaskStatus.running
    task.started_at = now
    task.attempts += 1
    await session.commit()
    await session.refresh(task)
    return task


async def mark_succeeded(session: AsyncSession, task: Task, result: dict | None) -> None:
    task.status = TaskStatus.succeeded
    task.result = result
    task.error = None
    task.finished_at = _now()
    await session.commit()


async def mark_failed_or_retry(session: AsyncSession, task: Task, error: str) -> TaskStatus:
    """On failure: reschedule with backoff if attempts remain, else fail.

    Returns the resulting status.
    """
    task.error = error[:4000]
    if should_retry(task.attempts, task.max_attempts):
        task.status = TaskStatus.pending
        task.available_at = _now() + compute_backoff(task.attempts)
        task.started_at = None
    else:
        task.status = TaskStatus.failed
        task.finished_at = _now()
    await session.commit()
    return task.status


async def cancel_broken_dependents(session: AsyncSession) -> int:
    """Cancel tasks whose dependency failed or was cancelled (they can't run).

    Returns the number of tasks cancelled.
    """
    dep = aliased(Task)
    blocked = (
        select(Task.id)
        .join(dep, Task.depends_on_id == dep.id)
        .where(
            Task.status.in_(RUNNABLE_STATUSES),
            dep.status.in_([TaskStatus.failed, TaskStatus.cancelled]),
        )
    )
    result = await session.execute(
        update(Task)
        .where(Task.id.in_(blocked.scalar_subquery()))
        .values(status=TaskStatus.cancelled, finished_at=_now())
    )
    await session.commit()
    return result.rowcount or 0
