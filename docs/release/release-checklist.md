# Release Checklist (§R13.4)

**Category:** Release · **Status:** I (template). Deterministic — placeholders `<VERSION>`/`<DATE>` filled at
release. Run before tagging a release.

## Gate

- [ ] `ruff check .` — All checks passed.
- [ ] `ruff format --check .` — clean.
- [ ] `mypy` (`--strict`) — Success, **0 `type: ignore`**.
- [ ] `pytest -q` — all unit/offline green (currently 466 passed, 6 skipped).
- [ ] Integration suite run on staging with `RUN_INTEGRATION=1` (RV) — pass or explicitly deferred.

## Content

- [ ] `CHANGELOG.md` updated for `<VERSION>`.
- [ ] `TRACEABILITY_STAGE2.md` / `MASTER_SPEC_TRACEABILITY_FINAL.md` cover all checkable `R*`.
- [ ] `RUNTIME_VERIFICATION_REGISTRY.md` reflects the current RV set.
- [ ] Docs synchronized (this `docs/` tree + root summaries).
- [ ] Public contracts unchanged, or MAJOR bump + ADR recorded.

## Artifacts

- [ ] Version tagged (`stage-<N>-<name>` and/or `v<VERSION>`).
- [ ] Dependencies locked (`uv.lock`, RV-18) or pin reviewed.
- [ ] Image build reproducible ([packaging.md](packaging.md), RV-1).

## Sign-off

- [ ] Owner acceptance recorded.
- [ ] Rollback path confirmed ([rollback-strategy.md](rollback-strategy.md)).

Next: [deployment-checklist.md](deployment-checklist.md) →
[production-readiness-checklist.md](production-readiness-checklist.md).
