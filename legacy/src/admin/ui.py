"""Serve the single-page admin dashboard (static/index.html).

The shell is public (no token); every API call it makes carries the admin token
the user enters, so the JSON API stays the security boundary.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

_INDEX = Path(__file__).parent / "static" / "index.html"

ui_router = APIRouter(tags=["admin-ui"])


@ui_router.get("/admin/ui", response_class=HTMLResponse, include_in_schema=False)
async def admin_ui() -> HTMLResponse:
    return HTMLResponse(_INDEX.read_text(encoding="utf-8"))
