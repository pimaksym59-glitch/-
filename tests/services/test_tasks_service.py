"""Offline tests for the Task Monitor service (Stage 21 Phase 2A).

Two things are provable without a database and are proven here: the wire-vocabulary translation
(owner decision D2-A) and the RBAC denial path, which runs BEFORE any I/O — a denied caller must
never reach the database at all, and that is exactly what makes this test possible offline. The
allow path needs real rows and lives in `tests/api/test_dashboard_integration.py`.
"""

from __future__ import annotations

import datetime
import uuid

import pytest

from app.core.errors import BadRequest, Forbidden
from app.models.enums import TaskStatus, TaskType
from app.models.queue import Task
from app.services.tasks import TaskService, status_to_wire, to_wire

_NOW = datetime.datetime(2026, 8, 15, 12, 0, tzinfo=datetime.UTC)


def _task(**overrides: object) -> Task:
    task = Task(
        id=uuid.uuid4(),
        channel_id=uuid.uuid4(),
        type=TaskType.publish,
        status=TaskStatus.pending,
        attempts=0,
        run_at=_NOW,
        last_error=None,
    )
    task.created_at = _NOW
    for key, value in overrides.items():
        setattr(task, key, value)
    return task


@pytest.mark.parametrize(
    ("db_status", "wire"),
    [
        (TaskStatus.pending, "queued"),
        (TaskStatus.succeeded, "completed"),
        (TaskStatus.running, "running"),
        (TaskStatus.failed, "failed"),
        (TaskStatus.deferred, "deferred"),
        (TaskStatus.needs_review, "needs_review"),
        (TaskStatus.cancelled, "cancelled"),
        (TaskStatus.dead, "dead"),
    ],
)
def test_status_translation_covers_every_db_state(db_status: TaskStatus, wire: str) -> None:
    """Only `pending`/`succeeded` are renamed; every other state crosses unchanged (D2-A)."""
    assert status_to_wire(db_status.value) == wire


def test_unknown_status_crosses_unchanged_rather_than_being_coerced() -> None:
    assert (
        status_to_wire("a-state-this-build-never-heard-of") == "a-state-this-build-never-heard-of"
    )


def test_to_wire_maps_the_contract_fields() -> None:
    channel_id = uuid.uuid4()
    task = _task(channel_id=channel_id, last_error="boom", attempts=3)

    wire = to_wire(task)

    assert wire.status == "queued"  # DB `pending`
    assert wire.type == "publish"
    assert wire.channel_id == str(channel_id)
    assert wire.attempts == 3
    assert wire.error == "boom"  # DB column is `last_error` (D4)
    assert wire.run_at == _NOW
    assert wire.created_at == _NOW


def test_to_wire_keeps_a_channelless_task_null() -> None:
    assert to_wire(_task(channel_id=None)).channel_id is None


@pytest.mark.parametrize("role", ["editor", "analyst", "viewer"])
async def test_non_ops_roles_are_denied_before_any_database_access(role: str) -> None:
    """`jobs.read` is owner/admin only (API_SPEC matrix). No DB is configured in this test, so a
    `Forbidden` here also proves authorization happens before the service opens a session."""
    with pytest.raises(Forbidden):
        await TaskService().list_tasks("user-1", role, channel_id=None)


async def test_bad_channel_id_is_rejected_before_any_database_access() -> None:
    with pytest.raises(BadRequest):
        await TaskService().list_tasks("user-1", "owner", channel_id="not-a-uuid")


async def test_unknown_status_filter_is_rejected() -> None:
    with pytest.raises(BadRequest):
        await TaskService().list_tasks("user-1", "owner", status="nonsense")


async def test_unknown_type_filter_is_rejected() -> None:
    with pytest.raises(BadRequest):
        await TaskService().list_tasks("user-1", "owner", task_type="nonsense")
