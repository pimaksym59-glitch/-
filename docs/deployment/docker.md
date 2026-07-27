# Docker & Compose (§R12.3–R12.5)

**Category:** Deployment · **Status:** I (artifacts) / RV (build/run — RV-1/RV-2).

## Image

Single multi-stage `docker/Dockerfile` on `python:3.13-slim`, non-root, minimal size. The same image runs all
app roles; the **command** selects the role:

| Role | Command (illustrative) | Notes |
|---|---|---|
| api (+admin) | `uvicorn app.main:app` | behind Caddy |
| scheduler | `python -m app.scheduler.run` | single logical scheduler (advisory-locked, safe ×N) |
| worker | `python -m app.workers.run` | scale ×N |

## Infra

- **PostgreSQL** with pgvector (`pgvector/pgvector:pg16`); `docker/postgres/init.sql` enables extensions.
- **Redis** (`redis:7-alpine`).
- **Caddy** (`caddy:2-alpine`) — auto-TLS, routing, security headers, rate-limit; the only exposed service.

## Network (§R12.5)

Only the reverse proxy is published. PostgreSQL / Redis / worker / scheduler are on the internal network. No
direct external access to data stores.

## Healthchecks (§R12.4)

Each app role defines a healthcheck; the api role exposes liveness/readiness. Graceful shutdown: workers
finish the current task on SIGTERM.

## Status

Static validation (`docker compose config`, `caddy validate`) and a real build/run with healthcheck
transitions are **Runtime Verification Pending** (RV-2). See `docker/`.
