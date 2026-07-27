# Deployment Checklist

**Category:** Release · **Status:** I (template) / RV (execution). Deterministic — placeholders filled at
deploy time. Run for each deployment to `<ENV>` (Staging/Production).

## Pre-deploy

- [ ] [release-checklist.md](release-checklist.md) complete for `<VERSION>`.
- [ ] Target `<ENV>` matches the [environment matrix](../deployment/environment-matrix.md).
- [ ] Secrets present via secret manager ([../deployment/secrets.md](../deployment/secrets.md)); no plaintext.
- [ ] Backup verified (staging restore drill) — §R12.8.
- [ ] Rollback path ready ([rollback-strategy.md](rollback-strategy.md)); previous image `<PREV_VERSION>`
      available.

## Deploy (§R12.15)

- [ ] Infra up (PostgreSQL/pgvector, Redis, Caddy).
- [ ] `alembic upgrade head` (expand step) — RV-4; schema verified.
- [ ] Roll out `api` → `worker×N` → `scheduler` (graceful).
- [ ] Only reverse proxy exposed; data stores internal (§R12.5).

## Verify

- [ ] Health readiness green; `python -m app doctor` clean.
- [ ] Dry-run pipeline succeeds; message flow/audit continuity OK.
- [ ] Monitoring/alerts active incl. dead-man's-switch ([../operations/monitoring.md](../operations/monitoring.md)).

## Post-deploy

- [ ] Contract migration only after all instances updated.
- [ ] Watch error/429/DLQ rates for `<WINDOW>`; runbooks linked ([../runbooks/README.md](../runbooks/README.md)).

## Status

Execution is **Runtime Verification Pending** (RV-1…RV-9). This checklist is the intended procedure.
