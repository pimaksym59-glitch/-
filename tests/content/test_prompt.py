"""Prompt pipeline + templates tests (§R5.3, req 2/3): modular, extensible, no model knowledge."""

from __future__ import annotations

from collections.abc import Mapping, Sequence

from app.content import templates
from app.content.pipeline import DEFAULT_CONTRIBUTORS, PromptBuilder
from app.content.sources import ContextItem
from app.content.types import PromptPart, PromptSpec, Role
from app.models.enums import PromptType


def _spec(
    *,
    persona: Mapping[str, str] | None = None,
    topic: str | None = None,
    constraints: Sequence[str] = (),
    examples: Sequence[str] = (),
) -> PromptSpec:
    return PromptSpec(
        prompt_type=PromptType.story,
        role=Role.body,
        task="write",
        persona=persona or {},
        topic=topic,
        constraints=constraints,
        examples=examples,
    )


def test_base_parts_include_present_sections_only() -> None:
    builder = PromptBuilder()
    parts = builder.base_parts(_spec(persona={"voice": "warm"}, topic="coffee"))
    names = [part.name for part in parts]
    assert names == ["task", "persona", "topic"]  # constraints absent -> no part


def test_empty_optional_fields_contribute_nothing() -> None:
    parts = PromptBuilder().base_parts(_spec())
    assert [p.name for p in parts] == ["task"]


def test_pipeline_is_extensible_without_touching_others() -> None:
    class SignatureContributor:
        def contribute(self, spec: PromptSpec) -> PromptPart | None:
            return PromptPart("signature", "— the author")

    builder = PromptBuilder([*DEFAULT_CONTRIBUTORS, SignatureContributor()])
    parts = builder.base_parts(_spec())
    assert parts[-1] == PromptPart("signature", "— the author")


def test_render_includes_preamble_parts_and_examples() -> None:
    spec = _spec(topic="coffee")
    parts = PromptBuilder().base_parts(spec)
    few_shot = [ContextItem("example", "past post")]
    prompt = PromptBuilder().render(spec, parts, few_shot)
    assert templates.preamble(PromptType.story) in prompt
    assert "## task\nwrite" in prompt
    assert "## examples\npast post" in prompt


def test_preamble_falls_back_for_unmapped_type() -> None:
    assert templates.preamble(PromptType.other) == "Write channel content."
