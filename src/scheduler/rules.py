"""Task runnability rules — pure predicates decoupled from the database.

The worker's SQL claim query mirrors these rules; keeping them here as plain
functions makes the semantics explicit and unit-testable.
"""

from __future__ import annotations

from datetime import datetime

from app.models.enums import TaskStatus

RUNNABLE_STATUSES = (TaskStatus.pending, TaskStatus.ready)


def is_runnable(
    *,
    status: TaskStatus,
    available_at: datetime | None,
    now: datetime,
    dependency_status: TaskStatus | None,
) -> bool:
    """True if a task may be claimed right now.

    `dependency_status` is None when the task has no dependency; otherwise it is
    the current status of the task it depends on (only `succeeded` unblocks it).
    """
    if status not in RUNNABLE_STATUSES:
        return False
    if available_at is not None and available_at > now:
        return False
    if dependency_status is not None and dependency_status != TaskStatus.succeeded:
        return False
    return True


def dependency_is_broken(dependency_status: TaskStatus | None) -> bool:
    """True if the dependency reached a terminal non-success state, meaning the
    dependent task can never run and should be cancelled."""
    return dependency_status in (TaskStatus.failed, TaskStatus.cancelled)


def should_retry(attempts: int, max_attempts: int) -> bool:
    return attempts < max_attempts
