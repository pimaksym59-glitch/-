# Upgrade Strategy

**Category:** Release · **Status:** I (docs) / RV (real upgrade — RV). An **independent** procedure from
rollback ([rollback-strategy.md](rollback-strategy.md)).

## Principles

- Zero-downtime for 24/7 operation: **expand-contract** schema changes (§R12.6); backward-compatible
  deploys.
- Promote only through CI/CD after the gate passes (§R12.12); never edit production schema manually.
- One image, rolling role updates; workers drain current tasks before replacement (graceful shutdown, §R12.4).

## Procedure (template)

1. Pre-flight: [release-checklist.md](release-checklist.md) green; backup verified (§R12.8).
2. **Expand** migration (additive) applied: `alembic upgrade head` (RV-4).
3. Deploy new image `<VERSION>` to `api`, then `worker×N` (rolling), then `scheduler`
   ([deployment-checklist.md](deployment-checklist.md)).
4. Backfill / dual-write if the change needs it.
5. Verify: readiness green, dry-run pipeline, metrics/audit continuity.
6. **Contract** migration (drop old columns) only after all instances run the new version.

## Compatibility

Public Protocol changes require an ADR + MAJOR version ([versioning.md](versioning.md)); within a MINOR/PATCH
upgrade, contracts are backward-compatible (`PUBLIC_CONTRACT_REGISTRY.md`).

## Status

Documented; real upgrade on live infrastructure is **Runtime Verification Pending**. Keep rollback ready at
every step.
