"""Health routes (§R12.10) — liveness and readiness, no auth (API_SPEC). Thin: they call
``HealthService`` and map its result to the response DTO; no business logic lives here (§R3.1).
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from app.api.deps import get_health_service
from app.schemas.health import LivenessResponse, ReadinessCheck, ReadinessResponse
from app.services.health import HealthService

router = APIRouter(prefix="/health", tags=["health"])

HealthServiceDep = Annotated[HealthService, Depends(get_health_service)]


@router.get("/live", response_model=LivenessResponse, status_code=status.HTTP_200_OK)
async def liveness(service: HealthServiceDep) -> LivenessResponse:
    """Liveness: the process is up and servicing requests."""
    service.liveness()
    return LivenessResponse()


@router.get(
    "/ready",
    response_model=ReadinessResponse,
    status_code=status.HTTP_200_OK,
    responses={status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ReadinessResponse}},
)
async def readiness(response: Response, service: HealthServiceDep) -> ReadinessResponse:
    """Readiness: dependencies are usable. 200 when all probes pass, else 503."""
    ready, results = await service.readiness()
    response.status_code = status.HTTP_200_OK if ready else status.HTTP_503_SERVICE_UNAVAILABLE
    return ReadinessResponse(
        status="ready" if ready else "not_ready",
        checks=[ReadinessCheck(name=r.name, healthy=r.healthy, detail=r.detail) for r in results],
    )
