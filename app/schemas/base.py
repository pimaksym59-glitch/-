"""Base Pydantic v2 DTO (§R3). One ancestor for request/response schemas so IO is strictly typed
and OpenAPI is generated consistently. ``extra="forbid"`` rejects unknown request fields (fail-fast
validation); ``from_attributes`` lets response models be built from ORM entities in services.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class Schema(BaseModel):
    """Common base for all API DTOs."""

    model_config = ConfigDict(extra="forbid", from_attributes=True)
