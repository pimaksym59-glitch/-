# Release Engineering

**Category:** Release · **Audience:** release-eng · **Status:** I (docs/templates) / RV (real release —
RV-18). A self-contained release-engineering subsystem of documentation. **No real release/publish/deploy is
performed in Stage 20** (§R21) — these are procedures, checklists and templates.

## Contents

- [versioning.md](versioning.md) — versioning & tagging scheme.
- [packaging.md](packaging.md) — package structure, build, publication (documented, not executed).
- [upgrade-strategy.md](upgrade-strategy.md) — independent upgrade procedure.
- [rollback-strategy.md](rollback-strategy.md) — independent rollback procedure.
- [release-checklist.md](release-checklist.md) — per-release gate (§R13.4).
- [deployment-checklist.md](deployment-checklist.md) — per-deployment steps.
- [production-readiness-checklist.md](production-readiness-checklist.md) — go/no-go before production.
- [release-automation-seams.md](release-automation-seams.md) — automation extension points (not implemented).

## Release flow (overview)

1. Green gate (ruff / mypy --strict / pytest) — [release-checklist.md](release-checklist.md).
2. Tag `stage-<N>-<name>` per stage; a project release is tagged `v<MAJOR>.<MINOR>.<PATCH>`
   ([versioning.md](versioning.md)).
3. Build image + lock dependencies ([packaging.md](packaging.md), [../deployment/dependency-lock.md](../deployment/dependency-lock.md)).
4. CI verification (format → static → tests → build → migration check → deploy), gated
   (`.github/workflows/ci.yml`, §R12.12).
5. Deploy via [deployment-checklist.md](deployment-checklist.md); verify; keep rollback ready.

## Verification

Every release is verified against [release-checklist.md](release-checklist.md) and, for production,
[production-readiness-checklist.md](production-readiness-checklist.md). Real CI/build/publish/deploy are
**Runtime Verification Pending** (RV-18).

## Related

[Deployment](../deployment/README.md) · [Operations](../operations/README.md) · root `CHANGELOG.md`.
