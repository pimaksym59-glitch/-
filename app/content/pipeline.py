"""Modular prompt pipeline (§R5.3, owner req 2/3). The prompt is assembled by an ordered list of
independent **contributors**, each producing one section from the spec (data only). Adding a
contributor extends the pipeline without touching the others. The ``PromptBuilder`` forms the
structure and delegates string rendering to :mod:`app.content.templates` — it knows no models.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol

from app.content import templates
from app.content.sources import ContextItem
from app.content.types import PromptPart, PromptSpec


class PromptContributor(Protocol):
    """Contributes at most one prompt section from the spec. Pure, no I/O, no model knowledge."""

    def contribute(self, spec: PromptSpec) -> PromptPart | None: ...


class InstructionContributor:
    def contribute(self, spec: PromptSpec) -> PromptPart | None:
        return PromptPart("task", spec.task) if spec.task else None


class PersonaContributor:
    def contribute(self, spec: PromptSpec) -> PromptPart | None:
        if not spec.persona:
            return None
        body = "\n".join(f"{key}: {value}" for key, value in spec.persona.items())
        return PromptPart("persona", body)


class TopicContributor:
    def contribute(self, spec: PromptSpec) -> PromptPart | None:
        return PromptPart("topic", spec.topic) if spec.topic else None


class ConstraintsContributor:
    def contribute(self, spec: PromptSpec) -> PromptPart | None:
        if not spec.constraints:
            return None
        return PromptPart("constraints", "\n".join(f"- {item}" for item in spec.constraints))


DEFAULT_CONTRIBUTORS: tuple[PromptContributor, ...] = (
    InstructionContributor(),
    PersonaContributor(),
    TopicContributor(),
    ConstraintsContributor(),
)


class PromptBuilder:
    """Assembles the prompt structure from contributors; renders via templates (no model detail)."""

    def __init__(self, contributors: Sequence[PromptContributor] = DEFAULT_CONTRIBUTORS) -> None:
        self._contributors = tuple(contributors)

    def base_parts(self, spec: PromptSpec) -> list[PromptPart]:
        parts: list[PromptPart] = []
        for contributor in self._contributors:
            part = contributor.contribute(spec)
            if part is not None:
                parts.append(part)
        return parts

    def render(
        self, spec: PromptSpec, parts: Sequence[PromptPart], few_shot: Sequence[ContextItem]
    ) -> str:
        return templates.render(spec.prompt_type, parts, few_shot)
