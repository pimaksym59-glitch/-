"""Tests for the application logging configuration (§R12.9).

These lock the exact behaviour F7 was missing: a record emitted the way
`app.middleware.logging` emits it must reach a handler and carry its `request_id` as a
top-level JSON key.
"""

from __future__ import annotations

import json
import logging
from collections.abc import Iterator

import pytest

from app.core.config import LogLevel, Settings
from app.core.logging import JsonLogFormatter, configure_logging


@pytest.fixture(autouse=True)
def _restore_root_logging() -> Iterator[None]:
    """Global logging state is process-wide — snapshot and restore it around every test."""
    root = logging.getLogger()
    handlers, level = list(root.handlers), root.level
    yield
    root.handlers = handlers
    root.setLevel(level)


def _record(**extra: object) -> logging.LogRecord:
    record = logging.LogRecord("app.api.request", logging.INFO, __file__, 1, "request", None, None)
    for key, value in extra.items():
        setattr(record, key, value)
    return record


def test_formatter_emits_one_json_object_with_the_standard_keys() -> None:
    payload = json.loads(JsonLogFormatter().format(_record()))
    assert payload["level"] == "INFO"
    assert payload["logger"] == "app.api.request"
    assert payload["message"] == "request"
    assert payload["ts"].startswith("20")


def test_formatter_lifts_fields_to_top_level_so_request_id_is_greppable() -> None:
    payload = json.loads(
        JsonLogFormatter().format(
            _record(event="request", fields={"request_id": "corr-123", "status": 200})
        )
    )
    assert payload["event"] == "request"
    assert payload["request_id"] == "corr-123"
    assert payload["status"] == 200


def test_formatter_renders_non_serialisable_values_instead_of_raising() -> None:
    payload = json.loads(JsonLogFormatter().format(_record(fields={"obj": object()})))
    assert isinstance(payload["obj"], str)


def test_formatter_includes_exception_text() -> None:
    try:
        raise ValueError("boom")
    except ValueError:
        record = _record()
        record.exc_info = __import__("sys").exc_info()
    payload = json.loads(JsonLogFormatter().format(record))
    assert "ValueError: boom" in payload["exc_info"]


def test_configure_logging_attaches_a_handler_that_receives_info_records() -> None:
    root = logging.getLogger()
    root.handlers = []
    configure_logging(Settings(log_level=LogLevel.info))
    assert len(root.handlers) == 1
    assert root.level == logging.INFO
    assert isinstance(root.handlers[0].formatter, JsonLogFormatter)


def test_configure_logging_is_idempotent() -> None:
    root = logging.getLogger()
    root.handlers = []
    configure_logging(Settings())
    configure_logging(Settings())
    assert len(root.handlers) == 1


def test_configure_logging_honours_the_configured_level() -> None:
    root = logging.getLogger()
    root.handlers = []
    configure_logging(Settings(log_level=LogLevel.warning))
    assert root.level == logging.WARNING
