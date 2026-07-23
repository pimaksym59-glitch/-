"""SQLAlchemy declarative base + shared MetaData (§R3.2, §R4).

A single ``MetaData`` with a deterministic naming convention keeps constraint/index names stable,
which is required for reliable Alembic migrations (§R12.6). All ORM models inherit from ``Base``;
importing ``app.models`` registers every table on ``Base.metadata`` (used as Alembic target).
"""

from __future__ import annotations

from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

NAMING_CONVENTION: dict[str, str] = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """Declarative base with a project-wide MetaData and naming convention."""

    metadata = MetaData(naming_convention=NAMING_CONVENTION)
