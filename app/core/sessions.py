"""Real session storage (Stage 21 Phase 0) — closes the `SessionStore` seam declared in
`app.admin.sessions`, previously satisfied only by `FakeSessionStore` in tests. Also provides the
real `Clock`/`TokenFactory` a production `SessionManager` needs (previously only `FakeClock`/
`FakeTokenFactory` existed).

Concrete incompatibility discovered and resolved here, without touching `app/admin/*`:
`SessionStore`/`Clock`/`TokenFactory` are declared as SYNCHRONOUS Protocols (the admin subsystem
imports nothing outside itself — no FastAPI, no asyncio). Real Redis access elsewhere in this
project is exclusively async (`app.core.redis.manager.RedisManager` wraps `redis.asyncio.Redis`).
Widening those Protocols to async would ripple into `SessionManager`'s own method signatures and
everything that calls it — out of scope and not authorized. Instead this module uses redis-py's
SYNCHRONOUS client (`redis.Redis`, the same `redis` package already a project dependency) so it
satisfies `SessionStore` exactly as declared; the HTTP route layer bridges the resulting sync calls
into the async request handler via `starlette.concurrency.run_in_threadpool`.

Sessions are stored as one JSON value per token plus a per-user SET of tokens (so `revoke_all` does
not need a Redis SCAN), keyed via the existing `KeyBuilder.cache()` — no new Redis namespace added.
"""

from __future__ import annotations

import datetime
import functools
import json
import secrets
from collections.abc import Set as AbstractSet
from typing import Protocol

from app.admin.rbac import Role
from app.admin.sessions import Session
from app.core.config import get_settings
from app.core.redis.keys import KeyBuilder, get_key_builder
from redis import Redis


class _RedisClientLike(Protocol):
    """The narrow slice of the sync redis-py client `RedisSessionStore` actually calls — lets
    tests substitute an in-memory fake without a `type: ignore` (interface segregation). Return
    types are deliberately loose (`object`) where this module never reads the return value —
    real redis-py and a minimal fake both satisfy this without over-constraining either."""

    def set(self, name: str, value: str, *, ex: int | None = None) -> object: ...
    def get(self, name: str) -> bytes | str | None: ...
    def delete(self, *names: str) -> object: ...
    def sadd(self, name: str, value: str) -> object: ...
    def srem(self, name: str, value: str) -> object: ...
    def smembers(self, name: str) -> AbstractSet[bytes | str]: ...
    def expire(self, name: str, time: int) -> object: ...


class SystemClock:
    """Real wall-clock `Clock` (UTC) — the production counterpart to `FakeClock`."""

    def now(self) -> datetime.datetime:
        return datetime.datetime.now(datetime.UTC)


class SecureTokenFactory:
    """Cryptographically random `TokenFactory` — production counterpart to `FakeTokenFactory`."""

    def new_token(self) -> str:
        return secrets.token_urlsafe(32)


def _session_key(builder: KeyBuilder, token: str) -> str:
    return builder.cache("session", token)


def _user_index_key(builder: KeyBuilder, user_id: str) -> str:
    return builder.cache("session-user", user_id)


def _to_json(session: Session) -> str:
    return json.dumps(
        {
            "token": session.token,
            "user_id": session.user_id,
            "role": session.role.value,
            "created_at": session.created_at.isoformat(),
            "expires_at": session.expires_at.isoformat(),
        }
    )


def _from_json(raw: bytes | str) -> Session:
    data = json.loads(raw)
    return Session(
        token=data["token"],
        user_id=data["user_id"],
        role=Role(data["role"]),
        created_at=datetime.datetime.fromisoformat(data["created_at"]),
        expires_at=datetime.datetime.fromisoformat(data["expires_at"]),
    )


class RedisSessionStore:
    """Real `SessionStore` over redis-py's sync client (see module docstring for why sync)."""

    def __init__(self, client: _RedisClientLike, key_builder: KeyBuilder) -> None:
        self._client = client
        self._keys = key_builder

    def save(self, session: Session) -> None:
        remaining = session.expires_at - datetime.datetime.now(datetime.UTC)
        ttl_seconds = max(1, int(remaining.total_seconds()))
        session_key = _session_key(self._keys, session.token)
        index_key = _user_index_key(self._keys, session.user_id)
        self._client.set(session_key, _to_json(session), ex=ttl_seconds)
        self._client.sadd(index_key, session.token)
        self._client.expire(index_key, ttl_seconds)

    def get(self, token: str) -> Session | None:
        raw = self._client.get(_session_key(self._keys, token))
        if raw is None:
            return None
        return _from_json(raw)

    def delete(self, token: str) -> None:
        session = self.get(token)
        self._client.delete(_session_key(self._keys, token))
        if session is not None:
            self._client.srem(_user_index_key(self._keys, session.user_id), token)

    def delete_for_user(self, user_id: str) -> int:
        index_key = _user_index_key(self._keys, user_id)
        tokens = self._client.smembers(index_key)
        if not tokens:
            return 0
        decoded = [t.decode("utf-8") if isinstance(t, bytes) else str(t) for t in tokens]
        session_keys = [_session_key(self._keys, token) for token in decoded]
        self._client.delete(*session_keys, index_key)
        return len(decoded)


@functools.lru_cache(maxsize=1)
def get_sync_redis_client() -> Redis:
    """Cached sync Redis client, lazily connecting (mirrors `RedisManager`'s laziness, §R2.8)."""
    url = get_settings().redis_url
    if url is None:
        raise RuntimeError("redis_url is not configured (set REDIS_URL, §R12.2)")
    return Redis.from_url(url)


def get_redis_session_store() -> RedisSessionStore:
    """Real `SessionStore` wired to the shared sync Redis client and the existing `KeyBuilder`."""
    return RedisSessionStore(get_sync_redis_client(), get_key_builder())
