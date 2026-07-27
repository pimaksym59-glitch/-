# Rollback Strategy

**Category:** Release · **Status:** I (docs) / RV (real rollback — RV). An **independent** procedure from
upgrade ([upgrade-strategy.md](upgrade-strategy.md)).

## Principles

- **Expand-contract makes rollback safe:** because the *expand* step is additive and backward-compatible, the
  previous image keeps working; roll back **code first**, schema last (and usually not at all until *contract*).
- Never destructively downgrade a schema that newer data depends on; prefer forward-fix if *contract* already
  ran.
- Keep the previous image `<PREV_VERSION>` available for immediate redeploy.

## Procedure (template)

1. Decide: code-only rollback (preferred) vs full rollback.
2. Redeploy previous image `<PREV_VERSION>` to `api` → `worker×N` → `scheduler` (rolling).
3. If a *contract* migration already dropped columns, do **not** blind-downgrade — restore from backup
   ([../operations/disaster-recovery.md](../operations/disaster-recovery.md)) or forward-fix.
4. Verify readiness green; confirm no duplicate side effects (idempotency dedup_key).
5. File an incident; capture root cause before re-attempting the upgrade.

## Migration rollback

`alembic downgrade -1` only for reversible, pre-*contract* steps ([../deployment/migrations.md](../deployment/migrations.md)).

## Status

Documented; real rollback drills are **Runtime Verification Pending**. Every deployment must have a tested
rollback path before it proceeds ([production-readiness-checklist.md](production-readiness-checklist.md)).
