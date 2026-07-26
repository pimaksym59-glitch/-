"""Admin component tests (§R10): rbac, authentication, authorization, sessions, csrf, pagination,
filtering, search, mapping, feature flags, dashboards, ai_studio, seams. Offline/deterministic."""

from __future__ import annotations

import pytest

from app.admin.ai_studio import AiStudioService
from app.admin.analytics_view import AnalyticsDashboard
from app.admin.audit import AdminAuditRecorder
from app.admin.authentication import Account, Credentials, PasswordAuthenticator
from app.admin.authorization import RbacAuthorization
from app.admin.channels import ChannelService
from app.admin.configuration import ConfigService
from app.admin.csrf import DoubleSubmitCsrf, SynchronizerTokenCsrf
from app.admin.dto import (
    ChannelRecord,
    ErrorRecord,
    JobRecord,
    MetricEntry,
    ProbeView,
    ProviderRecord,
    UserRecord,
)
from app.admin.error_reporting import ErrorReportService
from app.admin.exceptions import NotFoundInAdmin, PermissionDenied
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
from app.admin.feature_flags import FeatureFlag, FeatureFlagService, PercentageRollout
from app.admin.filtering import Filter, FilterOp, FilterSet, apply_filters
from app.admin.health_dashboard import HealthDashboard
from app.admin.jobs import JobMonitorService
from app.admin.metrics_dashboard import MetricsDashboard
from app.admin.pagination import PageRequest, paginate
from app.admin.prompts import PromptService
from app.admin.providers import ProviderService
from app.admin.rbac import Permission, Role, has_permission
from app.admin.seams import HtmxUiRenderer, OidcSsoProvider
from app.admin.search import SearchQuery, SubstringSearch, TokenSearch, search
from app.admin.sessions import SessionManager
from app.admin.types import ANONYMOUS, AdminActor, WriteOnly
from app.admin.users import UserService

# --- helpers -------------------------------------------------------------------------------------


def _actor(role: Role) -> AdminActor:
    return AdminActor(id=f"u-{role}", role=role, is_authenticated=True)


OWNER = _actor(Role.owner)
EDITOR = _actor(Role.editor)
VIEWER = _actor(Role.viewer)
ANALYST = _actor(Role.analyst)


# --- rbac (reqs 5, 6) ----------------------------------------------------------------------------


def test_rbac_matrix_matches_api_spec() -> None:
    assert has_permission(Role.owner, Permission.USERS_MANAGE)
    assert not has_permission(Role.admin, Permission.USERS_MANAGE)  # owner only
    assert has_permission(Role.editor, Permission.CONTENT_WRITE)
    assert not has_permission(Role.analyst, Permission.CONTENT_WRITE)
    assert has_permission(Role.viewer, Permission.ANALYTICS_READ)  # read for all
    assert has_permission(Role.analyst, Permission.AUDIT_READ)
    assert not has_permission(Role.editor, Permission.AUDIT_READ)
    assert not has_permission(Role.viewer, Permission.CHANNELS_WRITE)


# --- authentication (req 4) ----------------------------------------------------------------------


def _accounts() -> FakeAccountLookup:
    lookup = FakeAccountLookup()
    lookup.add(
        "owner@example.com",
        Account(id="u-1", role=Role.owner, password_hash="h:pw"),
    )
    lookup.add(
        "mfa@example.com",
        Account(id="u-2", role=Role.admin, password_hash="h:pw", mfa_secret_ref="ref"),
    )
    return lookup


def test_authentication_success_and_failure() -> None:
    auth = PasswordAuthenticator(_accounts(), FakePasswordHasher(), FakeMfaVerifier())
    ok = auth.authenticate(Credentials(email="owner@example.com", secret=WriteOnly("pw")))
    assert ok.authenticated and ok.actor is not None and ok.actor.role is Role.owner
    bad = auth.authenticate(Credentials(email="owner@example.com", secret=WriteOnly("wrong")))
    assert not bad.authenticated
    unknown = auth.authenticate(Credentials(email="nobody@example.com", secret=WriteOnly("pw")))
    assert not unknown.authenticated


