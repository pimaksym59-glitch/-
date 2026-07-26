"""Image component tests (§R6): aspect/size, prompt/style/enhancement, safety, post-processing."""

from __future__ import annotations

import dataclasses
import io

import pytest
from PIL import Image

from app.images.aspect import LANDSCAPE, PORTRAIT, SQUARE, AspectRatio
from app.images.enhancement import (
    DEFAULT_ENHANCERS,
    PromptEnhancementPipeline,
    QualityTagsEnhancer,
)
from app.images.postprocess import PostProcessingPipeline
from app.images.prompt import ImagePromptBuilder
from app.images.regen import RegenDecision, decide, should_regenerate
from app.images.safety import SafetyLayer
from app.images.size import BoundedSizePolicy, SizeLimits
from app.images.style import StylePipeline
from app.images.types import ImageSpec, SceneDescriptor
from app.images.validation import ImageValidationResult

# --- aspect ratio (req 8) ------------------------------------------------------------------------


def test_aspect_ratio_is_a_model_not_strings() -> None:
    assert LANDSCAPE.value == pytest.approx(16 / 9)
    assert SQUARE.value == 1.0
    with pytest.raises(ValueError, match="positive"):
        AspectRatio(0, 1)


def test_aspect_ratio_is_frozen() -> None:
    ratio = AspectRatio(4, 3)
    name = "width"
    with pytest.raises(dataclasses.FrozenInstanceError):
        setattr(ratio, name, 5)


# --- size policy (req 9) -------------------------------------------------------------------------


def test_size_policy_resolves_within_limits_and_multiple() -> None:
    policy = BoundedSizePolicy(target_long_side=1024, limits=SizeLimits(multiple_of=64))
    assert policy.resolve(LANDSCAPE) == (1024, 576)  # 16:9
    assert policy.resolve(PORTRAIT) == (576, 1024)  # 9:16
    assert policy.resolve(SQUARE) == (1024, 1024)
    w, h = policy.resolve(LANDSCAPE)
    assert w % 64 == 0 and h % 64 == 0


# --- prompt / style / enhancement (req 3/4/7) ----------------------------------------------------


def test_prompt_builder_base_only() -> None:
    builder = ImagePromptBuilder()
    spec = ImageSpec(subject="a fox", scene=SceneDescriptor(location="forest"))
    assert builder.build(spec) == "a fox, forest"  # subject + scene, no style/quality tags
    assert "blurry" in builder.negative(spec)


def test_style_pipeline_is_separate_layer() -> None:
    styled = StylePipeline().apply("a fox", ImageSpec(subject="a fox", style=["cinematic", "warm"]))
    assert styled == "a fox, cinematic, warm"
    assert StylePipeline().apply("a fox", ImageSpec(subject="a fox")) == "a fox"  # no style -> noop


def test_enhancement_is_modular_and_extensible() -> None:
    class _Tag:
        def enhance(self, prompt: str, spec: ImageSpec) -> str:
            return f"{prompt}, EXTRA"

    pipeline = PromptEnhancementPipeline([*DEFAULT_ENHANCERS, _Tag()])
    out = pipeline.run("a fox", ImageSpec(subject="a fox"))
    assert out.endswith(", EXTRA") and "high detail" in out


def test_enhancer_protocol_shape() -> None:
    assert QualityTagsEnhancer().enhance("x", ImageSpec(subject="x")).startswith("x,")


# --- safety (req 10) -----------------------------------------------------------------------------


def test_safety_blocks_real_person_and_allows_clean() -> None:
    safety = SafetyLayer(banned_terms=["gore"])
    assert not safety.check(ImageSpec(subject="x"), "a real celebrity portrait").allowed
    assert not safety.check(ImageSpec(subject="x"), "graphic gore scene").allowed
    assert safety.check(ImageSpec(subject="x"), "a fictional fox in a forest").allowed


# --- post-processing (req 12) --------------------------------------------------------------------


def _png(pixels: list[tuple[int, int, int]]) -> bytes:
    img = Image.new("RGB", (2, 2))
    img.putdata(pixels)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


def test_postprocess_thumbnail_and_phash_deterministic() -> None:
    pipeline = PostProcessingPipeline()
    data = _png([(0, 0, 0), (255, 255, 255), (255, 255, 255), (0, 0, 0)])
    a = pipeline.run(data)
    b = pipeline.run(data)
    assert a.phash == b.phash and len(a.phash) == 16  # deterministic 64-bit hex
    assert a.thumbnail  # non-empty PNG bytes
    other = pipeline.run(_png([(255, 255, 255)] * 4))  # solid -> different hash
    assert other.phash != a.phash


# --- regen (§R6.5) -------------------------------------------------------------------------------


def test_regen_decision() -> None:
    ok = ImageValidationResult(passed=True)
    bad = ImageValidationResult(passed=False, issues=["hands"])
    assert not should_regenerate(0, ok, max_regen=3)
    assert should_regenerate(0, bad, max_regen=3)
    assert not should_regenerate(3, bad, max_regen=3)
    assert decide(ok, 0, max_regen=3) is RegenDecision.accept
    assert decide(bad, 0, max_regen=3) is RegenDecision.regenerate
    assert decide(bad, 3, max_regen=3) is RegenDecision.needs_review
