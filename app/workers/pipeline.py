"""Pipeline continuation-chaining as DECLARATIVE DATA (§R2.5, §R8.4) — not a DAG, no if/else.

Each stage names the next; the Executor enqueues it on success. New stages extend the map without
touching the Executor.
"""

from __future__ import annotations

from app.models.enums import TaskType

NEXT_STAGE: dict[TaskType, TaskType | None] = {
    TaskType.generate_text: TaskType.validate,
    TaskType.validate: TaskType.generate_image,
    TaskType.generate_image: TaskType.publish,
    TaskType.publish: TaskType.collect_metrics,
    TaskType.collect_metrics: None,
    # standalone / periodic tasks have no continuation
    TaskType.backup: None,
    TaskType.cleanup: None,
    TaskType.reindex: None,
    TaskType.health_check: None,
}


def next_stage(task_type: TaskType) -> TaskType | None:
    """Return the next pipeline stage for ``task_type``, or None if terminal/standalone."""
    return NEXT_STAGE.get(task_type)
