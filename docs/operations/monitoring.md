# Monitoring & Alerting (§R12.10)

**Category:** Operations · **Status:** I (docs) / RV (real monitoring — RV-9/RV-18).

## Health

- **Liveness** and **readiness** are **separate** endpoints (§R12.10). Liveness = process up; readiness =
  dependencies (PostgreSQL/Redis) usable. Implemented via `app/services/health.py` (`HealthService`,
  `ReadinessProbe`). Real probes touch live services → RV-9.

## What to monitor

Services (api/scheduler/worker up), queue depth & task latency, retry/DLQ rates, API error rates, Telegram
send errors/429s, DB/Redis health, disk usage.

## Alerts

Scheduler down · DB down · backup failure · mass publish errors · disk full (§R12.10). Use an **external
dead-man's-switch**: a dead scheduler cannot alert on itself, so an outside heartbeat must detect silence.

## Logging signal

Structured JSON logs feed monitoring — see [logging.md](logging.md). Audit is separate (§R10.8).

## Status

Alert wiring and dashboards require a live monitoring stack — **Runtime Verification Pending**. This document
specifies the design; incident response is in [../runbooks/README.md](../runbooks/README.md).
