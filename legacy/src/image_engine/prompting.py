"""Image prompt construction with scene diversity. Pure, unit-tested.

Rotating the scene by a seed makes successive images for a channel visually
varied instead of same-y — the spec calls for scene/prompt diversity.
"""

from __future__ import annotations

SCENES = (
    "a minimalist flat illustration",
    "a vibrant photographic scene",
    "a cinematic wide shot",
    "an isometric 3d render",
    "a soft watercolor painting",
    "a bold vector poster",
)


def build_image_prompt(*, title: str | None, body: str | None, seed: int = 0) -> str:
    subject = ((title or body or "").strip().replace("\n", " "))[:200] or "the topic of the post"
    scene = SCENES[seed % len(SCENES)]
    return (
        f"{scene} representing: {subject}. "
        "High visual quality, clear focal point, no text or watermarks."
    )
