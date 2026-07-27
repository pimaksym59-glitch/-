# Migrations (§R12.6)

**Category:** Deployment · **Status:** I (initial migration authored) / RV (real `alembic upgrade` — RV-4).

## Rules

- **Alembic only.** Manual schema changes on production are forbidden.
- Hot tables use **expand-contract** + `CREATE INDEX CONCURRENTLY` (§R12.6 / Decision 43) to stay 24/7:
  1. **Expand:** add new nullable columns / new tables / concurrent indexes (backward-compatible).
  2. **Migrate:** backfill; dual-write if needed.
  3. **Contract:** drop old columns only after all readers are updated.
- Enum changes: add values (never remove in place).

## Procedure

```bash
# staging/production
alembic upgrade head            # RV-4 (live PostgreSQL)
# rollback one step if needed (see rollback strategy)
alembic downgrade -1
```

Initial migration: `app/db/migrations/versions/0001_initial.py` (extensions/enums/25 tables/indexes). It was
authored, not yet applied to a live DB (RV-4).

## Status

Migration authoring is implemented; applying migrations to a live PostgreSQL is **Runtime Verification
Pending** (RV-4). CI includes a **migration check** step before deploy (§R12.12).

## Related

[Rollback strategy](../release/rollback-strategy.md) · [Upgrade strategy](../release/upgrade-strategy.md).
