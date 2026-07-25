"""Shared fixtures for offline API tests — a fresh app per test and an ASGI client (no real server).

``raise_app_exceptions=False`` lets the deliberate "unexpected error" test observe the mapped 500
response instead of the re-raised exception; handled errors work either way.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

import httpx
import pytest
from fastapi import FastAPI

from app.api.app import create_app
from app.core.config import Settings

TEST_ORIGIN = "http://test.local"


@pytest.fixture
def settings() -> Settings:
    return Settings(cors_origins=[TEST_ORIGIN])


@pytest.fixture
def app(settings: Settings) -> FastAPI:
    return create_app(settings)


@pytest.fixture
async def client(app: FastAPI) -> AsyncIterator[httpx.AsyncClient]:
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as http_client:
        yield http_client
