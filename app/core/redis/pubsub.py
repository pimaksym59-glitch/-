"""Redis pub/sub infrastructure primitive: publisher, subscriber, channel abstraction.

Thin wrappers only — no business-event handlers. Channels are plain strings built via
:mod:`app.core.redis.keys` (``KeyBuilder.channel``). Messages are raw bytes.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from redis.asyncio import Redis


class Publisher:
    def __init__(self, client: Redis) -> None:
        self._client = client

    async def publish(self, channel: str, message: bytes) -> int:
        """Publish raw bytes to a channel; returns the number of receivers."""
        return int(await self._client.publish(channel, message))


class Subscriber:
    def __init__(self, client: Redis) -> None:
        self._client = client

    async def messages(self, channel: str) -> AsyncIterator[bytes]:
        """Async iterator over message payloads on a channel (auto-closes on exit)."""
        async with self._client.pubsub() as pubsub:
            await pubsub.subscribe(channel)
            async for item in pubsub.listen():
                if item.get("type") == "message":
                    data: bytes = item["data"]
                    yield data
