# Security Documentation

**Category:** Security · **Audience:** operators/security · **Status:** I (design) / RV (live hardening).
Root policy: `SECURITY.md`. Requirements: `MASTER_SPEC.md` §R12.2 / §R10.4 / §R10.5 / §R2.6 / §R12.14.

## Secrets, keys, tokens (§R12.2 / §R10.4)

- Secrets outside code/repo; production via **secret manager / Docker secrets**; never plaintext `.env`.
- Never logged (masking), never displayed in the panel — **write-only** fields (admin `WriteOnly[T]`; view
  DTOs drop `password_hash`/`mfa_secret_ref`/`bot_token_ref`/`api_key_ref`).
- Session tokens/CSRF tokens are generated via injected token factories; real cookie/CSRF over the wire is
  RV-17.
- Database account: **least-privilege**.

Details: [../deployment/secrets.md](../deployment/secrets.md).

## Permissions (§R10.5)

Backend RBAC — 5 roles (`owner/admin/editor/analyst/viewer`), enforced in services, never in the UI. Matrix:
`app/admin/rbac.py` and `API_SPEC.md`.

## Channel isolation (§R2.6)

Every query is scoped by `channel_id` (except Global Memory); cross-channel leakage is itself a test failure
(RAG hard filter, `app/rag/filters`).

## MTProto stats adapter (§R12.14)

If introduced (ADR-001, currently not): session file is a secret, isolated, **read-only**, under heightened
control.

## Operational recommendations

Rotate keys via secret manager; restrict DB grants; expose only the reverse proxy (§R12.5); enable the CI
gate before deploy (§R12.12); verify backups (§R12.8).

## Status

Security **design** is implemented and statically verified; live hardening (real SSO/MFA, secret manager,
network policy, TLS over the wire) is **Runtime Verification Pending** (RV-17 and infra RVs).

## Related

[Deployment secrets](../deployment/secrets.md) · [API](../api/README.md) · [Operations](../operations/README.md).
