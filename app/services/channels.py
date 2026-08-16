"""Channel and channel-scoped post read use-cases (§R3.1) — Stage 21 Phase 3A.

RBAC (`channels.read`, every role per the API_SPEC matrix) is enforced here, not in the route, and
the service owns its own DB session for the same reason `AuthService` does — the api layer may not
import `app.db`/`sqlalchemy` (`tests/test_layering.py`).

§R2.6 tenant scoping is structural here: post listing always goes through
`PostRepository.list_by_channel`, which cannot produce a cross-channel mix, and an unknown channel
is a 404 before any post query runs.
"""

from __future__ import annotations

import uuid

from app.admin.authorization import RbacAuthorization
from app.admin.rbac import Permission, Role
from app.admin.types import AdminActor
from app.core.errors import BadRequest, Forbidden, NotFound
from app.db.session import get_sessionmaker
from app.models.channel import Channel
from app.models.content import Post
from app.models.enums import PostStatus
from app.repositories.channel_repository import ChannelRepository
from app.repositories.post_repository import PostRepository
from app.schemas.channel import ChannelResponse
from app.schemas.post import BODY_PREVIEW_LENGTH, PostResponse


def channel_to_wire(channel: Channel) -> ChannelResponse:
    """Map one ORM channel onto the wire shape.

    `name` comes from `title` (D3). `title` is nullable in the schema while the wire field is not,
    so an untitled channel falls back to its @username and finally to its id — an identifier the
    operator can still act on, never a blank row.
    """
    return ChannelResponse(
        id=str(channel.id),
        name=channel.title or channel.username or str(channel.id),
        status=channel.status.value,
        description=channel.description,
    )


def post_to_wire(post: Post) -> PostResponse:
    """Map one ORM post onto the wire shape; `body_preview` is the first 160 characters (D6)."""
    return PostResponse(
        id=str(post.id),
        channel_id=str(post.channel_id),
        status=post.status.value,
        title=post.title,
        body_preview=post.body[:BODY_PREVIEW_LENGTH] if post.body else None,
        created_at=post.created_at,
    )


def parse_channel_id(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError:
        raise BadRequest("channel_id is not a valid UUID") from None


def _parse_post_status(value: str) -> PostStatus:
    try:
        return PostStatus(value)
    except ValueError:
        raise BadRequest(f"unknown post status: {value}") from None


class ChannelService:
    """`GET /channels` and `GET /channels/{id}/posts` — the console's channel reads."""

    def __init__(self, authz: RbacAuthorization | None = None) -> None:
        self._authz = authz if authz is not None else RbacAuthorization()

    def _authorize(self, actor_id: str, actor_role: str) -> None:
        actor = AdminActor(id=actor_id, role=Role(actor_role), is_authenticated=True)
        decision = self._authz.check(actor, Permission.CHANNELS_READ)
        if not decision.allowed:
            raise Forbidden(decision.reason)

    async def list_channels(
        self, actor_id: str, actor_role: str, *, limit: int = 100, offset: int = 0
    ) -> list[ChannelResponse]:
        """Active channels only — soft-deleted ones never reach the console (§R4.4)."""

        self._authorize(actor_id, actor_role)
        async with get_sessionmaker()() as session:
            channels = await ChannelRepository(session).list_active(limit=limit, offset=offset)
            return [channel_to_wire(channel) for channel in channels]

    async def list_posts(
        self,
        actor_id: str,
        actor_role: str,
        channel_id: str,
        *,
        status: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[PostResponse]:
        """Posts of one channel. An unknown or soft-deleted channel is a 404, not an empty list —
        an empty list would read as "a real channel with no posts"."""

        self._authorize(actor_id, actor_role)
        parsed_channel = parse_channel_id(channel_id)
        parsed_status = _parse_post_status(status) if status else None

        async with get_sessionmaker()() as session:
            channel = await ChannelRepository(session).get(parsed_channel)
            if channel is None or channel.deleted_at is not None:
                raise NotFound("channel not found")
            posts = await PostRepository(session).list_by_channel(
                parsed_channel, status=parsed_status, limit=limit, offset=offset
            )
            return [post_to_wire(post) for post in posts]
