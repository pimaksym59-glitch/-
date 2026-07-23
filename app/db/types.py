"""Reusable column helpers: UUIDv7 default and platform vector dimensions (§R4.3/§R4.5/§R4.6).

The embedding dimensions are platform constants (§R4.6) and mirror the config defaults in
``app.core.config`` / MASTER_SPEC §Appendix B — kept here as literals because ``Vector(dim)`` needs
a compile-time value (see TECHNICAL_BACKLOG DI-2 on single-sourcing these).
"""

from __future__ import annotations

import uuid

from uuid6 import uuid7

TEXT_EMBEDDING_DIM = 1536  # text embeddings (memory, document_chunks) — §R4.6
IMAGE_EMBEDDING_DIM = 512  # CLIP image / face embeddings (images, actors) — §R4.6


def uuid7_default() -> uuid.UUID:
    """Generate a time-ordered UUIDv7 primary key (§R4.3, provider: uuid6)."""
    return uuid7()
