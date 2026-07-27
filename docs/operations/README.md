# Operations Documentation

**Category:** Operations · **Audience:** operators · **Status:** I (docs) / RV (execution). Operating a live
system requires infrastructure — those actions are **Runtime Verification Pending** (RV-1…RV-9, RV-18).

## Start

One image, role = command (§R12.3). Typical Compose stack: `postgres`(pgvector), `redis`, `caddy`, and the
app roles `api`(+admin HTMX), `scheduler`, `worker` (scale ×N).

```bash
docker compose up -d postgres redis        # infra first
# migrations (RV-4): alembic upgrade head
docker compose up -d api scheduler worker  # app roles
```

Entry points: `app/main.py` (uvicorn, api), `app/scheduler/run.py`, `app/workers/run.py`.

## Stop

Graceful shutdown (§R12.4): a worker finishes its current task before exiting. `docker compose stop`
(SIGTERM) then `down`. Never hard-kill a worker mid-task in production.

## Monitor

See [monitoring.md](monitoring.md) — liveness ≠ readiness (separate endpoints, §R12.10), plus service/queue/
error monitoring and alerts with an external dead-man's-switch.

## Diagnose

`python -m app doctor` (config); health endpoints; structured logs ([logging.md](logging.md)); DLQ inspection
(§R8). Incident procedures: [runbooks](../runbooks/README.md); common issues:
[troubleshooting](../troubleshooting/README.md).

## Maintain

See [maintenance.md](maintenance.md) — backup, cleanup (VACUUM/ANALYZE), reindex, health_check (§R8.12).

## Disaster recovery

See [disaster-recovery.md](disaster-recovery.md) — backup/restore strategy (§R12.7/§R12.8).

## Related

[Deployment](../deployment/README.md) · [Runbooks](../runbooks/README.md) · [Release](../release/README.md).
