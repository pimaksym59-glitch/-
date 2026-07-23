"""TaskRegistry tests (§R8.2): typed registration, duplicate/unknown handling. Offline."""

from __future__ import annotations

import pytest

from app.models.enums import TaskType
from app.models.queue import Task
from app.workers.errors import HandlerNotRegistered
from app.workers.handler import HandlerContext
from app.workers.registry import TaskRegistry


class _Handler:
    async def handle(self, task: Task, ctx: HandlerContext) -> None:
        return None


def test_register_and_get() -> None:
    registry = TaskRegistry()
    handler = _Handler()
    registry.register(TaskType.generate_text, handler)
    assert registry.get(TaskType.generate_text) is handler
    assert registry.registered_types() == frozenset({TaskType.generate_text})


def test_duplicate_registration_rejected() -> None:
    registry = TaskRegistry()
    registry.register(TaskType.publish, _Handler())
    with pytest.raises(ValueError):
        registry.register(TaskType.publish, _Handler())


def test_missing_handler_raises_typed_error() -> None:
    with pytest.raises(HandlerNotRegistered):
        TaskRegistry().get(TaskType.validate)


def test_declarative_decorator() -> None:
    registry = TaskRegistry()

    @registry.handler(TaskType.cleanup)
    class _Cleanup:
        async def handle(self, task: Task, ctx: HandlerContext) -> None:
            return None

    assert TaskType.cleanup in registry.registered_types()
