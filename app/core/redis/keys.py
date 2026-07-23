"""Centralized Redis key builder (§R3.7). Format: ``tai:{env}:{namespace}:{parts}``.

This is the **only** place Redis key strings are constructed — no key literals elsewhere.
"""

from __future__ import annotations

import functools
from enum import StrEnum

from app.core.config import get_settings

_PREFIX = "tai"
_SEP = ":"


class Namespace(StrEnum):
    cache = "cache"
    lock = "lock"
    ratelimit = "ratelimit"
    idempotency = "idem"
    pubsub = "pubsub"


class KeyBuilder:
    """Builds namespaced Redis keys for a given environment."""

    def __init__(self, env: str) -> None:
        self._env = env

    def _build(self, namespace: Namespace, *parts: str) -> str:
        for part in parts:
            if _SEP in part:
                raise ValueError(f"key part must not contain '{_SEP}': {part!r}")
        return _SEP.join([_PREFIX, self._env, namespace.value, *parts])

    def cache(self, *parts: str) -> str:
        return self._build(Namespace.cache, *parts)

    def lock(self, name: str) -> str:
        return self._build(Namespace.lock, name)

    def ratelimit(self, provider: str, scope: str) -> str:
        return self._build(Namespace.ratelimit, provider, scope)

    def idempotency(self, key: str) -> str:
        return self._build(Namespace.idempotency, key)

    def channel(self, name: str) -> str:
        return self._build(Namespace.pubsub, name)


@functools.lru_cache(maxsize=1)
def get_key_builder() -> KeyBuilder:
    """Cached KeyBuilder scoped to the current environment."""
    return KeyBuilder(get_settings().app_env.value)
