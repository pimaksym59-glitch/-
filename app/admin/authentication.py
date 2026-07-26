"""Authentication (owner reqs 3, 4, 18) — a standalone subsystem: it establishes *who you are*.

Authentication is deliberately separate from authorization (owner req 5) and RBAC. Password
verification goes through a :class:`PasswordHasher` port and MFA through a :class:`MfaVerifier`
port — no real crypto in the domain (real hashers/MFA are RV-17). Secrets are carried write-
only (:class:`~app.admin.types.WriteOnly`) and never logged/returned. External identity
providers (OAuth/OIDC/LDAP/SAML) are declared as seams only (owner req 18) — see
:mod:`app.admin.seams`.

"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from app.admin.rbac import Role
from app.admin.types import AdminActor, WriteOnly


@dataclass(frozen=True, slots=True)
class Credentials:
    """Login credentials. The secret is write-only and never rendered (§R10.4)."""

    email: str
    secret: WriteOnly[str]
    otp: str | None = None


@dataclass(frozen=True, slots=True)
class AuthOutcome:
    """Result of an authentication attempt."""

    authenticated: bool
    actor: AdminActor | None = None
    detail: str | None = None


class PasswordHasher(Protocol):
    """Password hashing/verification port (real implementation is RV-17)."""

    def verify(self, secret: str, password_hash: str) -> bool: ...


class MfaVerifier(Protocol):
    """MFA verification port (real TOTP/WebAuthn is RV-17)."""

    def verify(self, secret_ref: str, otp: str) -> bool: ...


class Authenticator(Protocol):
    """Pluggable authentication strategy (owner req 4)."""

    def authenticate(self, credentials: Credentials) -> AuthOutcome: ...


@dataclass(frozen=True, slots=True)
class Account:
    """Minimal account view an authenticator needs (supplied by composition)."""

    id: str
    role: Role
    password_hash: str
    mfa_secret_ref: str | None = None


class AccountLookup(Protocol):
    """Resolves an email to an account (adapts a real user store in composition)."""

    def find(self, email: str) -> Account | None: ...


class PasswordAuthenticator(Authenticator):
    """Password (+ optional MFA) authentication via injected ports (owner req 4).

    Contains no authorization/RBAC logic — it only decides whether the caller is who they claim
    to be.

    """

    def __init__(
        self,
        accounts: AccountLookup,
        hasher: PasswordHasher,
        mfa: MfaVerifier | None = None,
    ) -> None:
        self._accounts = accounts
        self._hasher = hasher
        self._mfa = mfa

    def authenticate(self, credentials: Credentials) -> AuthOutcome:
        account = self._accounts.find(credentials.email)
        if account is None:
            return AuthOutcome(authenticated=False, detail="unknown account")
        if not self._hasher.verify(credentials.secret.reveal(), account.password_hash):
            return AuthOutcome(authenticated=False, detail="bad credentials")
        if account.mfa_secret_ref is not None:
            if self._mfa is None or credentials.otp is None:
                return AuthOutcome(authenticated=False, detail="mfa required")
            if not self._mfa.verify(account.mfa_secret_ref, credentials.otp):
                return AuthOutcome(authenticated=False, detail="bad otp")
        actor = AdminActor(id=account.id, role=account.role, is_authenticated=True)
        return AuthOutcome(authenticated=True, actor=actor)
