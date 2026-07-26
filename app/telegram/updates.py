"""Update processing pipeline — normalizes a raw update into the internal ``Update`` DTO via the
mapping layer (owner req 15). One responsibility; deterministic.
"""

from __future__ import annotations

from app.telegram.mapping import map_update
from app.telegram.source import RawUpdate
from app.telegram.types import Update


class UpdateProcessingPipeline:
    def process(self, raw: RawUpdate) -> Update:
        return map_update(raw)
