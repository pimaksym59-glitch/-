"""Dashboard analytics & cost use-cases (§R3.1, §R10.3, §R11.8) — Stage 21 Phase 2A.

Two reads sit behind the console's dashboard tiles: today's per-channel snapshot and the spend
series. Neither exists as a stored row — both are derived here from `api_usage`/`image_usage`,
`posts` and `analytics_snapshots` through `AnalyticsRepository`.

§R7.3/§R10.3 decide what may be shown at all:
  * `cost_today` / `published_today` are measured from our own tables -> always `available`;
  * `reactions` has no defined source in the schema or the contract -> ALWAYS `gated`
    (owner decision D5: no formula is to be invented);
  * `views` is reported only when engagement rows were actually captured; with nothing measured it
    is `gated` rather than a fabricated `0` — the Bot API cannot supply it without the MTProto
    stats adapter (§R7.3, §Appendix C).

RBAC (`analytics.read`, every role per the API_SPEC matrix) is enforced here, not in the route.
"""

from __future__ import annotations

import datetime
import uuid

from app.admin.authorization import RbacAuthorization
from app.admin.rbac import Permission, Role
from app.admin.types import AdminActor
from app.core.errors import BadRequest, Forbidden, NotFound
from app.db.session import get_sessionmaker
from app.repositories.analytics_repository import AnalyticsRepository
from app.repositories.channel_repository import ChannelRepository
from app.schemas.analytics import (
    AnalyticsSnapshotResponse,
    CostEntryResponse,
    available_metric,
    gated_metric,
)

#: The only `group_by` this slice serves; see the module docstring in `routes/analytics.py`.
SUPPORTED_COST_GROUPINGS = ("day",)


class DashboardAnalyticsService:
    """`GET /analytics/channels/{id}` and `GET /cost` — the console dashboard's read side."""

    def __init__(self, authz: RbacAuthorization | None = None) -> None:
        self._authz = authz if authz is not None else RbacAuthorization()

    def _authorize(self, actor_id: str, actor_role: str) -> None:
        actor = AdminActor(id=actor_id, role=Role(actor_role), is_authenticated=True)
        decision = self._authz.check(actor, Permission.ANALYTICS_READ)
        if not decision.allowed:
            raise Forbidden(decision.reason)

    async def channel_snapshot(
        self, actor_id: str, actor_role: str, channel_id: str, *, today: datetime.date | None = None
    ) -> AnalyticsSnapshotResponse:
        """Today's snapshot for one channel. An unknown channel is a 404, never an empty snapshot
        (that would read as "a real channel with no activity")."""

        self._authorize(actor_id, actor_role)
        try:
            parsed = uuid.UUID(channel_id)
        except ValueError:
            raise BadRequest("channel_id is not a valid UUID") from None
        day = today if today is not None else datetime.datetime.now(datetime.UTC).date()

        async with get_sessionmaker()() as session:
            channel = await ChannelRepository(session).get(parsed)
            if channel is None or channel.deleted_at is not None:
                raise NotFound("channel not found")
            analytics = AnalyticsRepository(session)
            cost = await analytics.cost_total(channel_id=parsed, day=day)
            published = await analytics.published_count(channel_id=parsed, day=day)
            views = await analytics.views_total(channel_id=parsed, day=day)

        return AnalyticsSnapshotResponse(
            channel_id=str(parsed),
            date=day,
            cost_today=available_metric(float(cost)),
            published_today=available_metric(float(published)),
            views=available_metric(float(views)) if views is not None else gated_metric(),
            reactions=gated_metric(),
        )

    async def cost(
        self, actor_id: str, actor_role: str, *, group_by: str
    ) -> list[CostEntryResponse]:
        """Spend buckets. Platform-wide: the console asks for `?group_by=day` with no channel, and
        inventing a channel scope for it would be a contract decision, not an implementation one."""

        self._authorize(actor_id, actor_role)
        if group_by not in SUPPORTED_COST_GROUPINGS:
            raise BadRequest(
                f"unsupported group_by: {group_by} "
                f"(this build serves {', '.join(SUPPORTED_COST_GROUPINGS)})"
            )

        async with get_sessionmaker()() as session:
            buckets = await AnalyticsRepository(session).cost_by_day()
        return [CostEntryResponse(key=key, amount_usd=float(amount)) for key, amount in buckets]
