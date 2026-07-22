"""Handler registry mapping TaskType → async handler.

Later stages register real handlers (e.g. ai_engine registers `generate_text`).
A handler receives the Task and a TaskContext and returns an optional result
dict stored on the task. Raising an exception triggers retry/failure handling.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import async_sessionmaker

from app.config import Settings
from app.models import Task
from app.models.enums import TaskType


@dataclass
class TaskContext:
    sessionmaker: async_sessionmaker
    settings: Settings


Handler = Callable[[Task, TaskContext], Awaitable[dict | None]]

_HANDLERS: dict[TaskType, Handler] = {}


def register(task_type: TaskType) -> Callable[[Handler], Handler]:
    def decorator(fn: Handler) -> Handler:
        if task_type in _HANDLERS:
            raise ValueError(f"handler for {task_type} already registered")
        _HANDLERS[task_type] = fn
        return fn

    return decorator


def get_handler(task_type: TaskType) -> Handler | None:
    return _HANDLERS.get(task_type)


def clear_handlers() -> None:
    """Test helper — reset the registry between tests."""
    _HANDLERS.clear()
