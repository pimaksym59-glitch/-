# Versioning Strategy

**Category:** Release · **Status:** I (docs).

## Scheme

- **Project releases:** Semantic Versioning `v<MAJOR>.<MINOR>.<PATCH>`. Current: `0.1.0` (pre-1.0; public
  contracts stable but the first production deployment has not happened).
- **Stage tags:** each build stage is tagged `stage-<N>-<name>` (e.g. `stage-19-tests`). These record the
  staged-delivery history and remain immutable.
- **First production release:** `v1.0.0` after the Production Readiness Review closes RV-1…RV-9 (see
  `PRODUCTION_READINESS_SUMMARY.md`).

## Rules

- MAJOR: breaking change to a Stable Public Contract (`PUBLIC_CONTRACT_REGISTRY.md`) or the architecture
  (needs an ADR).
- MINOR: backward-compatible feature/subsystem.
- PATCH: fixes/docs with no contract change.
- Public Protocol changes require an ADR and a MAJOR bump (Architecture Freeze).

## Tagging

- Annotated git tags; one tag per stage; `v<X.Y.Z>` for releases.
- `CHANGELOG.md` (Keep-a-Changelog) records each version; placeholders `<VERSION>`/`<DATE>` filled at release.

## Related

[Release](README.md) · [Packaging](packaging.md) · [Public contracts](../../PUBLIC_CONTRACT_REGISTRY.md).
