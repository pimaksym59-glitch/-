"""Dependency-Injection providers (§R3.1). Routes depend on these; tests swap them via
``app.dependency_overrides``. No global service instances — a fresh service is built per request.

The API layer reaches infrastructure (DB/Redis) only through the service layer (§R3.1): it never
imports ``app.db``/``sqlalchemy`` directly, so DB access is exposed as a *service*
(``HealthService``), not a raw session. Later resource endpoints follow the same service-per-request
pattern.
"""

from __future__ import annotations

from app.core.config import Settings
from app.core.config import get_settings as _get_settings
from app.services.health import HealthService, default_readiness_probes


def get_settings() -> Settings:
    """Application settings as a DI dependency (overridable in tests)."""
    return _get_settings()


def get_health_service() -> HealthService:
    """A HealthService wired with the production readiness probes (fakes override this in tests)."""
    return HealthService(default_readiness_probes())
