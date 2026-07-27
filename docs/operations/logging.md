# Logging (§R12.9)

**Category:** Operations · **Status:** I (interface) / RV (structured JSON logger — backlog FA-4).

## Format

Structured JSON: time · level · service · `request_id`/`task_id` · `channel_id` · event. Levels DEBUG / INFO
/ WARNING / ERROR / CRITICAL. **Audit log is separate** (§R10.8, `audit_log` table + analytics audit
pipeline).

## Interfaces

The queue and provider layers log through a single `EventLogger` interface (`app/workers/log.py`); middleware
attaches `request_id` (`app/middleware/*`). Analytics events flow through the Stage-17 event pipeline. A full
structured JSON logger with secret masking is a planned improvement (TECHNICAL_BACKLOG FA-4).

## Rules

- No `print()` anywhere — logging only.
- Secrets are never logged (masking, §R12.2); `Settings.to_safe_dict` masks on dump.

## Status

The single logging interface is implemented; a production JSON logger + masking is **Runtime Verification
Pending**.
