"""Fundamental injection Protocols for the Analytics & Observability subsystem (owner reqs 1, 17).

Only DTO-free, stdlib-typed dependencies live here (clock, id generation). Component-specific
ports (sinks/exporters/hooks) are declared beside the DTOs they carry, keeping this module free of
intra-package imports so the subsystem stays acyclic. The subsystem is stdlib-only: no imports
from other app packages and no third-party SDKs.

"""

from __future__ import annotations

import datetime
from typing import Protocol


class Clock(Protocol):
    """Time source (injected — the domain never calls ``datetime.now`` directly, owner req 17)."""

    def now(self) -> datetime.datetime: ...


class IdFactory(Protocol):
    """Identifier source (injected — no ``uuid4``/``random`` in the domain, owner req 17)."""

    def new_id(self) -> str: ...
