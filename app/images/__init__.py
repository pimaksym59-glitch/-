"""Domain: image generation (§R6). The Image Engine (:class:`app.images.engine.ImageEngine`) is a
provider-agnostic orchestrator over the Stage-11 ``ImageProvider`` protocol. No DB session, no HTTP,
no content rules; identity is by reference (§R6.1). Independent of the AI and Validation engines.
"""

from __future__ import annotations

from app.images.aspect import LANDSCAPE, PORTRAIT, SQUARE, STANDARD, AspectRatio
from app.images.base import ImageProvider, ImageResult
from app.images.engine import ImageEngine
from app.images.regen import RegenDecision, decide, should_regenerate
from app.images.safety import SafetyLayer, SafetyRejected, SafetyVerdict
from app.images.selection import ImageModelRouter, ImageProviderSelector
from app.images.types import (
    GeneratedImage,
    ImageMetadata,
    ImageRequest,
    ImageSpec,
    SceneDescriptor,
    Usage,
)
from app.images.validation import ImageValidationResult, ImageValidator

__all__ = [
    "LANDSCAPE",
    "PORTRAIT",
    "SQUARE",
    "STANDARD",
    "AspectRatio",
    "GeneratedImage",
    "ImageEngine",
    "ImageMetadata",
    "ImageModelRouter",
    "ImageProvider",
    "ImageProviderSelector",
    "ImageRequest",
    "ImageResult",
    "ImageSpec",
    "ImageValidationResult",
    "ImageValidator",
    "RegenDecision",
    "SafetyLayer",
    "SafetyRejected",
    "SafetyVerdict",
    "SceneDescriptor",
    "Usage",
    "decide",
    "should_regenerate",
]
