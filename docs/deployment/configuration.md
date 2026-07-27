# Configuration (§R3.4 / §Appendix B)

**Category:** Deployment · **Status:** I + SV. Config is **config-first**: parameters live in
`MASTER_SPEC.md` §Appendix B and are surfaced via `app/core/config.py` (Pydantic Settings).

## Principles

- **Env-first:** environment variables and per-environment YAML (`config/{global,development,production}.yaml`);
  the channel profile's truth is the DB, YAML is a seed (§Decision 5).
- **Fail-fast:** invalid config aborts startup with a clear error.
- **Secrets only via env / secret manager** — never in YAML/code (§R12.2); `Settings.to_safe_dict` masks
  secrets on dump.
- Validate with `python -m app doctor`.

## Key parameter groups (§Appendix B)

Database URL (`+asyncpg`), Redis URL, provider keys (optional → fakes when unset), model routing
(`claude-opus-4-8` / `claude-haiku-4-5`), embedding dimensions (text 1536, CLIP/face 512), control-loop
limits (`MAX_REWRITES`/`MAX_RETRIES`/`IMAGE_MAX_REGEN`), rate limits, `LEAD_TIME`, `epsilon_min`. Full list:
`MASTER_SPEC.md` §Appendix B (Source of Truth — not duplicated here).

## Status

Configuration loading, masking, and `doctor` are implemented and statically verified. Real per-environment
values and secret-manager wiring are operational concerns (RV).

## Related

[Secrets](secrets.md) · [Environment matrix](environment-matrix.md) · [Security config](../security/secrets.md).
