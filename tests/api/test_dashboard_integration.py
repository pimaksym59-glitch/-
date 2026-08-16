"""End-to-end integration tests for the Phase 2A dashboard reads — require a live PostgreSQL
(Stage 21 Phase 2A).

NOT executed without RUN_INTEGRATION=1 and a DATABASE_URL. These drive the REAL services and the
REAL repositories over HTTP: the wire vocabulary (D2-A), the availability policy (§R7.3) and RBAC
are all asserted against real rows, which is the half offline fakes cannot prove.

`require_principal` is overridden because the session half is already closed by FE-RV-7 — the role
it returns is fed to the REAL RBAC check, so authorization itself is genuinely exercised here.

Every test seeds its own channel under a fresh UUID and removes it afterwards: the file is
re-runnable against a persistent database and order-independent.
"""

from __future__ import annotations

import datetime
import os
import uuid
from collections.abc import AsyncIterator

import httpx
import pytest
from fastapi import FastAPI
from sqlalchemy import delete

from app.api.auth import AuthenticatedPrincipal, require_principal
from app.db.session import get_engine, get_sessionmaker
from app.models.analytics import ApiUsage, ImageUsage
from app.models.channel import Channel
from app.models.content import Post
from app.models.enums import PostStatus, TaskStatus, TaskType
from app.models.queue import Task

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_INTEGRATION") != "1",
        reason="requires a live PostgreSQL (set RUN_INTEGRATION=1 and DATABASE_URL)",
    ),
]

_NOW = datetime.datetime.now(datetime.UTC)
_TODAY = _NOW.date()


@pytest.fixture(autouse=True)
async def _engine_bound_to_this_loop() -> AsyncIterator[None]:
    get_engine.cache_clear()
    get_sessionmaker.cache_clear()
    yield
    await get_engine().dispose()
    get_engine.cache_clear()
    get_sessionmaker.cache_clear()


def _as_role(app: FastAPI, role: str) -> None:
    app.dependency_overrides[require_principal] = lambda: AuthenticatedPrincipal(
        id=str(uuid.uuid4()), role=role
    )


@pytest.fixture
async def seeded() -> AsyncIterator[uuid.UUID]:
    """One channel with: 2 posts published today, 1 needs-review post, a pending publish task, a
    succeeded task, and today's LLM + image spend."""
    channel = Channel(
        id=uuid.uuid4(),
        title=f"dashboard-it-{uuid.uuid4().hex[:8]}",
        language="en",
        timezone="UTC",
        llm_provider="fake",
        image_provider="fake",
    )
    async with get_sessionmaker()() as session:
        session.add(channel)
        await session.flush()  # FK parent must exist first
        session.add(
            Post(channel_id=channel.id, status=PostStatus.published, published_at=_NOW, title="p1")
        )
        session.add(
            Post(channel_id=channel.id, status=PostStatus.published, published_at=_NOW, title="p2")
        )
        session.add(Post(channel_id=channel.id, status=PostStatus.needs_review, title="review me"))
        session.add(
            Task(
                channel_id=channel.id,
                type=TaskType.publish,
                status=TaskStatus.pending,
                run_at=_NOW + datetime.timedelta(hours=2),
            )
        )
        session.add(
            Task(
                channel_id=channel.id,
                type=TaskType.generate_text,
                status=TaskStatus.succeeded,
                run_at=_NOW - datetime.timedelta(hours=1),
                last_error=None,
            )
        )
        session.add(ApiUsage(channel_id=channel.id, cost_usd=2.50, created_at=_NOW))
        session.add(ImageUsage(channel_id=channel.id, cost_usd=1.25, created_at=_NOW))
        await session.commit()
    try:
        yield channel.id
    finally:
        async with get_sessionmaker()() as session:
            await session.execute(delete(ApiUsage).where(ApiUsage.channel_id == channel.id))
            await session.execute(delete(ImageUsage).where(ImageUsage.channel_id == channel.id))
            await session.execute(delete(Task).where(Task.channel_id == channel.id))
            await session.execute(delete(Post).where(Post.channel_id == channel.id))
            await session.execute(delete(Channel).where(Channel.id == channel.id))
            await session.commit()


