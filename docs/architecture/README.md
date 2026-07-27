# Architecture Documentation

**Category:** Architecture · **Audience:** all · **Status:** SV. Requirements live in `MASTER_SPEC.md`; the
full picture is in the root `ARCHITECTURE_MAP.md` and `DEPENDENCY_MAP.md`.

## Overview

Modular monolith (§R3.1): one code base, three runtime roles (`api`+admin / `scheduler` / `worker×N`) over a
PostgreSQL task queue, with Redis for cache/rate-limit/locks/idempotency/pub-sub. Strict downward layering
`api → services → (domain, repositories) → models/db`, enforced by `tests/test_layering.py`.

## Subsystems and boundaries

Each subsystem's responsibility, package, and composition root are tabulated in
[`ARCHITECTURE_MAP.md`](../../ARCHITECTURE_MAP.md) §2. Domain engines (Stages 12–18) are **independent** — no
engine imports another; interaction is only through public Protocols wired in `app/services/<name>.py`.

## Public contracts

The Stable Public Contract of every subsystem is registered in
[`PUBLIC_CONTRACT_REGISTRY.md`](../../PUBLIC_CONTRACT_REGISTRY.md). API documents public interfaces only.

## Composition roots

`app/services/{providers,ai,rag,validation,images,telegram,analytics,admin,health,lifecycle}.py` are the sole
wiring points. They inject real/public backends into domain ports; domains never import backends directly.

## Dependencies

Direction, forbidden imports, and the "no cycles / independence" confirmations are in
[`DEPENDENCY_MAP.md`](../../DEPENDENCY_MAP.md).

## Decisions

Consolidated in [`ADR_SUMMARY.md`](../../ADR_SUMMARY.md); individual ADRs in [`../adr/`](../adr/).

## Related

[API](../api/README.md) · [Developer](../developer/README.md) · [Deployment](../deployment/README.md) ·
[Security](../security/README.md).
