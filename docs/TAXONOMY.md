# Documentation Taxonomy

Every document is classified by **category**, **audience**, and **status**. This keeps responsibilities clear
and prevents duplication of `MASTER_SPEC.md` (the Source of Truth).

## Categories

- **Architecture** — structure, boundaries, contracts, dependencies (what/why).
- **API** — public interfaces only (never internal implementation details).
- **Developer** — how to build/test/extend the code.
- **Operations** — run/monitor/diagnose/maintain a running system.
- **Deployment** — how to provision and ship.
- **Security** — secrets, keys, tokens, permissions, hardening.
- **Runbooks** — incident response, one scenario per document.
- **Troubleshooting** — common problems and fixes.
- **Release** — versioning, checklists, upgrade/rollback, packaging.
- **Support** — support/maintenance workflows.

## Audience

`all` · `contributors` · `integrators` · `operators` · `on-call` · `security` · `release-eng` · `support`.

## Status (mirrors the engineering statuses)

- **Implemented (I)** — the artifact exists and is complete.
- **Statically Verified (SV)** — cross-checked against code/specs offline (ruff/mypy/pytest, links, tables).
- **Runtime Verification Pending (RV)** — describes behaviour that requires live infrastructure/tooling to
  confirm (see `RUNTIME_VERIFICATION_REGISTRY.md`).

## Rules

1. Documents **reference** `MASTER_SPEC.md`/specs; they never restate requirements as new truth.
2. Every operational/deployment/release document states which parts are **RV**.
3. Templates and checklists are **deterministic** — variable values are placeholders (`<VERSION>`, `<DATE>`,
   `<HOST>`), never live values.
4. Cross-references connect the ten categories (see each section's "Related" footer).