@pytest.fixture
async def api(app: FastAPI) -> AsyncIterator[httpx.AsyncClient]:
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


async def test_tasks_translate_the_status_vocabulary_against_real_rows(
    app: FastAPI, api: httpx.AsyncClient, seeded: uuid.UUID
) -> None:
    """D2-A end to end: the DB holds `pending`/`succeeded`, the wire says `queued`/`completed`."""
    _as_role(app, "owner")

    response = await api.get("/api/v1/tasks", params={"channel_id": str(seeded)})

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    by_type = {task["type"]: task for task in body}
    assert by_type["publish"]["status"] == "queued"
    assert by_type["generate_text"]["status"] == "completed"
    assert by_type["publish"]["run_at"] is not None
    assert by_type["publish"]["channel_id"] == str(seeded)


async def test_tasks_filter_accepts_the_wire_vocabulary_it_serves(
    app: FastAPI, api: httpx.AsyncClient, seeded: uuid.UUID
) -> None:
    _as_role(app, "owner")

    response = await api.get(
        "/api/v1/tasks", params={"channel_id": str(seeded), "status": "queued"}
    )

    assert response.status_code == 200
    assert [task["status"] for task in response.json()] == ["queued"]


@pytest.mark.parametrize("role", ["editor", "analyst", "viewer"])
async def test_tasks_are_owner_admin_only_against_the_real_authorizer(
    app: FastAPI, api: httpx.AsyncClient, role: str
) -> None:
    _as_role(app, role)

    response = await api.get("/api/v1/tasks")

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"


async def test_snapshot_aggregates_real_cost_and_publications(
    app: FastAPI, api: httpx.AsyncClient, seeded: uuid.UUID
) -> None:
    _as_role(app, "owner")

    response = await api.get(f"/api/v1/analytics/channels/{seeded}")

    assert response.status_code == 200
    body = response.json()
    assert body["channel_id"] == str(seeded)
    assert body["date"] == _TODAY.isoformat()
    assert body["cost_today"] == {"value": 3.75, "availability": "available"}  # 2.50 + 1.25
    assert body["published_today"] == {"value": 2.0, "availability": "available"}


async def test_snapshot_gates_what_the_platform_cannot_measure(
    app: FastAPI, api: httpx.AsyncClient, seeded: uuid.UUID
) -> None:
    """§R7.3/§R10.3 on real data: no engagement was captured, so these are gated, not zero."""
    _as_role(app, "viewer")

    body = (await api.get(f"/api/v1/analytics/channels/{seeded}")).json()

    assert body["views"] == {"value": None, "availability": "gated"}
    assert body["reactions"] == {"value": None, "availability": "gated"}


async def test_snapshot_is_readable_by_every_role(
    app: FastAPI, api: httpx.AsyncClient, seeded: uuid.UUID
) -> None:
    for role in ("owner", "admin", "editor", "analyst", "viewer"):
        _as_role(app, role)
        response = await api.get(f"/api/v1/analytics/channels/{seeded}")
        assert response.status_code == 200, role


async def test_unknown_channel_is_404_not_an_empty_snapshot(
    app: FastAPI, api: httpx.AsyncClient
) -> None:
    _as_role(app, "owner")

    response = await api.get(f"/api/v1/analytics/channels/{uuid.uuid4()}")

    assert response.status_code == 404


async def test_cost_by_day_returns_iso_dated_buckets(
    app: FastAPI, api: httpx.AsyncClient, seeded: uuid.UUID
) -> None:
    _as_role(app, "analyst")

    response = await api.get("/api/v1/cost", params={"group_by": "day"})

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    today = {entry["key"]: entry["amount_usd"] for entry in body}.get(_TODAY.isoformat())
    assert today is not None and today >= 3.75
    for entry in body:
        datetime.date.fromisoformat(entry["key"])  # the console slices this as YYYY-MM-DD
