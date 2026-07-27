# Runbook: Scheduler Down

**Status:** I (docs) / RV. Trigger: external dead-man's-switch reports no scheduler heartbeat (§R12.10).

- **Symptoms:** no new tasks materialized; `run_at` slots passing without enqueue; scheduler container not
  running / crash-looping.
- **Diagnosis:** check scheduler container status/logs; verify advisory lock is not stuck held by a dead
  instance; verify DB reachable ([database-down.md](database-down.md)); confirm the dead-man's-switch itself is
  healthy (a dead scheduler cannot self-alert).
- **Actions:** restart the scheduler role; if the advisory lock is stuck, confirm the holder is truly dead
  before clearing; scale to a second instance (idempotent slots + advisory lock make this safe, §R8.10).
- **Recovery criteria:** scheduler heartbeat resumes; due slots materialize into `tasks`; no duplicate slots
  (dedup_key pre-filter + UNIQUE).
- **Follow-up checks:** verify missed slots were handled per LEAD_TIME/deferral policy (§R8.5/§R8.7); confirm
  no double-publish; clear the alert.
