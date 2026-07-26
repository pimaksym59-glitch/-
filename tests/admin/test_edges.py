"""Admin edge-case coverage (§R10): remaining branches — hooks, masking, journals, seams."""

from __future__ import annotations

from collections.abc import MutableMapping
from typing import cast

import pytest

from app.admin.authorization import RbacAuthorization
from app.admin.channels import ChannelService
from app.admin.dto import ChannelRecord, ErrorRecord, PromptRecord
from app.admin.error_reporting import ErrorReportService
from app.admin.exceptions import NotFoundInAdmin
from app.admin.fakes import (
    FakeChannelStore,
    FakeClock,
    FakeErrorReport,
    FakeFeatureFlagStore,
    FakePromptStore,
    FakeSessionStore,
    FakeTokenFactory,
)
from app.admin.feature_flags import FeatureFlag, FeatureFlagService
from app.admin.filtering import Filter, FilterOp, FilterSet, apply_filters
from app.admin.observability import NoOpLogger, NoOpMetrics
from app.admin.prompts import PromptService
from app.admin.rbac import Role
from app.admin.seams import ExternalMfaProvider, OidcSsoProvider
from app.admin.search import SearchQuery, SubstringSearch, TokenSearch, search
from app.admin.sessions import SessionManager, journal_login, recent_attempts
from app.admin.types import ANONYMOUS, AdminActor, TaskIntent, WriteOnly

OWNER = AdminActor(id="u-1", role=Role.owner, is_authenticated=True)


def test_observability_hooks_are_noops() -> None:
    NoOpMetrics().incr("admin.action")
    NoOpLogger().event("admin.action", actor="u-1")


def test_write_only_masks_repr_and_str() -> None:
    secret = WriteOnly("password")
    assert "password" not in repr(secret)
    assert str(secret) == "***"
    assert secret.reveal() == "password"


def test_task_intent_payload_is_readonly() -> None:
    intent = TaskIntent(kind="publish", payload={"post_id": "p-1"})
    assert intent.payload["post_id"] == "p-1"
    with pytest.raises(TypeError):
        cast(MutableMapping[str, str], intent.payload)["x"] = "y"  # read-only proxy


def test_anonymous_actor_not_authenticated() -> None:
    assert not ANONYMOUS.is_authenticated and ANONYMOUS.role is None


def test_channel_list_and_rename_not_found() -> None:
    store = FakeChannelStore([ChannelRecord(id="c-1", title="A", status="active")])
    service = ChannelService(store, RbacAuthorization())
    assert service.list_channels(OWNER).total == 1
    with pytest.raises(NotFoundInAdmin):
        service.rename(OWNER, "missing", "X")


def test_error_reporting_with_filter() -> None:
    records = [
        ErrorRecord(id="e-1", module="a", severity="error", resolved=False, message="x"),
        ErrorRecord(id="e-2", module="b", severity="warning", resolved=True, message="y"),
    ]
    service = ErrorReportService(FakeErrorReport(records), RbacAuthorization())
    page = service.list_errors(
        OWNER, filters=FilterSet((Filter("severity", FilterOp.EQ, "error"),))
    )
    assert [e.id for e in page.items] == ["e-1"]


def test_feature_flag_keeps_description_on_toggle() -> None:
    store = FakeFeatureFlagStore([FeatureFlag(name="beta", enabled=False, description="Beta mode")])
    service = FeatureFlagService(store, RbacAuthorization())
    assert [f.name for f in service.list_flags()] == ["beta"]
    updated = service.set_enabled(OWNER, "beta", enabled=True)
    assert updated.description == "Beta mode"


def test_filtering_ne_operator() -> None:
    items = [
        ChannelRecord(id="1", title="A", status="active"),
        ChannelRecord(id="2", title="B", status="paused"),
    ]
    result = apply_filters(items, FilterSet((Filter("status", FilterOp.NE, "active"),)))
    assert [c.id for c in result] == ["2"]


def test_prompt_active_not_found() -> None:
    store = FakePromptStore()
    store.add_version(PromptRecord(id="p:1", name="x", version=1, body="b", active=False))
    service = PromptService(store, RbacAuthorization())
    with pytest.raises(NotFoundInAdmin):
        service.active(OWNER, "x")


def test_search_empty_query_matches_all() -> None:
    items = [ChannelRecord(id="1", title="A", status="active")]
    empty = SearchQuery(text="", fields=("title",))
    assert len(search(items, empty, SubstringSearch())) == 1
    assert len(search(items, empty, TokenSearch())) == 1


def test_seam_complete_and_mfa_unimplemented() -> None:
    with pytest.raises(NotImplementedError, match="RV-17"):
        OidcSsoProvider().complete({})
    with pytest.raises(NotImplementedError, match="RV-17"):
        ExternalMfaProvider().verify("ref", "123456")


def test_session_missing_and_login_journal() -> None:
    manager = SessionManager(FakeSessionStore(), FakeClock(), FakeTokenFactory())
    assert manager.validate("nonexistent") is None
    manager.revoke("nonexistent")  # no error on missing

    class _Journal:
        def __init__(self) -> None:
            self.records: list[object] = []

        def record(self, attempt: object) -> None:
            self.records.append(attempt)

    journal = _Journal()
    clock = FakeClock()
    a1 = journal_login(journal, clock, "a@b.co", success=True)
    a2 = journal_login(journal, clock, "a@b.co", success=False)
    assert len(journal.records) == 2
    assert recent_attempts([a1, a2], 1)[0] is a2  # newest first
