"""End-to-end integration tests for the Phase 3A channel/post reads and review intents — require a
live PostgreSQL (Stage 21 Phase 3A).

NOT executed without RUN_INTEGRATION=1 and a DATABASE_URL.

These drive the REAL services, repositories and queue producer over HTTP. Two channels are seeded
in every scenario so §R2.6 scoping is asserted as a real property — a post of one channel must never
appear under another — rather than assumed from the query text.

`require_principal` is overridden because the session half is closed by FE-RV-7; the role it returns
feeds the REAL RBAC check, so authorization is genuinely exercised.

Every test seeds fresh UUIDs and deletes what it created: re-runnable and order-independent.
"""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass

import httpx
import pytest
from fastapi import FastAPI
from sqlalchemy import delete, select

from app.api.auth import AuthenticatedPrincipal, require_principal
from app.db.session import get_engine, get_sessionmaker
from app.models.channel import Channel
from app.models.content import Post
from app.models.enums import PostStatus
from app.models.queue import Task

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        __import__("os").environ.get("RUN_INTEGRATION") != "1",
        reason="requires a live PostgreSQL (set RUN_INTEGRATION=1 and DATABASE_URL)",
    ),
]


@dataclass(frozen=True)
class Seed:
    channel_a: uuid.UUID
    channel_b: uuid.UUID
    review_post_a: uuid.UUID
    review_post_b: uuid.UUID
    draft_post_a: uuid.UUID


@pytest.fixture(autouse=True)
async def _engine_bound_to_this_loop() -> AsyncIterator[None]:
    get_engine.cache_clear()
    get_sessionmaker.cache_clear()
    yield
    await get_engine().dispose()
    get_engine.cache_clear()
    get_sessionmaker.cache_clear()


def _channel(label: str) -> Channel:
    return Channel(
        id=uuid.uuid4(),
        title=f"content-it-{label}-{uuid.uuid4().hex[:8]}",
        language="en",
        timezone="UTC",
        llm_provider="fake",
        image_provider="fake",
    )


@pytest.fixture
async def seed() -> AsyncIterator[Seed]:
    channel_a, channel_b = _channel("a"), _channel("b")
    async with get_sessionmaker()() as session:
        session.add_all([channel_a, channel_b])
        await session.flush()  # FK parents must exist first
        review_a = Post(
            channel_id=channel_a.id,
            status=PostStatus.needs_review,
            title="A needs review",
            body="a" * 400,
        )
        draft_a = Post(channel_id=channel_a.id, status=PostStatus.draft, title="A draft", body=None)
        review_b = Post(
            channel_id=channel_b.id, status=PostStatus.needs_review, title="B needs review"
        )
        session.add_all([review_a, draft_a, review_b])
        await session.commit()
        seeded = Seed(channel_a.id, channel_b.id, review_a.id, review_b.id, draft_a.id)
    try:
        yield seeded
    finally:
        async with get_sessionmaker()() as session:
            for channel_id in (channel_a.id, channel_b.id):
                await session.execute(delete(Task).where(Task.channel_id == channel_id))
                await session.execute(delete(Post).where(Post.channel_id == channel_id))
                await session.execute(delete(Channel).where(Channel.id == channel_id))
            await session.commit()


@pytest.fixture
async def api(app: FastAPI) -> AsyncIterator[httpx.AsyncClient]:
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


def _as_role(app: FastAPI, role: str) -> str:
    actor_id = str(uuid.uuid4())
    app.dependency_overrides[require_principal] = lambda: AuthenticatedPrincipal(
        id=actor_id, role=role
    )
    return actor_id


async def _post_status(post_id: uuid.UUID) -> PostStatus:
    async with get_sessionmaker()() as session:
        post = await session.get(Post, post_id)
        assert post is not None
        return post.status


async def _tasks_for(channel_id: uuid.UUID) -> list[Task]:
    async with get_sessionmaker()() as session:
        result = await session.scalars(select(Task).where(Task.channel_id == channel_id))
        return list(result.all())


# --------------------------------------------------------------------------- reads


async def test_channels_list_carries_the_title_as_name(
    app: FastAPI, api: httpx.AsyncClient, seed: Seed
) -> None:
    _as_role(app, "viewer")

    response = await api.get("/api/v1/channels", params={"limit": 100})

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    listed = {entry["id"]: entry for entry in body}
    assert str(seed.channel_a) in listed
    assert listed[str(seed.channel_a)]["name"].startswith("content-it-a-")  # D3: title -> name
    assert listed[str(seed.channel_a)]["status"] == "active"


async def test_soft_deleted_channels_never_reach_the_console(
    app: FastAPI, api: httpx.AsyncClient, seed: Seed
) -> None:
    async with get_sessionmaker()() as session:
        channel = await session.get(Channel, seed.channel_b)
        assert channel is not None
        import datetime

        channel.deleted_at = datetime.datetime.now(datetime.UTC)
        await session.commit()
    _as_role(app, "owner")

    listed = {entry["id"] for entry in (await api.get("/api/v1/channels")).json()}

    assert str(seed.channel_a) in listed
    assert str(seed.channel_b) not in listed


async def test_posts_are_scoped_to_one_channel(
    app: FastAPI, api: httpx.AsyncClient, seed: Seed
) -> None:
    """§R2.6 as a real property: channel B's post must not appear under channel A."""
    _as_role(app, "analyst")

    body = (await api.get(f"/api/v1/channels/{seed.channel_a}/posts")).json()

    ids = {entry["id"] for entry in body}
    assert str(seed.review_post_a) in ids
    assert str(seed.draft_post_a) in ids
    assert str(seed.review_post_b) not in ids, "cross-channel data leaked"
    assert {entry["channel_id"] for entry in body} == {str(seed.channel_a)}


