"""AI Engine (§R5) — a provider-agnostic **orchestrator** (owner req 1/11). It wires the modular
pipeline: select provider (not model), route model tiers (not provider), build the prompt, gather
budgeted context, generate with model fallback, run validators, quality-rewrite loop — emitting
cost/streaming/metrics/logging hooks. It has **no content rules**: persona/style come in as data,
and quality gates plug into the validation seam (Stage 14).

Uses only the Stage-11 ``LLMProvider`` protocol; no vendor calls here. Quality rewrites (§R5.6) are
distinct from infra retries (Executor) and from model fallback (§R2.9).
"""

from __future__ import annotations

from collections.abc import Sequence

from app.content.budget import TokenEstimator
from app.content.context import ContextBuilder
from app.content.cost import CostSink, NoOpCostSink
from app.content.fallback import generate_with_fallback
from app.content.pipeline import PromptBuilder
from app.content.rewrite import RewritePolicy
from app.content.selection import ModelRouter, ProviderSelector
from app.content.streaming import NoOpStreamSink, StreamSink
from app.content.types import GenerationRequest, GenerationResult, Usage
from app.content.validation import AlwaysPass, OutputValidator, ValidationResult
from app.core.providers.observability import ProviderObservability


class AIEngine:
    def __init__(
        self,
        *,
        provider_selector: ProviderSelector,
        model_router: ModelRouter,
        prompt_builder: PromptBuilder,
        context_builder: ContextBuilder,
        estimator: TokenEstimator,
        rewrite_policy: RewritePolicy,
        validators: Sequence[OutputValidator] = (),
        cost_sink: CostSink | None = None,
        stream_sink: StreamSink | None = None,
        observability: ProviderObservability | None = None,
    ) -> None:
        self._provider_selector = provider_selector
        self._model_router = model_router
        self._prompt_builder = prompt_builder
        self._context_builder = context_builder
        self._estimator = estimator
        self._rewrite_policy = rewrite_policy
        self._validators: tuple[OutputValidator, ...] = tuple(validators) or (AlwaysPass(),)
        self._cost_sink = cost_sink if cost_sink is not None else NoOpCostSink()
        self._stream_sink = stream_sink if stream_sink is not None else NoOpStreamSink()
        self._obs = observability if observability is not None else ProviderObservability()

    async def generate(self, request: GenerationRequest) -> GenerationResult:
        spec = request.spec
        provider = self._provider_selector.select()  # provider only (req 4)
        tiers = self._model_router.tiers(spec.role)  # model only (req 5)

        base_parts = self._prompt_builder.base_parts(spec)
        reserved = sum(self._estimator.estimate(part.body) for part in base_parts)
        context_items = await self._context_builder.build(request, reserved_tokens=reserved)
        base_prompt = self._prompt_builder.render(spec, base_parts, context_items)

        prompt = base_prompt
        attempt = 0
        while True:
            self._obs.metrics.incr("ai.generate.attempt")
            result = await generate_with_fallback(
                provider, prompt, tiers, json_mode=request.json_mode
            )
            usage = Usage(
                model=result.model,
                prompt_tokens=result.prompt_tokens,
                completion_tokens=result.completion_tokens,
            )
            await self._cost_sink.record(usage, provider=provider.name)
            await self._stream_sink.on_complete()  # integration point (no real streaming)
            validation = await self._validate(result.text)
            self._obs.logger.event(
                "ai.generate", model=result.model, attempt=attempt, passed=validation.passed
            )
            if not self._rewrite_policy.should_rewrite(
                attempt, validation, max_rewrites=request.max_rewrites
            ):
                return GenerationResult(
                    text=result.text,
                    model=result.model,
                    provider=provider.name,
                    usage=usage,
                    rewrites=attempt,
                    passed=validation.passed,
                    issues=list(validation.issues),
                )
            attempt += 1
            prompt = self._rewrite_policy.refine(base_prompt, validation)

    async def _validate(self, text: str) -> ValidationResult:
        issues: list[str] = []
        for validator in self._validators:
            result = await validator.validate(text)
            if not result.passed:
                issues.extend(result.issues)
        return ValidationResult(passed=not issues, issues=issues)
