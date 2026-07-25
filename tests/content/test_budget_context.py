"""Token budget + context builder tests (§R5.2, req 6/7): deterministic, port-only, budgeted."""

from __future__ import annotations

import uuid

from app.content.budget import HeuristicTokenEstimator, fit_within
from app.content.context import ContextBuilder
from app.content.fakes import EmptyKnowledgeSource, EmptyMemorySource, FixedMemorySource
from app.content.sources import ContextItem
from app.content.types import GenerationRequest, PromptSpec, Role
from app.models.enums import PromptType


def _request(
    *, examples: tuple[str, ...] = (), max_context_tokens: int = 8000
) -> GenerationRequest:
    spec = PromptSpec(
        prompt_type=PromptType.story, role=Role.body, task="t", topic="coffee", examples=examples
    )
    return GenerationRequest(
        spec=spec, channel_id=uuid.uuid4(), max_context_tokens=max_context_tokens
    )


def test_estimator_is_deterministic_and_ceil() -> None:
    est = HeuristicTokenEstimator()
    assert est.estimate("") == 0
    assert est.estimate("abcd") == 1
    assert est.estimate("abcde") == 2  # ceil(5/4)
    assert est.estimate("x" * 40) == est.estimate("x" * 40)  # deterministic


def test_fit_within_keeps_in_order_until_budget() -> None:
    est = HeuristicTokenEstimator()
    items = [ContextItem("example", "x" * 40), ContextItem("example", "y" * 40)]  # 10 tokens each
    assert (
        fit_within(items, est, 15) == items[:1]
    )  # first fits (10), second (10) exceeds remaining 5
    assert fit_within(items, est, 20) == items  # both fit exactly (10+10)
    assert fit_within(items, est, 5) == []  # nothing fits
    assert fit_within(items, est, 0) == []


async def test_context_gathers_examples_then_sources_capped_to_k() -> None:
    memory = FixedMemorySource([ContextItem("example", f"m{i}") for i in range(10)])
    builder = ContextBuilder(
        memory, EmptyKnowledgeSource(), HeuristicTokenEstimator(), few_shot_k=3
    )
    items = await builder.build(_request(examples=("e1", "e2")))
    assert len(items) == 3  # capped to K
    assert items[0].text == "e1" and items[1].text == "e2"  # spec examples first


async def test_context_respects_reserved_budget() -> None:
    memory = FixedMemorySource([ContextItem("example", "x" * 40)])  # 10 tokens
    builder = ContextBuilder(EmptyMemorySource(), EmptyKnowledgeSource(), HeuristicTokenEstimator())
    builder_with = ContextBuilder(memory, EmptyKnowledgeSource(), HeuristicTokenEstimator())
    # reserved leaves only 5 tokens < 10-token item -> dropped
    items = await builder_with.build(_request(max_context_tokens=15), reserved_tokens=10)
    assert items == []
    # empty sources -> empty regardless
    assert await builder.build(_request()) == []
