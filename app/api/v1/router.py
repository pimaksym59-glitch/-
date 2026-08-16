"""API v1 aggregate router (§R3.1). Mounts every v1 sub-router under ``/api/v1``. Adding a resource
router later means appending it to ``_ROUTERS`` — the factory does not change (owner req).
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.routes import analytics, auth, channels, health, posts, tasks

_API_V1_PREFIX = "/api/v1"

# Extension point: resource routers (channels/posts/...) are appended here in their service stages.
_ROUTERS: tuple[APIRouter, ...] = (
    health.router,
    auth.router,
    tasks.router,
    analytics.router,
    channels.router,
    posts.router,
)


def build_v1_router() -> APIRouter:
    """Build the aggregate ``/api/v1`` router (no global state; a fresh router per call)."""
    router = APIRouter(prefix=_API_V1_PREFIX)
    for sub_router in _ROUTERS:
        router.include_router(sub_router)
    return router
