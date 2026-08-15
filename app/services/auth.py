"""Auth service (§R3.1) — Stage 21 Phase 0. Composes the real DB session lookup with the existing
`PasswordAuthenticator`/`SessionManager` domain logic for the four `/auth/*` use-cases. No SQL and
no authentication decision logic lives in the route (API_SPEC "Слои").

The service owns its own DB session lifecycle internally (`app.db.session.get_sessionmaker`) —
`AsyncSession` never crosses into the "api" layer (`app/api/deps.py`/routes), matching
`tests/test_layering.py`'s mechanically-enforced `api -> services -> (domain, repositories) ->
models/db` direction (§R3.1): the "api" layer may not import `app.db`/`sqlalchemy` directly.

`PasswordAuthenticator.authenticate` and `SessionManager`'s methods are synchronous (the admin
subsystem is FastAPI/asyncio-independent by design); the decision logic is bridged via
`asyncio.to_thread` so it never blocks the event loop, without importing any web framework here.
"""

from __future__ import annotations

import asyncio
import uuid

from app.admin.authentication import Account, Credentials, PasswordAuthenticator, PasswordHasher
from app.admin.sessions import Session, SessionManager
from app.admin.types import WriteOnly
from app.core.errors import Unauthorized
from app.db.session import get_sessionmaker
from app.models.user import User
from app.repositories.user_repository import UserRepository, to_account


class _PreloadedAccountLookup:
    """A one-shot `AccountLookup` over an already-fetched account — no I/O inside `find` (the
    async DB fetch already happened in `AuthService.login` before this is constructed)."""

    def __init__(self, email: str, account: Account | None) -> None:
        self._email = email
        self._account = account

    def find(self, email: str) -> Account | None:
        return self._account if email == self._email else None


class AuthService:
    """Real login/logout/me/session-revoke use-cases (Stage 21 Phase 0)."""

    def __init__(self, hasher: PasswordHasher, sessions: SessionManager) -> None:
        self._hasher = hasher
        self._sessions = sessions

    async def login(self, email: str, password: str, otp: str | None) -> tuple[User, Session]:
        """Authenticate and open a real session. Raises `Unauthorized` on any failure — the
        reason is never distinguished to the caller (§R10.4: no user-enumeration signal)."""

        async with get_sessionmaker()() as db_session:
            repo = UserRepository(db_session)
            user = await repo.get_by_email(email)
            account = to_account(user) if user is not None else None

        lookup = _PreloadedAccountLookup(email, account)
        authenticator = PasswordAuthenticator(lookup, self._hasher, mfa=None)
        credentials = Credentials(email=email, secret=WriteOnly(password), otp=otp)
        outcome = await asyncio.to_thread(authenticator.authenticate, credentials)
        actor_role = outcome.actor.role if outcome.actor is not None else None
        if not outcome.authenticated or actor_role is None or user is None:
            raise Unauthorized("invalid email or password")
        session = await asyncio.to_thread(self._sessions.create, str(user.id), actor_role)
        return user, session

    async def logout(self, token: str) -> None:
        await asyncio.to_thread(self._sessions.revoke, token)

    async def get_user(self, user_id: str) -> User | None:
        try:
            uuid_id = uuid.UUID(user_id)
        except ValueError:
            return None
        async with get_sessionmaker()() as db_session:
            repo = UserRepository(db_session)
            return await repo.get(uuid_id)

    async def revoke_user_sessions(self, user_id: str) -> int:
        result: int = await asyncio.to_thread(self._sessions.revoke_all, user_id)
        return result
