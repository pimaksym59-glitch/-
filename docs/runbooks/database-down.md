# Runbook: Database Down

**Status:** I (docs) / RV. Trigger: DB-down alert or readiness probe failing (§R12.10).

- **Symptoms:** API readiness red; workers/scheduler failing to claim tasks; `SELECT 1` failing.
- **Diagnosis:** check PostgreSQL container/host status, disk ([disk-full.md](disk-full.md)), connection
  limits (§R12.11), network; inspect logs; confirm it is the DB and not the network/proxy.
- **Actions:** restart/repair PostgreSQL; if data loss suspected, follow
  [../operations/disaster-recovery.md](../operations/disaster-recovery.md); pause `scheduler`/`worker` to stop
  retry storms; keep `api` up to serve health.
- **Recovery criteria:** readiness green; workers claim tasks again (`FOR UPDATE SKIP LOCKED`); no partial
  writes (optimistic lock `version` protects rows).
- **Follow-up checks:** verify queue drained without duplicates; check audit-log continuity; confirm backups
  are current; clear the alert.
