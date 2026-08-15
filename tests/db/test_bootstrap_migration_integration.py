"""Integration tests for the bootstrap-owner migration (0002) — require a live PostgreSQL
(§R4, Stage 21 Phase 1).

NOT executed without RUN_INTEGRATION=1 and a DATABASE_URL; in environments without a database
these are Runtime Verification Pending and are not counted as verified.

Plain sync tests (not `async def`) — Alembic's own `env.py` drives its own `asyncio.run()`
internally and cannot be invoked from inside an already-running event loop.
"""

from __future__ import annotations

import os
import uuid

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text

from app.core.config import get_settings

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_INTEGRATION") != "1",
        reason="requires a live PostgreSQL (set RUN_INTEGRATION=1 and DATABASE_URL)",
    ),
]


def _sync_url() -> str:
    return os.environ["DATABASE_URL"].replace("+asyncpg", "")


def _reset_schema() -> None:
    engine = create_engine(_sync_url())
    try:
        with engine.begin() as conn:
            conn.execute(text("DROP SCHEMA public CASCADE"))
            conn.execute(text("CREATE SCHEMA public"))
    finally:
        engine.dispose()


def _upgrade(revision: str = "head") -> None:
    get_settings.cache_clear()
    command.upgrade(Config("alembic.ini"), revision)


def _select_users() -> list[tuple[str, str]]:
    engine = create_engine(_sync_url())
    try:
        with engine.connect() as conn:
            return [(row[0], row[1]) for row in conn.execute(text("SELECT email, role FROM users"))]
    finally:
        engine.dispose()


def test_bootstrap_creates_exactly_one_owner_on_empty_db(monkeypatch: pytest.MonkeyPatch) -> None:
    _reset_schema()
    monkeypatch.setenv("BOOTSTRAP_OWNER_EMAIL", "bootstrap-owner@example.com")
    monkeypatch.setenv("BOOTSTRAP_OWNER_PASSWORD", "correct horse battery staple")

    _upgrade()

    rows = _select_users()
    assert rows == [("bootstrap-owner@example.com", "owner")]


def test_bootstrap_is_a_no_op_when_a_user_already_exists(monkeypatch: pytest.MonkeyPatch) -> None:
    _reset_schema()
    monkeypatch.setenv("BOOTSTRAP_OWNER_EMAIL", "should-not-be-created@example.com")
    monkeypatch.setenv("BOOTSTRAP_OWNER_PASSWORD", "correct horse battery staple")

    # Run only 0001 (schema, no seed) so the users table exists but the migration under test
    # (0002) has not run yet — then seed a user by hand BEFORE 0002 ever executes.
    _upgrade(revision="0001")
    engine = create_engine(_sync_url())
    try:
        with engine.begin() as conn:
            conn.execute(
                text(
                    "INSERT INTO users (id, email, role, password_hash, status) "
                    "VALUES (:id, :email, 'viewer', 'h:x', 'active')"
                ),
                {"id": str(uuid.uuid4()), "email": "pre-existing@example.com"},
            )
    finally:
        engine.dispose()

    _upgrade()  # now runs 0002 for real, against a non-empty table

    rows = _select_users()
    assert rows == [("pre-existing@example.com", "viewer")]  # no bootstrap owner was added


def test_bootstrap_fails_clearly_without_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    _reset_schema()
    monkeypatch.delenv("BOOTSTRAP_OWNER_EMAIL", raising=False)
    monkeypatch.delenv("BOOTSTRAP_OWNER_PASSWORD", raising=False)

    with pytest.raises(Exception) as exc_info:
        _upgrade()
    message = f"{exc_info.value}{getattr(exc_info.value, '__cause__', '')}"
    assert "BOOTSTRAP_OWNER_EMAIL" in message
    assert _select_users() == []  # the failed run created nothing
