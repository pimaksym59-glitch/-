# Security Policy

Full security documentation: [`docs/security/README.md`](docs/security/README.md). Requirements:
`MASTER_SPEC.md` §R12.2 / §R10.4 / §R10.5 / §R2.6.

## Reporting a vulnerability

Do **not** open a public issue for security problems. Report privately to `<SECURITY_CONTACT>` with:

- affected version/tag and environment,
- a description and reproduction (no secrets),
- impact assessment if known.

You will receive an acknowledgement within `<SLA_ACK>` and updates until resolution. Placeholders are filled
by the operating organization.

## Handling principles

- Secrets/keys/tokens live outside code/repo; production uses a secret manager (§R12.2); never logged, never
  shown in the panel (write-only fields, §R10.4).
- Backend RBAC (5 roles, §R10.5); channel isolation by `channel_id` (§R2.6).
- Least-privilege DB account; only the reverse proxy is exposed (§R12.5).
- MTProto stats adapter, if introduced, is read-only and isolated with the session file as a secret (§R12.14).

## Scope note

Real hardening (SSO/MFA, secret manager, TLS over the wire, network policy) is **Runtime Verification
Pending** (RV-17 and infra RVs) — see `RUNTIME_VERIFICATION_REGISTRY.md`.
