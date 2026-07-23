"""Offline metadata/mapper tests for the ORM models (§R4). No live database."""

from __future__ import annotations

import app.models as m
from app.db.types import IMAGE_EMBEDDING_DIM, TEXT_EMBEDDING_DIM

EXPECTED_TABLES: set[str] = {
    "channels",
    "channel_settings",
    "personas",
    "actors",
    "locations",
    "posts",
    "post_history",
    "topics",
    "cta",
    "prompts",
    "schedules",
    "images",
    "image_history",
    "tasks",
    "memory",
    "documents",
    "document_chunks",
    "analytics_snapshots",
    "api_usage",
    "image_usage",
    "errors",
    "logs",
    "users",
    "audit_log",
    "config_versions",
}


def test_all_tables_registered() -> None:
    assert set(m.Base.metadata.tables) == EXPECTED_TABLES
    assert len(EXPECTED_TABLES) == 25


def test_entity_has_base_columns() -> None:
    cols = m.Channel.__table__.c
    for name in ("id", "created_at", "updated_at", "deleted_at", "version"):
        assert name in cols


def test_record_has_no_soft_delete_or_version() -> None:
    cols = m.Memory.__table__.c  # Memory is a Record (insert-only)
    assert "id" in cols
    assert "created_at" in cols
    assert "deleted_at" not in cols
    assert "version" not in cols


def test_persona_is_not_actor() -> None:
    # §R4.7: channel carries no tone/writing_style, only default_persona_id.
    channel_cols = m.Channel.__table__.c
    assert "default_persona_id" in channel_cols
    assert "tone" not in channel_cols
    assert "writing_style" not in channel_cols
    # persona = textual voice; actor = visual identity (face embedding).
    assert "biography" in m.Persona.__table__.c
    assert "face_embedding" in m.Actor.__table__.c


def test_vector_dimensions_match_platform_constants() -> None:
    assert getattr(m.Memory.__table__.c.embedding.type, "dim", None) == TEXT_EMBEDDING_DIM
    assert getattr(m.DocumentChunk.__table__.c.embedding.type, "dim", None) == TEXT_EMBEDDING_DIM
    assert getattr(m.Image.__table__.c.embedding.type, "dim", None) == IMAGE_EMBEDDING_DIM
    assert getattr(m.Actor.__table__.c.face_embedding.type, "dim", None) == IMAGE_EMBEDDING_DIM


def test_uuid_primary_key_has_default() -> None:
    assert m.Channel.__table__.c.id.default is not None  # UUIDv7 callable default (§R4.3)


def test_tasks_queue_indexes() -> None:
    index_names = {index.name for index in m.Base.metadata.tables["tasks"].indexes}
    assert "ix_tasks_pending_dispatch" in index_names  # SKIP LOCKED dispatch (§R8.10)
    assert "uq_tasks_dedup_key" in index_names  # idempotency (§R7.4)
    assert "uq_tasks_channel_schedule_slot" in index_names  # slot idempotency (§R8.10)


def test_optimistic_lock_configured() -> None:
    assert m.Channel.__mapper__.version_id_col is not None  # §R4.2
