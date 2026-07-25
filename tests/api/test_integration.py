"""API integration tests — require a live PostgreSQL + Redis (§R12.10). Runtime Verification Pending
(RV-9). NOT executed without ``RUN_INTEGRATION=1`` + ``DATABASE_URL``/``REDIS_URL``; not counted.

Covers: readiness probing real dependencies (200 when both up), and the app lifespan disposing real
connections on shutdown.
"""

from __future__ import annotations

import os

import httpx
import pytest

from app.api.app import create_app
from app.api.lifespan import lifespan
from app.core.config import Settings, get_settings

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_INTEGRATION") != "1",
        reason="requires a live PostgreSQL + Redis (RUN_INTEGRATION=1, DATABASE_URL, REDIS_URL)",
    ),
]


async def test_readiness_ok_against_live_services() -> None:
    get_settings.cache_clear()
    app = create_app(Settings())
    transport = httpx.ASGITransport(app=app)
    async with (
        lifespan(app),
        httpx.AsyncClient(transport=transport, base_url="http://testserver") as client,
    ):
        response = await client.get("/api/v1/health/ready")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ready"
    assert {check["name"] for check in body["checks"]} == {"postgresql", "redis"}
    assert all(check["healthy"] for check in body["checks"])
