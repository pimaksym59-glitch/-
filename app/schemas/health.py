"""Health DTOs (§R12.10): liveness (process is up) and readiness (dependencies are usable) are
separate responses so orchestrators can probe them independently.
"""

from __future__ import annotations

from app.schemas.base import Schema


class LivenessResponse(Schema):
    status: str = "alive"


class ReadinessCheck(Schema):
    name: str
    healthy: bool
    detail: str | None = None


class ReadinessResponse(Schema):
    status: str  # "ready" | "not_ready"
    checks: list[ReadinessCheck]
