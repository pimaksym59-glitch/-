"""FastAPI application entrypoint.

Stage 1 exposes health/readiness endpoints proving the app boots and can reach
Postgres and Redis. Feature routers (admin, analytics, ...) are mounted in
later stages.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.responses import JSONResponse

from . import db, redis_client
from .config import get_settings
from .logging import configure_logging

log = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    settings = get_settings()
    log.info("startup", app_env=settings.app_env)
    yield
    await db.dispose()
    await redis_client.dispose()
    log.info("shutdown")


app = FastAPI(title="AI Telegram Automation Platform", lifespan=lifespan)

# Admin management API (see admin package). Guarded by ADMIN_TOKEN.
from admin import router as admin_router  # noqa: E402

app.include_router(admin_router)


@app.get("/health")
async def health() -> dict[str, str]:
    """Liveness: the process is up and serving requests."""
    return {"status": "ok"}


@app.get("/readiness")
async def readiness() -> JSONResponse:
    """Readiness: dependencies (Postgres, Redis) are reachable."""
    checks: dict[str, str] = {}
    healthy = True

    for name, check in (("postgres", db.ping), ("redis", redis_client.ping)):
        try:
            await check()
            checks[name] = "ok"
        except Exception as exc:  # noqa: BLE001 - report any failure per-dependency
            healthy = False
            checks[name] = f"error: {exc.__class__.__name__}"
            log.warning("readiness_check_failed", dependency=name, error=str(exc))

    status_code = 200 if healthy else 503
    return JSONResponse(
        status_code=status_code,
        content={"status": "ready" if healthy else "degraded", "checks": checks},
    )
