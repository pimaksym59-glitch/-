"""Unit tests for the Validation layer (pure rules + composition)."""

from validation.rules import (
    check_banned,
    check_duplicate,
    check_image,
    check_length,
    jaccard_similarity,
)
from validation.validator import validate_post


# ── individual rules ─────────────────────────────────────────────────────
def test_check_length():
    assert check_length("hi", min_chars=10, max_chars=100) is not None
    assert check_length("x" * 200, min_chars=10, max_chars=100) is not None
    assert check_length("hello world!", min_chars=5, max_chars=100) is None


def test_check_banned_case_insensitive():
    assert check_banned("Buy CRYPTO now", ["crypto"]) is not None
    assert check_banned("clean text", ["crypto", "spam"]) is None
    assert check_banned("anything", []) is None


def test_jaccard_and_duplicate():
    assert jaccard_similarity("the cat sat", "the cat sat") == 1.0
    assert jaccard_similarity("abc def", "xyz uvw") == 0.0
    assert check_duplicate("the cat sat", ["the cat sat here"], threshold=0.9) is None
    assert check_duplicate("the cat sat", ["the cat sat"], threshold=0.9) is not None


def test_check_image():
    assert check_image(None, image_exists=False) is None
    assert check_image("images/a.png", image_exists=True) is None
    assert check_image("images/a.png", image_exists=False) is not None


# ── composition ──────────────────────────────────────────────────────────
def _validate(body, **over):
    kwargs = dict(
        body=body,
        image_path=None,
        image_exists=True,
        recent_bodies=[],
        min_chars=10,
        max_chars=4096,
        banned_patterns=[],
        duplicate_threshold=0.9,
    )
    kwargs.update(over)
    return validate_post(**kwargs)


def test_valid_post_passes():
    result = _validate("This is a perfectly fine post about cats and dogs.")
    assert result.ok
    assert result.issues == []


def test_invalid_post_accumulates_issues():
    result = _validate(
        "spam",  # too short + banned
        banned_patterns=["spam"],
        image_path="images/missing.png",
        image_exists=False,
    )
    assert not result.ok
    assert len(result.issues) >= 2  # length + banned + image
