# Runbook: Disk Full

**Status:** I (docs) / RV. Trigger: disk-full alert (§R12.10).

- **Symptoms:** writes failing; DB errors; backups failing; containers crashing.
- **Diagnosis:** identify the consumer — DB data/WAL, image storage, logs, backups; check retention/rotation;
  check for runaway logs or unbounded tables.
- **Actions:** free space safely (rotate/ship logs, prune old backups **only** after verifying newer ones,
  move images to object storage); expand the volume; run `cleanup` (VACUUM/ANALYZE, §R8.12) to reclaim DB
  space; never delete WAL needed for PITR.
- **Recovery criteria:** healthy free-space margin restored; writes succeed; backups resume.
- **Follow-up checks:** add/adjust retention and alerts thresholds; confirm monitoring shows sustained
  headroom; clear the alert.
