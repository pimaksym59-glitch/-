"""DI tests (owner req 8): get_provider_factory resolves and is overridable via overrides."""

from __future__ import annotations

from typing import Annotated

import pytest
from fastapi import Depends, FastAPI
from httpx import ASGITransport, AsyncClient

from app.api.deps import get_provider_factory
from app.core.config import Settings
from app.core.providers.base import ProviderKind
from app.core.providers.factory import ProviderFactory
from app.core.providers.registry import FAKE_NAME
from app.services.providers import build_provider_factory


@pytest.fixture(autouse=True)
def _no_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setitem(Settings.model_config, "env_file", None)
    for var in ("ANTHROPIC_API_KEY", "OPENAI_API_KEY", "TELEGRAM_BOT_TOKEN"):
        monkeypatch.delenv(var, raising=False)


def test_get_provider_factory_returns_factory() -> None:
    factory = get_provider_factory()
    assert isinstance(factory, ProviderFactory)
    assert factory.create(ProviderKind.llm).name == FAKE_NAME


def _app() -> FastAPI:
    app = FastAPI()

    @app.get("/llm-name")
    async def _llm_name(
        factory: Annotated[ProviderFactory, Depends(get_provider_factory)],
    ) -> dict[str, str]:
        return {"name": factory.create(ProviderKind.llm).name}

    return app


async def test_dependency_is_overridable() -> None:
    app = _app()
    app.dependency_overrides[get_provider_factory] = lambda: build_provider_factory(Settings())
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/llm-name")
    assert response.status_code == 200
    assert response.json() == {"name": FAKE_NAME}
