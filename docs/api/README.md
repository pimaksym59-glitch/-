# API Documentation

**Category:** API · **Audience:** integrators · **Status:** SV (contract) / RV (runtime). The REST contract
is `API_SPEC.md` (root, Source of Truth for `/api/v1`). This document documents **public interfaces only** —
never internal implementation.

## Base

- Prefix `/api/v1`. Session cookie (HttpOnly, Secure, SameSite) after `POST /auth/login`; optional MFA
  (§R10.4). All endpoints except `/auth/*` and `/health/*` require a session.
- **RBAC on the backend** (§R10.5) — enforced in services, never in the UI. Matrix: `API_SPEC.md` §RBAC and
  `app/admin/rbac.py`.

## Error schema (unified)

All errors share one JSON shape (`app/schemas/errors.py`, handlers in `app/api/errors.py`). HTTP codes:
`200/201/202` success · `400` validation · `401` unauthenticated · `403` RBAC/isolation · `404` · `409`
conflict · `422` request validation · `429` rate-limited · `5xx` server.

## Areas

Auth · Channels · Personas/Actors/Locations · Content/Posts (operations go through the **queue**, §R10.1 —
"publish" = a `publish` task, `202 Accepted`) · Images · Knowledge Base · Prompts (versioned) · Scheduler &
Tasks · Analytics & Cost (read; gated metrics flagged, §R10.3) · AI Studio (isolated, §R10.9) · Users &
Security (owner) · Audit log · Health (no auth). Full endpoint list: `API_SPEC.md`.

## Pagination

Generic `Page[T]` (offset and cursor), `limit ≤ 100`; out-of-range → `422` (`app/api/pagination.py`).

## Runtime status

Serving over the wire (uvicorn, live PG/Redis readiness, lifespan) is **Runtime Verification Pending (RV-9)**.
Offline tests cover routing/DI/errors/pagination/health on fakes.

## Related

[Architecture](../architecture/README.md) · [Security](../security/README.md) ·
[Deployment](../deployment/README.md).
