"""Single structured logging interface for the queue (§ req 9, §R12.9). No ``print()``.

All queue events go through an :class:`EventLogger`. The default wraps stdlib ``logging``; a full
structured JSON logger is a later stage (backlog FA-4).
"""

from __future__ import annotations

import logging
from typing import Any, Protocol


class EventLogger(Protocol):
    def event(self, name: str, **fields: Any) -> None: ...


class StdlibEventLogger:
    def __init__(self, logger: logging.Logger | None = None) -> None:
        self._logger = logger if logger is not None else logging.getLogger("app.workers")

    def event(self, name: str, **fields: Any) -> None:
        self._logger.info(name, extra={"event": name, "fields": fields})
