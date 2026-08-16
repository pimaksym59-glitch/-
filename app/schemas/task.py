"""Task DTOs (API_SPEC §"Scheduler & Tasks") — Stage 21 Phase 2A.

Wire vocabulary note (owner decision D2-A): the database keeps the §R4.11 vocabulary
(`pending`/`succeeded`), while the wire speaks the frozen console vocabulary
(`queued`/`completed`). The translation lives in `app.services.tasks` — this module only declares
the shape. Every other status crosses unchanged, so an unknown state is never coerced into a
wrong one.

`error` mirrors the model's `last_error` column (owner decision D4) — the column name is an
implementation detail, the wire name is the contract.
"""

from __future__ import annotations

import datetime

from app.schemas.base import Schema


class TaskResponse(Schema):
    """One queue task as the console consumes it."""

    id: str
    type: str
    status: str
    channel_id: str | None = None
    attempts: int
    run_at: datetime.datetime | None = None
    created_at: datetime.datetime
    error: str | None = None
