"""KeyBuilder tests (§R3.7): format, namespaces, isolation, no-magic-strings guard. Offline."""

from __future__ import annotations

import pytest

from app.core.redis.keys import KeyBuilder, Namespace


def test_key_format_is_namespaced() -> None:
    kb = KeyBuilder("prod")
    assert kb.cache("post", "1") == "tai:prod:cache:post:1"
    assert kb.lock("materialize") == "tai:prod:lock:materialize"
    assert kb.ratelimit("openai", "global") == "tai:prod:ratelimit:openai:global"
    assert kb.idempotency("dedup-1") == "tai:prod:idem:dedup-1"
    assert kb.channel("events") == "tai:prod:pubsub:events"


def test_namespaces_are_stable() -> None:
    assert Namespace.idempotency.value == "idem"
    assert {n.value for n in Namespace} == {"cache", "lock", "ratelimit", "idem", "pubsub"}


def test_separator_in_part_is_rejected() -> None:
    with pytest.raises(ValueError):
        KeyBuilder("dev").cache("a:b")


def test_env_scopes_keys() -> None:
    assert KeyBuilder("dev").cache("x") != KeyBuilder("prod").cache("x")
