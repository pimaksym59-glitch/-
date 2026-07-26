"""Admin API facade (owner reqs 2, 8) — a UI-agnostic *delegation* surface with no business logic.

This is deliberately a thin aggregator: it holds the independent services/components and
exposes them, but implements **no** business rules of its own (owner req 8 — no god-object). It
has no HTTP dependency (owner req 2); a Web UI binds to these services via the seams in
:mod:`app.admin.seams` (RV-17).

"""

from __future__ import annotations

from dataclasses import dataclass

from app.admin.ai_studio import AiStudioService
from app.admin.analytics_view import AnalyticsDashboard
from app.admin.audit import AdminAuditRecorder
from app.admin.authentication import Authenticator
from app.admin.authorization import RbacAuthorization
from app.admin.channels import ChannelService
from app.admin.configuration import ConfigService
from app.admin.csrf import CsrfStrategy
from app.admin.error_reporting import ErrorReportService
from app.admin.feature_flags import FeatureFlagService
from app.admin.health_dashboard import HealthDashboard
from app.admin.jobs import JobMonitorService
from app.admin.metrics_dashboard import MetricsDashboard
from app.admin.prompts import PromptService
from app.admin.providers import ProviderService
from app.admin.sessions import SessionManager
from app.admin.users import UserService


@dataclass(frozen=True, slots=True)
class AdminApi:
    """UI-agnostic aggregation of the independent admin services (delegation only, no business
    logic)."""

    authenticator: Authenticator
    authorization: RbacAuthorization
    sessions: SessionManager
    csrf: CsrfStrategy
    audit: AdminAuditRecorder
    users: UserService
    channels: ChannelService
    prompts: PromptService
    providers: ProviderService
    configuration: ConfigService
    feature_flags: FeatureFlagService
    jobs: JobMonitorService
    health: HealthDashboard
    metrics: MetricsDashboard
    analytics: AnalyticsDashboard
    errors: ErrorReportService
    ai_studio: AiStudioService
