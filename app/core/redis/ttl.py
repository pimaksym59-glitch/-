"""All Redis TTLs in one place (§R3.7). Values in **seconds**.

No numeric TTL literals may appear anywhere else — every expiry references a constant here. These
are platform defaults and may later move to config (like MASTER_SPEC §Appendix B).
"""

from __future__ import annotations

CACHE_DEFAULT = 300  # generic cache entries
EMBEDDING = 86_400  # cached embeddings (rarely change)
PROMPT = 3_600  # rendered prompts
CHANNEL_SETTINGS = 600  # channel config cache
HISTORY = 900  # recent-history windows
SIMILAR_POSTS = 300  # similarity lookups
IDEMPOTENCY = 3_600  # idempotency fast-path window (Postgres is source of truth)
LOCK_DEFAULT = 30  # distributed lock lease
RATELIMIT_BUCKET = 3_600  # token-bucket state expiry when idle
