"""vector index on knowledge_chunks.embedding

Revision ID: 0002_vector_index
Revises: 0001_initial
Create Date: 2026-07-20

Adds an IVFFlat cosine index so RAG similarity search scales beyond a seq scan.
The index can be built on an empty table; `lists` is a reasonable default for
small-to-medium corpora (raise for very large ones).
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0002_vector_index"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_knowledge_chunks_embedding "
        "ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_knowledge_chunks_embedding")
