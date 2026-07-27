# Production Readiness Checklist

**Category:** Release · **Status:** I (template). The go/no-go gate before the **first** production deployment.
Consolidated agenda: `PRODUCTION_READINESS_SUMMARY.md` + `RUNTIME_VERIFICATION_REGISTRY.md`.

## Engineering

- [ ] Static gate green: ruff / mypy --strict (0 `type: ignore`) / pytest (466 passed offline).
- [ ] Layering guard green; all domain subsystems independent; no cycles; `app` ⊄ `tests`.
- [ ] Public contracts stable; Architecture Freeze intact.

## Runtime verification (RV — must pass on staging)

- [ ] RV-1/RV-2/RV-3 — image build, full-stack install on 3.13, compose/caddy validate, healthchecks, non-root,
      network isolation.
- [ ] RV-4/RV-5/RV-6 — `alembic upgrade head`, repository CRUD + pgvector/HNSW/locks, Redis I/O.
- [ ] RV-7/RV-8/RV-9 — queue SKIP-LOCKED/concurrency, scheduler advisory/idempotency, API readiness.
- [ ] RV-10…RV-15 — real vendor adapters (LLM/image/embedding/Bot API) + retry/CB/identity/CLIP/at-least-once.
- [ ] RV-16/RV-17 — telemetry export/persistence/engagement; Web UI/session/CSRF/MFA/SSO/persistence.
- [ ] RV-18 — CI/CD run, performance/stress/chaos/mutation, coverage enforcement, distributed exec.

## Operations

- [ ] Secrets in secret manager; DB least-privilege ([../security/README.md](../security/README.md)).
- [ ] Monitoring/alerting active incl. external dead-man's-switch (§R12.10).
- [ ] Backups scheduled **and** a restore drill passed on staging (§R12.8).
- [ ] Runbooks reviewed; on-call assigned ([../runbooks/README.md](../runbooks/README.md)).
- [ ] Rollback path drilled ([rollback-strategy.md](rollback-strategy.md)).

## Governance

- [ ] ADR-001 (MTProto stats) and ADR-002 (deployment environment) decided.
- [ ] Owner sign-off recorded.

**Go/No-Go:** proceed to production only when Engineering + RV-1…RV-9 + Operations are all checked. Later RVs
may be phased with feature flags.
