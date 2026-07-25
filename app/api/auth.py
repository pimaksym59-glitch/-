"""Authentication integration points (§R10.4/R10.5) — **extension only**, no OAuth/JWT/sessions and
no RBAC enforcement yet (Stage 10 is infrastructure). The seam is here so the auth stage can plug in
a real ``Authenticator`` and RBAC checks (service layer) **without changing route signatures**.

Nothing in Stage 10 relies on authentication: ``current_principal`` returns an anonymous principal
by default; tests and later stages override it via ``dependency_overrides``.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from starlette.requests import Request


@dataclass(frozen=True, slots=True)
class Principal:
    """The caller's identity. ``is_authenticated`` is False for the anonymous default."""

    id: str | None
    role: str | None
    is_authenticated: bool


ANONYMOUS = Principal(id=None, role=None, is_authenticated=False)


class Authenticator(Protocol):
    """Pluggable authentication strategy (implemented by the auth stage)."""

    async def authenticate(self, request: Request) -> Principal: ...


async def current_principal(request: Request) -> Principal:
    """DI seam for the current caller. Returns ANONYMOUS until real auth is wired (§R10.4).

    RBAC (§R10.5) will be enforced in the service layer keyed off the resolved principal — never in
    the UI and not in this stage.
    """
    return ANONYMOUS
