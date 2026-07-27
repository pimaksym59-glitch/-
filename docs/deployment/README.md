# Deployment Documentation

**Category:** Deployment · **Audience:** operators · **Status:** I (docs) / RV (real deploy — RV-1/RV-2/RV-3).

## Topology (§R12.3–R12.5)

One Docker image; role = command: `api`(+admin HTMX), `scheduler`, `worker×N`. Infra: PostgreSQL(pgvector),
Redis, Caddy reverse-proxy (auto-TLS, default). **Only the proxy is exposed**; PostgreSQL/Redis/worker/
scheduler live on the internal network. Container principles (§R12.4): one function, healthcheck, minimal
size, graceful shutdown. Artifacts: `docker/Dockerfile`, `docker/Caddyfile`, `docker-compose.yml`,
`docker/postgres/init.sql`. See [docker.md](docker.md).

## Contents

- [docker.md](docker.md) — image/roles/proxy/network.
- [environment-matrix.md](environment-matrix.md) — Local / CI / Staging / Production.
- [configuration.md](configuration.md) — config-first (§R3.4 / §Appendix B).
- [secrets.md](secrets.md) — secret management (§R12.2).
- [migrations.md](migrations.md) — Alembic / expand-contract (§R12.6).
- [procedure.md](procedure.md) — reproducible deployment (§R12.15).
- [dependency-lock.md](dependency-lock.md) — pinned dependencies (§R12.13).

## Status

The compose/docker artifacts exist and are statically valid; a real `docker build` + stack bring-up +
healthcheck transitions are **Runtime Verification Pending** (RV-1/RV-2/RV-3).

## Related

[Operations](../operations/README.md) · [Security](../security/README.md) · [Release](../release/README.md).
