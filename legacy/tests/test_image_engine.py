"""Unit tests for Image Engine (offline: FakeImageProvider, no DB/network)."""

from pathlib import Path

from app.config import Settings
from image_engine.prompting import SCENES, build_image_prompt
from image_engine.provider import FakeImageProvider, get_image_provider
from image_engine.similarity import average_hash, hamming_distance, is_duplicate
from image_engine.storage import save_image


# ── prompting ────────────────────────────────────────────────────────────
def test_prompt_rotates_scene_by_seed():
    p0 = build_image_prompt(title="Cats", body=None, seed=0)
    p1 = build_image_prompt(title="Cats", body=None, seed=1)
    assert SCENES[0] in p0
    assert SCENES[1] in p1
    assert p0 != p1


def test_prompt_uses_body_when_no_title_and_has_fallback():
    assert "Dogs" in build_image_prompt(title=None, body="Dogs are great", seed=0)
    assert "topic of the post" in build_image_prompt(title=None, body="", seed=0)


# ── provider ─────────────────────────────────────────────────────────────
async def test_fake_provider_deterministic_png():
    provider = FakeImageProvider()
    a = await provider.generate("prompt one")
    b = await provider.generate("prompt one")
    c = await provider.generate("prompt two")
    assert a[:8] == b"\x89PNG\r\n\x1a\n"  # PNG signature
    assert a == b  # deterministic
    assert a != c  # varies with prompt


def test_get_image_provider_falls_back_to_fake_without_key():
    provider = get_image_provider(Settings(image_provider="openai", image_api_key=None))
    assert isinstance(provider, FakeImageProvider)


# ── similarity ───────────────────────────────────────────────────────────
async def test_average_hash_identical_and_different():
    provider = FakeImageProvider()
    img1 = await provider.generate("scene A")
    img1_again = await provider.generate("scene A")
    img2 = await provider.generate("scene B")
    assert average_hash(img1) == average_hash(img1_again)
    assert average_hash(img1) != average_hash(img2)


def test_hamming_and_duplicate_threshold():
    h = 0b1010_1010
    assert hamming_distance(h, h) == 0
    assert hamming_distance(0b0000, 0b1111) == 4
    # within threshold → duplicate; beyond → not
    assert is_duplicate(h, [h ^ 0b0001], threshold=1)
    assert not is_duplicate(h, [h ^ 0b1111], threshold=2)
    assert not is_duplicate(h, [], threshold=5)


# ── storage ──────────────────────────────────────────────────────────────
def test_save_image_writes_and_returns_relative_path(tmp_path: Path):
    rel = save_image(b"\x89PNG\r\n\x1a\nfake", media_root=str(tmp_path))
    assert rel.startswith("images/") and rel.endswith(".png")
    written = tmp_path / rel
    assert written.exists()
    assert written.read_bytes().startswith(b"\x89PNG")
