"""End-to-end integration tests for the real auth HTTP stack — require a live PostgreSQL AND a
live Redis (Stage 21 Phase 0).

NOT executed without RUN_INTEGRATION=1, a DATABASE_URL and a REDIS_URL; in environments without
both these are Runtime Verification Pending and are not counted as verified.

This proves the real bcrypt/Postgres/Redis/HTTP/cookie path end-to-end within this codebase — it is
still NOT FE-RV-7 itself, which additionally requires a real browser, real Caddy in front of the
app, and `Secure` observed over real HTTPS.
"""

from __future__ import annotations

import os

import httpx
import pytest
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.app import create_app
from app.core.config import Settings
from app.core.security import BcryptPasswordHasher
from app.db.base import Base
from app.models.enums import UserRole
from app.models.user import User
from app.repositories.user_repository import UserRepository

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_INTEGRATION") != "1",
        reason=(
            "requires a live PostgreSQL and a live Redis "
            "(set RUN_INTEGRATION=1, DATABASE_URL, REDIS_URL)"
        ),
    ),
]


async def _seed_owner(email: str, password: str) -> None:
    engine = create_async_engine(os.environ["DATABASE_URL"])
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        sessionmaker = async_sessionmaker(engine, expire_on_commit=False)
        async with sessionmaker() as session:
            repo = UserRepository(session)
            repo.add(
                User(
                    email=email,
                    role=UserRole.owner,
                    password_hash=BcryptPasswordHasher().hash(password),
                    status="active",
                )
            )
            await session.commit()
    finally:
        await engine.dispose()


async def test_real_login_me_logout_round_trip() -> None:
    email, password = "integration-e2e-owner@example.com", "correct horse battery staple"
    await _seed_owner(email, password)

    app: FastAPI = create_app(Settings(cors_origins=["http://test.local"]))
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="https://testserver") as client:
        login = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
        assert login.status_code == 200
        assert login.json()["user"]["email"] == email

        me = await client.get("/api/v1/auth/me")
        assert me.status_code == 200
        assert me.json()["role"] == "owner"

        logout = await client.post("/api/v1/auth/logout")
        assert logout.status_code == 204

        me_after_logout = await client.get("/api/v1/auth/me")
        assert me_after_logout.status_code == 401


async def test_real_login_rejects_wrong_password() -> None:
    email, password = "integration-e2e-owner-2@example.com", "correct horse battery staple"
    await _seed_owner(email, password)

    app = create_app(Settings(cors_origins=["http://test.local"]))
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="https://testserver") as client:
        response = await client.post(
            "/api/v1/auth/login", json={"email": email, "password": "wrong"}
        )
        assert response.status_code == 401
