"""Image fake tests (§R6, owner req 4/11): Protocol-conformant, deterministic PNG, offline."""

from __future__ import annotations

from app.core.providers.base import Capability, ProviderKind
from app.images.base import ImageProvider
from app.images.fakes import FakeImageProvider

_PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def test_fake_image_conforms_to_protocol() -> None:
    provider: ImageProvider = FakeImageProvider()
    assert provider.kind is ProviderKind.image
    assert Capability.image_generation in provider.capabilities()
    assert Capability.image_identity_reference in provider.capabilities()


async def test_fake_image_produces_deterministic_png() -> None:
    a = await FakeImageProvider().generate("cat", size=(16, 16))
    b = await FakeImageProvider().generate("cat", size=(16, 16))
    assert a.data == b.data  # deterministic bytes
    assert a.data.startswith(_PNG_SIGNATURE)
    assert a.mime == "image/png" and a.width == 16 and a.height == 16
    other = await FakeImageProvider().generate("dog", size=(16, 16))
    assert other.data != a.data  # different prompt -> different image


async def test_fake_image_records_prompts_and_healthy() -> None:
    provider = FakeImageProvider()
    await provider.generate("x")
    assert provider.prompts == ["x"]
    assert (await provider.health()).healthy is True
