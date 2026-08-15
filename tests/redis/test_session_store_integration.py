"""Integration tests for the real session store — require a live Redis (§R2.8, Stage 21 Phase 0).

NOT executed without RUN_INTEGRATION=1 and a REDIS_URL; in environments without Redis these are
Runtime Verification Pending and are not counted as verified.
"""

from __future__ import annotations

import os
import time

import pytest

from app.admin.rbac import Role
from app.admin.sessions import SessionManager
from app.core.redis.keys import KeyBuilder
from app.core.sessions import RedisSessionStore, SecureTokenFactory, SystemClock
from redis import Redis

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_INTEGRATION") != "1",
        reason="requires a live Redis (set RUN_INTEGRATION=1 and REDIS_URL)",
    ),
]


def test_create_get_revoke_against_real_redis() -> None:
    client = Redis.from_url(os.environ["REDIS_URL"])
    store = RedisSessionStore(client, KeyBuilder("test"))
    manager = SessionManager(store, SystemClock(), SecureTokenFactory(), ttl_seconds=3600.0)

    session = manager.create("integration-user-1", Role.owner)
    validated = manager.validate(session.token)
    assert validated is not None
    assert validated.user_id == "integration-user-1"

    manager.revoke(session.token)
    assert manager.validate(session.token) is None


def test_short_ttl_session_expires_in_real_redis() -> None:
    client = Redis.from_url(os.environ["REDIS_URL"])
    store = RedisSessionStore(client, KeyBuilder("test"))
    manager = SessionManager(store, SystemClock(), SecureTokenFactory(), ttl_seconds=1.0)

    session = manager.create("integration-user-2", Role.viewer)
    assert store.get(session.token) is not None
    time.sleep(2)
    # Real Redis TTL expiry, not SessionManager's own Python-side expiry check.
    assert store.get(session.token) is None


def test_revoke_all_removes_every_session_for_a_user() -> None:
    client = Redis.from_url(os.environ["REDIS_URL"])
    store = RedisSessionStore(client, KeyBuilder("test"))
    manager = SessionManager(store, SystemClock(), SecureTokenFactory(), ttl_seconds=3600.0)

    first = manager.create("integration-user-3", Role.editor)
    second = manager.create("integration-user-3", Role.editor)
    removed = manager.revoke_all("integration-user-3")
    assert removed == 2
    assert manager.validate(first.token) is None
    assert manager.validate(second.token) is None
