# Runbook: DLQ Requeue

**Status:** I (docs) / RV. Trigger: tasks accumulating in the dead-letter queue (§R8).

- **Symptoms:** tasks in `failed`/`needs_review`/DLQ; pipeline stages not progressing; backlog growing.
- **Diagnosis:** inspect the failed task's error class and stage; distinguish transient (retryable, §R7.5)
  from permanent (needs a fix); confirm upstream cause resolved (DB/Redis/provider/token).
- **Actions:** after the root cause is fixed, requeue via the admin Job Monitor (a **requeue intent** through
  the queue, §R10.1 — never a second execution path); requeue in controlled batches respecting per-bot limits
  (§R10.7); leave genuinely permanent failures in `needs_review` for human triage.
- **Recovery criteria:** DLQ drains; requeued tasks complete; no duplicates (idempotency dedup_key).
- **Follow-up checks:** verify continuation-chaining resumed (downstream stages scheduled, §R8.4); confirm
  metrics/memory updated by `collect_metrics`; clear the alert.
