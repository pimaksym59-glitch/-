# Reproducible Deployment Procedure (§R12.15)

**Category:** Deployment · **Audience:** operators · **Status:** I (procedure) / RV (real deploy — RV-1…RV-9).
Deployment must be reproducible on a new server with minimal manual steps. Placeholders `<HOST>`/`<VERSION>`/
`<REGISTRY>` are filled at release time.

## New-server bring-up

1. Provision host `<HOST>`; install Docker + Compose.
2. Fetch release `<VERSION>` (image `<REGISTRY>/telegram-platform:<VERSION>` or build from tag).
3. Configure environment ([configuration.md](configuration.md)) and secrets via secret manager
   ([secrets.md](secrets.md)).
4. Start infra: `docker compose up -d postgres redis`.
5. Run migrations: `alembic upgrade head` (RV-4); verify schema.
6. Start app roles: `docker compose up -d api scheduler worker`.
7. Verify: health readiness green; `python -m app doctor`; a dry-run pipeline; Caddy TLS active.
8. Enable monitoring/alerting ([../operations/monitoring.md](../operations/monitoring.md)) and scheduled
   backups ([../operations/disaster-recovery.md](../operations/disaster-recovery.md)).

## Update / rollback

See [../release/upgrade-strategy.md](../release/upgrade-strategy.md) and
[../release/rollback-strategy.md](../release/rollback-strategy.md).

## Status

The procedure is documented and internally consistent; a real deployment is **Runtime Verification Pending**
(inherits RV-1…RV-9). Use the [deployment checklist](../release/deployment-checklist.md) for each rollout.
