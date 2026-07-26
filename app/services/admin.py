"""Composition root for the Admin subsystem (integrations live only here).

The domain (:mod:`app.admin`) is independent and imports no other subsystem. This module is the
single place allowed to wire it: it builds an offline :class:`~app.admin.service.AdminApi` on
deterministic fakes, and provides adapters that bind admin ports to the **public** interfaces
of Analytics (audit/metrics) — so "use Analytics/Audit only through public Protocol" (owner
reqs 12, 13) holds at the boundary while the domain stays independent (owner req 1). Real
stores/queue/Workers/Providers/Health backends are RV-17.

"""

from __future__ import annotations

from collections.abc import Mapping, Sequence

from app.admin.ai_studio import AiStudioService
from app.admin.analytics_view import AnalyticsDashboard
from app.admin.audit import AdminAuditRecorder, AuditValue
from app.admin.authentication import PasswordAuthenticator
from app.admin.authorization import RbacAuthorization
from app.admin.channels import ChannelService
from app.admin.configuration import ConfigService
from app.admin.csrf import DoubleSubmitCsrf
from app.admin.error_reporting import ErrorReportService
from app.admin.fakes import (
    FakeAccountLookup,
    FakeAnalyticsRead,
    FakeAuditPort,
    FakeChannelStore,
    FakeClock,
    FakeConfigStore,
    FakeDryRun,
    FakeErrorReport,
    FakeFeatureFlagStore,
    FakeHealthRead,
    FakeJobMonitor,
    FakeMetricsRead,
    FakeMfaVerifier,
    FakePasswordHasher,
    FakePromptStore,
    FakeProviderRegistry,
    FakeQueue,
    FakeSessionStore,
    FakeTokenFactory,
    FakeUserStore,
)
from app.admin.feature_flags import FeatureFlagService
from app.admin.health_dashboard import HealthDashboard
from app.admin.jobs import JobMonitorService
from app.admin.metrics_dashboard import MetricsDashboard
from app.admin.prompts import PromptService
from app.admin.providers import ProviderService
from app.admin.service import AdminApi
from app.admin.sessions import SessionManager
from app.admin.users import UserService
from app.analytics.audit import AuditEvent
from app.analytics.audit_pipeline import AuditPipeline
from app.analytics.metrics import MetricsSnapshot
from app.analytics.ports import Clock as AnalyticsClock


class AnalyticsAuditAdapter:
    """Adapts the admin ``AuditPort`` to the **public** Analytics audit pipeline (owner req 13)."""

    def __init__(self, pipeline: AuditPipeline, clock: AnalyticsClock) -> None:
        self._pipeline = pipeline
        self._clock = clock

    def record(
        self,
        actor: str,
        action: str,
        entity: str | None,
        entity_id: str | None,
        before: Mapping[str, AuditValue],
        after: Mapping[str, AuditValue],
    ) -> None:
        self._pipeline.submit(
            AuditEvent(
                actor=actor,
                action=action,
                occurred_at=self._clock.now(),
                entity=entity,
                entity_id=entity_id,
                before=dict(before),
                after=dict(after),
            )
        )


class AnalyticsMetricsAdapter:
    """Adapts the admin ``MetricsReadPort`` to a **public** Analytics ``MetricsSnapshot`` (owner
    req 15)."""

    def __init__(self, snapshot: MetricsSnapshot) -> None:
        self._snapshot = snapshot

    def counters(self) -> Sequence[tuple[str, int]]:
        return tuple((c.name, c.value) for c in self._snapshot.counters)

    def timers(self) -> Sequence[tuple[str, float]]:
        return tuple((t.name, t.total_seconds) for t in self._snapshot.timers)


def build_admin_api() -> AdminApi:
    """Assemble a complete offline :class:`AdminApi` on deterministic fakes (owner reqs 19, 20)."""

    clock = FakeClock()
    tokens = FakeTokenFactory()
    authz = RbacAuthorization()
    hasher = FakePasswordHasher()
    return AdminApi(
        authenticator=PasswordAuthenticator(FakeAccountLookup(), hasher, FakeMfaVerifier()),
        authorization=authz,
        sessions=SessionManager(FakeSessionStore(), clock, tokens),
        csrf=DoubleSubmitCsrf(tokens),
        audit=AdminAuditRecorder(FakeAuditPort(), clock),
        users=UserService(FakeUserStore(), hasher, authz),
        channels=ChannelService(FakeChannelStore(), authz),
        prompts=PromptService(FakePromptStore(), authz),
        providers=ProviderService(FakeProviderRegistry(), authz),
        configuration=ConfigService(FakeConfigStore(), authz, clock),
        feature_flags=FeatureFlagService(FakeFeatureFlagStore(), authz),
        jobs=JobMonitorService(FakeJobMonitor(), FakeQueue(), authz),
        health=HealthDashboard(FakeHealthRead()),
        metrics=MetricsDashboard(FakeMetricsRead()),
        analytics=AnalyticsDashboard(FakeAnalyticsRead()),
        errors=ErrorReportService(FakeErrorReport(), authz),
        ai_studio=AiStudioService(FakeDryRun(), authz),
    )
