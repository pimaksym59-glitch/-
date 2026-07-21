"""Admin Panel — management API over the platform modules.

REST JSON API (routers.py) protected by an admin token (security.py); schemas in
schemas.py. Mounted onto the FastAPI app in app.main. An HTMX/JS front-end can be
layered on top of this API later.

Depends on: db, scheduler, memory, analytics.
"""

from __future__ import annotations

from .routers import router

__all__ = ["router"]
