# Packaging Strategy

**Category:** Release · **Status:** I (docs) / RV (build/publish — RV-18). **No publication is performed**
(§R21).

## Package structure

- Python package `app/` (with `py.typed`); tests under `tests/` (not shipped). Build metadata in
  `pyproject.toml`.
- Deployable artifact is a **Docker image** (one image, roles = commands, §R12.3), built from
  `docker/Dockerfile`.

## Dependencies

Pinned in `pyproject.toml`; dev deps via PEP 735 `[dependency-groups]`. Production lock: `uv.lock`
([../deployment/dependency-lock.md](../deployment/dependency-lock.md)). Vendor SDKs (aiogram/anthropic/openai)
declared, installed only when wiring real adapters (RV-10).

## Build (documented, not executed here)

```bash
uv lock                                   # produce uv.lock (RV-18)
docker build -f docker/Dockerfile -t <REGISTRY>/telegram-platform:<VERSION> .   # RV-1
```

## Publication (documented, not executed here)

```bash
docker push <REGISTRY>/telegram-platform:<VERSION>   # RV-18 — not performed
```

Publication and image signing happen only through the release pipeline after the gate passes; placeholders
`<REGISTRY>`/`<VERSION>` are filled at release time.

## Status

Package structure and build/publish **procedure** are documented; real build/lock/publish are **Runtime
Verification Pending** (RV-1/RV-18).

## Related

[Versioning](versioning.md) · [Dependency lock](../deployment/dependency-lock.md) · [Release](README.md).
