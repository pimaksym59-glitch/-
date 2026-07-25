"""FastAPI application factory (§R3.5, owner req 1). ``create_app`` builds a fully-wired, isolated
app instance — there is **no module-level FastAPI singleton**. All middleware, exception handlers
and routers are registered here; dependencies are resolved via DI so tests can override them.

Middleware order is explicit (outermost first): Request-ID -> Logging -> CORS -> GZip. Request-ID is
outermost so its id is available to logging and to every exception handler; GZip is innermost so it
compresses the final response.
"""

from __future__ import annotations

from fastapi import FastAPI
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware

from app.api.errors import register_exception_handlers
from app.api.lifespan import lifespan
from app.api.v1.router import build_v1_router
from app.core.config import Settings, get_settings
from app.middleware.logging import RequestLoggingMiddleware
from app.middleware.request_id import RequestIdMiddleware
from app.schemas.errors import ErrorResponse

_API_TITLE = "AI Telegram Automation Platform API"
_API_VERSION = "0.1.0"
_API_DESCRIPTION = "Infrastructure HTTP layer (§R13.1 stage 10); business endpoints arrive later."
_GZIP_MIN_SIZE = 500

_OPENAPI_TAGS = [
    {"name": "health", "description": "Liveness and readiness probes (§R12.10)."},
]

# Documented on every operation so the unified Error Schema is part of the OpenAPI contract.
_DEFAULT_RESPONSES: dict[int | str, dict[str, object]] = {
    422: {"model": ErrorResponse, "description": "Validation error"},
    500: {"model": ErrorResponse, "description": "Internal server error"},
}


def _build_middleware(settings: Settings) -> list[Middleware]:
    """Middleware stack, outermost first (owner req 6). Each entry is independent + single-task."""
    return [
        Middleware(RequestIdMiddleware),
        Middleware(RequestLoggingMiddleware),
        Middleware(
            CORSMiddleware,
            allow_origins=list(settings.cors_origins),
            allow_credentials=settings.cors_allow_credentials,
            allow_methods=["*"],
            allow_headers=["*"],
        ),
        Middleware(GZipMiddleware, minimum_size=_GZIP_MIN_SIZE),
    ]


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build and return a fresh FastAPI application (factory pattern; no global singleton)."""
    settings = settings if settings is not None else get_settings()
    app = FastAPI(
        title=_API_TITLE,
        version=_API_VERSION,
        description=_API_DESCRIPTION,
        openapi_tags=_OPENAPI_TAGS,
        responses=_DEFAULT_RESPONSES,
        middleware=_build_middleware(settings),
        lifespan=lifespan,
    )
    register_exception_handlers(app)
    app.include_router(build_v1_router())
    return app
