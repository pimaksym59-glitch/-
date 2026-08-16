"""Offline tests for the dashboard analytics/cost service (Stage 21 Phase 2A).

The availability policy (§R7.3/§R10.3) and the input contract are provable without a database.
The aggregation itself needs real rows and lives in the integration tests.
"""

from __future__ import annotations

import pytest

from app.core.errors import BadRequest
from app.schemas.analytics import available_metric, gated_metric
from app.services.dashboard import DashboardAnalyticsService


def test_gated_metric_is_null_never_zero() -> None:
    """§R10.3: an unmeasurable metric must not be rendered as a real zero."""
    metric = gated_metric()
    assert metric.value is None
    assert metric.availability == "gated"


def test_available_metric_carries_the_value() -> None:
    metric = available_metric(4.82)
    assert metric.value == 4.82
    assert metric.availability == "available"


def test_gated_metric_returns_independent_instances() -> None:
    """Two gated fields in one response must not share one mutable object."""
    assert gated_metric() is not gated_metric()


@pytest.mark.parametrize("role", ["owner", "admin", "editor", "analyst", "viewer"])
async def test_every_role_may_read_cost_and_is_stopped_only_by_validation(role: str) -> None:
    """`analytics.read` is granted to all five roles (API_SPEC matrix). Reaching the `group_by`
    validation — rather than a `Forbidden` — proves authorization passed for each of them, and the
    rejection happens before any database access."""
    with pytest.raises(BadRequest):
        await DashboardAnalyticsService().cost("user-1", role, group_by="provider")


@pytest.mark.parametrize("group_by", ["channel", "model", "provider", "", "hour"])
async def test_unsupported_groupings_are_rejected_explicitly(group_by: str) -> None:
    with pytest.raises(BadRequest) as exc_info:
        await DashboardAnalyticsService().cost("user-1", "owner", group_by=group_by)
    assert "day" in str(exc_info.value)


async def test_bad_channel_id_is_rejected_before_any_database_access() -> None:
    with pytest.raises(BadRequest):
        await DashboardAnalyticsService().channel_snapshot("user-1", "owner", "not-a-uuid")
