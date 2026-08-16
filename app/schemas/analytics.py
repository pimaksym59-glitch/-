"""Analytics & cost DTOs (API_SPEC §"Analytics & Cost") — Stage 21 Phase 2A.

§R7.3/§R10.3 are load-bearing here: a metric the platform cannot actually measure is returned as
`value: null` with `availability: "gated"` — never as a zero and never as an invented number. The
`availability` flag is part of the contract, not a UI concern.
"""

from __future__ import annotations

import datetime
from typing import Literal

from app.schemas.base import Schema

Availability = Literal["available", "gated"]


class MetricResponse(Schema):
    """A single metric value plus whether it is measurable at all (§R7.3)."""

    value: float | None
    availability: Availability


def gated_metric() -> MetricResponse:
    """A metric the platform cannot measure — the only honest representation (§R10.3)."""
    return MetricResponse(value=None, availability="gated")


def available_metric(value: float) -> MetricResponse:
    return MetricResponse(value=value, availability="available")


class AnalyticsSnapshotResponse(Schema):
    """Today's channel snapshot behind the console dashboard tiles."""

    channel_id: str
    date: datetime.date
    cost_today: MetricResponse
    published_today: MetricResponse
    views: MetricResponse
    reactions: MetricResponse


class CostEntryResponse(Schema):
    """One `GET /cost` bucket. For `group_by=day` the key is an ISO `YYYY-MM-DD` date."""

    key: str
    amount_usd: float
