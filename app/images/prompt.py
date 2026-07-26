"""Image prompt builder (§R6, owner req 3) — builds the **base** prompt only, from the spec's
subject
and scene descriptors. It does not apply style or enhancement (those are separate stages) and knows
no models/providers. Also assembles the negative prompt from the spec's hints. Deterministic.
"""

from __future__ import annotations

from app.images.types import ImageSpec

_DEFAULT_NEGATIVE: tuple[str, ...] = (
    "blurry",
    "deformed",
    "extra fingers",
    "extra limbs",
    "watermark",
    "text",
)


class ImagePromptBuilder:
    def build(self, spec: ImageSpec) -> str:
        """The base prompt: subject + scene descriptors (§R6.3). Structure only."""
        parts = [spec.subject, *spec.scene.as_parts()]
        return ", ".join(part for part in parts if part)

    def negative(self, spec: ImageSpec) -> str:
        """Assemble the negative prompt (stored in metadata, §R6.8)."""
        return ", ".join((*_DEFAULT_NEGATIVE, *spec.negative_hints))
