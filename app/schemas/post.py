"""Post DTOs (API_SPEC §"Content / Posts") — Stage 21 Phase 3A.

`body_preview` is a derived field: the first 160 characters of `posts.body` (owner decision D6).
The full body is deliberately NOT part of the list DTO — the console's needs-review queue renders a
preview, and shipping whole post bodies in a list response would be payload for nobody.

`TaskIntentResponse` is the body of every queue intent (§R10.1): the console is told what was
enqueued, never that the work is done.
"""

from __future__ import annotations

import datetime

from app.schemas.base import Schema

#: Owner decision D6 — the preview length the console renders.
BODY_PREVIEW_LENGTH = 160


class PostResponse(Schema):
    """One post as the console consumes it."""

    id: str
    channel_id: str
    status: str
    title: str | None = None
    body_preview: str | None = None
    created_at: datetime.datetime


class TaskIntentResponse(Schema):
    """`202 Accepted` body for a queued mutation (§R10.1)."""

    task_id: str
