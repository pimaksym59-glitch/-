"""Auth DTOs (API_SPEC "Auth" section) — Stage 21 Phase 0. Shapes are deliberately minimal: only
fields the frozen contract actually names (`{user}`, `{user, role}`). `password_hash`/
`mfa_secret_ref` are never part of any response schema (write-only, §R10.4).
"""

from __future__ import annotations

from app.schemas.base import Schema


class LoginRequest(Schema):
    email: str
    password: str
    otp: str | None = None


class UserSummary(Schema):
    id: str
    email: str


class LoginResponse(Schema):
    user: UserSummary


class MeResponse(Schema):
    user: UserSummary
    role: str


class RevokeSessionsRequest(Schema):
    user_id: str
