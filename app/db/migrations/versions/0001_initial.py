"""initial schema — extensions, enums, tables, indexes (§R4)

Baseline migration. Enums and all 25 tables are created from ``Base.metadata`` so the schema is
guaranteed to match the ORM models; subsequent migrations use standard autogenerate. Requires a
live PostgreSQL — applying this is Runtime Verification Pending in environments without a database.

Revision ID: 0001
Revises:
Create Date: 2026-07-22
"""

from __future__ import annotations

from alembic import op

import app.models

revision: str = "0001"
down_revision: str | None = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    app.models.Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    app.models.Base.metadata.drop_all(bind=op.get_bind())
    op.execute("DROP EXTENSION IF EXISTS pg_trgm")
    op.execute("DROP EXTENSION IF EXISTS vector")
