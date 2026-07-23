"""Channel-cluster models (§R4.7): channels, channel_settings, personas, actors, locations.

Persona (textual voice) ≠ Actor (visual identity) — §R4.7. ``channels`` holds no tone/style; the
voice lives in ``personas`` and the channel references its default via ``default_persona_id``.
"""

from __future__ import annotations

import datetime
import uuid
from decimal import Decimal
from typing import Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, Numeric, Text, text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.types import IMAGE_EMBEDDING_DIM
from app.models.base import Entity
from app.models.enums import CHANNEL_STATUS, ChannelStatus


class Channel(Entity):
    __tablename__ = "channels"

    telegram_channel_id: Mapped[int | None] = mapped_column(BigInteger)
    username: Mapped[str | None] = mapped_column(Text)
    title: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    language: Mapped[str] = mapped_column(Text)
    country: Mapped[str | None] = mapped_column(Text)
    timezone: Mapped[str] = mapped_column(Text)
    status: Mapped[ChannelStatus] = mapped_column(CHANNEL_STATUS, default=ChannelStatus.active)
    llm_provider: Mapped[str] = mapped_column(Text)
    image_provider: Mapped[str] = mapped_column(Text)
    default_persona_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("personas.id", use_alter=True, name="fk_channels_default_persona_id_personas")
    )
    bot_token_ref: Mapped[str | None] = mapped_column(Text)
    settings: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, server_default="{}")

    channel_settings: Mapped[ChannelSettings | None] = relationship(
        back_populates="channel", uselist=False
    )
    personas: Mapped[list[Persona]] = relationship(
        back_populates="channel", foreign_keys="Persona.channel_id"
    )
    actors: Mapped[list[Actor]] = relationship(back_populates="channel")
    locations: Mapped[list[Location]] = relationship(back_populates="channel")

    __table_args__ = (
        Index(
            "uq_channels_telegram_channel_id",
            "telegram_channel_id",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
        Index(
            "uq_channels_username",
            "username",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
        Index("ix_channels_settings", "settings", postgresql_using="gin"),
    )


class ChannelSettings(Entity):
    __tablename__ = "channel_settings"

    channel_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("channels.id"), unique=True)
    temperature: Mapped[Decimal | None] = mapped_column(Numeric)
    max_post_length: Mapped[int | None]
    images_per_post: Mapped[int | None]
    cta_style: Mapped[str | None] = mapped_column(Text)
    emoji_set: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    text_format: Mapped[str | None] = mapped_column(Text)
    banned_words: Mapped[list[str] | None] = mapped_column(ARRAY(Text))
    allowed_topics: Mapped[list[str] | None] = mapped_column(ARRAY(Text))
    posts_per_day: Mapped[int | None]
    similarity_threshold: Mapped[Decimal | None] = mapped_column(Numeric(4, 3))
    humanness_min: Mapped[int | None]
    history_window: Mapped[int | None]
    image_window: Mapped[int | None]
    max_rewrites: Mapped[int | None]
    image_max_regen: Mapped[int | None]
    lead_time_minutes: Mapped[int | None]
    max_context_tokens: Mapped[int | None]
    epsilon_min: Mapped[Decimal | None] = mapped_column(Numeric(4, 3))
    quality_check: Mapped[dict[str, Any] | None] = mapped_column(JSONB)

    channel: Mapped[Channel] = relationship(back_populates="channel_settings")


class Persona(Entity):
    __tablename__ = "personas"

    channel_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("channels.id"))
    name: Mapped[str] = mapped_column(Text)
    biography: Mapped[str | None] = mapped_column(Text)
    character: Mapped[str | None] = mapped_column(Text)
    manner_of_speech: Mapped[str | None] = mapped_column(Text)
    favorite_words: Mapped[list[str] | None] = mapped_column(ARRAY(Text))
    forbidden_expressions: Mapped[list[str] | None] = mapped_column(ARRAY(Text))
    goals: Mapped[str | None] = mapped_column(Text)
    life_story: Mapped[str | None] = mapped_column(Text)
    audience_relationship: Mapped[str | None] = mapped_column(Text)
    vocabulary: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    greeting_style: Mapped[str | None] = mapped_column(Text)
    farewell_style: Mapped[str | None] = mapped_column(Text)
    storytelling_style: Mapped[str | None] = mapped_column(Text)
    selling_post_rules: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    personal_post_rules: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    motivational_post_rules: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    best_examples: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    style_features: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    status: Mapped[str | None] = mapped_column(Text)

    channel: Mapped[Channel] = relationship(back_populates="personas", foreign_keys=[channel_id])

    __table_args__ = (Index("ix_personas_channel_id", "channel_id"),)


class Actor(Entity):
    __tablename__ = "actors"

    channel_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("channels.id"))
    name: Mapped[str] = mapped_column(Text)
    gender: Mapped[str | None] = mapped_column(Text)
    age: Mapped[int | None]
    height: Mapped[str | None] = mapped_column(Text)
    build: Mapped[str | None] = mapped_column(Text)
    facial_features: Mapped[str | None] = mapped_column(Text)
    eyes: Mapped[str | None] = mapped_column(Text)
    hair: Mapped[str | None] = mapped_column(Text)
    hair_color: Mapped[str | None] = mapped_column(Text)
    nationality: Mapped[str | None] = mapped_column(Text)
    ethnicity: Mapped[str | None] = mapped_column(Text)
    clothing_style: Mapped[str | None] = mapped_column(Text)
    appearance_description: Mapped[str | None] = mapped_column(Text)
    prompt_description: Mapped[str | None] = mapped_column(Text)
    negative_prompt: Mapped[str | None] = mapped_column(Text)
    reference_images_folder: Mapped[str | None] = mapped_column(Text)
    face_embedding: Mapped[list[float] | None] = mapped_column(Vector(IMAGE_EMBEDDING_DIM))
    voice: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str | None] = mapped_column(Text)

    channel: Mapped[Channel] = relationship(back_populates="actors")

    __table_args__ = (Index("ix_actors_channel_id", "channel_id"),)


class Location(Entity):
    __tablename__ = "locations"

    channel_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("channels.id"))
    name: Mapped[str] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    references: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    restrictions: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    usage_count: Mapped[int] = mapped_column(default=0, server_default="0")
    last_used_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True))

    channel: Mapped[Channel | None] = relationship(back_populates="locations")

    __table_args__ = (Index("ix_locations_channel_id", "channel_id"),)
