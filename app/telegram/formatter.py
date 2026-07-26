"""Message formatting (§R7.7) — MarkdownV2/HTML escaping and length limits (text <= 4096, media
caption <= 1024). Pure, deterministic; no Telegram library.
"""

from __future__ import annotations

from app.telegram.types import ParseMode

TEXT_LIMIT = 4096
CAPTION_LIMIT = 1024

_MARKDOWN_V2_SPECIAL = r"_*[]()~`>#+-=|{}.!"
_HTML_ESCAPE = {"&": "&amp;", "<": "&lt;", ">": "&gt;"}


def escape(text: str, parse_mode: ParseMode) -> str:
    if parse_mode is ParseMode.markdown_v2:
        return _escape_markdown_v2(text)
    if parse_mode is ParseMode.html:
        return _escape_html(text)
    return text


def _escape_markdown_v2(text: str) -> str:
    out: list[str] = []
    for char in text:
        if char in _MARKDOWN_V2_SPECIAL:
            out.append("\\")
        out.append(char)
    return "".join(out)


def _escape_html(text: str) -> str:
    return "".join(_HTML_ESCAPE.get(char, char) for char in text)


def truncate_text(text: str) -> str:
    return text[:TEXT_LIMIT]


def truncate_caption(text: str) -> str:
    return text[:CAPTION_LIMIT]
