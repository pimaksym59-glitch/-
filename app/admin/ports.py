"""Fundamental injection Protocols for the Admin subsystem (owner reqs 1, 20).

Only DTO-free, stdlib-typed dependencies live here (clock, id/token generation). Component-
specific ports (stores, integration ports, hooks) are declared beside the types they carry. The
subsystem is independent: no imports from other app packages, no FastAPI/Starlette, no third-
party SDKs. Time and identifiers are always injected so behaviour is deterministic under test
(owner req 20).

"""

from __future__ import annotations

import datetime
from typing import Protocol


class Clock(Protocol):
    """Time source (injected — the domain never calls ``datetime.now`` directly)."""

    def now(self) -> datetime.datetime: ...


class IdFactory(Protocol):
    """Identifier source (injected — no ``uuid4``/``random`` in the domain)."""

    def new_id(self) -> str: ...


class TokenFactory(Protocol):
    """Opaque-token source for sessions/CSRF (injected — deterministic under test)."""

    def new_token(self) -> str: ...
