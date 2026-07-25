"""Application factory tests (owner req 1): factory builds isolated instances; middleware order and
routes are wired inside the factory; no module-level singleton state leaks between apps.
"""

from __future__ import annotations

from fastapi import FastAPI

from app.api.app import create_app
from app.core.config import Settings


def test_create_app_returns_fastapi_instance() -> None:
    app = create_app(Settings())
    assert isinstance(app, FastAPI)


def test_factory_builds_independent_instances() -> None:
    a = create_app(Settings())
    b = create_app(Settings())
    assert a is not b
    # overriding a dependency on one app must not affect the other (no shared global state)
    a.dependency_overrides[object] = object
    assert not b.dependency_overrides


def test_health_routes_are_mounted_under_v1() -> None:
    app = create_app(Settings())
    paths = set(app.openapi()["paths"])
    assert "/api/v1/health/live" in paths
    assert "/api/v1/health/ready" in paths


def test_middleware_order_is_explicit_outermost_first() -> None:
    app = create_app(Settings())
    names = [getattr(mw.cls, "__name__", "") for mw in app.user_middleware]
    assert names == [
        "RequestIdMiddleware",
        "RequestLoggingMiddleware",
        "CORSMiddleware",
        "GZipMiddleware",
    ]
