"""Admin composition tests (§R10): build_admin_api + Analytics adapters (public interfaces)."""

from __future__ import annotations

from app.admin.rbac import Permission, Role
from app.admin.types import AdminActor
from app.analytics.aggregation import MetricsAggregator
from app.analytics.audit_pipeline import AuditPipeline
from app.analytics.counters import Counter
from app.analytics.fakes import FakeAuditExporter, FakeAuditSink, FakeClock
from app.analytics.metrics import MetricRegistry
from app.services.admin import (
    AnalyticsAuditAdapter,
    AnalyticsMetricsAdapter,
    build_admin_api,
)


def test_build_admin_api_wires_independent_services() -> None:
    api = build_admin_api()
    owner = AdminActor(id="u-1", role=Role.owner, is_authenticated=True)
    # delegation facade exposes independent services; RBAC is enforced centrally in each service
    assert api.authorization.check(owner, Permission.USERS_MANAGE).allowed
    page = api.users.list_users(owner)
    assert page.total == 0  # empty fake store
    flag = api.feature_flags.set_enabled(owner, "beta", enabled=True)
    assert flag.enabled is True


def test_analytics_audit_adapter_uses_public_pipeline() -> None:
    sink = FakeAuditSink()
    pipeline = AuditPipeline(sink)
    exporter = FakeAuditExporter()
    pipeline.register(exporter)
    adapter = AnalyticsAuditAdapter(pipeline, FakeClock())
    adapter.record(
        actor="u-1", action="update", entity="channel", entity_id="c-1", before={}, after={"x": 1}
    )
    pipeline.flush()
    assert len(exporter.exported) == 1
    assert exporter.exported[0].action == "update"


def test_analytics_metrics_adapter_reads_public_snapshot() -> None:
    registry = MetricRegistry()
    counter = Counter("posts")
    counter.increment(3)
    registry.register(counter)
    snapshot = MetricsAggregator().collect(registry.all())
    adapter = AnalyticsMetricsAdapter(snapshot)
    assert adapter.counters() == (("posts", 3),)
    assert adapter.timers() == ()
