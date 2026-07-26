"""Rate limiting (§R7.6, owner req 14) — a public ``RateLimiter`` Protocol. The engine never touches
Redis directly; the real distributed token-bucket (Stage 5) is injected in composition (RV-15). The
limiter key is ``bot_token`` + ``channel_id`` (§R7.6).
"""

from __future__ import annotations

from typing import Protocol


class RateLimiter(Protocol):
    async def acquire(self, key: str) -> bool: ...


def rate_limit_key(bot_token: str, chat_id: int | str) -> str:
    """Per-bot, per-chat limiter key (§R7.6)."""
    return f"tg:{bot_token}:{chat_id}"
