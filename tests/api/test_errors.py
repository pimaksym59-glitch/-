"""Error-handling tests (owner req 5): every exception path — application error, HTTP error,
request validation, unexpected — maps to the unified API Error Schema with a request_id; internals
never leak.
"""

from __future__ import annotations

import httpx
from fastapi import FastAPI

from app.core.errors import NotFound, VersionConflict


def _add_routes(app: FastAPI) -> None:
    async def app_error() -> None:
        raise NotFound("channel missing", details={"id": "x"})

    async def version_conflict() -> None:
        raise VersionConflict("stale version")

    async def crash() -> None:
        raise RuntimeError("super-secret internal detail")

    async def needs_int(n: int) -> dict[str, int]:
        return {"n": n}

    app.add_api_route("/_app_error", app_error, methods=["GET"])
    app.add_api_route("/_conflict", version_conflict, methods=["GET"])
    app.add_api_route("/_crash", crash, methods=["GET"])
    app.add_api_route("/_needs_int", needs_int, methods=["GET"])


def _assert_error_shape(payload: dict[str, object]) -> dict[str, object]:
    assert set(payload) == {"error"}
    error = payload["error"]
    assert isinstance(error, dict)
    assert set(error) == {"code", "message", "details", "request_id"}
    return error


async def test_application_error_maps_to_schema(app: FastAPI, client: httpx.AsyncClient) -> None:
    _add_routes(app)
    response = await client.get("/_app_error")
    assert response.status_code == 404
    error = _assert_error_shape(response.json())
    assert error["code"] == "not_found"
    assert error["details"] == {"id": "x"}
    assert error["request_id"]


async def test_version_conflict_maps_to_409(app: FastAPI, client: httpx.AsyncClient) -> None:
    _add_routes(app)
    response = await client.get("/_conflict")
    assert response.status_code == 409
    assert _assert_error_shape(response.json())["code"] == "version_conflict"


async def test_request_validation_maps_to_422(app: FastAPI, client: httpx.AsyncClient) -> None:
    _add_routes(app)
    response = await client.get("/_needs_int", params={"n": "not-an-int"})
    assert response.status_code == 422
    assert _assert_error_shape(response.json())["code"] == "validation_error"


async def test_http_404_maps_to_schema(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/v1/does-not-exist")
    assert response.status_code == 404
    assert _assert_error_shape(response.json())["code"] == "not_found"


async def test_method_not_allowed_maps_to_schema(client: httpx.AsyncClient) -> None:
    response = await client.post("/api/v1/health/live")
    assert response.status_code == 405
    assert _assert_error_shape(response.json())["code"] == "method_not_allowed"


async def test_unexpected_error_is_masked_500(app: FastAPI, client: httpx.AsyncClient) -> None:
    _add_routes(app)
    response = await client.get("/_crash")
    assert response.status_code == 500
    error = _assert_error_shape(response.json())
    assert error["code"] == "internal_error"
    assert error["message"] == "Internal server error"
    assert "secret" not in str(error).lower()  # internals never leak
