"""User management (owner reqs 8, 11) — an independent service (no god-object, owner req 8).

Users are read/written through a :class:`UserStore` port. Passwords enter write-only
(:class:`~app.admin.types.WriteOnly`) and are hashed via the authentication ``PasswordHasher``
port before storage; views never expose secrets (§R10.4, via the mapping layer). Every mutation
is RBAC-gated (USERS_MANAGE — owner only, §R10.5).

"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol

from app.admin.authentication import PasswordHasher
from app.admin.authorization import RbacAuthorization
from app.admin.dto import UserRecord, UserView
from app.admin.exceptions import NotFoundInAdmin
from app.admin.mapping import to_user_view
from app.admin.pagination import Page, PageRequest, paginate
from app.admin.rbac import Permission, Role
from app.admin.types import AdminActor, WriteOnly


class HashingPasswordHasher(PasswordHasher, Protocol):
    """A password hasher that can also produce a hash (superset used by user creation)."""

    def hash(self, secret: str) -> str: ...


class UserStore(Protocol):
    """Persistence port for users (real backend is RV-17)."""

    def list_users(self) -> Sequence[UserRecord]: ...

    def get(self, user_id: str) -> UserRecord | None: ...

    def upsert(self, record: UserRecord) -> None: ...


class UserService:
    """Independent user-management service (§R10.4/§R10.5)."""

    def __init__(
        self, store: UserStore, hasher: HashingPasswordHasher, authz: RbacAuthorization
    ) -> None:
        self._store = store
        self._hasher = hasher
        self._authz = authz

    def list_users(self, actor: AdminActor, request: PageRequest | None = None) -> Page[UserView]:
        self._authz.require(actor, Permission.USERS_MANAGE)
        views = [to_user_view(record) for record in self._store.list_users()]
        return paginate(views, request or PageRequest())

    def create_user(
        self, actor: AdminActor, *, user_id: str, email: str, role: Role, secret: WriteOnly[str]
    ) -> UserView:
        """Create a user; the password is hashed and never stored/returned in the clear (§R10.4)."""

        self._authz.require(actor, Permission.USERS_MANAGE)
        record = UserRecord(
            id=user_id,
            email=email,
            role=role,
            status="active",
            password_hash=self._hasher.hash(secret.reveal()),
        )
        self._store.upsert(record)
        return to_user_view(record)

    def update_role(self, actor: AdminActor, user_id: str, role: Role) -> UserView:
        """Change a user's role (owner only)."""

        self._authz.require(actor, Permission.USERS_MANAGE)
        record = self._require(user_id)
        updated = UserRecord(
            id=record.id,
            email=record.email,
            role=role,
            status=record.status,
            password_hash=record.password_hash,
            mfa_secret_ref=record.mfa_secret_ref,
        )
        self._store.upsert(updated)
        return to_user_view(updated)

    def deactivate(self, actor: AdminActor, user_id: str) -> UserView:
        """Soft-deactivate a user (owner only)."""

        self._authz.require(actor, Permission.USERS_MANAGE)
        record = self._require(user_id)
        updated = UserRecord(
            id=record.id,
            email=record.email,
            role=record.role,
            status="disabled",
            password_hash=record.password_hash,
            mfa_secret_ref=record.mfa_secret_ref,
        )
        self._store.upsert(updated)
        return to_user_view(updated)

    def _require(self, user_id: str) -> UserRecord:
        record = self._store.get(user_id)
        if record is None:
            raise NotFoundInAdmin(f"user not found: {user_id}")
        return record
