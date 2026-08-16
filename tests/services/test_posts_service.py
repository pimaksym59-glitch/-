"""Offline tests for the post review service (Stage 21 Phase 3A).

RBAC denial and the dedup-key derivation run before any I/O, so both are provable without a
database. The enqueue itself, the status transition and real idempotency are covered against real
PostgreSQL in `tests/api/test_review_integration.py`.
"""

from __future__ import annotations

import uuid

import pytest

from app.core.errors import BadRequest, Forbidden
from app.models.content import Post
from app.models.enums import PostStatus
from app.services.posts import PostService, review_dedup_key


def _post() -> Post:
    post = Post(id=uuid.uuid4(), channel_id=uuid.uuid4(), status=PostStatus.needs_review)
    post.version = 1
    return post


def test_supplied_idempotency_key_becomes_the_dedup_key() -> None:
    """§R7.4 — the caller's key is the source of truth when present."""
    post = _post()
    assert review_dedup_key("approve", post, "client-key-123") == "client-key-123"


def test_derived_key_is_stable_for_the_same_post_and_version() -> None:
    """A double-clicked button must not produce two tasks even without a header."""
    post = _post()
    assert review_dedup_key("approve", post, None) == review_dedup_key("approve", post, None)


def test_derived_key_separates_approve_from_reject() -> None:
    post = _post()
    assert review_dedup_key("approve", post, None) != review_dedup_key("reject", post, None)


def test_derived_key_changes_once_the_post_changes() -> None:
    """The optimistic-lock version is part of the key, so a genuinely new decision is a new task."""
    post = _post()
    first = review_dedup_key("approve", post, None)
    post.version = 2
    assert review_dedup_key("approve", post, None) != first


@pytest.mark.parametrize("role", ["analyst", "viewer"])
@pytest.mark.parametrize("action", ["approve", "reject"])
async def test_analyst_and_viewer_cannot_review(role: str, action: str) -> None:
    """`content.write` is owner/admin/editor (API_SPEC matrix). No DB is configured here, so a
    `Forbidden` also proves authorization precedes any database access."""
    service = PostService()
    with pytest.raises(Forbidden):
        await getattr(service, action)("user-1", role, str(uuid.uuid4()))


@pytest.mark.parametrize("action", ["approve", "reject"])
async def test_bad_post_id_is_rejected_before_any_database_access(action: str) -> None:
    service = PostService()
    with pytest.raises(BadRequest):
        await getattr(service, action)("user-1", "owner", "not-a-uuid")
