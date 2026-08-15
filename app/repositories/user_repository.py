"""User data-access (§R3.1) — Stage 21 Phase 0. Closes the real half of the `UserStore`/
`AccountLookup` seams declared in `app.admin.users`/`app.admin.authentication`, previously
satisfied only by `FakeUserStore`/`FakeAccountLookup` in tests.

No domain logic here (§R3.1) — only data access plus pure DTO mapping. `AccountLookup`/`UserStore`
are declared as SYNCHRONOUS Protocols in the (FastAPI-independent) admin subsystem; this repository
stays honestly ASYNC, matching every other repository in this package. The route layer resolves the
mismatch by awaiting a repository fetch first, then handing the already-fetched result to a small
synchronous, in-memory `AccountLookup` (see `app.api.v1.routes.auth`) — no Protocol was widened.
"""

from __future__ import annotations

from sqlalchemy import select

from app.admin.authentication import Account
from app.admin.rbac import Role
from app.models.enums import UserRole
from app.models.user import User
from app.repositories.base import EntityRepository


class UserRepository(EntityRepository[User]):
    model = User

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email, User.deleted_at.is_(None))
        user: User | None = await self.session.scalar(stmt)
        return user

    async def count_active(self) -> int:
        stmt = select(User).where(User.deleted_at.is_(None))
        result = await self.session.scalars(stmt)
        return len(result.all())


def to_account(user: User) -> Account | None:
    """Map a `User` row to the `Account` view `PasswordAuthenticator` needs.

    Returns None if the row has no `password_hash` — such an account can never authenticate
    (never fabricate a hash to compare against).
    """

    if user.password_hash is None:
        return None
    return Account(
        id=str(user.id),
        role=Role(user.role.value),
        password_hash=user.password_hash,
        mfa_secret_ref=user.mfa_secret_ref,
    )


def role_to_user_role(role: Role) -> UserRole:
    """Map the admin-domain `Role` to the ORM-level `UserRole` enum (same values, distinct types
    by design — the admin subsystem imports nothing outside itself)."""

    return UserRole(role.value)
