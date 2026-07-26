"""Shared immutable types for the Admin subsystem (owner req 2, UI-agnostic).

``AdminActor`` is the resolved caller identity (used for RBAC decisions). ``WriteOnly`` wraps a
secret so it can be accepted but never rendered (§R10.4) — its ``repr`` is masked and DTO
mapping never emits the value. ``TaskIntent`` models a panel action that must go through the
queue (§R10.1) rather than a second publish path — the actual enqueue happens in composition
(RV-17).

"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, field
from types import MappingProxyType

from app.admin.rbac import Role

_MASK = "***"


@dataclass(frozen=True, slots=True)
class AdminActor:
    """The resolved caller: identity + role. ``is_authenticated`` is False for anonymous."""

    id: str | None
    role: Role | None
    is_authenticated: bool = False


ANONYMOUS = AdminActor(id=None, role=None, is_authenticated=False)


@dataclass(frozen=True, slots=True)
class WriteOnly[T]:
    """A write-only secret holder: the value is accepted but masked in repr and never mapped out."""

    _value: T

    def reveal(self) -> T:
        """Return the wrapped secret (only composition/real backends should call this)."""

        return self._value

    def __repr__(self) -> str:
        return f"WriteOnly({_MASK})"

    def __str__(self) -> str:
        return _MASK


@dataclass(frozen=True, slots=True)
class ActionResult:
    """Outcome of an admin action (UI-agnostic)."""

    ok: bool
    detail: str | None = None


@dataclass(frozen=True, slots=True)
class TaskIntent:
    """A queued-action intent (§R10.1) — kind + payload; enqueued in composition (RV-17)."""

    kind: str
    payload: Mapping[str, str] = field(default_factory=lambda: MappingProxyType({}))

    def __post_init__(self) -> None:
        if not isinstance(self.payload, MappingProxyType):
            object.__setattr__(self, "payload", MappingProxyType(dict(self.payload)))
