# Secrets (§R12.2)

**Category:** Deployment/Security · **Status:** I (design) / RV (secret manager wiring). Cross-ref
[../security/secrets.md](../security/secrets.md).

## Rules

- Secrets live **outside code and repository**. In production use a **secret manager / Docker secrets**, not a
  plaintext `.env`.
- Secrets are **never** logged (masking) and **never** shown in the panel (§R10.4 — write-only fields).
- The database account uses **least-privilege**.
- In code, secrets are represented write-only (e.g. admin `WriteOnly[T]`) and dropped from view DTOs.

## Handling

- Development: `.env` (local only, git-ignored).
- CI: CI secret store.
- Staging/Production: secret manager; injected as env at runtime.

## Status

The masking/least-privilege design is implemented; live secret-manager integration is **Runtime Verification
Pending**.
