"""Prompt enhancement (§R6, owner req 4) — fully modular. Each enhancer implements the
``PromptEnhancer``
Protocol and transforms the prompt; the ``PromptEnhancementPipeline`` runs them in order. Adding an
enhancer needs no change to the others or the engine. Enhancement is separate from the prompt
builder
(owner req 3) and from the style pipeline (owner req 7).
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol

from app.images.types import ImageSpec


class PromptEnhancer(Protocol):
    def enhance(self, prompt: str, spec: ImageSpec) -> str: ...


class QualityTagsEnhancer:
    """Appends generic quality tags (provider-neutral)."""

    _TAGS = "high detail, sharp focus, natural lighting"

    def enhance(self, prompt: str, spec: ImageSpec) -> str:
        return f"{prompt}, {self._TAGS}"


DEFAULT_ENHANCERS: tuple[PromptEnhancer, ...] = (QualityTagsEnhancer(),)


class PromptEnhancementPipeline:
    def __init__(self, enhancers: Sequence[PromptEnhancer] = DEFAULT_ENHANCERS) -> None:
        self._enhancers = tuple(enhancers)

    def run(self, prompt: str, spec: ImageSpec) -> str:
        for enhancer in self._enhancers:
            prompt = enhancer.enhance(prompt, spec)
        return prompt
