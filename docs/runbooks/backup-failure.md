# Runbook: Backup Failure

**Status:** I (docs) / RV. Trigger: backup-failure alert (§R12.10). "An unverified backup is no backup"
(§R12.8).

- **Symptoms:** scheduled `pg_dump`/object-storage snapshot failed or missing; retention window at risk.
- **Diagnosis:** check backup job logs; disk/quota on backup target; credentials to object storage; DB
  reachability; encryption key availability.
- **Actions:** re-run the backup manually; fix the root cause (space/creds/network); if the primary target is
  down, write to a secondary; verify the new backup restores on staging.
- **Recovery criteria:** a fresh **encrypted** backup exists **and** a staging restore of it succeeds
  ([../operations/disaster-recovery.md](../operations/disaster-recovery.md)).
- **Follow-up checks:** confirm cadence resumed (daily/weekly/monthly, §R12.7); confirm retention intact;
  clear the alert only after a verified restore.
