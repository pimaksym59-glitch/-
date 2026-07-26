"""Image Engine composition root (§R6, §R2.10). Wires the engine with the Stage-11 provider factory
and offline-safe defaults (deterministic fake provider + fake validator, no-op cost/stream
hooks). Real
providers (Nano Banana/Flux/OpenAI/Ideogram) and the real image validator (CLIP/face-embedding) plug
in here without changing the engine (RV-14). The engine is provider-agnostic.
"""

from __future__ import annotations

from app.core.config import Settings
from app.core.providers.factory import ProviderFactory
from app.images.cost import ImageCostSink
from app.images.engine import ImageEngine
from app.images.enhancement import PromptEnhancementPipeline
from app.images.fakes import FakeImageValidator
from app.images.postprocess import PostProcessingPipeline
from app.images.prompt import ImagePromptBuilder
from app.images.safety import SafetyLayer
from app.images.selection import ImageModelRouter, ImageProviderSelector
from app.images.size import BoundedSizePolicy, SizePolicy
from app.images.streaming import ImageStreamSink
from app.images.style import StylePipeline
from app.images.types import GeneratedImage, ImageRequest
from app.images.validation import ImageValidator
from app.services.providers import build_provider_factory


def build_image_engine(
    settings: Settings,
    *,
    provider_factory: ProviderFactory | None = None,
    validator: ImageValidator | None = None,
    safety: SafetyLayer | None = None,
    size_policy: SizePolicy | None = None,
    cost_sink: ImageCostSink | None = None,
    stream_sink: ImageStreamSink | None = None,
) -> ImageEngine:
    """Assemble an :class:`ImageEngine`. Defaults are fully offline (fake provider + fake
    validator)."""
    factory = provider_factory if provider_factory is not None else build_provider_factory(settings)
    return ImageEngine(
        provider_selector=ImageProviderSelector(factory),
        model_router=ImageModelRouter(),
        prompt_builder=ImagePromptBuilder(),
        style_pipeline=StylePipeline(),
        enhancement=PromptEnhancementPipeline(),
        size_policy=size_policy if size_policy is not None else BoundedSizePolicy(),
        safety=safety if safety is not None else SafetyLayer(),
        validator=validator if validator is not None else FakeImageValidator(),
        postprocess=PostProcessingPipeline(),
        cost_sink=cost_sink,
        stream_sink=stream_sink,
    )


async def generate_image(settings: Settings, request: ImageRequest) -> GeneratedImage:
    """Convenience: build the engine and generate one image (offline defaults)."""
    return await build_image_engine(settings).generate(request)
