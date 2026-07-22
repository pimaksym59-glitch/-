"""Perceptual similarity via average hash (aHash) + Hamming distance.

Used to avoid publishing near-duplicate images: a candidate whose aHash is
within `threshold` bits of a recent image is considered a duplicate.
"""

from __future__ import annotations

import io
from collections.abc import Iterable


def average_hash(png_bytes: bytes, *, hash_size: int = 8) -> int:
    """64-bit average hash of an image (bit set where pixel > mean luminance)."""
    from PIL import Image

    img = Image.open(io.BytesIO(png_bytes)).convert("L").resize((hash_size, hash_size))
    pixels = img.tobytes()  # one byte per pixel for mode "L"
    mean = sum(pixels) / len(pixels)
    bits = 0
    for i, pixel in enumerate(pixels):
        if pixel > mean:
            bits |= 1 << i
    return bits


def hamming_distance(a: int, b: int) -> int:
    return (a ^ b).bit_count()


def is_duplicate(candidate: int, existing: Iterable[int], *, threshold: int) -> bool:
    return any(hamming_distance(candidate, other) <= threshold for other in existing)
