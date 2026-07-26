"""Authorization (owner reqs 4, 5) — decides *what you may do*, independently of authentication.

Every check goes through the RBAC model (owner req 4) — never string literals, never the UI.
The policy is pure: it maps ``(actor, permission)`` to an allow/deny decision; ``require``
raises :class:`~app.admin.exceptions.PermissionDenied` on deny. It performs no authentication.

"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from app.admin.exceptions import PermissionDenied
from app.admin.rbac import Permission, has_permission
from app.admin.types import AdminActor


@dataclass(frozen=True, slots=True)
class AuthorizationDecision:
    """Immutable allow/deny decision with a reason."""

    allowed: bool
    reason: str


class AuthorizationPolicy(Protocol):
    """Pluggable authorization policy (owner req 5)."""

    def check(self, actor: AdminActor, permission: Permission) -> AuthorizationDecision: ...


class RbacAuthorization(AuthorizationPolicy):
    """RBAC-backed authorization: allow iff the actor is authenticated and its role holds the
    permission."""

    def check(self, actor: AdminActor, permission: Permission) -> AuthorizationDecision:
        if not actor.is_authenticated or actor.role is None:
            return AuthorizationDecision(allowed=False, reason="not authenticated")
        if not has_permission(actor.role, permission):
            return AuthorizationDecision(allowed=False, reason="role lacks permission")
        return AuthorizationDecision(allowed=True, reason="granted")

    def require(self, actor: AdminActor, permission: Permission) -> None:
        """Raise :class:`PermissionDenied` unless the actor holds ``permission``."""

        decision = self.check(actor, permission)
        if not decision.allowed:
            raise PermissionDenied(f"{permission}: {decision.reason}")
