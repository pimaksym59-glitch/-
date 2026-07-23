"""Task queue engine (§R2.2/§R8): registry, dispatcher, executor, worker, retry/backoff, DLQ.

Infrastructure only — no domain generation logic. Handlers for each ``TaskType`` are registered by
their stages (12-17). See TASK_BREAKDOWN_STAGE8 for the design.
"""

from __future__ import annotations

from app.workers.dispatcher import Dispatcher
from app.workers.executor import Executor
from app.workers.handler import HandlerContext, TaskHandler
from app.workers.hooks import Hooks, NoOpHooks
from app.workers.producer import SqlTaskProducer, TaskProducer
from app.workers.registry import TaskRegistry
from app.workers.worker import Worker

__all__ = [
    "Dispatcher",
    "Executor",
    "HandlerContext",
    "Hooks",
    "NoOpHooks",
    "SqlTaskProducer",
    "TaskHandler",
    "TaskProducer",
    "TaskRegistry",
    "Worker",
]
