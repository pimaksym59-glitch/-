"""Admin API auth — a shared token sent as the X-Admin-Token header.

When ADMIN_TOKEN is unset the admin API is disabled (503) rather than open.
"""

from __future__ import annotations

from fastapi import Header, HTTPException, status

from app.config import get_settings


async def require_admin(x_admin_token: str | None = Header(default=None)) -> None:
    settings = get_settings()
    if not settings.admin_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="admin API disabled: set ADMIN_TOKEN",
        )
    if x_admin_token != settings.admin_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid admin token")
