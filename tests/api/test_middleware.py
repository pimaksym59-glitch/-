"""Middleware tests (owner req 6/7): request-id generated and propagated; independent CORS and GZip.
Each middleware is single-purpose and the ordering is verified in test_app_factory.
"""

from __future__ import annotations

import httpx
from fastapi import FastAPI

from app.middleware.request_id import REQUEST_ID_HEADER
from tests.api.conftest import TEST_ORIGIN


async def test_request_id_generated_when_absent(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/v1/health/live")
    request_id = response.headers.get(REQUEST_ID_HEADER)
    assert request_id
    # the same id appears in the (future structured) log correlation and error bodies
    assert len(request_id) >= 8


async def test_request_id_is_propagated_when_provided(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/v1/health/live", headers={REQUEST_ID_HEADER: "trace-42"})
    assert response.headers.get(REQUEST_ID_HEADER) == "trace-42"


async def test_cors_preflight_allows_configured_origin(client: httpx.AsyncClient) -> None:
    response = await client.options(
        "/api/v1/health/live",
        headers={
            "Origin": TEST_ORIGIN,
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == TEST_ORIGIN


async def test_gzip_compresses_large_responses(app: FastAPI, client: httpx.AsyncClient) -> None:
    async def big() -> dict[str, str]:
        return {"payload": "x" * 5000}

    app.add_api_route("/_big", big, methods=["GET"])
    response = await client.get("/_big", headers={"Accept-Encoding": "gzip"})
    assert response.status_code == 200
    assert response.headers.get("content-encoding") == "gzip"
