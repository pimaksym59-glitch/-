"""Task status state machine (§R8.3, DATABASE_SPEC ``task_status``) — pure.

pending  -> running, cancelled
running  -> succeeded, failed, needs_review, cancelled
failed   -> deferred (retry), dead (DLQ)
deferred -> pending, cancelled
dead / needs_review -> pending (manual requeue, §R8.11)
"""

from __future__ import annotations

from app.models.enums import TaskStatus

ALLOWED_TRANSITIONS: dict[TaskStatus, frozenset[TaskStatus]] = {
    TaskStatus.pending: frozenset({TaskStatus.running, TaskStatus.cancelled}),
    TaskStatus.running: frozenset(
        {TaskStatus.succeeded, TaskStatus.failed, TaskStatus.needs_review, TaskStatus.cancelled}
    ),
    TaskStatus.failed: frozenset({TaskStatus.deferred, TaskStatus.dead}),
    TaskStatus.deferred: frozenset({TaskStatus.pending, TaskStatus.cancelled}),
    TaskStatus.needs_review: frozenset({TaskStatus.pending}),
    TaskStatus.dead: frozenset({TaskStatus.pending}),
    TaskStatus.succeeded: frozenset(),
    TaskStatus.cancelled: frozenset(),
}


def can_transition(current: TaskStatus, target: TaskStatus) -> bool:
    return target in ALLOWED_TRANSITIONS[current]


def assert_transition(current: TaskStatus, target: TaskStatus) -> None:
    if not can_transition(current, target):
        raise ValueError(f"illegal task status transition: {current.value} -> {target.value}")
