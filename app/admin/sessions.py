"""Session Management (owner reqs 6, 7) — a standalone component with immutable session DTOs.

Sessions are created/validated/revoked through a :class:`SessionStore` port; expiry is computed
from an injected :class:`~app.admin.ports.Clock` (deterministic, owner req 20). Forced
termination (§R10.4) is ``revoke_all``. Login attempts are journaled through a
:class:`LoginJournalPort` (§R10.4). There is no cookie/HTTP here — binding a session to a
transport is a Web UI seam (RV-17).

"""

from __future__ import annotations

import datetime
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol

from app.admin.ports import Clock, TokenFactory
from app.admin.rbac import Role


@dataclass(frozen=True, slots=True)
class Session:
    """Immutable session DTO (owner req 6)."""

    token: str
    user_id: str
    role: Role
    created_at: datetime.datetime
    expires_at: datetime.datetime


@dataclass(frozen=True, slots=True)
class LoginAttempt:
    """A journaled login attempt (§R10.4)."""

    email: str
    success: bool
    at: datetime.datetime


class SessionStore(Protocol):
    """Persistence port for sessions (real backend is RV-17)."""

    def save(self, session: Session) -> None: ...

    def get(self, token: str) -> Session | None: ...

    def delete(self, token: str) -> None: ...

    def delete_for_user(self, user_id: str) -> int: ...


class LoginJournalPort(Protocol):
    """Login-journal port (§R10.4)."""

    def record(self, attempt: LoginAttempt) -> None: ...


class SessionManager:
    """Creates, validates and revokes sessions via the store (owner req 7)."""

    def __init__(
        self, store: SessionStore, clock: Clock, tokens: TokenFactory, ttl_seconds: float = 3600.0
    ) -> None:
        self._store = store
        self._clock = clock
        self._tokens = tokens
        self._ttl = datetime.timedelta(seconds=ttl_seconds)

    def create(self, user_id: str, role: Role) -> Session:
        """Open a new session for a user."""

        now = self._clock.now()
        session = Session(
            token=self._tokens.new_token(),
            user_id=user_id,
            role=role,
            created_at=now,
            expires_at=now + self._ttl,
        )
        self._store.save(session)
        return session

    def validate(self, token: str) -> Session | None:
        """Return the session if present and not expired; otherwise None (expired ones are
        deleted)."""

        session = self._store.get(token)
        if session is None:
            return None
        if self._clock.now() >= session.expires_at:
            self._store.delete(token)
            return None
        return session

    def revoke(self, token: str) -> None:
        """Revoke a single session."""

        self._store.delete(token)

    def revoke_all(self, user_id: str) -> int:
        """Forcibly terminate every session of a user (§R10.4). Returns the count removed."""

        return self._store.delete_for_user(user_id)


def journal_login(
    journal: LoginJournalPort, clock: Clock, email: str, *, success: bool
) -> LoginAttempt:
    """Record a login attempt in the journal (§R10.4)."""

    attempt = LoginAttempt(email=email, success=success, at=clock.now())
    journal.record(attempt)
    return attempt


def recent_attempts(attempts: Sequence[LoginAttempt], limit: int) -> tuple[LoginAttempt, ...]:
    """Most-recent-first slice of login attempts (journal viewer helper)."""

    return tuple(sorted(attempts, key=lambda a: a.at, reverse=True)[:limit])