async def test_status_filter_narrows_within_the_channel(
    app: FastAPI, api: httpx.AsyncClient, seed: Seed
) -> None:
    _as_role(app, "owner")

    body = (
        await api.get(f"/api/v1/channels/{seed.channel_a}/posts", params={"status": "needs_review"})
    ).json()

    assert [entry["id"] for entry in body] == [str(seed.review_post_a)]
    assert body[0]["body_preview"] == "a" * 160  # D6
    assert body[0]["title"] == "A needs review"


async def test_post_without_a_body_has_a_null_preview(
    app: FastAPI, api: httpx.AsyncClient, seed: Seed
) -> None:
    _as_role(app, "owner")

    body = (
        await api.get(f"/api/v1/channels/{seed.channel_a}/posts", params={"status": "draft"})
    ).json()

    assert body[0]["body_preview"] is None


async def test_unknown_channel_is_404_not_an_empty_list(
    app: FastAPI, api: httpx.AsyncClient
) -> None:
    _as_role(app, "owner")

    response = await api.get(f"/api/v1/channels/{uuid.uuid4()}/posts")

    assert response.status_code == 404


@pytest.mark.parametrize("role", ["owner", "admin", "editor", "analyst", "viewer"])
async def test_every_role_may_read_channels(
    app: FastAPI, api: httpx.AsyncClient, seed: Seed, role: str
) -> None:
    _as_role(app, role)
    assert (await api.get("/api/v1/channels")).status_code == 200
    assert (await api.get(f"/api/v1/channels/{seed.channel_a}/posts")).status_code == 200


# --------------------------------------------------------------------- review intents


async def test_approve_queues_a_publish_task_and_moves_the_post(
    app: FastAPI, api: httpx.AsyncClient, seed: Seed
) -> None:
    actor_id = _as_role(app, "editor")

    response = await api.post(f"/api/v1/posts/{seed.review_post_a}/approve")

    assert response.status_code == 202
    assert set(response.json()) == {"task_id"}
    tasks = await _tasks_for(seed.channel_a)
    assert len(tasks) == 1
    assert tasks[0].type.value == "publish"  # R10.1
    assert str(tasks[0].id) == response.json()["task_id"]
    assert tasks[0].payload["post_id"] == str(seed.review_post_a)
    assert tasks[0].payload["reviewed_by"] == actor_id
    assert await _post_status(seed.review_post_a) is PostStatus.ready


async def test_reject_sends_the_post_back_and_queues_its_rework(
    app: FastAPI, api: httpx.AsyncClient, seed: Seed
) -> None:
    _as_role(app, "owner")

    response = await api.post(f"/api/v1/posts/{seed.review_post_a}/reject")

    assert response.status_code == 202
    tasks = await _tasks_for(seed.channel_a)
    assert len(tasks) == 1
    assert tasks[0].type.value == "generate_text"
    assert await _post_status(seed.review_post_a) is PostStatus.draft


async def test_same_idempotency_key_never_creates_a_second_task(
    app: FastAPI, api: httpx.AsyncClient, seed: Seed
) -> None:
    """§R7.4 — the replayed request returns the FIRST task, and the queue holds exactly one row."""
    _as_role(app, "admin")
    key = f"it-key-{uuid.uuid4()}"

    first = await api.post(
        f"/api/v1/posts/{seed.review_post_a}/approve", headers={"Idempotency-Key": key}
    )
    second = await api.post(
        f"/api/v1/posts/{seed.review_post_a}/approve", headers={"Idempotency-Key": key}
    )

    assert first.status_code == second.status_code == 202
    assert first.json()["task_id"] == second.json()["task_id"]
    tasks = await _tasks_for(seed.channel_a)
    assert len(tasks) == 1
    assert tasks[0].dedup_key == key


async def test_reviewing_twice_without_a_key_is_refused_rather_than_duplicated(
    app: FastAPI, api: httpx.AsyncClient, seed: Seed
) -> None:
    """Without a key the second call is a NEW request against a post that already left review, so
    it is refused with 422 — and the queue still holds exactly one task."""
    _as_role(app, "editor")

    first = await api.post(f"/api/v1/posts/{seed.review_post_a}/approve")
    second = await api.post(f"/api/v1/posts/{seed.review_post_a}/approve")

    assert first.status_code == 202
    assert second.status_code == 422
    assert len(await _tasks_for(seed.channel_a)) == 1


@pytest.mark.parametrize("role", ["analyst", "viewer"])
@pytest.mark.parametrize("action", ["approve", "reject"])
async def test_analyst_and_viewer_cannot_review_against_the_real_authorizer(
    app: FastAPI, api: httpx.AsyncClient, seed: Seed, role: str, action: str
) -> None:
    _as_role(app, role)

    response = await api.post(f"/api/v1/posts/{seed.review_post_a}/{action}")

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"
    assert await _tasks_for(seed.channel_a) == []


@pytest.mark.parametrize("role", ["owner", "admin", "editor"])
async def test_staff_roles_may_review(
    app: FastAPI, api: httpx.AsyncClient, seed: Seed, role: str
) -> None:
    _as_role(app, role)
    target = seed.review_post_a if role == "owner" else seed.review_post_b
    assert (await api.post(f"/api/v1/posts/{target}/reject")).status_code == 202


async def test_unknown_post_is_404(app: FastAPI, api: httpx.AsyncClient) -> None:
    _as_role(app, "owner")

    response = await api.post(f"/api/v1/posts/{uuid.uuid4()}/approve")

    assert response.status_code == 404
