"""AI Engine end-to-end tests (offline on fakes): routing, fallback, rewrite, hooks, structured."""

from __future__ import annotations

import pytest
from pydantic import BaseModel

from app.content.budget import HeuristicTokenEstimator
from app.content.context import ContextBuilder
from app.content.cost import RecordingCostSink
from app.content.engine import AIEngine
from app.content.fakes import EmptyKnowledgeSource, EmptyMemorySource
from app.content.pipeline import PromptBuilder
from app.content.rewrite import RewritePolicy
from app.content.selection import ModelRouter, ProviderSelector
from app.content.structured import StructuredOutputValidator
from app.content.types import GenerationRequest, PromptSpec, Role
from app.content.validation import OutputValidator, ValidationResult
from app.core.config import Settings
from app.core.providers.base import Capability, ProviderKind
from app.core.providers.errors import TemporaryProviderError
from app.core.providers.factory import ProviderFactory
from app.core.providers.health import ProviderHealth
from app.core.providers.registry import FAKE_NAME, ProviderRegistry
from app.llm.base import LLMProvider, LLMResult
from app.llm.fakes import FakeLLMProvider
from app.models.enums import PromptType


@pytest.fixture(autouse=True)
def _no_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setitem(Settings.model_config, "env_file", None)
    for var in ("ANTHROPIC_API_KEY", "OPENAI_API_KEY", "TELEGRAM_BOT_TOKEN"):
        monkeypatch.delenv(var, raising=False)


class _ScriptedLLM:
    name = "scripted"
    kind = ProviderKind.llm

    def __init__(self, *, fail_models: frozenset[str] = frozenset()) -> None:
        self.fail_models = fail_models

    def capabilities(self) -> frozenset[Capability]:
        return frozenset({Capability.text_generation, Capability.json_mode})

    async def health(self) -> ProviderHealth:
        return ProviderHealth(healthy=True)

    async def generate(
        self, prompt: str, *, model: str | None = None, json_mode: bool = False
    ) -> LLMResult:
        if model in self.fail_models:
            raise TemporaryProviderError("temporary")
        return LLMResult(
            text=f"ok:{model}", model=model or "?", prompt_tokens=2, completion_tokens=1
        )


class _FailThenPass:
    def __init__(self, fail_times: int) -> None:
        self._fail_times = fail_times
        self.calls = 0

    async def validate(self, text: str) -> ValidationResult:
        self.calls += 1
        if self.calls <= self._fail_times:
            return ValidationResult(passed=False, issues=["needs work"])
        return ValidationResult(passed=True)


class _RecordingStream:
    def __init__(self) -> None:
        self.completed = 0

    async def on_token(self, token: str) -> None: ...

    async def on_complete(self) -> None:
        self.completed += 1


def _engine(
    provider: LLMProvider,
    *,
    validators: tuple[OutputValidator, ...] = (),
    cost_sink: RecordingCostSink | None = None,
    stream_sink: _RecordingStream | None = None,
) -> AIEngine:
    registry = ProviderRegistry()
    registry.register(ProviderKind.llm, FAKE_NAME, lambda _s: provider)
    estimator = HeuristicTokenEstimator()
    context = ContextBuilder(EmptyMemorySource(), EmptyKnowledgeSource(), estimator)
    return AIEngine(
        provider_selector=ProviderSelector(ProviderFactory(registry, Settings())),
        model_router=ModelRouter(),
        prompt_builder=PromptBuilder(),
        context_builder=context,
        estimator=estimator,
        rewrite_policy=RewritePolicy(),
        validators=validators,
        cost_sink=cost_sink,
        stream_sink=stream_sink,
    )


def _request(
    *, role: Role = Role.body, json_mode: bool = False, max_rewrites: int = 3
) -> GenerationRequest:
    spec = PromptSpec(prompt_type=PromptType.story, role=role, task="write about coffee")
    return GenerationRequest(spec=spec, json_mode=json_mode, max_rewrites=max_rewrites)


async def test_body_routes_to_strong_model_and_records_cost() -> None:
    cost, stream = RecordingCostSink(), _RecordingStream()
    engine = _engine(FakeLLMProvider(), cost_sink=cost, stream_sink=stream)
    result = await engine.generate(_request(role=Role.body))
    assert result.model == "claude-opus-4-8" and result.provider == FAKE_NAME
    assert result.passed and result.rewrites == 0
    assert cost.records[0][0].model == "claude-opus-4-8"
    assert stream.completed == 1  # streaming integration point fired


async def test_headline_routes_to_fast_model() -> None:
    result = await _engine(FakeLLMProvider()).generate(_request(role=Role.headline))
    assert result.model == "claude-haiku-4-5"


async def test_engine_falls_back_to_next_model_tier() -> None:
    # body tiers = (opus, haiku); opus fails temporary -> engine uses haiku (fallback in engine)
    engine = _engine(_ScriptedLLM(fail_models=frozenset({"claude-opus-4-8"})))
    result = await engine.generate(_request(role=Role.body))
    assert result.model == "claude-haiku-4-5"


async def test_rewrite_loop_runs_until_validation_passes() -> None:
    validator = _FailThenPass(fail_times=1)
    result = await _engine(FakeLLMProvider(), validators=(validator,)).generate(_request())
    assert result.rewrites == 1 and result.passed
    assert validator.calls == 2  # failed once, passed on rewrite


async def test_rewrite_exhaustion_returns_unpassed_result() -> None:
    validator = _FailThenPass(fail_times=99)  # never passes
    result = await _engine(FakeLLMProvider(), validators=(validator,)).generate(
        _request(max_rewrites=2)
    )
    assert result.rewrites == 2 and not result.passed
    assert list(result.issues) == ["needs work"]


async def test_structured_validator_passes_on_fake_json() -> None:
    class _FakeShape(BaseModel):
        fake: str

    validator = StructuredOutputValidator(_FakeShape)
    result = await _engine(FakeLLMProvider(), validators=(validator,)).generate(
        _request(json_mode=True)
    )
    assert result.passed  # FakeLLMProvider json_mode emits {"fake": "..."} which matches
