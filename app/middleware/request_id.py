"""Request-ID middleware (§R12.9) — single responsibility: correlate every request/response/log.

It assigns an ``X-Request-ID`` (honoring an inbound one), stores it on ``request.state`` (so every
exception handler, including the outermost 500, can read it) and in a ``ContextVar`` (so structured
logging deep in the stack can attach it without threading the request through). Nothing else.
"""

from __future__ import annotations

import uuid
from contextvars import ContextVar

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

REQUEST_ID_HEADER = "X-Request-ID"

_request_id: ContextVar[str | None] = ContextVar("request_id", default=None)


def current_request_id() -> str | None:
    """The current request's id from the ContextVar (for logging integration points)."""
    return _request_id.get()


def resolve_request_id(request: Request) -> str | None:
    """Id for a given request: request.state first (survives ContextVar reset), then ContextVar."""
    state_id: str | None = getattr(request.state, "request_id", None)
    return state_id or current_request_id()


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get(REQUEST_ID_HEADER) or uuid.uuid4().hex
        request.state.request_id = request_id
        token = _request_id.set(request_id)
        try:
            response = await call_next(request)
        finally:
            _request_id.reset(token)
        response.headers[REQUEST_ID_HEADER] = request_id
        return response
