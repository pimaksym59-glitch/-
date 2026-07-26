"""Image engine + selection + seams tests (offline on FakeImageProvider): orchestration, regen."""

from __future__ import annotations

import pytest

from app.core.config import Settings
from app.core.providers.base import ProviderKind
from app.core.providers.factory import ProviderFactory
from app.core.providers.registry import FAKE_NAME, ProviderRegistry
from app.images.aspect import LANDSCAPE
from app.images.batch import BatchGenerator
from app.images.cost import NoOpImageCostSink, RecordingImageCostSink
from app.images.engine import ImageEngine
from app.images.enhancement import PromptEnhancementPipeline
from app.images.fakes import FakeImageProvider, FakeImageValidator
from app.images.postprocess import PostProcessingPipeline
from app.images.prompt import ImagePromptBuilder
from app.images.safety import SafetyLayer, SafetyRejected
from app.images.selection import ImageModelRouter, ImageProviderSelector
from app.images.size import BoundedSizePolicy
from app.images.streaming import NoOpImageStreamSink
from app.images.style import StylePipeline
from app.images.types import ImageRequest, ImageSpec, Usage
from app.images.validation import ImageValidator


@pytest.fixture(autouse=True)
def _no_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setitem(Settings.model_config, "env_file", None)
    for var in ("ANTHROPIC_API_KEY", "OPENAI_API_KEY", "TELEGRAM_BOT_TOKEN"):
        monkeypatch.delenv(var, raising=False)


class _RecordingStream:
    def __init__(self) -> None:
        self.completed = 0

    async def on_progress(self, fraction: float) -> None: ...

    async def on_complete(self) -> None:
        self.completed += 1


def _engine(
    *,
    validator: ImageValidator | None = None,
    cost_sink: RecordingImageCostSink | None = None,
    stream_sink: _RecordingStream | None = None,
    safety: SafetyLayer | None = None,
) -> ImageEngine:
    registry = ProviderRegistry()
    registry.register(ProviderKind.image, FAKE_NAME, lambda _s: FakeImageProvider())
    return ImageEngine(
        provider_selector=ImageProviderSelector(ProviderFactory(registry, Settings())),
        model_router=ImageModelRouter(),
        prompt_builder=ImagePromptBuilder(),
        style_pipeline=StylePipeline(),
        enhancement=PromptEnhancementPipeline(),
        size_policy=BoundedSizePolicy(),
        safety=safety if safety is not None else SafetyLayer(),
        validator=validator if validator is not None else FakeImageValidator(),
        postprocess=PostProcessingPipeline(),
        cost_sink=cost_sink,
        stream_sink=stream_sink,
    )


def _request(*, max_regen: int = 3) -> ImageRequest:
    spec = ImageSpec(subject="a fox", style=["cinematic"], aspect=LANDSCAPE)
    return ImageRequest(spec=spec, max_regen=max_regen)


# --- selection (req 5/6) -------------------------------------------------------------------------


def test_provider_selection_and_model_routing_independent() -> None:
    registry = ProviderRegistry()
    registry.register(ProviderKind.image, FAKE_NAME, lambda _s: FakeImageProvider())
    provider = ImageProviderSelector(ProviderFactory(registry, Settings())).select()
    assert provider.kind is ProviderKind.image and provider.name == FAKE_NAME
    assert ImageModelRouter().default() == "flux-pro"  # model chosen without any provider
    assert ImageModelRouter().model_for("art") == "ideogram-v2"


# --- engine end-to-end ---------------------------------------------------------------------------


async def test_generate_produces_image_and_metadata() -> None:
    cost, stream = RecordingImageCostSink(), _RecordingStream()
    result = await _engine(cost_sink=cost, stream_sink=stream).generate(_request())
    assert result.passed and result.regens == 0
    assert result.data and result.thumbnail
    assert result.metadata.width == 1024 and result.metadata.height == 576  # LANDSCAPE
    assert result.metadata.model == "flux-pro" and result.metadata.provider == FAKE_NAME
    assert "cinematic" in result.metadata.prompt  # style applied
    assert cost.records and cost.records[0][0] == Usage(model="flux-pro")
    assert stream.completed == 1  # streaming integration point fired


async def test_regen_loop_exhausts_on_failing_validation() -> None:
    engine = _engine(validator=FakeImageValidator(passed=False, issues=["bad hands"]))
    result = await engine.generate(_request(max_regen=2))
    assert result.regens == 2 and not result.passed
    assert list(result.issues) == ["bad hands"]


async def test_safety_layer_blocks_before_generation() -> None:
    with pytest.raises(SafetyRejected):
        await _engine().generate(ImageRequest(spec=ImageSpec(subject="a real celebrity")))


# --- seams (req 13/14/15) ------------------------------------------------------------------------


async def test_noop_seams() -> None:
    await NoOpImageStreamSink().on_progress(0.5)
    await NoOpImageStreamSink().on_complete()
    await NoOpImageCostSink().record(Usage(model="m"), provider="fake")  # must not raise


def test_batch_generator_is_a_protocol_seam() -> None:
    # extension point only (not implemented) — importable Protocol
    assert BatchGenerator.__name__ == "BatchGenerator"
