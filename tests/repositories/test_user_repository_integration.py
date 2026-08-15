"""Integration tests for the user repository — require a live PostgreSQL (§R4, Stage 21 Phase 0).

NOT executed without RUN_INTEGRATION=1 and a DATABASE_URL; in environments without a database
these are Runtime Verification Pending and are not counted as verified.
"""

from __future__ import annotations

import os

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.base import Base
from app.models.enums import UserRole
from app.models.user import User
from app.repositories.user_repository import UserRepository, to_account

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_INTEGRATION") != "1",
        reason="requires a live PostgreSQL (set RUN_INTEGRATION=1 and DATABASE_URL)",
    ),
]


async def test_user_insert_fetch_by_email_and_account_mapping() -> None:
    engine = create_async_engine(os.environ["DATABASE_URL"])
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        sessionmaker = async_sessionmaker(engine, expire_on_commit=False)
        async with sessionmaker() as session:
            repo = UserRepository(session)
            user = User(
                email="integration-owner@example.com",
                role=UserRole.owner,
                password_hash="h:secret",
                status="active",
            )
            repo.add(user)
            await session.commit()

            fetched = await repo.get_by_email("integration-owner@example.com")
            assert fetched is not None
            assert fetched.id == user.id

            account = to_account(fetched)
            assert account is not None
            assert account.id == str(user.id)
    finally:
        await engine.dispose()


async def test_email_uniqueness_is_enforced() -> None:
    engine = create_async_engine(os.environ["DATABASE_URL"])
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        sessionmaker = async_sessionmaker(engine, expire_on_commit=False)
        async with sessionmaker() as session:
            repo = UserRepository(session)
            repo.add(User(email="dup@example.com", role=UserRole.viewer, password_hash="h:x"))
            await session.commit()

        async with sessionmaker() as session:
            repo = UserRepository(session)
            repo.add(User(email="dup@example.com", role=UserRole.viewer, password_hash="h:y"))
            with pytest.raises(Exception):  # noqa: B017 — the exact driver exception isn't the point
                await session.commit()
    finally:
        await engine.dispose()
