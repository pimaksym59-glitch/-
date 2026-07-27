# Runbooks

**Category:** Runbooks · **Audience:** on-call · **Status:** I (docs) / RV (live incident handling). Each
runbook follows the same shape: **Symptoms → Diagnosis → Actions → Recovery criteria → Follow-up checks**.
Alerts that trigger them: §R12.10.

## Index

| Runbook | Trigger |
|---|---|
| [scheduler-down.md](scheduler-down.md) | Scheduler-down alert (dead-man's-switch) |
| [database-down.md](database-down.md) | DB-down alert / readiness failing |
| [backup-failure.md](backup-failure.md) | Backup-failure alert |
| [mass-publish-errors.md](mass-publish-errors.md) | Spike in Telegram publish errors/429s |
| [disk-full.md](disk-full.md) | Disk-full alert |
| [dlq-requeue.md](dlq-requeue.md) | Tasks in the dead-letter queue |

## Conventions

- Runbooks are **deterministic**: commands use placeholders (`<HOST>`, `<TASK_ID>`), never live values.
- Every runbook ends with follow-up checks that confirm the alert cleared and no data was lost.
- Live execution is **Runtime Verification Pending** — these describe the intended procedure.

## Related

[Operations](../operations/README.md) · [Monitoring](../operations/monitoring.md) ·
[Troubleshooting](../troubleshooting/README.md).
