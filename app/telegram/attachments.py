"""Attachment processing pipeline (§R7.8, owner req 9) — a standalone pipeline, kept separate from
text handling. It validates/normalizes media: album size 1-10 and known kinds
(photo/video/document).
Deterministic; raises on invalid input.
"""

from __future__ import annotations

from collections.abc import Sequence

from app.telegram.types import Attachment

_MAX_ALBUM = 10
_KINDS = frozenset({"photo", "video", "document"})


class AttachmentError(ValueError):
    """Invalid attachment set (too many, or an unknown kind)."""


class AttachmentPipeline:
    def process(self, attachments: Sequence[Attachment]) -> tuple[Attachment, ...]:
        if len(attachments) > _MAX_ALBUM:
            raise AttachmentError(f"album exceeds {_MAX_ALBUM} items: {len(attachments)}")
        for attachment in attachments:
            if attachment.kind not in _KINDS:
                raise AttachmentError(f"unknown attachment kind: {attachment.kind!r}")
        return tuple(attachments)
