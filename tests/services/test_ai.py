"""AI Engine composition tests (§R2.10): build_ai_engine wires offline defaults; generation OK."""

from __future__ import annotations

import pytest

from app.content.cost import RecordingCostSink
from app.content.types import GenerationRequest, PromptSpec, Role
from app.core.config import Settings
from app.core.providers.registry import FAKE_NAME
from app.models.enums import PromptType
from app.services.ai import build_ai_engine
from app.services.providers import build_provider_factory


@pytest.fixture(autouse=True)
def _no_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setitem(Settings.model_config, "env_file", None)
    for var in ("ANTHROPIC_API_KEY", "OPENAI_API_KEY", "TELEGRAM_BOT_TOKEN"):
        monkeypatch.delenv(var, raising=False)


def _request() -> GenerationRequest:
    spec = PromptSpec(prompt_type=PromptType.story, role=Role.body, task="write")
    return GenerationRequest(spec=spec)


async def test_build_ai_engine_generates_offline_with_fake() -> None:
    cost = RecordingCostSink()
    engine = build_ai_engine(Settings(), cost_sink=cost)
    result = await engine.generate(_request())
    assert result.provider == FAKE_NAME and result.passed
    assert result.model == "claude-opus-4-8"
    assert cost.records  # cost hook fired


async def test_build_ai_engine_accepts_injected_factory() -> None:
    factory = build_provider_factory(Settings())
    engine = build_ai_engine(Settings(), provider_factory=factory)
    result = await engine.generate(_request())
    assert result.provider == FAKE_NAME
