"""Authentication integration points (§R10.4/R10.5).

Stage 21 Phase 0: ``current_principal`` resolves the real session cookie via the real Redis-backed
``SessionManager`` (``app.core.sessions.RedisSessionStore``) — no anonymous-only fallback for a
request carrying a valid session. It still returns ANONYMOUS for a missing, unknown or expired
cookie; tests override it via ``dependency_overrides`` exactly as before.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends
from starlette.concurrency import run_in_threadpool
from starlette.requests import Request

from app.admin.sessions import SessionManager
from app.api.deps import get_session_manager

SESSION_COOKIE_NAME = "session"


@dataclass(frozen=True, slots=True)
class Principal:
    """The caller's identity. ``is_authenticated`` is False for the anonymous default."""

    id: str | None
    role: str | None
    is_authenticated: bool


ANONYMOUS = Principal(id=None, role=None, is_authenticated=False)


async def current_principal(
    request: Request,
    sessions: Annotated[SessionManager, Depends(get_session_manager)],
) -> Principal:
    """DI seam for the current caller (§R10.4): resolves the real session cookie.

    RBAC (§R10.5) is enforced in the service layer keyed off the resolved principal — never in the
    UI and not here.
    """

    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        return ANONYMOUS
    session = await run_in_threadpool(sessions.validate, token)
    if session is None:
        return ANONYMOUS
    return Principal(id=session.user_id, role=session.role.value, is_authenticated=True)
