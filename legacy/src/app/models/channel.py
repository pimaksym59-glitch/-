"""Channels and personas — the top-level configuration a user manages."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, Column, ForeignKey, String, Table, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, pg_enum
from .enums import ChannelStatus

if TYPE_CHECKING:
    from .content import Post
    from .knowledge import KnowledgeBase
    from .scheduling import Schedule

# Which knowledge bases feed a channel's generation (many-to-many).
channel_knowledge_bases = Table(
    "channel_knowledge_bases",
    Base.metadata,
    Column("channel_id", ForeignKey("channels.id", ondelete="CASCADE"), primary_key=True),
    Column(
        "knowledge_base_id",
        ForeignKey("knowledge_bases.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Persona(Base, TimestampMixin):
    __tablename__ = "personas"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    system_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    tone: Mapped[str | None] = mapped_column(String(100))
    language: Mapped[str] = mapped_column(String(20), nullable=False, server_default="ru")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))


class Channel(Base, TimestampMixin):
    __tablename__ = "channels"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    telegram_chat_id: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    persona_id: Mapped[int | None] = mapped_column(ForeignKey("personas.id", ondelete="SET NULL"))
    status: Mapped[ChannelStatus] = mapped_column(
        pg_enum(ChannelStatus, "channelstatus"),
        nullable=False,
        server_default=ChannelStatus.active.value,
    )
    settings: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=text("'{}'"))

    persona: Mapped[Persona | None] = relationship(lazy="selectin")
    posts: Mapped[list[Post]] = relationship(back_populates="channel", cascade="all, delete-orphan")
    schedules: Mapped[list[Schedule]] = relationship(
        back_populates="channel", cascade="all, delete-orphan"
    )
    knowledge_bases: Mapped[list[KnowledgeBase]] = relationship(secondary=channel_knowledge_bases)
