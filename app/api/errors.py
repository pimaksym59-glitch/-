"""Exception -> unified API Error Schema (API_SPEC). Registers handlers so no unhandled exception
ever reaches the client: application errors map by their ``status_code``/``code``; request-shape
validation (FastAPI) maps to 422; anything else maps to a clean 500 without leaking internals.

Every response carries the request id (from ``request.state``, so it is present even for the
outermost 500) both in the body and the ``X-Request-ID`` header. Handlers use the base ``Exception``
signature (narrowing internally) so registration type-checks without ``type: ignore``.
"""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.errors import AppError
from app.middleware.request_id import REQUEST_ID_HEADER, resolve_request_id
from app.schemas.errors import ErrorDetail, ErrorResponse

# Stable error codes for HTTP-level exceptions (404/405/etc.) that carry no application code.
_HTTP_CODES: dict[int, str] = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    405: "method_not_allowed",
    409: "conflict",
    415: "unsupported_media_type",
    422: "unprocessable_entity",
    429: "rate_limited",
}


def _error_response(
    request: Request, *, status_code: int, code: str, message: str, details: dict[str, object]
) -> JSONResponse:
    request_id = resolve_request_id(request)
    body = ErrorResponse(
        error=ErrorDetail(code=code, message=message, details=details, request_id=request_id)
    )
    headers = {REQUEST_ID_HEADER: request_id} if request_id else None
    return JSONResponse(status_code=status_code, content=body.model_dump(), headers=headers)


async def _handle_app_error(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, AppError):  # registered only for AppError; stay defensive
        return await _handle_unexpected(request, exc)
    return _error_response(
        request,
        status_code=exc.status_code,
        code=exc.code,
        message=exc.message,
        details=exc.details,
    )


async def _handle_validation_error(request: Request, exc: Exception) -> JSONResponse:
    errors = exc.errors() if isinstance(exc, RequestValidationError) else []
    return _error_response(
        request,
        status_code=422,
        code="validation_error",
        message="Request validation failed",
        details={"errors": errors},
    )


async def _handle_http_exception(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, StarletteHTTPException):  # registered only for HTTPException
        return await _handle_unexpected(request, exc)
    code = _HTTP_CODES.get(exc.status_code, f"http_{exc.status_code}")
    message = exc.detail if isinstance(exc.detail, str) else code.replace("_", " ")
    return _error_response(
        request, status_code=exc.status_code, code=code, message=message, details={}
    )


async def _handle_unexpected(request: Request, exc: Exception) -> JSONResponse:
    # Never leak the exception message/stack to the client (§R12.2).
    return _error_response(
        request,
        status_code=500,
        code="internal_error",
        message="Internal server error",
        details={},
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Wire the unified error handlers onto the application (called by the factory).

    Covers application errors, request-shape validation, HTTP exceptions (404/405/...), and any
    unexpected exception — so no response ever escapes the unified Error Schema.
    """
    app.add_exception_handler(AppError, _handle_app_error)
    app.add_exception_handler(RequestValidationError, _handle_validation_error)
    app.add_exception_handler(StarletteHTTPException, _handle_http_exception)
    app.add_exception_handler(Exception, _handle_unexpected)
