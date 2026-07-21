"""Placeholder task handlers so the queue is runnable end-to-end in Stage 3.

Each real engine replaces its stub in later stages (ai_engine → generate_text,
image_engine → generate_image, validation → validate, telegram_engine →
publish, analytics → collect_metrics). Registered explicitly by the runner.
"""

from __future__ import annotations

import structlog

from app.models import Task
from app.models.enums import TaskType

from .registry import TaskContext, get_handler, register

log = structlog.get_logger(__name__)


def register_stubs() -> None:
    """Register echo stubs only for task types no real engine has claimed yet."""
    for task_type in TaskType:
        if get_handler(task_type) is None:
            register(task_type)(_make_stub(task_type))


def _make_stub(task_type: TaskType):
    async def _stub(task: Task, ctx: TaskContext) -> dict:
        log.info("stub_handler", task_type=task_type.value, task_id=task.id)
        return {"stub": True, "type": task_type.value}

    _stub.__name__ = f"stub_{task_type.value}"
    return _stub
