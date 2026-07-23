"""Redis infrastructure (§R2.8/§R7.6/§R8.9/§R2-CACHE). Async, key-builder-only, TTL-constant-only.

Infrastructure layer only — no business logic. Public primitives: RedisManager, KeyBuilder, Cache,
IdempotencyStore, RateLimiter, DistributedLock, Publisher, Subscriber.
"""

from __future__ import annotations

from app.core.redis.cache import Cache
from app.core.redis.idempotency import IdempotencyStore
from app.core.redis.keys import KeyBuilder, Namespace, get_key_builder
from app.core.redis.locks import DistributedLock
from app.core.redis.manager import RedisManager, get_redis_manager
from app.core.redis.pubsub import Publisher, Subscriber
from app.core.redis.rate_limiter import RateLimiter

__all__ = [
    "Cache",
    "DistributedLock",
    "IdempotencyStore",
    "KeyBuilder",
    "Namespace",
    "Publisher",
    "RateLimiter",
    "RedisManager",
    "Subscriber",
    "get_key_builder",
    "get_redis_manager",
]
