"""Distributed token-bucket rate limiter (§R2.8/§R7.6/§R8.9, backlog FA-5).

Pure infrastructure — no Telegram/API coupling. Callers supply ``rate``/``burst`` and the key
(built via :mod:`app.core.redis.keys`). The bucket update is a single atomic Lua script, so the
limiter is correct across the whole worker fleet (unlike an in-process semaphore).
"""

from __future__ import annotations

from redis.asyncio import Redis

from app.core.redis import ttl as ttl_constants

# KEYS[1] = bucket key.  ARGV = rate(tokens/sec), burst(capacity), now(sec), cost, ttl(sec).
_TOKEN_BUCKET_LUA = """
local key = KEYS[1]
local rate = tonumber(ARGV[1])
local burst = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])
local ttl = tonumber(ARGV[5])
local state = redis.call('HMGET', key, 'tokens', 'ts')
local tokens = tonumber(state[1])
local ts = tonumber(state[2])
if tokens == nil then
  tokens = burst
  ts = now
end
local elapsed = math.max(0, now - ts)
tokens = math.min(burst, tokens + elapsed * rate)
local allowed = 0
if tokens >= cost then
  tokens = tokens - cost
  allowed = 1
end
redis.call('HSET', key, 'tokens', tokens, 'ts', now)
redis.call('EXPIRE', key, ttl)
return allowed
"""


class RateLimiter:
    def __init__(self, client: Redis) -> None:
        self._client = client
        self._script = client.register_script(_TOKEN_BUCKET_LUA)

    async def try_acquire(
        self, key: str, *, rate: float, burst: int, now: float, cost: int = 1
    ) -> bool:
        """Atomically consume ``cost`` tokens. True if allowed, False if rate-limited."""
        allowed = await self._script(
            keys=[key], args=[rate, burst, now, cost, ttl_constants.RATELIMIT_BUCKET]
        )
        return bool(allowed)
