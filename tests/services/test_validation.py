"""Validation composition tests (§R5.5): OutputValidator adapter + AI-Engine integration."""

from __future__ import annotations

import pytest

from app.content.types import GenerationRequest, PromptSpec, Role
from app.core.config import Settings
from app.models.enums import PromptType
from app.services.validation import (
    ValidationContextTemplate,
    build_ai_engine_with_validation,
    build_output_validator,
)


@pytest.fixture(autouse=True)
def _no_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setitem(Settings.model_config, "env_file", None)
    for var in ("ANTHROPIC_API_KEY", "OPENAI_API_KEY", "TELEGRAM_BOT_TOKEN"):
        monkeypatch.delenv(var, raising=False)


async def test_output_validator_accepts_clean_text() -> None:
    validator = build_output_validator(Settings())
    result = await validator.validate("A warm morning post about coffee.")
    assert result.passed and not result.issues


async def test_output_validator_gates_banned_word() -> None:
    template = ValidationContextTemplate(banned_words=["crypto"])
    validator = build_output_validator(Settings(), template=template)
    result = await validator.validate("Buy crypto now")
    assert not result.passed and any("banned word" in issue for issue in result.issues)


async def test_ai_engine_with_validation_generates_offline() -> None:
    # FakeLLMProvider emits deterministic text; the default validator passes it -> generation OK.
    engine = build_ai_engine_with_validation(Settings())
    spec = PromptSpec(prompt_type=PromptType.story, role=Role.body, task="write")
    result = await engine.generate(GenerationRequest(spec=spec))
    assert result.provider == "fake"
    assert result.passed  # validator plugged into the Stage-12 seam, engine unchanged
