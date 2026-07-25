"""Model fallback tests (§R2.9/R5.10, req 11): tier progression, permanent stop, exhaustion."""

from __future__ import annotations

import pytest

from app.content.fallback import GenerationExhausted, generate_with_fallback
from app.core.providers.base import Capability, ProviderKind
from app.core.providers.errors import (
    AuthenticationError,
    ProviderError,
    TemporaryProviderError,
)
from app.core.providers.health import ProviderHealth
from app.llm.base import LLMResult


class _ScriptedLLM:
    name = "scripted"
    kind = ProviderKind.llm

    def __init__(
        self, *, fail_models: frozenset[str] = frozenset(), error: ProviderError | None = None
    ) -> None:
        self.fail_models = fail_models
        self.error = error or TemporaryProviderError("temporary")
        self.calls: list[str | None] = []

    def capabilities(self) -> frozenset[Capability]:
        return frozenset({Capability.text_generation})

    async def health(self) -> ProviderHealth:
        return ProviderHealth(healthy=True)

    async def generate(
        self, prompt: str, *, model: str | None = None, json_mode: bool = False
    ) -> LLMResult:
        self.calls.append(model)
        if model in self.fail_models:
            raise self.error
        return LLMResult(
            text=f"ok:{model}", model=model or "?", prompt_tokens=1, completion_tokens=1
        )


async def test_primary_success_no_fallback() -> None:
    llm = _ScriptedLLM()
    result = await generate_with_fallback(llm, "p", ("a", "b"))
    assert result.model == "a"
    assert llm.calls == ["a"]  # second tier not tried


async def test_temporary_failure_advances_to_next_tier() -> None:
    llm = _ScriptedLLM(fail_models=frozenset({"a"}))
    result = await generate_with_fallback(llm, "p", ("a", "b"))
    assert result.model == "b"
    assert llm.calls == ["a", "b"]


async def test_permanent_failure_stops_immediately() -> None:
    llm = _ScriptedLLM(fail_models=frozenset({"a"}), error=AuthenticationError("bad key"))
    with pytest.raises(AuthenticationError):
        await generate_with_fallback(llm, "p", ("a", "b"))
    assert llm.calls == ["a"]  # no fallback for permanent


async def test_all_tiers_exhausted_raises_generation_exhausted() -> None:
    llm = _ScriptedLLM(fail_models=frozenset({"a", "b"}))
    with pytest.raises(GenerationExhausted):
        await generate_with_fallback(llm, "p", ("a", "b"))
    assert llm.calls == ["a", "b"]
