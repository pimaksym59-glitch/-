# Runbook: Mass Publish Errors

**Status:** I (docs) / RV. Trigger: spike in Telegram publish errors / 429s (§R12.10, §R7).

- **Symptoms:** many `publish` tasks failing or `needs_review`; rising 429 rate; posts not appearing.
- **Diagnosis:** inspect error classes (transient vs permanent, §R7.5); check per-bot rate-limit key
  (`bot_token`+`channel_id`, §R7.6); verify bot token validity (permanent errors → bad token/kicked);
  check ambiguous at-least-once outcomes routed to `needs_review` (§R7.4).
- **Actions:** for 429s, let the distributed rate-limiter/back-off drain (honor `retry_after`); pause bulk
  operations (they enqueue, so pausing the producer stops the flood, §R10.7); for permanent errors, fix the
  token/permissions then requeue ([dlq-requeue.md](dlq-requeue.md)); do **not** create a second publish path
  (§R10.1).
- **Recovery criteria:** error/429 rate back to baseline; `needs_review` items triaged; no duplicate posts
  (idempotency dedup_key marked before send, §R7.4).
- **Follow-up checks:** verify message_ids recorded; confirm no double-publish; clear the alert.
