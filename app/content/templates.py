"""Prompt templates (§R5.3, owner req 3) — turn assembled parts into a prompt string. Templates have
**no model knowledge** and no business rules: they only structure sections. A per-``PromptType``
preamble sets the shape; a static all-purpose prompt is forbidden (§R5.3), so the final prompt is
always composed from the dynamic parts.
"""

from __future__ import annotations

from collections.abc import Sequence

from app.content.sources import ContextItem
from app.content.types import PromptPart
from app.models.enums import PromptType

_PREAMBLE: dict[PromptType, str] = {
    PromptType.system: "Write channel content in the author's voice.",
    PromptType.sales: "Write a persuasive selling post.",
    PromptType.story: "Write an engaging personal story.",
    PromptType.morning: "Write a morning post.",
    PromptType.evening: "Write an evening post.",
}
_DEFAULT_PREAMBLE = "Write channel content."


def preamble(prompt_type: PromptType) -> str:
    return _PREAMBLE.get(prompt_type, _DEFAULT_PREAMBLE)


def render(
    prompt_type: PromptType, parts: Sequence[PromptPart], few_shot: Sequence[ContextItem]
) -> str:
    """Assemble the final prompt: preamble + labelled parts + a few-shot examples section."""
    sections = [preamble(prompt_type)]
    sections.extend(f"## {part.name}\n{part.body}" for part in parts)
    if few_shot:
        examples = "\n---\n".join(item.text for item in few_shot)
        sections.append(f"## examples\n{examples}")
    return "\n\n".join(sections)
