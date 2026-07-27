# Environment Matrix (§R12.1)

**Category:** Deployment · **Audience:** operators · **Status:** I (docs) / RV (Staging/Production — RV).
Each environment has its own env/DB/config/keys/logs/monitoring; promotion is **only through CI/CD** (§R12.1).

| Aspect | Local | CI | Staging | Production |
|---|---|---|---|---|
| Purpose | dev/offline | automated gate | pre-prod verification | live |
| Services | fakes (no infra) | fakes; gated integration off by default | real PG/Redis, sandbox APIs | real PG/Redis, live APIs |
| `RUN_INTEGRATION` | `0` | `0` (unit) / `1` (integration job) | `1` | n/a (real) |
| Providers | fakes (`get_*_provider` → fake) | fakes | sandbox keys | production keys (secret manager) |
| Secrets | `.env` (dev only) | CI secrets | secret manager | secret manager / Docker secrets (§R12.2) |
| DB | none / disposable | none | dedicated staging DB | production DB (least-privilege) |
| Migrations | `create_all`/none | none | `alembic upgrade head` | `alembic upgrade head` (expand-contract) |
| Monitoring | none | CI logs | full stack | full stack + dead-man's-switch |
| Backup | none | none | scheduled + restore drill | scheduled + verified restore (§R12.8) |
| TLS/proxy | none | none | Caddy auto-TLS | Caddy auto-TLS |
| Deploy | manual | pipeline (no deploy) | pipeline → staging | pipeline → prod (gated) |

## Notes

- Only **Local** and **CI (unit)** are fully exercised today (offline). Staging/Production rows are **Runtime
  Verification Pending** (RV-1…RV-18).
- Config precedence and parameters: [configuration.md](configuration.md) (§R3.4 / §Appendix B).

## Related

[Deployment](README.md) · [Secrets](secrets.md) · [Release checklists](../release/README.md).
