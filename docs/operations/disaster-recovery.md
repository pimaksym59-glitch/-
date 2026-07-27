# Disaster Recovery (§R12.7 / §R12.8)

**Category:** Operations · **Audience:** operators · **Status:** I (procedure) / RV (real backup/restore drill
— RV-18). **"An unverified backup is no backup" (§R12.8).**

## Backup (§R12.7)

| Asset | Method | Cadence |
|---|---|---|
| Database | `pg_dump` + PITR/WAL archiving | daily/weekly/monthly |
| Images | object-storage snapshot | daily |
| Config | versioned export (`config_versions`, §R10.8) | on change |
| Knowledge base + vectors | DB dump (documents/document_chunks + embeddings) | daily |
| Metadata | DB dump | daily |

Backups are **encrypted**; retention is configurable.

## Restore (§R12.8)

Restore is **verified regularly on staging** — full / DB-only / per-channel / documents / images. A restore
that has not been exercised on staging is not trusted.

## Recovery procedure (template)

1. Declare incident; freeze writes (stop `scheduler`/`worker`).
2. Provision clean infra ([../deployment/procedure.md](../deployment/procedure.md)).
3. Restore DB (`pg_restore` / PITR to `<TIMESTAMP>`); restore image object storage; restore config version
   `<VERSION>`.
4. Run `alembic upgrade head` if needed; verify schema (extensions/enums/tables/indexes).
5. Smoke-check: health readiness, a dry-run pipeline, audit-log continuity.
6. Resume `scheduler`/`worker`; monitor closely ([monitoring.md](monitoring.md)).

## Checklist

Use the Disaster Recovery items in the release checklists:
[../release/production-readiness-checklist.md](../release/production-readiness-checklist.md).

## Status

Procedure documented; a real backup/restore drill on live infrastructure is **Runtime Verification Pending**
(RV-18) and a prerequisite for production sign-off.
