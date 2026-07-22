"""Validation — unified content checks applied before publication.

Layout:
- rules.py      individual pure checks (length, banned, duplicate, image)
- validator.py  compose rules → ValidationResult
- handler.py    registers the `validate` task handler (gate before publish)

On pass the handler enqueues `publish` (closing the pipeline); on fail it marks
the Post rejected. Call `register()` at startup.
Depends on: db, scheduler.
"""

from __future__ import annotations


def register() -> None:
    """Register the validation task handler into scheduler.registry."""
    from app.models.enums import TaskType
    from scheduler.registry import register as register_handler

    from .handler import handle_validate

    register_handler(TaskType.validate)(handle_validate)
