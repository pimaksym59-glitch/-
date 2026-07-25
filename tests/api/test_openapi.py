"""OpenAPI tests (owner req 11): schema generates with no warnings, unique operation_ids, correct
response models, and the unified Error Schema is part of the contract.
"""

from __future__ import annotations

import warnings

from app.api.app import create_app
from app.core.config import Settings


def test_openapi_generates_without_warnings() -> None:
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        app = create_app(Settings())
        app.openapi_schema = None  # force a fresh build
        schema = app.openapi()
    assert schema["openapi"].startswith("3.")
    assert not caught, [str(w.message) for w in caught]


def test_operation_ids_are_unique() -> None:
    schema = create_app(Settings()).openapi()
    operation_ids = [
        operation["operationId"]
        for path in schema["paths"].values()
        for operation in path.values()
        if "operationId" in operation
    ]
    assert operation_ids
    assert len(operation_ids) == len(set(operation_ids))


def test_info_title_and_version() -> None:
    schema = create_app(Settings()).openapi()
    assert schema["info"]["title"] == "AI Telegram Automation Platform API"
    assert schema["info"]["version"] == "0.1.0"


def test_error_schema_is_documented() -> None:
    schema = create_app(Settings()).openapi()
    assert "ErrorResponse" in schema["components"]["schemas"]
    assert "ErrorDetail" in schema["components"]["schemas"]


def test_health_endpoints_declare_response_models() -> None:
    schema = create_app(Settings()).openapi()
    live = schema["paths"]["/api/v1/health/live"]["get"]
    assert "200" in live["responses"]
    ready = schema["paths"]["/api/v1/health/ready"]["get"]
    assert "200" in ready["responses"]
    assert "503" in ready["responses"]
