"""Post metrics — time-series snapshots captured after publication (Stage 9)."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .content import Post


class PostMetric(Base, TimestampMixin):
    __tablename__ = "post_metrics"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    post_id: Mapped[int] = mapped_column(
        ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    views: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    reactions: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    forwards: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    captured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    post: Mapped[Post] = relationship(back_populates="metrics")
