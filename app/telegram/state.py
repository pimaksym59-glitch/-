"""State management (§R7, owner req 8) — a public ``StateStore`` Protocol. The engine depends
only on
this interface, not on any concrete backend (in-memory fake offline; Redis/DB in composition,
RV-15).
``SessionContext`` (immutable) lives in :mod:`app.telegram.types`.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Protocol


class StateStore(Protocol):
    async def get(self, key: str) -> Mapping[str, str]: ...

    async def set(self, key: str, data: Mapping[str, str]) -> None: ...

    async def clear(self, key: str) -> None: ...
