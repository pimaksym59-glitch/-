"""Image Engine — provider-agnostic image generation, prompt/scene diversity, similarity checks.

Layout:
- provider.py    ImageProvider protocol + OpenAIImageProvider / FakeImageProvider
- prompting.py   image prompt builder with scene rotation
- similarity.py  aHash + Hamming duplicate detection
- storage.py     save PNG under media root → relative path
- handler.py     registers the `generate_image` task handler

Call `register()` at startup to install the handler into scheduler.registry.
Depends on: db (Stage 2), scheduler (Stage 3).
"""

from __future__ import annotations


def register() -> None:
    """Register Image Engine task handlers into scheduler.registry."""
    from app.models.enums import TaskType
    from scheduler.registry import register as register_handler

    from .handler import handle_generate_image

    register_handler(TaskType.generate_image)(handle_generate_image)
