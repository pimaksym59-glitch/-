"""Schedule data-access (§R3.1, §R8). Read-only queries; no business logic, no commit — the caller
owns the transaction. The scheduler maps these rows to pure views before computing slots.
"""

from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy import Row, select

from app.models.channel import Channel
from app.models.content import Schedule
from app.repositories.base import EntityRepository


class ScheduleRepository(EntityRepository[Schedule]):
    model = Schedule

    async def list_enabled_with_channel(self) -> Sequence[Row[tuple[Schedule, Channel]]]:
        """Enabled, non-deleted schedules joined to their channel (for timezone + status).

        Channel-status filtering (paused/archived) is left to the scheduler (§R8.14) so the skip
        policy stays in one place and remains unit-testable on plain views.
        """
        stmt = (
            select(Schedule, Channel)
            .join(Channel, Schedule.channel_id == Channel.id)
            .where(
                Schedule.enabled.is_(True),
                Schedule.deleted_at.is_(None),
                Channel.deleted_at.is_(None),
            )
        )
        result = await self.session.execute(stmt)
        return result.all()
