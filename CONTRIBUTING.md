# Contributing

Full developer guide: [`docs/developer/README.md`](docs/developer/README.md). This is the quick reference.

## Setup

```bash
python -m venv .venv
.venv/Scripts/pip install -e ".[dev]"     # Windows; use .venv/bin on POSIX
```

## Gate (must pass before every commit)

```bash
ruff format --check .
ruff check .
python -m mypy          # --strict, 0 type: ignore
python -m pytest -q     # offline; integration behind RUN_INTEGRATION=1
```

Or `make gate`.

## Standards (§3 / §12)

- Python 3.13+, full typing, `from __future__ import annotations`, PEP 695 generics.
- ruff line-length 100 (`E,F,W,I,UP,B,C4,SIM,TID,RUF`); no `print()`; no ambiguous unicode.
- `mypy --strict`: **0 errors, 0 `type: ignore`** — narrow structurally / via fakes.
- Frozen DTOs; interfaces are `Protocol`; ports + deterministic fakes; secrets only via env.
- Keep subsystems independent; wire cross-subsystem only in composition roots.

## Architecture rules

- **Architecture Freeze is ACTIVE.** Changing the architecture, a public Protocol, or a layering rule requires
  an ADR (`docs/adr/`) and a MAJOR version bump.
- Domains must not import other domains, `app.api`, `app.services`, `app.db`, `fastapi`, or `sqlalchemy`
  (enforced by `tests/test_layering.py`).
- Production (`app/`) must never import `tests/` (enforced by `tests/framework/test_independence.py`).

## Tests

Add unit tests for pure logic (always in CI); gate live-service paths behind `RUN_INTEGRATION=1`. Reuse the
Stage-19 harness (`tests/framework`): `SeedManager`, factories/fixtures, contract & E2E. See `TEST_PLAN.md`.

## Security

Report vulnerabilities per [`SECURITY.md`](SECURITY.md) — do not open public issues.
