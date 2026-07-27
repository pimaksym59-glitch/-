# Dependency Lock (§R12.13)

**Category:** Deployment · **Status:** I (pinned in `pyproject.toml`) / RV (`uv.lock` generation — RV-18).

## Policy

Dependencies use **fixed versions**; upgrades go through the test gate before adoption (§R12.13). Runtime
dependencies are pinned in `pyproject.toml`; dev dependencies via PEP 735 `[dependency-groups]`.

## Lockfile

A fully hashed `uv.lock` is the intended production lock. Generating it requires `uv` + network access to
resolve hashes:

```bash
uv lock            # produces uv.lock (RV-18 — not run in this environment)
uv sync --frozen   # install exactly from the lock
```

Until then, `pyproject.toml` pins exact versions and is the reference. Vendor SDKs (aiogram/anthropic/openai)
are **declared but not installed/imported** — real adapters are RV-10.

## Status

Version pinning is implemented; producing and committing a real `uv.lock` (and CI `--frozen` installs) is
**Runtime Verification Pending** (RV-18). See [packaging](../release/packaging.md).