def test_authentication_mfa_required_and_verified() -> None:
    auth = PasswordAuthenticator(_accounts(), FakePasswordHasher(), FakeMfaVerifier())
    no_otp = auth.authenticate(Credentials(email="mfa@example.com", secret=WriteOnly("pw")))
    assert not no_otp.authenticated and no_otp.detail == "mfa required"
    good = auth.authenticate(
        Credentials(email="mfa@example.com", secret=WriteOnly("pw"), otp="123456")
    )
    assert good.authenticated
    bad = auth.authenticate(
        Credentials(email="mfa@example.com", secret=WriteOnly("pw"), otp="000000")
    )
    assert not bad.authenticated and bad.detail == "bad otp"


# --- authorization (req 5) -----------------------------------------------------------------------


def test_authorization_allow_deny_and_require() -> None:
    authz = RbacAuthorization()
    assert authz.check(OWNER, Permission.USERS_MANAGE).allowed
    denied = authz.check(EDITOR, Permission.USERS_MANAGE)
    assert not denied.allowed and denied.reason == "role lacks permission"
    assert not authz.check(ANONYMOUS, Permission.ANALYTICS_READ).allowed
    with pytest.raises(PermissionDenied):
        authz.require(EDITOR, Permission.USERS_MANAGE)


# --- sessions (reqs 6, 7) ------------------------------------------------------------------------


def test_session_lifecycle_and_expiry() -> None:
    store = FakeSessionStore()
    manager = SessionManager(
        store, FakeClock(step_seconds=10.0), FakeTokenFactory(), ttl_seconds=15.0
    )
    session = manager.create("u-1", Role.owner)
    assert manager.validate(session.token) is not None  # still valid within ttl
    # advance the clock past expiry via repeated now() calls inside validate
    assert manager.validate(session.token) is None  # expired -> deleted
    assert manager.validate(session.token) is None


def test_session_revoke_all() -> None:
    store = FakeSessionStore()
    manager = SessionManager(store, FakeClock(), FakeTokenFactory())
    manager.create("u-1", Role.owner)
    manager.create("u-1", Role.owner)
    manager.create("u-2", Role.admin)
    assert manager.revoke_all("u-1") == 2


# --- csrf (req 8) --------------------------------------------------------------------------------


@pytest.mark.parametrize("strategy_cls", [DoubleSubmitCsrf, SynchronizerTokenCsrf])
def test_csrf_issue_validate(strategy_cls: type) -> None:
    strategy = strategy_cls(FakeTokenFactory())
    token = strategy.issue()
    assert strategy.validate(token, token.value)
    assert not strategy.validate(token, "wrong")
    assert not strategy.validate(token, "")


# --- pagination / filtering / search (req 15) ----------------------------------------------------


def test_pagination_slices_and_validates() -> None:
    page = paginate(list(range(10)), PageRequest(limit=3, offset=2))
    assert page.items == (2, 3, 4) and page.total == 10
    with pytest.raises(ValueError, match="limit"):
        PageRequest(limit=0)
    with pytest.raises(ValueError, match="offset"):
        PageRequest(offset=-1)


def test_filtering_operators() -> None:
    items = [
        ChannelRecord(id="1", title="Alpha", status="active"),
        ChannelRecord(id="2", title="Beta", status="paused"),
    ]
    active = apply_filters(items, FilterSet((Filter("status", FilterOp.EQ, "active"),)))
    assert [c.id for c in active] == ["1"]
    contains = apply_filters(items, FilterSet((Filter("title", FilterOp.CONTAINS, "et"),)))
    assert [c.id for c in contains] == ["2"]
    in_set = apply_filters(items, FilterSet((Filter("id", FilterOp.IN, ("2",)),)))
    assert [c.id for c in in_set] == ["2"]


