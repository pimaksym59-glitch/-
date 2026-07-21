"""Save generated image bytes under the media root; return a relative path."""

from __future__ import annotations

import uuid
from pathlib import Path


def save_image(png_bytes: bytes, *, media_root: str, subdir: str = "images") -> str:
    """Write PNG bytes and return the path relative to `media_root`
    (e.g. "images/ab12...png") for storage in posts.image_path.
    """
    rel = Path(subdir) / f"{uuid.uuid4().hex}.png"
    dest = Path(media_root) / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(png_bytes)
    return rel.as_posix()
