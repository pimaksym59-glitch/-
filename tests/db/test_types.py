"""Unit tests for app.db.types (§R4.3 UUIDv7, §R4.6 dims). Offline."""

from __future__ import annotations

import uuid

from app.db.types import IMAGE_EMBEDDING_DIM, TEXT_EMBEDDING_DIM, uuid7_default


def test_uuid7_default_returns_version_7() -> None:
    value = uuid7_default()
    assert isinstance(value, uuid.UUID)
    assert value.version == 7


def test_uuid7_default_is_unique_and_time_ordered() -> None:
    first = uuid7_default()
    second = uuid7_default()
    assert first != second
    # UUIDv7 is time-ordered → later value sorts after the earlier one.
    assert second >= first


def test_platform_embedding_dims() -> None:
    assert TEXT_EMBEDDING_DIM == 1536  # §R4.6 text embeddings
    assert IMAGE_EMBEDDING_DIM == 512  # §R4.6 CLIP / face embeddings
