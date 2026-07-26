"""Telegram DTO mapping (§R7, owner req 15) — the **only** layer that touches raw Telegram update
structures. It maps a raw update (a plain dict from webhook/polling) into the internal immutable
DTOs;
domain logic never sees raw Telegram objects. Deterministic, pure.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

from app.telegram.types import (
    Attachment,
    CallbackQuery,
    Chat,
    Command,
    IncomingMessage,
    TelegramUser,
    Update,
    UpdateKind,
)


def map_update(raw: Mapping[str, Any]) -> Update:
    update_id = int(raw.get("update_id", 0))
    if "callback_query" in raw:
        return Update(
            update_id, UpdateKind.callback_query, callback_query=_callback(raw["callback_query"])
        )
    if "message" in raw:
        message = _message(raw["message"])
        if message.text.startswith("/"):
            return Update(update_id, UpdateKind.command, message=message, command=_command(message))
        return Update(update_id, UpdateKind.message, message=message)
    return Update(update_id, UpdateKind.unknown)


def _user(raw: Mapping[str, Any] | None) -> TelegramUser | None:
    if not raw:
        return None
    return TelegramUser(
        id=int(raw["id"]), username=raw.get("username"), is_bot=bool(raw.get("is_bot", False))
    )


def _message(raw: Mapping[str, Any]) -> IncomingMessage:
    chat_raw = raw.get("chat", {})
    return IncomingMessage(
        message_id=int(raw.get("message_id", 0)),
        chat=Chat(id=chat_raw.get("id", 0), type=chat_raw.get("type", "private")),
        from_user=_user(raw.get("from")),
        text=raw.get("text", ""),
        attachments=_attachments(raw),
    )


def _attachments(raw: Mapping[str, Any]) -> tuple[Attachment, ...]:
    items: list[Attachment] = []
    photos = raw.get("photo")
    if isinstance(photos, Sequence) and photos:
        last = photos[-1]
        items.append(Attachment(kind="photo", file_id=last.get("file_id")))
    if "document" in raw:
        items.append(Attachment(kind="document", file_id=raw["document"].get("file_id")))
    if "video" in raw:
        items.append(Attachment(kind="video", file_id=raw["video"].get("file_id")))
    return tuple(items)


def _callback(raw: Mapping[str, Any]) -> CallbackQuery:
    from_user = _user(raw.get("from"))
    message = _message(raw["message"]) if "message" in raw else None
    return CallbackQuery(
        id=str(raw.get("id", "")),
        from_user=from_user if from_user is not None else TelegramUser(id=0),
        data=raw.get("data", ""),
        message=message,
    )


def _command(message: IncomingMessage) -> Command:
    head, _, rest = message.text.partition(" ")
    name = head[1:].split("@", 1)[0]  # strip leading "/" and optional @botname
    args = tuple(part for part in rest.split() if part)
    return Command(name=name, args=args, message=message)
