"""Generic provider infrastructure (§R2.10, §R3.8) — Protocols, registry, factory, capability
discovery, health, unified error model, and resilience/observability seams.

This package is **generic**: it imports no domain package; dependencies flow outward only (owner
req 1). Concrete per-kind protocols, fakes and real adapters live in the domain packages
(``app/llm``, ``app/images``, ``app/telegram``); composition is in ``app/services/providers.py``.
"""

from __future__ import annotations

from app.core.providers.base import Capability, Provider, ProviderKind
from app.core.providers.capabilities import require, supports
from app.core.providers.errors import (
    AuthenticationError,
    PermanentProviderError,
    ProviderError,
    RateLimitError,
    TemporaryProviderError,
    TimeoutError,
    UnsupportedCapabilityError,
)
from app.core.providers.factory import ProviderFactory
from app.core.providers.health import ProviderHealth
from app.core.providers.observability import ProviderObservability
from app.core.providers.registry import (
    FAKE_NAME,
    ProviderBuilder,
    ProviderNotRegistered,
    ProviderRegistry,
)
from app.core.providers.resilience import (
    CircuitBreaker,
    NoOpCircuitBreaker,
    Timeout,
    call_with_resilience,
)

__all__ = [
    "FAKE_NAME",
    "AuthenticationError",
    "Capability",
    "CircuitBreaker",
    "NoOpCircuitBreaker",
    "PermanentProviderError",
    "Provider",
    "ProviderBuilder",
    "ProviderError",
    "ProviderFactory",
    "ProviderHealth",
    "ProviderKind",
    "ProviderNotRegistered",
    "ProviderObservability",
    "ProviderRegistry",
    "RateLimitError",
    "TemporaryProviderError",
    "Timeout",
    "TimeoutError",
    "UnsupportedCapabilityError",
    "call_with_resilience",
    "require",
    "supports",
]
