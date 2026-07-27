# Documentation Index

Navigational hub for the AI Telegram Automation Platform. **`MASTER_SPEC.md` (repo root) is the single
Source of Truth**; these documents explain and operate the system without duplicating requirements.

## Documentation taxonomy

See [`TAXONOMY.md`](TAXONOMY.md) for the category × audience × status model. Every document declares its
category, audience, and status (Implemented / Statically Verified / Runtime Verification Pending).

## Sections

| Section | Audience | Contents |
|---|---|---|
| [Architecture](architecture/README.md) | all | subsystems, boundaries, contracts, composition, dependencies |
| [API](api/README.md) | integrators | public REST interfaces (`API_SPEC.md` is the contract) |
| [Developer](developer/README.md) | contributors | setup, coding standards, testing, extension points |
| [Operations](operations/README.md) | operators | start/stop/monitor/diagnose/maintain, disaster recovery |
| [Deployment](deployment/README.md) | operators | docker, environment matrix, config, secrets, migrations |
| [Security](security/README.md) | operators/security | secrets, keys, tokens, RBAC, isolation |
| [Runbooks](runbooks/README.md) | on-call | per-incident: symptoms → diagnosis → action → recovery |
| [Troubleshooting](troubleshooting/README.md) | all | common problems and diagnostics |
| [Release](release/README.md) | release eng | versioning, checklists, upgrade/rollback, packaging |
| [Support](support/README.md) | support | support channels, escalation, diagnostics collection |

## Top-level summaries (repo root)

`ARCHITECTURE_MAP.md` · `DEPENDENCY_MAP.md` · `PUBLIC_CONTRACT_REGISTRY.md` ·
`MASTER_SPEC_TRACEABILITY_FINAL.md` · `ADR_SUMMARY.md` · `RUNTIME_VERIFICATION_REGISTRY.md` ·
`PRODUCTION_READINESS_SUMMARY.md` · `PROJECT_COMPLETION_SUMMARY.md`.

## Specs & history

Contracts: `API_SPEC.md`, `DATABASE_SPEC.md`, `TEST_PLAN.md`. Living docs: `TECHNICAL_BACKLOG.md`,
`TRACEABILITY_STAGE2.md`. Per-stage: `STAGE<N>_REPORT.md` / `CODE_AUDIT_STAGE<N>.md` /
`RELEASE_NOTES_STAGE<N>.md`. Decisions: `docs/adr/`. Historic specs: `docs/spec/`.
