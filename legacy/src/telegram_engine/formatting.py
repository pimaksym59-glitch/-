"""Format a post body for Telegram. Pure, unit-tested.

Plain text (no parse mode) keeps truncation safe — no risk of cutting a markup
entity. Photo captions and text messages have different length limits.
"""

from __future__ import annotations

TEXT_LIMIT = 4096
CAPTION_LIMIT = 1024


def truncate(text: str, limit: int) -> str:
    text = text.strip()
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def render_message(body: str | None, *, has_image: bool) -> str:
    """Return the post text sized for a caption (with image) or a text message."""
    limit = CAPTION_LIMIT if has_image else TEXT_LIMIT
    return truncate(body or "", limit)
