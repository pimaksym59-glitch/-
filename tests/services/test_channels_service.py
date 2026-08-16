"""Offline tests for the channel/post read service (Stage 21 Phase 3A).

The pure mappers and the pre-I/O guards are provable without a database; the SQL is proven in the
integration tests.
"""

from __future__ import annotations

import datetime
import uuid

import pytest

from app.core.errors import BadRequest
from app.models.channel import Channel
from app.models.content import Post
from app.models.enums import ChannelStatus, PostStatus
from app.schemas.post import BODY_PREVIEW_LENGTH
from app.services.channels import ChannelService, channel_to_wire, post_to_wire

_NOW = datetime.datetime(2026, 8, 15, 12, 0, tzinfo=datetime.UTC)


def _channel(**overrides: object) -> Channel:
    channel = Channel(
        id=uuid.uuid4(),
        title="Tech Digest",
        username="techdigest",
        description="Daily engineering brief",
        language="en",
        timezone="UTC",
        llm_provider="fake",
        image_provider="fake",
        status=ChannelStatus.active,
    )
    for key, value in overrides.items():
        setattr(channel, key, value)
    return channel


def _post(**overrides: object) -> Post:
    post = Post(
        id=uuid.uuid4(),
        channel_id=uuid.uuid4(),
        status=PostStatus.needs_review,
        title="Quantum-safe TLS",
        body="x" * 500,
    )
    post.created_at = _NOW
    for key, value in overrides.items():
        setattr(post, key, value)
    return post


def test_channel_title_is_served_as_the_wire_name() -> None:
    """Owner decision D3 — the column is `title`, the contract field is `name`."""
    wire = channel_to_wire(_channel())
    assert wire.name == "Tech Digest"
    assert wire.status == "active"
    assert wire.description == "Daily engineering brief"


def test_untitled_channel_falls_back_to_its_username_then_its_id() -> None:
    """`title` is nullable but the wire field is not — a channel row must never render blank."""
    assert channel_to_wire(_channel(title=None)).name == "techdigest"
    idless = _channel(title=None, username=None)
    assert channel_to_wire(idless).name == str(idless.id)


def test_channel_secrets_never_reach_the_wire() -> None:
    """§R10.4/§R12.2 — the bot-token reference is write-only."""
    wire = channel_to_wire(_channel(bot_token_ref="secret-store://abc"))
    assert "bot_token_ref" not in wire.model_dump()
    assert "secret-store://abc" not in wire.model_dump_json()


def test_body_preview_is_the_first_160_characters() -> None:
    """Owner decision D6."""
    wire = post_to_wire(_post(body="y" * 500))
    assert wire.body_preview is not None
    assert len(wire.body_preview) == BODY_PREVIEW_LENGTH == 160
    assert wire.body_preview == "y" * 160


def test_short_body_is_not_padded_and_carries_no_ellipsis() -> None:
    assert post_to_wire(_post(body="short")).body_preview == "short"


def test_missing_body_becomes_null_not_an_empty_string() -> None:
    assert post_to_wire(_post(body=None)).body_preview is None


def test_post_maps_the_contract_fields() -> None:
    channel_id = uuid.uuid4()
    wire = post_to_wire(_post(channel_id=channel_id, status=PostStatus.needs_review))
    assert wire.channel_id == str(channel_id)
    assert wire.status == "needs_review"
    assert wire.title == "Quantum-safe TLS"
    assert wire.created_at == _NOW


def test_full_body_is_never_shipped_in_the_list_dto() -> None:
    assert "body" not in post_to_wire(_post()).model_dump()


@pytest.mark.parametrize("role", ["owner", "admin", "editor", "analyst", "viewer"])
async def test_every_role_may_read_channels_and_is_stopped_only_by_validation(role: str) -> None:
    """`channels.read` is granted to all five roles; reaching UUID validation rather than a
    `Forbidden` proves authorization passed before any database access."""
    with pytest.raises(BadRequest):
        await ChannelService().list_posts("user-1", role, "not-a-uuid")


async def test_unknown_post_status_filter_is_rejected() -> None:
    with pytest.raises(BadRequest):
        await ChannelService().list_posts("user-1", "owner", str(uuid.uuid4()), status="nonsense")
