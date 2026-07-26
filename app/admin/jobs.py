"""Job monitoring (owner req 11, §R4.11) — read task status through a public Workers port only.

The admin domain defines :class:`JobMonitorPort` (adapted to Workers' public status interface
in composition) and :class:`QueuePort` for actions. Per §R10.1 a requeue is emitted as a
:class:`~app.admin.types.TaskIntent` through the queue — never a second execution path; the
actual enqueue is composition/RV-17.

"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol

from app.admin.authorization import RbacAuthorization
from app.admin.dto import JobRecord, JobView
from app.admin.mapping import to_job_view
from app.admin.pagination import Page, PageRequest, paginate
from app.admin.rbac import Permission
from app.admin.types import AdminActor, TaskIntent


class JobMonitorPort(Protocol):
    """Read port for queue/task status (adapted to Workers' public interface in composition)."""

    def list_jobs(self) -> Sequence[JobRecord]: ...


class QueuePort(Protocol):
    """Action port: submit a task intent to the queue (§R10.1). Real enqueue is RV-17."""

    def submit(self, intent: TaskIntent) -> None: ...


class JobMonitorService:
    """Lists task statuses (§R4.11) and issues DLQ-requeue intents (§R10.1) — RBAC-gated."""

    def __init__(self, port: JobMonitorPort, queue: QueuePort, authz: RbacAuthorization) -> None:
        self._port = port
        self._queue = queue
        self._authz = authz

    def list_jobs(self, actor: AdminActor, request: PageRequest | None = None) -> Page[JobView]:
        """Return a page of job views (requires JOBS_READ)."""

        self._authz.require(actor, Permission.JOBS_READ)
        views = [to_job_view(record) for record in self._port.list_jobs()]
        return paginate(views, request or PageRequest())

    def requeue(self, actor: AdminActor, job_id: str) -> TaskIntent:
        """Emit a requeue intent for a DLQ job (requires SCHEDULER_MANAGE). Enqueue is
        composition."""

        self._authz.require(actor, Permission.SCHEDULER_MANAGE)
        intent = TaskIntent(kind="requeue", payload={"job_id": job_id})
        self._queue.submit(intent)
        return intent