def test_search_strategies() -> None:
    items = [
        ChannelRecord(id="1", title="Daily News", status="active"),
        ChannelRecord(id="2", title="Weekly Recap", status="active"),
    ]
    q = SearchQuery(text="news", fields=("title",))
    assert [c.id for c in search(items, q, SubstringSearch())] == ["1"]
    q2 = SearchQuery(text="weekly recap", fields=("title",))
    assert [c.id for c in search(items, q2, TokenSearch())] == ["2"]


# --- management services (reqs 8, 11) ------------------------------------------------------------


def test_user_service_masks_secrets_and_gates_rbac() -> None:
    service = UserService(FakeUserStore(), FakePasswordHasher(), RbacAuthorization())
    view = service.create_user(
        OWNER, user_id="u-9", email="a@b.co", role=Role.editor, secret=WriteOnly("pw")
    )
    assert not hasattr(view, "password_hash")  # secret never in the view (§R10.4)
    assert view.mfa_enabled is False
    with pytest.raises(PermissionDenied):
        service.create_user(
            EDITOR, user_id="x", email="x@y.z", role=Role.viewer, secret=WriteOnly("pw")
        )


def test_user_service_update_and_deactivate() -> None:
    store = FakeUserStore([UserRecord(id="u-1", email="a@b.co", role=Role.viewer, status="active")])
    service = UserService(store, FakePasswordHasher(), RbacAuthorization())
    assert service.update_role(OWNER, "u-1", Role.admin).role is Role.admin
    assert service.deactivate(OWNER, "u-1").status == "disabled"
    with pytest.raises(NotFoundInAdmin):
        service.update_role(OWNER, "missing", Role.admin)


def test_channel_service_rename_masks_token() -> None:
    store = FakeChannelStore(
        [ChannelRecord(id="c-1", title="Old", status="active", bot_token_ref="secret")]
    )
    service = ChannelService(store, RbacAuthorization())
    view = service.rename(OWNER, "c-1", "New")
    assert view.title == "New" and not hasattr(view, "bot_token_ref")
    with pytest.raises(PermissionDenied):
        service.rename(VIEWER, "c-1", "Nope")


def test_prompt_service_versioning() -> None:
    service = PromptService(FakePromptStore(), RbacAuthorization())
    v1 = service.add_version(OWNER, "greeting", "hello")
    v2 = service.add_version(OWNER, "greeting", "hi there")
    assert (v1.version, v2.version) == (1, 2)
    history = service.history(OWNER, "greeting")
    assert [p.version for p in history] == [2, 1]
    assert service.active(OWNER, "greeting").version == 2


def test_provider_service_masks_api_key() -> None:
    store = FakeProviderRegistry(
        [
            ProviderRecord(
                name="openai",
                kind="llm",
                capabilities=("chat",),
                healthy=True,
                api_key_ref="secret",
            )
        ]
    )
    service = ProviderService(store, RbacAuthorization())
    views = service.list_providers(OWNER)
    assert views[0].name == "openai" and not hasattr(views[0], "api_key_ref")
    with pytest.raises(PermissionDenied):
        service.list_providers(VIEWER)


def test_config_service_masks_secret_and_versions() -> None:
    service = ConfigService(FakeConfigStore(), RbacAuthorization(), FakeClock())
    service.set_value(OWNER, "api.key", "supersecret", secret=True)
    service.set_value(OWNER, "site.title", "Panel")
    views = {c.key: c.value for c in service.list_config(OWNER)}
    assert views["api.key"] == "***"  # secret masked (§R10.4)
    assert views["site.title"] == "Panel"
    assert len(service.history(OWNER)) == 2  # version snapshots (§R10.8)


# --- feature flags (req 9) -----------------------------------------------------------------------


def test_feature_flags_toggle_and_evaluate() -> None:
    store = FakeFeatureFlagStore([FeatureFlag(name="beta", enabled=False)])
    service = FeatureFlagService(store, RbacAuthorization())
    assert service.is_enabled("beta") is False
    assert service.is_enabled("unknown") is False
    service.set_enabled(OWNER, "beta", enabled=True)
    assert service.is_enabled("beta") is True
    with pytest.raises(PermissionDenied):
        service.set_enabled(VIEWER, "beta", enabled=False)


