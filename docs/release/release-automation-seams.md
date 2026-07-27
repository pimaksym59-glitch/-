# Release Automation Seams

**Category:** Release · **Status:** I (seams) / RV (implementation — RV-18). Extension points for release
automation, **declared only** — nothing is implemented or executed in Stage 20 (§R20/§R21).

## Seams

| Seam | Purpose | Where it plugs in | Status |
|---|---|---|---|
| CI/CD pipeline | format → static → tests → build → migration-check → deploy (§R12.12) | `.github/workflows/ci.yml` (template) | RV-18 |
| Distributed test execution | parallel/remote test runs (pytest-xdist) | test harness seam `XdistDistributedSeam` (Stage 19) | RV-18 |
| Image build & publish | build/sign/push the deploy image | `docs/release/packaging.md` procedure | RV-1/RV-18 |
| Dependency lock | generate `uv.lock` | `docs/deployment/dependency-lock.md` | RV-18 |
| Coverage enforcement | gate on coverage thresholds | test harness `CoveragePolicy` (Stage 19) | RV-18 |
| Changelog/version bump | automate `CHANGELOG.md`/tag | manual today | RV-18 |

## Principle

Automation consumes the same **deterministic** checklists/templates a human would follow. No seam performs a
real deploy/publish/release in this stage; each is `NotImplementedError` or a template.

## Related

[Release](README.md) · Stage 19 seams (`tests/framework/seams.py`) · [Packaging](packaging.md).
