"""Image composition tests (§R6, §R2.10): build_image_engine / generate_image offline on fakes."""

from __future__ import annotations

import pytest

from app.core.config import Settings
from app.core.providers.registry import FAKE_NAME
from app.images.fakes import FakeImageValidator
from app.images.types import ImageRequest, ImageSpec
from app.services.images import build_image_engine, generate_image


@pytest.fixture(autouse=True)
def _no_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setitem(Settings.model_config, "env_file", None)
    for var in ("ANTHROPIC_API_KEY", "OPENAI_API_KEY", "TELEGRAM_BOT_TOKEN"):
        monkeypatch.delenv(var, raising=False)


def _request() -> ImageRequest:
    return ImageRequest(spec=ImageSpec(subject="a fox in a forest"))


async def test_generate_image_offline() -> None:
    result = await generate_image(Settings(), _request())
    assert result.passed and result.metadata.provider == FAKE_NAME
    assert result.data and result.thumbnail


async def test_build_image_engine_accepts_injected_validator() -> None:
    engine = build_image_engine(
        Settings(), validator=FakeImageValidator(passed=False, issues=["artifacts"])
    )
    result = await engine.generate(ImageRequest(spec=ImageSpec(subject="a fox"), max_regen=1))
    assert not result.passed and result.regens == 1
