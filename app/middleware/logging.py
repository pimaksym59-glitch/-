"""Request-logging middleware (§R12.9) — single responsibility: emit one structured record per
request (method, path, status, duration, request_id). No bodies, no secrets.

It logs through the stdlib ``logging`` interface (kept independent of the queue's ``EventLogger``
for layer boundaries). A full structured JSON logger + masking is a later concern (backlog FA-4);
this is its integration point.
"""

from __future__ import annotations

import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.middleware.request_id import resolve_request_id

_logger = logging.getLogger("app.api.request")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        started = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - started) * 1000.0
        _logger.info(
            "request",
            extra={
                "event": "request",
                "fields": {
                    "method": request.method,
                    "path": request.url.path,
                    "status": response.status_code,
                    "duration_ms": round(duration_ms, 2),
                    "request_id": resolve_request_id(request),
                },
            },
        )
        return response
