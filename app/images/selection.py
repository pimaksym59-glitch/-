"""Provider selection and model routing — **independent** mechanisms (owner req 5/6, §R6.9).
``ImageProviderSelector`` picks only the provider (via the Stage-11 factory;
identity-conditioning is
a provider capability, §R6.1) and knows nothing about models. ``ImageModelRouter`` picks only the
model from a declarative table and knows nothing about providers. (The Stage-11 ``ImageProvider``
protocol takes no model argument, so the chosen model is carried in metadata; a real adapter that
accepts a model is an extension.)
"""

from __future__ import annotations

from typing import cast

from app.core.providers.base import ProviderKind
from app.core.providers.factory import ProviderFactory
from app.images.base import ImageProvider

_DEFAULT_MODEL = "flux-pro"
# Declarative model routing by intent (§R6.9) — independent of provider selection.
_MODEL_BY_KIND: dict[str, str] = {
    "photo": "flux-pro",
    "art": "ideogram-v2",
    "avatar": "flux-pro",
}


class ImageProviderSelector:
    def __init__(self, factory: ProviderFactory) -> None:
        self._factory = factory

    def select(self) -> ImageProvider:
        return cast(ImageProvider, self._factory.create(ProviderKind.image))


class ImageModelRouter:
    def default(self) -> str:
        return _DEFAULT_MODEL

    def model_for(self, kind: str) -> str:
        return _MODEL_BY_KIND.get(kind, _DEFAULT_MODEL)
