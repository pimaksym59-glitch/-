"""Typed task registry (§R8.2). Declarative registration; a missing handler raises a clean error
(``HandlerNotRegistered``) that the Executor turns into ``needs_review`` — never a process crash.
"""

from __future__ import annotations

from collections.abc import Callable

from app.models.enums import TaskType
from app.workers.errors import HandlerNotRegistered
from app.workers.handler import TaskHandler


class TaskRegistry:
    def __init__(self) -> None:
        self._handlers: dict[TaskType, TaskHandler] = {}

    def register(self, task_type: TaskType, handler: TaskHandler) -> None:
        if task_type in self._handlers:
            raise ValueError(f"handler already registered for {task_type.value}")
        self._handlers[task_type] = handler

    def handler(self, task_type: TaskType) -> Callable[[type[TaskHandler]], type[TaskHandler]]:
        """Declarative registration: ``@registry.handler(TaskType.x)`` on a no-arg handler class."""

        def decorator(cls: type[TaskHandler]) -> type[TaskHandler]:
            self.register(task_type, cls())
            return cls

        return decorator

    def get(self, task_type: TaskType) -> TaskHandler:
        try:
            return self._handlers[task_type]
        except KeyError as exc:
            raise HandlerNotRegistered(f"no handler for task type {task_type.value}") from exc

    def registered_types(self) -> frozenset[TaskType]:
        return frozenset(self._handlers)
