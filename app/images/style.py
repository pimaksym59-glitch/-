"""Style pipeline (§R6, owner req 7) — a **separate** pipeline layer, not mixed into the prompt
builder or the enhancement pipeline. It applies the spec's style descriptors (e.g. photorealistic,
cinematic) as its own ordered stage. Deterministic.
"""

from __future__ import annotations

from app.images.types import ImageSpec


class StylePipeline:
    def apply(self, prompt: str, spec: ImageSpec) -> str:
        if not spec.style:
            return prompt
        return f"{prompt}, {', '.join(spec.style)}"
