"""Auth routes (API_SPEC "Auth") — Stage 21 Phase 0. Thin HTTP <-> `AuthService`/`SessionManager`/
`RbacAuthorization` translation; no SQL, no authentication/authorization decision logic here
(§R3.1 — a route calls one use-case in a service).
"""

from __future__ import annotations

import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status

from app.admin.authorization import RbacAuthorization
from app.admin.rbac import Permission, Role
from app.admin.types import AdminActor
from app.api.auth import SESSION_COOKIE_NAME, Principal, current_principal
from app.api.deps import get_auth_service
from app.core.errors import Forbidden, Unauthorized
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    MeResponse,
    RevokeSessionsRequest,
    UserSummary,
)
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])

AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]
PrincipalDep = Annotated[Principal, Depends(current_principal)]

_FALLBACK_COOKIE_MAX_AGE = 3600


def _set_session_cookie(response: Response, token: str, expires_at: datetime.datetime) -> None:
    remaining = (expires_at - datetime.datetime.now(datetime.UTC)).total_seconds()
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=max(1, int(remaining)) if remaining > 0 else _FALLBACK_COOKIE_MAX_AGE,
        httponly=True,
        secure=True,
        samesite="lax",
    )


def _clear_session_cookie(response: Response) -> None:
    response.delete_cookie(key=SESSION_COOKIE_NAME, httponly=True, secure=True, samesite="lax")


def _require_authenticated(principal: Principal) -> None:
    if not principal.is_authenticated or principal.id is None or principal.role is None:
        raise Unauthorized("no active session")


@router.post("/login", response_model=LoginResponse, status_code=status.HTTP_200_OK)
async def login(body: LoginRequest, response: Response, service: AuthServiceDep) -> LoginResponse:
    """`POST /auth/login` (API_SPEC): authenticate against the real UserStore, open a real Redis
    session, set the session cookie (HttpOnly, Secure, SameSite). `Unauthorized` -> 401 on any
    failure (unknown account, bad password, or MFA required) via `AuthService.login`."""

    user, session = await service.login(body.email, body.password, body.otp)
    _set_session_cookie(response, session.token, session.expires_at)
    return LoginResponse(user=UserSummary(id=str(user.id), email=user.email))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(request: Request, response: Response, service: AuthServiceDep) -> None:
    """`POST /auth/logout` (API_SPEC): revoke the current session and clear its cookie."""

    token = request.cookies.get(SESSION_COOKIE_NAME)
    if token:
        await service.logout(token)
    _clear_session_cookie(response)


@router.get("/me", response_model=MeResponse, status_code=status.HTTP_200_OK)
async def me(principal: PrincipalDep, service: AuthServiceDep) -> MeResponse:
    """`GET /auth/me` (API_SPEC): resolve the caller through the real SessionStore. Requires an
    existing session — `current_principal`'s ANONYMOUS default is never rendered as a user."""

    _require_authenticated(principal)
    assert principal.id is not None and principal.role is not None  # narrowed by the check above
    user = await service.get_user(principal.id)
    if user is None:
        raise Unauthorized("no active session")
    return MeResponse(user=UserSummary(id=str(user.id), email=user.email), role=principal.role)


@router.post("/sessions/revoke", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_sessions(
    body: RevokeSessionsRequest, principal: PrincipalDep, service: AuthServiceDep
) -> None:
    """`POST /auth/sessions/revoke` (API_SPEC, owner-only): forcibly end a target user's
    sessions. RBAC via the existing `RbacAuthorization` — never a UI-side check."""

    _require_authenticated(principal)
    assert principal.id is not None and principal.role is not None
    actor = AdminActor(id=principal.id, role=Role(principal.role), is_authenticated=True)
    decision = RbacAuthorization().check(actor, Permission.USERS_MANAGE)
    if not decision.allowed:
        raise Forbidden(decision.reason)
    await service.revoke_user_sessions(body.user_id)
