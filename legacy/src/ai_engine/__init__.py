"""AI Engine — text generation pipeline: generate -> self-review -> validation -> humanization.

Layout:
- client.py    LLMClient protocol + AnthropicClient / FakeLLMClient
- prompts.py   prompt builders (persona system + per-stage prompts)
- pipeline.py  run_pipeline() + light validation
- handler.py   registers the `generate_text` task handler

Call `register()` at startup to install the handler into scheduler.registry.
Depends on: db (Stage 2), scheduler (Stage 3).
"""

from __future__ import annotations


def register() -> None:
    """Register AI Engine task handlers into scheduler.registry (explicit, idempotent-safe)."""
    from app.models.enums import TaskType
    from scheduler.registry import register as register_handler

    from .handler import handle_generate_text

    register_handler(TaskType.generate_text)(handle_generate_text)
