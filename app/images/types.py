"""Image Engine contracts (§R6) — immutable (owner req 14). ``ImageSpec`` carries scene / actor
references / style **as data** (§R6.1/§R6.3); the engine encodes no content rules. Metadata mirrors
the storage record (§R6.8): prompt, negative, size, scene, phash (CLIP is a port/RV).
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from dataclasses import dataclass, field

from app.images.aspect import SQUARE, AspectRatio


@dataclass(frozen=True, slots=True)
class SceneDescriptor:
    """Scene selection (§R6.3): diversity dimensions chosen before generation — data, not logic."""

    location: str | None = None
    clothing: str | None = None
    pose: str | None = None
    angle: str | None = None
    emotion: str | None = None

    def as_parts(self) -> tuple[str, ...]:
        values = (self.location, self.clothing, self.pose, self.angle, self.emotion)
        return tuple(value for value in values if value)


@dataclass(frozen=True, slots=True)
class ImageSpec:
    subject: str
    scene: SceneDescriptor = SceneDescriptor()
    actor_refs: Sequence[str] = ()  # reference_images_folder inputs (§R6.1)
    style: Sequence[str] = ()  # style descriptors (applied by the style pipeline)
    negative_hints: Sequence[str] = ()
    aspect: AspectRatio = SQUARE


@dataclass(frozen=True, slots=True)
class ImageRequest:
    spec: ImageSpec
    channel_id: uuid.UUID | None = None
    max_regen: int = 3  # §R6.5 IMAGE_MAX_REGEN (NOT infra MAX_RETRIES)


@dataclass(frozen=True, slots=True)
class ImageMetadata:
    prompt: str
    negative: str
    width: int
    height: int
    scene: SceneDescriptor
    phash: str
    model: str
    provider: str
    clip_embedding: tuple[float, ...] | None = None  # §R6.4 CLIP — port/RV-14


@dataclass(frozen=True, slots=True)
class Usage:
    model: str
    images: int = 1


@dataclass(frozen=True, slots=True)
class GeneratedImage:
    data: bytes
    thumbnail: bytes
    metadata: ImageMetadata
    regens: int
    passed: bool
    issues: Sequence[str] = field(default_factory=tuple)