def test_rollout_seam_unimplemented() -> None:
    with pytest.raises(NotImplementedError, match="RV-17"):
        PercentageRollout().should_enable(FeatureFlag(name="x", enabled=True), "subject")


# --- dashboards (reqs 10, 12, 13, 15) ------------------------------------------------------------


def test_health_dashboard_shapes_only() -> None:
    dash = HealthDashboard(
        FakeHealthRead([ProbeView("db", healthy=True), ProbeView("redis", healthy=False)])
    )
    view = dash.view()
    assert view.healthy is False and len(view.probes) == 2


def test_metrics_dashboard_sorted() -> None:
    dash = MetricsDashboard(FakeMetricsRead(counters=[("b", 2), ("a", 1)], timers=[("t", 0.5)]))
    view = dash.view()
    assert view.counters == (("a", 1), ("b", 2))


def test_analytics_dashboard_flags_gated() -> None:
    dash = AnalyticsDashboard(
        FakeAnalyticsRead([MetricEntry("cost", 1.0, True), MetricEntry("views", None, False)])
    )
    full = dash.view()
    assert len(full.entries) == 2
    available_only = dash.view(include_unavailable=False)
    assert [e.name for e in available_only.entries] == ["cost"]


def test_job_monitor_list_and_requeue() -> None:
    monitor = JobMonitorService(
        FakeJobMonitor([JobRecord(id="j-1", kind="publish", status="failed", attempts=5)]),
        FakeQueue(),
        RbacAuthorization(),
    )
    page = monitor.list_jobs(OWNER)
    assert page.items[0].id == "j-1"
    intent = monitor.requeue(OWNER, "j-1")
    assert intent.kind == "requeue" and intent.payload["job_id"] == "j-1"
    with pytest.raises(PermissionDenied):
        monitor.requeue(EDITOR, "j-1")


def test_error_reporting_read_only_gated() -> None:
    service = ErrorReportService(
        FakeErrorReport(
            [ErrorRecord(id="e-1", module="m", severity="error", resolved=False, message="boom")]
        ),
        RbacAuthorization(),
    )
    page = service.list_errors(OWNER)
    assert page.items[0].id == "e-1"
    with pytest.raises(PermissionDenied):
        service.list_errors(VIEWER)


# --- ai studio (§R10.9) --------------------------------------------------------------------------


def test_ai_studio_isolated_dry_run() -> None:
    studio = AiStudioService(FakeDryRun(), RbacAuthorization())
    result = studio.dry_run(EDITOR, "write a post", "claude-opus-4-8")
    assert result.model == "claude-opus-4-8" and result.estimated_cost_usd >= 0
    compared = studio.compare(OWNER, "hi", ["a", "b"])
    assert [r.model for r in compared] == ["a", "b"]
    with pytest.raises(PermissionDenied):
        studio.dry_run(VIEWER, "x", "m")


def test_ai_studio_has_no_write_or_publish_ports() -> None:
    # §R10.9 isolation: the service exposes only dry-run; no memory-write / publish surface.
    assert not hasattr(AiStudioService, "publish")
    assert not hasattr(AiStudioService, "write_memory")


# --- audit recorder (req 13) ---------------------------------------------------------------------


def test_audit_recorder_forwards_to_port() -> None:
    port = FakeAuditPort()
    recorder = AdminAuditRecorder(port, FakeClock())
    recorder.record(OWNER, "delete_user", entity="user", entity_id="u-1")
    assert port.records == [("u-owner", "delete_user", "user")]


# --- seams (reqs 17, 18) -------------------------------------------------------------------------


def test_web_ui_and_sso_seams_unimplemented() -> None:
    with pytest.raises(NotImplementedError, match="RV-17"):
        HtmxUiRenderer().render("dashboard", {})
    with pytest.raises(NotImplementedError, match="RV-17"):
        OidcSsoProvider().begin("https://cb")
