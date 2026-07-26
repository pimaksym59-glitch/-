"""Fake infrastructure catalogue (owner reqs 3, 21) — the deterministic fake inventory.

A registry of the subsystems' **public** fakes (re-exported by name), plus the harness's own
deterministic doubles used by strategies (fault injector, snapshot store, coverage source).
Nothing here reaches a network or uses randomness. Concrete subsystem fakes are imported only
through their public ``fakes`` modules.

"""

from __future__ import annotations

from collections.abc import Mapping
from types import MappingProxyType

from app.admin.fakes import FakePasswordHasher, FakeSessionStore
from app.analytics.fakes import FakeEventExporter, FakeEventSink
from app.images.fakes import FakeImageProvider
from app.llm.fakes import FakeEmbeddingProvider, FakeLLMProvider
from app.telegram.fakes import FakeTelegramProvider

# name -> public fake type (documentation/registry of the offline inventory, §R2.10)
_CATALOGUE: dict[str, type] = {
    "llm": FakeLLMProvider,
    "embedding": FakeEmbeddingProvider,
    "image": FakeImageProvider,
    "telegram": FakeTelegramProvider,
    "analytics_event_sink": FakeEventSink,
    "analytics_event_exporter": FakeEventExporter,
    "admin_password_hasher": FakePasswordHasher,
    "admin_session_store": FakeSessionStore,
}

FAKE_CATALOGUE: Mapping[str, type] = MappingProxyType(_CATALOGUE)


class FakeCatalogue:
    """Read-only registry of the offline fake inventory (owner req 21)."""

    def names(self) -> tuple[str, ...]:
        return tuple(sorted(FAKE_CATALOGUE))

    def get(self, name: str) -> type:
        return FAKE_CATALOGUE[name]
