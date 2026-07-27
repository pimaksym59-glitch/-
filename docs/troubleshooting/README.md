# Troubleshooting

**Category:** Troubleshooting · **Audience:** all · **Status:** I (docs). Common problems and diagnostics.
For incidents on a running system, use [../runbooks/README.md](../runbooks/README.md).

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `python -m app doctor` reports missing config | env/YAML not set | set env or `config/*.yaml`; see [../deployment/configuration.md](../deployment/configuration.md) |
| Providers return canned/deterministic output | no API key set → fake provider (§R2.10) | set the provider key; real adapters are RV-10 |
| Integration tests skipped | `RUN_INTEGRATION` not `1` (by design) | set `RUN_INTEGRATION=1` + `DATABASE_URL`/`REDIS_URL` on a live stack |
| `database_url` rejected | missing `+asyncpg` driver suffix | use `postgresql+asyncpg://…` (backlog OR-4) |
| API readiness red | PostgreSQL/Redis unreachable | check infra; [../runbooks/database-down.md](../runbooks/database-down.md) |
| Import of aiogram/anthropic/openai fails | declared but not installed (RV) | install only when wiring real adapters (RV-10) |
| ruff/mypy failures after edits | style/type drift | run `make gate`; keep line-length 100 / 0 `type: ignore` |

## Known observations (not defects)

Tracked in `TECHNICAL_BACKLOG.md` (Deferred Improvements, Operational Risks OR-*, Testing Gaps TG-*, and the
Runtime Verification Required list RV-1…RV-18).

## Related

[Runbooks](../runbooks/README.md) · [Developer](../developer/README.md) · [Operations](../operations/README.md).
