"""Offline unit tests for the real session adapters (Stage 21 Phase 0, §R3.9).

`RedisSessionStore` is exercised against an in-memory fake Redis client here — this proves the
adapter's own logic (key construction, TTL computation, the per-user index) is correct. It does
NOT prove real Redis network behavior; that is `tests/redis/test_session_store_integration.py`,
gated by RUN_INTEGRATION=1.
"""

from __future__ import annotations

import datetime
from collections.abc import Set as AbstractSet

from app.admin.rbac import Role
from app.admin.sessions import Session, SessionManager
from app.core.redis.keys import KeyBuilder
from app.core.sessions import RedisSessionStore, SecureTokenFactory, SystemClock


class _FakeRedisClient:
    """Minimal in-memory double for the subset of the sync redis-py client interface
    `RedisSessionStore` uses — no network, no server."""

    def __init__(self) -> None:
        self._strings: dict[str, bytes] = {}
        self._sets: dict[str, set[bytes]] = {}

    def _encode(self, value: str | bytes) -> bytes:
        return value.encode("utf-8") if isinstance(value, str) else value

    def set(self, key: str, value: str, ex: int | None = None) -> None:
        self._strings[key] = self._encode(value)

    def get(self, key: str) -> bytes | None:
        return self._strings.get(key)

    def delete(self, *keys: str) -> int:
        count = 0
        for key in keys:
            if self._strings.pop(key, None) is not None:
                count += 1
            if self._sets.pop(key, None) is not None:
                count += 1
        return count

    def sadd(self, key: str, member: str) -> None:
        self._sets.setdefault(key, set()).add(self._encode(member))

    def srem(self, key: str, member: str) -> None:
        self._sets.get(key, set()).discard(self._encode(member))

    def smembers(self, key: str) -> AbstractSet[bytes]:
        return set(self._sets.get(key, set()))

    def expire(self, key: str, ttl: int) -> None:
        pass  # no-op fake; real TTL expiry is proven only against real Redis (integration)


def _make_session(
    *, token: str = "tok-1", user_id: str = "user-1", role: Role = Role.owner
) -> Session:
    now = datetime.datetime.now(datetime.UTC)
    return Session(
        token=token,
        user_id=user_id,
        role=role,
        created_at=now,
        expires_at=now + datetime.timedelta(seconds=3600),
    )


def test_save_then_get_round_trip() -> None:
    store = RedisSessionStore(_FakeRedisClient(), KeyBuilder("test"))
    session = _make_session()
    store.save(session)
    assert store.get(session.token) == session


def test_get_missing_token_returns_none() -> None:
    store = RedisSessionStore(_FakeRedisClient(), KeyBuilder("test"))
    assert store.get("nonexistent") is None


def test_delete_removes_session_and_user_index() -> None:
    store = RedisSessionStore(_FakeRedisClient(), KeyBuilder("test"))
    session = _make_session()
    store.save(session)
    store.delete(session.token)
    assert store.get(session.token) is None
    assert store.delete_for_user(session.user_id) == 0


def test_delete_for_user_removes_all_sessions_for_that_user() -> None:
    store = RedisSessionStore(_FakeRedisClient(), KeyBuilder("test"))
    store.save(_make_session(token="tok-1", user_id="user-1"))
    store.save(_make_session(token="tok-2", user_id="user-1"))
    store.save(_make_session(token="tok-3", user_id="user-2"))
    removed = store.delete_for_user("user-1")
    assert removed == 2
    assert store.get("tok-1") is None
    assert store.get("tok-2") is None
    assert store.get("tok-3") is not None


def test_delete_for_user_with_no_sessions_returns_zero() -> None:
    store = RedisSessionStore(_FakeRedisClient(), KeyBuilder("test"))
    assert store.delete_for_user("nobody") == 0


def test_system_clock_returns_aware_utc_datetime() -> None:
    now = SystemClock().now()
    assert now.tzinfo is not None


def test_secure_token_factory_generates_unique_tokens() -> None:
    factory = SecureTokenFactory()
    tokens = {factory.new_token() for _ in range(50)}
    assert len(tokens) == 50


def test_session_manager_over_redis_store_create_validate_revoke() -> None:
    store = RedisSessionStore(_FakeRedisClient(), KeyBuilder("test"))
    manager = SessionManager(store, SystemClock(), SecureTokenFactory(), ttl_seconds=3600.0)
    session = manager.create("user-1", Role.owner)
    validated = manager.validate(session.token)
    assert validated is not None
    assert validated.user_id == "user-1"
    manager.revoke(session.token)
    assert manager.validate(session.token) is None
