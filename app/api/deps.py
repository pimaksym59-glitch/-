"""Dependency-Injection providers (§R3.1). Routes depend on these; tests swap them via
``app.dependency_overrides``. No global service instances — a fresh service is built per request.

The API layer reaches infrastructure (DB/Redis) only through the service layer (§R3.1): it never
imports ``app.db``/``sqlalchemy`` directly (mechanically enforced by
``tests/test_layering.py``), so DB access is exposed as a *service* (``HealthService``,
``AuthService``) that owns its own session lifecycle, not a raw session handed down from here.
"""

from __future__ import annotations

from app.admin.sessions import SessionManager
from app.core.config import Settings
from app.core.config import get_settings as _get_settings
from app.core.providers.factory import ProviderFactory
from app.core.security import BcryptPasswordHasher
from app.core.sessions import SecureTokenFactory, SystemClock, get_redis_session_store
from app.services.auth import AuthService
from app.services.channels import ChannelService
from app.services.dashboard import DashboardAnalyticsService
from app.services.health import HealthService, default_readiness_probes
from app.services.posts import PostService
from app.services.providers import build_provider_factory
from app.services.tasks import TaskService


def get_settings() -> Settings:
    """Application settings as a DI dependency (overridable in tests)."""
    return _get_settings()


def get_health_service() -> HealthService:
    """A HealthService wired with the production readiness probes (fakes override this in tests)."""
    return HealthService(default_readiness_probes())


def get_provider_factory() -> ProviderFactory:
    """Provider factory as a DI dependency (§R2.10, owner req 8; overridable in tests)."""
    return build_provider_factory(_get_settings())


def get_password_hasher() -> BcryptPasswordHasher:
    """Real bcrypt password hasher (Stage 21 Phase 0; overridable in tests)."""
    return BcryptPasswordHasher()


def get_session_manager() -> SessionManager:
    """SessionManager over the real Redis-backed store (Stage 21 Phase 0; overridable in tests)."""
    return SessionManager(get_redis_session_store(), SystemClock(), SecureTokenFactory())


def get_auth_service() -> AuthService:
    """AuthService wired with real dependencies (Stage 21 Phase 0; overridable in tests). The
    service builds its own DB session per call — see `app.services.auth` for why."""
    return AuthService(get_password_hasher(), get_session_manager())


def get_task_service() -> TaskService:
    """Task Monitor service (Stage 21 Phase 2A; overridable in tests)."""
    return TaskService()


def get_dashboard_analytics_service() -> DashboardAnalyticsService:
    """Dashboard analytics/cost service (Stage 21 Phase 2A; overridable in tests)."""
    return DashboardAnalyticsService()


def get_channel_service() -> ChannelService:
    """Channel read service (Stage 21 Phase 3A; overridable in tests)."""
    return ChannelService()


def get_post_service() -> PostService:
    """Post review service (Stage 21 Phase 3A; overridable in tests)."""
    return PostService()
