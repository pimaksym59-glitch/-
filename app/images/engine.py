"""Image Engine (§R6) — a provider-agnostic **orchestrator** (owner req 1). It wires the pipeline:
select provider (not model) -> route model (not provider) -> build base prompt -> style ->
enhance ->
safety gate (decision only) -> resolve size -> generate via the Stage-11 ``ImageProvider`` -> post-
process (thumbnail/phash) -> validate via the ``ImageValidator`` port -> regen loop. It contains
**no
content rules** and calls no vendor SDK. Regen (§R6.5) is distinct from infra retries.
"""

from __future__ import annotations

from app.core.providers.observability import ProviderObservability
from app.images.cost import ImageCostSink, NoOpImageCostSink
from app.images.enhancement import PromptEnhancementPipeline
from app.images.postprocess import PostProcessingPipeline
from app.images.prompt import ImagePromptBuilder
from app.images.regen import should_regenerate
from app.images.safety import SafetyLayer, SafetyRejected
from app.images.selection import ImageModelRouter, ImageProviderSelector
from app.images.size import SizePolicy
from app.images.streaming import ImageStreamSink, NoOpImageStreamSink
from app.images.style import StylePipeline
from app.images.types import GeneratedImage, ImageMetadata, ImageRequest, Usage
from app.images.validation import ImageValidator


class ImageEngine:
    def __init__(
        self,
        *,
        provider_selector: ImageProviderSelector,
        model_router: ImageModelRouter,
        prompt_builder: ImagePromptBuilder,
        style_pipeline: StylePipeline,
        enhancement: PromptEnhancementPipeline,
        size_policy: SizePolicy,
        safety: SafetyLayer,
        validator: ImageValidator,
        postprocess: PostProcessingPipeline,
        cost_sink: ImageCostSink | None = None,
        stream_sink: ImageStreamSink | None = None,
        observability: ProviderObservability | None = None,
    ) -> None:
        self._provider_selector = provider_selector
        self._model_router = model_router
        self._prompt_builder = prompt_builder
        self._style = style_pipeline
        self._enhancement = enhancement
        self._size_policy = size_policy
        self._safety = safety
        self._validator = validator
        self._postprocess = postprocess
        self._cost_sink = cost_sink if cost_sink is not None else NoOpImageCostSink()
        self._stream_sink = stream_sink if stream_sink is not None else NoOpImageStreamSink()
        self._obs = observability if observability is not None else ProviderObservability()

    async def generate(self, request: ImageRequest) -> GeneratedImage:
        spec = request.spec
        provider = self._provider_selector.select()  # provider only (req 5)
        model = self._model_router.default()  # model only (req 6)

        base = self._prompt_builder.build(spec)
        styled = self._style.apply(base, spec)
        prompt = self._enhancement.run(styled, spec)
        negative = self._prompt_builder.negative(spec)

        verdict = self._safety.check(spec, prompt)  # decision only (req 10)
        if not verdict.allowed:
            raise SafetyRejected(verdict.reasons)

        size = self._size_policy.resolve(spec.aspect)
        attempt = 0
        while True:
            self._obs.metrics.incr("image.generate.attempt")
            result = await provider.generate(prompt, size=size)
            post = self._postprocess.run(result.data)
            metadata = ImageMetadata(
                prompt=prompt,
                negative=negative,
                width=result.width,
                height=result.height,
                scene=spec.scene,
                phash=post.phash,
                model=model,
                provider=provider.name,
            )
            await self._cost_sink.record(Usage(model=model), provider=provider.name)
            await self._stream_sink.on_complete()  # integration point (no progressive generation)
            validation = await self._validator.validate(
                result.data, metadata, actor_refs=spec.actor_refs
            )
            self._obs.logger.event(
                "image.generate", model=model, attempt=attempt, passed=validation.passed
            )
            if not should_regenerate(attempt, validation, max_regen=request.max_regen):
                return GeneratedImage(
                    data=result.data,
                    thumbnail=post.thumbnail,
                    metadata=metadata,
                    regens=attempt,
                    passed=validation.passed,
                    issues=list(validation.issues),
                )
            attempt += 1
