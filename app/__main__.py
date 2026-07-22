"""CLI entrypoint: ``python -m app <command>``.

Stage 2 provides ``doctor`` — a **configuration** check only (no network connections): it reports
which parts of the config are present/valid, useful before wiring real services in later stages.
"""

from __future__ import annotations

import argparse
import sys

from app.core import config


def _marks() -> tuple[str, str]:
    """Return (ok, bad) marks the current stdout can encode; fall back to ASCII."""
    encoding = sys.stdout.encoding or "ascii"
    try:
        "✓✗".encode(encoding)
    except (UnicodeEncodeError, LookupError):
        return "[OK]", "[--]"
    return "✓", "✗"


def _yaml_present(app_env: str) -> bool:
    return (config.CONFIG_DIR / "global.yaml").is_file() or (
        config.CONFIG_DIR / f"{app_env}.yaml"
    ).is_file()


def doctor() -> int:
    """Print configuration status (config-only, no connections). Always exits 0."""
    ok, bad = _marks()
    settings = config.get_settings()

    checks: list[tuple[str, bool]] = [
        ("env loaded", True),
        ("yaml loaded", _yaml_present(settings.app_env.value)),
        ("postgres configured", settings.database_url is not None),
        ("redis configured", settings.redis_url is not None),
        ("storage configured", settings.storage_dir.is_dir()),
        ("openai configured", settings.openai_api_key is not None),
        ("anthropic configured", settings.anthropic_api_key is not None),
        ("telegram configured", settings.telegram_bot_token is not None),
    ]

    lines = [
        f"Configuration doctor (config-only; no connections) — env={settings.app_env.value}",
        *(f"  {ok if passed else bad} {label}" for label, passed in checks),
    ]
    print("\n".join(lines))
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="app", description="AI Telegram Automation Platform CLI")
    sub = parser.add_subparsers(dest="command")
    sub.add_parser("doctor", help="check configuration (no network connections)")

    args = parser.parse_args(argv)
    if args.command == "doctor":
        return doctor()
    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
