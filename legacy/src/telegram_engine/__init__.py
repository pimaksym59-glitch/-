"""Telegram Engine — publish queue, message formatting, publishing, error handling.

Layout:
- client.py      TelegramClient protocol + AiogramTelegramClient / FakeTelegramClient
- formatting.py  plain-text rendering under Telegram length limits
- handler.py     registers the `publish` task handler

Call `register()` at startup to install the handler into scheduler.registry.
Depends on: db, scheduler, ai_engine, image_engine.
"""

from __future__ import annotations


def register() -> None:
    """Register Telegram Engine task handlers into scheduler.registry."""
    from app.models.enums import TaskType
    from scheduler.registry import register as register_handler

    from .handler import handle_publish

    register_handler(TaskType.publish)(handle_publish)
