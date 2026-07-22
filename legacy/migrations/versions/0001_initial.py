"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-07-20

Creates the pgvector extension, the four native enum types, and all base tables.
Hand-written to match app.models (no live DB was available to autogenerate).
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

EMBEDDING_DIM = 1536

channelstatus = postgresql.ENUM("active", "paused", "disabled", name="channelstatus")
poststatus = postgresql.ENUM(
    "draft", "generating", "validated", "queued", "published", "failed", "rejected",
    name="poststatus",
)
taskstatus = postgresql.ENUM(
    "pending", "ready", "running", "succeeded", "failed", "cancelled", name="taskstatus"
)
tasktype = postgresql.ENUM(
    "generate_text", "generate_image", "validate", "publish", "collect_metrics",
    name="tasktype",
)


def _timestamps() -> tuple[sa.Column, sa.Column]:
    """Fresh created_at/updated_at columns (a Column can't be shared across tables)."""
    return (
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    bind = op.get_bind()
    for enum in (channelstatus, poststatus, taskstatus, tasktype):
        enum.create(bind, checkfirst=True)

    op.create_table(
        "personas",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("system_prompt", sa.Text(), nullable=False),
        sa.Column("tone", sa.String(100)),
        sa.Column("language", sa.String(20), server_default="ru", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        *_timestamps(),
    )

    op.create_table(
        "knowledge_bases",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        *_timestamps(),
    )

    op.create_table(
        "channels",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("telegram_chat_id", sa.String(100), nullable=False, unique=True),
        sa.Column("persona_id", sa.BigInteger(), sa.ForeignKey("personas.id", ondelete="SET NULL")),
        sa.Column(
            "status",
            postgresql.ENUM(name="channelstatus", create_type=False),
            server_default="active",
            nullable=False,
        ),
        sa.Column("settings", postgresql.JSONB(), server_default=sa.text("'{}'"), nullable=False),
        *_timestamps(),
    )

    op.create_table(
        "channel_knowledge_bases",
        sa.Column(
            "channel_id",
            sa.BigInteger(),
            sa.ForeignKey("channels.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "knowledge_base_id",
            sa.BigInteger(),
            sa.ForeignKey("knowledge_bases.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )

    op.create_table(
        "knowledge_documents",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "knowledge_base_id",
            sa.BigInteger(),
            sa.ForeignKey("knowledge_bases.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("source", sa.String(1000)),
        sa.Column("raw_text", sa.Text()),
        *_timestamps(),
    )
    op.create_index("ix_knowledge_documents_knowledge_base_id", "knowledge_documents", ["knowledge_base_id"])

    op.create_table(
        "knowledge_chunks",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "document_id",
            sa.BigInteger(),
            sa.ForeignKey("knowledge_documents.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("chunk_index", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("embedding", Vector(EMBEDDING_DIM)),
        *_timestamps(),
    )
    op.create_index("ix_knowledge_chunks_document_id", "knowledge_chunks", ["document_id"])

    op.create_table(
        "posts",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "channel_id", sa.BigInteger(), sa.ForeignKey("channels.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("persona_id", sa.BigInteger(), sa.ForeignKey("personas.id", ondelete="SET NULL")),
        sa.Column("title", sa.String(500)),
        sa.Column("body", sa.Text()),
        sa.Column("image_path", sa.String(1000)),
        sa.Column("image_prompt", sa.Text()),
        sa.Column(
            "status",
            postgresql.ENUM(name="poststatus", create_type=False),
            server_default="draft",
            nullable=False,
        ),
        sa.Column("scheduled_for", sa.DateTime(timezone=True)),
        sa.Column("published_at", sa.DateTime(timezone=True)),
        sa.Column("telegram_message_id", sa.BigInteger()),
        sa.Column("error", sa.Text()),
        sa.Column("meta", postgresql.JSONB(), server_default=sa.text("'{}'"), nullable=False),
        *_timestamps(),
    )
    op.create_index("ix_posts_channel_id", "posts", ["channel_id"])
    op.create_index("ix_posts_status", "posts", ["status"])

    op.create_table(
        "schedules",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "channel_id", sa.BigInteger(), sa.ForeignKey("channels.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("cron", sa.String(100)),
        sa.Column("interval_seconds", sa.Integer()),
        sa.Column("timezone", sa.String(64), server_default="UTC", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("next_run_at", sa.DateTime(timezone=True)),
        *_timestamps(),
    )
    op.create_index("ix_schedules_channel_id", "schedules", ["channel_id"])

    op.create_table(
        "tasks",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("type", postgresql.ENUM(name="tasktype", create_type=False), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(name="taskstatus", create_type=False),
            server_default="pending",
            nullable=False,
        ),
        sa.Column("payload", postgresql.JSONB(), server_default=sa.text("'{}'"), nullable=False),
        sa.Column("priority", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("attempts", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("max_attempts", sa.Integer(), server_default=sa.text("3"), nullable=False),
        sa.Column("available_at", sa.DateTime(timezone=True)),
        sa.Column("depends_on_id", sa.BigInteger(), sa.ForeignKey("tasks.id", ondelete="SET NULL")),
        sa.Column("result", postgresql.JSONB()),
        sa.Column("error", sa.Text()),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        *_timestamps(),
    )
    op.create_index("ix_tasks_status", "tasks", ["status"])
    op.create_index("ix_tasks_available_at", "tasks", ["available_at"])

    op.create_table(
        "post_metrics",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("post_id", sa.BigInteger(), sa.ForeignKey("posts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("views", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("reactions", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("forwards", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("captured_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        *_timestamps(),
    )
    op.create_index("ix_post_metrics_post_id", "post_metrics", ["post_id"])


def downgrade() -> None:
    for table in (
        "post_metrics", "tasks", "schedules", "posts", "knowledge_chunks",
        "knowledge_documents", "channel_knowledge_bases", "channels",
        "knowledge_bases", "personas",
    ):
        op.drop_table(table)

    bind = op.get_bind()
    for enum in (tasktype, taskstatus, poststatus, channelstatus):
        enum.drop(bind, checkfirst=True)
