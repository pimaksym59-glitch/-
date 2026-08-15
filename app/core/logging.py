"""Application logging configuration (§R12.9) — structured JSON to stdout.

Why this module exists: ``RequestLoggingMiddleware`` (and every other ``logging.getLogger``
call site) emits records at INFO, but the application never attached a handler anywhere. Under
``uvicorn app.main:app`` uvicorn configures only its OWN loggers, so those records reached the
root logger, found no handler and were dropped by ``logging.lastResort`` (WARNING and above
only): the correlation id was generated and returned in ``X-Request-ID``, yet never appeared in
the container's log output. This module supplies the missing configuration — it changes no
middleware, no request-id generation and no HTTP contract.

The format is JSON (§R12.9): timestamp, level, logger, message, plus the ``event``/``fields``
extras the middlewares already pass. ``request_id`` therefore lands as a top-level key without a
single call site changing.
"""

from __future__ import annotations

import datetime
import json
import logging
import sys
from typing import Any, Final

from app.core.config import Settings, get_settings

#: Marks the handler this module installs, so re-configuring is a no-op instead of a duplicate.
_HANDLER_MARKER: Final = "_app_json_handler"


class JsonLogFormatter(logging.Formatter):
    """Render a record as one JSON object per line (§R12.9).

    ``event`` and the ``fields`` mapping are the extras this codebase already uses
    (``app.middleware.logging``, ``app.workers.log``); ``fields`` is merged in at the top level so
    correlating keys such as ``request_id``/``task_id`` are directly greppable in container logs.
    """

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": datetime.datetime.fromtimestamp(record.created, datetime.UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        event = getattr(record, "event", None)
        if event is not None:
            payload["event"] = event
        fields = getattr(record, "fields", None)
        if isinstance(fields, dict):
            payload.update(fields)
        if record.exc_info is not None:
            payload["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


def configure_logging(settings: Settings | None = None) -> None:
    """Attach the JSON handler to the root logger at the configured level (§R12.9).

    Idempotent: a second call is a no-op rather than a duplicated line per record. Existing
    handlers are left in place — uvicorn's own loggers do not propagate, so nothing is emitted
    twice, and pytest's capture handlers keep working untouched.
    """

    settings = settings if settings is not None else get_settings()
    root = logging.getLogger()
    root.setLevel(settings.log_level.value)
    if any(getattr(handler, _HANDLER_MARKER, False) for handler in root.handlers):
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonLogFormatter())
    setattr(handler, _HANDLER_MARKER, True)
    root.addHandler(handler)
