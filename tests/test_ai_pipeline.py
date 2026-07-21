"""Unit tests for the AI Engine pipeline (FakeLLMClient — no network/DB)."""

import pytest

from ai_engine.client import FakeLLMClient, get_llm_client
from ai_engine.pipeline import ContentValidationError, run_pipeline, validate
from ai_engine.prompts import build_system
from app.config import Settings


async def test_pipeline_runs_three_stages():
    llm = FakeLLMClient()
    content = await run_pipeline(
        llm,
        channel_title="Tech Daily",
        persona_system="You are witty.",
        tone="casual",
        language="en",
    )
    # generate → self-review → humanize
    assert len(llm.calls) == 3
    assert content.body.startswith("[fake]")
    # every stage received the persona-derived system prompt
    assert all("You are witty." in system for system, _ in llm.calls)


async def test_pipeline_validates_non_empty(monkeypatch):
    class EmptyLLM:
        async def complete(self, *, system, user, max_tokens=4096):
            return "   "

    with pytest.raises(ContentValidationError):
        await run_pipeline(
            EmptyLLM(), channel_title="X", persona_system=None, tone=None, language="ru"
        )


def test_validate_rejects_too_long():
    with pytest.raises(ContentValidationError):
        validate("x" * 5000)


def test_build_system_includes_persona_and_language():
    system = build_system(persona_system="Persona voice.", tone="formal", language="de")
    assert "Persona voice." in system
    assert "formal" in system
    assert "de" in system


def test_build_system_defaults_without_persona():
    system = build_system(persona_system=None, tone=None, language="ru")
    assert "Telegram" in system  # DEFAULT_SYSTEM used
    assert "ru" in system


def test_get_llm_client_selects_fake_without_key():
    assert isinstance(get_llm_client(Settings(anthropic_api_key=None)), FakeLLMClient)
