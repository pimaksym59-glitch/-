# Developer Documentation

**Category:** Developer · **Audience:** contributors · **Status:** SV. See also root `CONTRIBUTING.md`.

## Getting started

Requirements: Python `>=3.13` (dev venv 3.14). From the repo root:

```bash
python -m venv .venv
.venv/Scripts/pip install -e ".[dev]"   # Windows; use .venv/bin on POSIX
```

Run the gate (all offline):

```bash
.venv/Scripts/ruff.exe check .
.venv/Scripts/python.exe -m mypy
.venv/Scripts/pytest.exe -q
```

Config sanity: `python -m app doctor`. Convenience targets: `make gate` (see repo `Makefile`).

## Coding standards (§3 / §12)

- Python 3.13+, full typing, `from __future__ import annotations` in every module.
- **ruff** (format+lint): line-length 100; rules `E,F,W,I,UP,B,C4,SIM,TID,RUF`; PEP 695 generics;
  `enum.StrEnum`; no `print()`; no ambiguous unicode.
- **mypy --strict: 0 errors, 0 `type: ignore`** — narrow structurally / via fakes, never ignore.
- Frozen DTOs (`@dataclass(frozen=True, slots=True)`); all interfaces are `Protocol`; ports + fakes; secrets
  only via env; no magic strings/numbers (use KeyBuilder / ttl / config / §Appendix B).
- Files ≤ ~400–500 lines; one class = one responsibility.

## Testing

Offline-first (§R2.10) via provider/port fakes; unit always in CI, integration gated behind
`RUN_INTEGRATION=1`. The Stage-19 harness lives outside `app/` in `tests/framework|contract|e2e`
(SeedManager, factories/fixtures, nine strategies, contract & E2E). Guide: `TEST_PLAN.md`.

## Extension points (seams → RV)

Real vendor adapters (LLM/image/embedding/Bot API), telemetry exporters (OTel/Prometheus), Web UI (HTMX/SPA),
external SSO/MFA, CI/CD, distributed test execution, mutation/property tooling — all declared as **seams**
(`raise NotImplementedError`) and tracked in `RUNTIME_VERIFICATION_REGISTRY.md`. Wire them in composition roots
without changing domains.

## Related

[Architecture](../architecture/README.md) · [Release](../release/README.md) · [API](../api/README.md).
