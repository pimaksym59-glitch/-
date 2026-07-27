# Maintenance (§R8.12)

**Category:** Operations · **Audience:** operators · **Status:** I (docs) / RV (execution — RV-18).

Routine maintenance tasks the platform expects (§R8.12 automation/maintenance):

| Task | Cadence | Purpose |
|---|---|---|
| `backup` | daily/weekly/monthly | DB + images + config + KB + vectors (§R12.7) — see [disaster-recovery.md](disaster-recovery.md) |
| `cleanup` | daily | VACUUM/ANALYZE; purge expired cache/idempotency keys; prune old logs per retention |
| `reindex` | as needed | rebuild HNSW/GIN indexes after bulk changes (use `CREATE INDEX CONCURRENTLY`, §R12.6) |
| `health_check` | continuous | liveness/readiness probes; alert on degradation ([monitoring.md](monitoring.md)) |

## Notes

- Bulk operations respect per-bot Telegram limits (§R10.7): they enqueue tasks, never fire-and-forget; mass
  deletes are soft.
- Hot-table schema changes use **expand-contract** (§R12.6) — see
  [../deployment/migrations.md](../deployment/migrations.md).

## Status

Task definitions exist in the domain (queue handlers); scheduled real execution against live data is
**Runtime Verification Pending** (RV-18). See [Developer maintenance](../../CONTRIBUTING.md) for code upkeep.

## Related

[Operations](README.md) · [Deployment migrations](../deployment/migrations.md) · [Release](../release/README.md).
