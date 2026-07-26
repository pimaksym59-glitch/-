"""Telegram DTOs (§R7) — immutable, library-agnostic. These internal types (never aiogram objects)
are the only Telegram data the domain sees; raw updates are mapped into them in one place
(:mod:`app.telegram.mapping`). ``SessionContext`` is immutable (owner req 7).
"""

from __future__ import annotations

import uuid
from collections.abc import Mapping
from dataclasses import dataclass, field
from enum import StrEnum


class UpdateKind(StrEnum):
    message = "message"
    command = "command"
    callback_query = "callback_query"
    unknown = "unknown"


class ParseMode(StrEnum):
    markdown_v2 = "MarkdownV2"
    html = "HTML"
    plain = "plain"


@dataclass(frozen=True, slots=True)
class TelegramUser:
    id: int
    username: str | None = None
    is_bot: bool = False


@dataclass(frozen=True, slots=True)
class Chat:
    id: int | str
    type: str = "private"


@dataclass(frozen=True, slots=True)
class Attachment:
    kind: str  # photo | video | document
    data: bytes | None = None
    file_id: str | None = None
    mime: str | None = None
    caption: str | None = None


@dataclass(frozen=True, slots=True)
class IncomingMessage:
    message_id: int
    chat: Chat
    from_user: TelegramUser | None = None
    text: str = ""
    attachments: tuple[Attachment, ...] = ()


@dataclass(frozen=True, slots=True)
class CallbackQuery:
    id: str
    from_user: TelegramUser
    data: str = ""
    message: IncomingMessage | None = None


@dataclass(frozen=True, slots=True)
class Command:
    name: str
    args: tuple[str, ...]
    message: IncomingMessage


@dataclass(frozen=True, slots=True)
class Update:
    update_id: int
    kind: UpdateKind
    message: IncomingMessage | None = None
    callback_query: CallbackQuery | None = None
    command: Command | None = None


@dataclass(frozen=True, slots=True)
class PublishRequest:
    chat_id: int | str
    dedup_key: str
    channel_id: uuid.UUID | None = None
    text: str = ""
    attachments: tuple[Attachment, ...] = ()
    parse_mode: ParseMode = ParseMode.markdown_v2
    draft: bool = False


@dataclass(frozen=True, slots=True)
class PublishResult:
    sent: bool
    message_ids: tuple[int, ...] = ()
    status: str = "published"  # published | draft | needs_review | skipped
    reason: str | None = None


@dataclass(frozen=True, slots=True)
class SessionContext:
    chat_id: int | str
    user_id: int | None
    state_key: str
    data: Mapping[str, str] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class RouteRule:
    handler: str
    kind: UpdateKind | None = None
    command: str | None = None
