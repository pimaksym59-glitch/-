"""Cross-cutting harness Protocols (owner req 23) — DTO-free injection points.

Component-specific ports (snapshot store, reporter, fault injector, coverage source) are
declared beside their components. Only stdlib-typed fundamentals live here so the module stays
import-light.

"""

from __future__ import annotations

import datetime
from typing import Protocol


class Clock(Protocol):
    """Injected time source (the harness never calls ``datetime.now``)."""

    def now(self) -> datetime.datetime: ...


class IdFactory(Protocol):
    """Injected identifier source (no ``uuid4``/``random``)."""

    def new_id(self) -> str: ...
