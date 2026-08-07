# Production Readiness Runbook

**Created:** FS15 (T-FS15.5) · **Status:** frontend implementation complete (pending owner acceptance of FS15);
every item below requires infrastructure that does **not exist in the authoring environment** (no Docker
engine, no CI runner, no live backend, no staging deployment — verified directly, `docker`/`gh`/`act` all
"command not found"; see `FS15_REPORT.md` §0). This document is a **procedure**, not a narrative: each item is
the exact command sequence to run, the expected result, and the single file to touch if it fails — so closing
it is execution, not investigation, the day the missing infrastructure exists.

**This document does not close any FE-RV by itself.** An item is CLOSED only when it has been executed for real
and the evidence is recorded against it (by whoever runs it, in whatever document that session produces — this
Runbook, an updated `FS15_REPORT.md` addendum, or the handoff's own FE-RV register at PART4 §6.2). Writing a
procedure down is not evidence.

---

## How to use this document

Work top to bottom. Items 1–2 unblock the container/CI items generally. Items 3–9 are independent and can run
in any order once their own prerequisite (a live backend, a staging deploy, a Docker engine) exists. Item 10 is
the one session that closes ten FE-RV items at once, per the handoff's own observation that they "share one
closing event."

---

## 1. Docker Compose validation and the deferred Caddy route (FE-RV-3)

**Blocked on:** a Docker engine (`docker compose` — verified absent here).

**What FS15 already did:** authored `webplatform/docker-compose.console.yml` (D2 Option A) — a frontend-local
overlay adding the `console` service, built from `webplatform/console/Dockerfile`, on the same `internal`/
`public` networks as the root `docker-compose.yml`. **Neither the root `docker-compose.yml` nor
`docker/Caddyfile` was modified** — this overlay is additive only, per the owner's D2 ruling. YAML syntax and
Compose-Spec shape were verified with a Python YAML parser (not `docker compose config` — that tool does not
exist here); the merge semantics, path resolution and profile activation are **unverified**.

**Run, in order, from the repo root, the day a Docker engine exists:**

```bash
# 1. Validate the merged config BEFORE up. Confirms build.context resolves to
#    webplatform/console (the one assumption this overlay could not prove).
docker compose -f docker-compose.yml -f webplatform/docker-compose.console.yml \
  --profile app config

# 2. Build and start alongside the existing backend roles.
docker compose -f docker-compose.yml -f webplatform/docker-compose.console.yml \
  --profile app up --build console

# 3. Confirm the healthcheck the Dockerfile already declares.
docker inspect --format='{{json .State.Health}}' \
  $(docker compose -f docker-compose.yml -f webplatform/docker-compose.console.yml ps -q console)
```

**Then, the one Caddyfile edit this stage deliberately deferred** (D2's stated next step, not performed here):
add a route in `docker/Caddyfile` so `console` is reachable through the shared reverse proxy instead of an
unpublished internal-only port. A minimal, additive shape (illustrative — validate against the real
`docker/Caddyfile` at the time, since Stage 10+ may have changed the `api` block):

```caddyfile
:80 {
    encode gzip
    header {
        -Server
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "no-referrer"
    }
    handle /api/* {
        reverse_proxy api:8000
    }
    handle {
        reverse_proxy console:3000
    }
}
```

This one edit is what makes the console's own same-origin `/api/v1` client calls
(`shared/config/env.ts`'s default) resolve — until it lands, `console` serves its shell with every client-side
API call failing, which is expected and not a defect in the overlay (documented in
`docker-compose.console.yml`'s own header comment).

**Adjustment points:** `webplatform/docker-compose.console.yml` (the service definition) ·
`docker/Caddyfile` (the one deferred route — a backend-track file; edit it deliberately, not incidentally).

---

## 2. CI pipeline execution (FE-RV-4)

**Blocked on:** a GitHub Actions runner (`gh`/`act` — verified absent here).

**What FS15 already did:** fixed the one real, source-verified gap — `ci.yml`'s E2E step ran only
`--project=desktop-dark`; it now runs all three shipped Playwright projects (`desktop-dark`, `desktop-light`,
`mobile`), matching `playwright.config.ts` and every FS1–FS14 acceptance's own reported floor. The fix was
verified the only way this environment can verify a CI-authored file — by running the **exact equivalent
commands** locally:

```bash
cd webplatform/console
pnpm exec playwright install --with-deps chromium
pnpm exec playwright test
# Result recorded at FS15: 400 passed, 0 failed, 17 skipped — matches the FS14 acceptance floor exactly.
```

Raised the job timeout 30 → 45 minutes as a conservative buffer (not a measured CI wall-clock — there is no
runner here to time it against).

**Run, the day a runner exists:** push a commit or open a PR touching `webplatform/console/**`; watch the
`console-ci` workflow. If the `gate` job exceeds 45 minutes, split the E2E step into a matrix job (one per
Playwright project) rather than raising the timeout further.

**Adjustment point:** `webplatform/console/.github/workflows/ci.yml`.

---

## 3. Session-cookie round-trip through Caddy (FE-RV-7, checklist item 1)

**Blocked on:** a live backend issuing the real session cookie, behind Caddy.

```bash
curl -i -X POST https://<staging-host>/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"<real-account>","password":"<real-password>"}'
# Inspect: Set-Cookie name/flags (HttpOnly, Secure, SameSite), and confirm the
# BFF (webplatform/console/src/app/api/auth/login/route.ts) forwards it
# VERBATIM via a raw header append (see roleHintSetCookie's own warning —
# NextResponse.cookies.set() silently drops appended values).
```

**Adjustment point:** `shared/lib/auth-gateway/map.ts` (`SESSION_COOKIE_NAME` in `server-env.ts` if the real
name differs from the assumed default `session`).

## 4. Correlation-id continuity into backend logs (FE-RV-7, checklist item 2)

**Blocked on:** a live backend with structured logging reachable.

```bash
curl -i https://<staging-host>/api/v1/channels -H 'X-Request-Id: fs15-probe-<uuid>'
# Then grep the backend's structured logs for "fs15-probe-<uuid>" (§R12.9).
```

**Adjustment point:** none expected — `shared/lib/api/correlation-id.ts` already sends the header on every
request; this item only confirms the backend half.

## 5. SSE through the reverse proxy (FE-RV-9, checklist item 3)

**Blocked on:** a live backend + Caddy in front of the console.

```bash
curl -N -i https://<staging-host>/api/ai/stream -X POST \
  -H 'content-type: application/json' -d '{"...": "a real dry-run body"}'
# Confirm tokens arrive INCREMENTALLY (not batched at completion) and that no
# idle timeout severs a long stream. If Caddy buffers, add
# `flush_interval -1` to its reverse_proxy block for this route.
```

**Adjustment point:** `webplatform/console/src/app/api/ai/stream/route.ts` · `docker/Caddyfile` (only if
buffering is observed — see item 1's deferred route for where this directive would live).

## 6. Real non-owner RBAC (checklist item 6)

**Blocked on:** a live backend issuing a real, backend-assigned non-owner role (the five fixture roles are
already exercised in every FS4–FS14 E2E suite — that half is **closed**, not open).

```bash
# Sign in as a real analyst/viewer account (not a fixture) and confirm:
#  - the sidebar/palette hide forbidden actions (client RBAC)
#  - a forbidden route renders the /403 permission state, never a crash
#  - the backend itself refuses the underlying call (server RBAC is the real
#    boundary — the client only reflects it, §F7.2)
```

**Adjustment point:** `shared/config/rbac.ts` / `route-access.ts`, only if a mismatch is found.

## 7. Container behaviour (FE-RV-3, checklist item 8)

**Blocked on:** a Docker engine. Covered by item 1's `docker inspect` step above; additionally:

```bash
docker run --rm -p 3000:3000 telegram-ai-console:latest &
curl -i http://localhost:3000/  # confirm non-root binding, standalone server responds
docker exec <container> whoami   # confirm the process runs as `node`, not root
```

## 8. CSP enforcement (FE-RV-17)

**Blocked on:** a real deploy behind Caddy, observed for at least one deploy cycle first — there has never been
a `report-uri`/`report-to` configured, so there is no report data anywhere to promote from (the FS14 finding,
unchanged at FS15). **Do not skip straight to enforcement** — that would be exactly the fabricated-gate pattern
this project has refused twice (FS14 D8, FS15 §5.2 D-CSP).

**Pre-condition:** wire a report sink (first-party, allowlist-scrubbed, the same discipline
`shared/lib/observability`'s server half already uses at `app/api/telemetry`) and add `report-to`/`report-uri`
to the **existing** Report-Only header in `next.config.ts`. Watch it for at least one real deploy cycle.

**Then, the one-line promotion**, already documented in `next.config.ts`'s own comments:

```ts
// next.config.ts — swap the header KEY only; the directive string (`csp`) is unchanged.
{ key: 'Content-Security-Policy', value: csp }   // was: 'Content-Security-Policy-Report-Only'
```

**Before flipping it, resolve the one open cost written into that file's comments**: `script-src` currently
keeps `'unsafe-inline'` because Next's App Router emits inline bootstrap/streaming scripts on every RSC
response; removing it requires a per-request nonce, which forces every static/ISR route into dynamic
rendering — measure that trade on staging before deciding, not here.

**Adjustment points:** `next.config.ts` (the header) · `src/shared/lib/observability/*` (only if a client sink
is ever reopened — it is not, by the FS14 owner ruling, rule 78) · `src/app/api/telemetry/route.ts`.

## 9. Field performance vs §F8.1 (checklist item 7 — the staging half)

**Blocked on:** a staging deployment. FS15 already ran a **workstation-only** Lighthouse pass
(`scripts/lighthouse-local.mjs` — see `FS15_REPORT.md` for its numbers and the explicit caveat that they are
not this measurement). This item is that same tool pointed at real staging infrastructure instead of
`localhost`:

```bash
node scripts/lighthouse-local.mjs   # after editing BASE_URL to the staging origin,
                                     # or run `npx lighthouse <staging-url>/chat` directly
                                     # against a real device profile (mid-tier, per §F8.1)
```

Compare against §F8.1: FCP < 1.2s, LCP < 2.0s, TTI < 2.5s, CLS < 0.05, INP < 200ms.

---

## 10. The one session that closes FE-RV-7…16 together

The handoff's own words: "ten live items still share one closing event: the first session against a real
backend." Verified at FS15 (source-level, not by assumption) that every named single-adjustment-point file
still exists at its stated path:

| FE-RV | What it asks | Single adjustment point | Verified present at FS15 |
|---|---|---|---|
| FE-RV-7 | Live auth round-trip | `shared/lib/auth-gateway/map.ts` | ✅ |
| FE-RV-8 | Live `/api/v1` data round-trip | `entities/*/model.ts` mappers | ✅ |
| FE-RV-9 | Live AI round-trip | `shared/lib/ai-gateway/real.ts` | ✅ |
| FE-RV-10 | Live knowledge round-trip | `entities/document/{model,paths}.ts` | ✅ |
| FE-RV-11 | Live memory round-trip | `entities/{persona,actor}/{model,paths}.ts` | ✅ |
| FE-RV-12 | Live image round-trip | `entities/image/{model,paths,keys}.ts`, `entities/location/*`, `entities/actor/paths.ts` | ✅ |
| FE-RV-13 | Live prompt round-trip | `entities/prompt/{model,paths,keys}.ts` | ✅ |
| FE-RV-14 | Live analytics round-trip | `entities/analytics-report/{report-model,report-hooks,paths,keys}.ts` | ✅ |
| FE-RV-15 | Live platform & admin round-trip | `entities/{platform-user,config-version,audit,job-queue,probe,api-key,cost-report}/{model,paths,keys}.ts` | ✅ |
| FE-RV-16 | Live account round-trip | `widgets/profile/identity.ts`, `widgets/profile/ActivityPanel.tsx`, `features/change-settings/model/preferences.ts` | ✅ |

**Procedure, in order, for that one session:**

1. Point `INTERNAL_API_BASE_URL` (server) and, once item 1's Caddy route lands, the same-origin
   `NEXT_PUBLIC_API_BASE_URL` path at the real backend.
2. Sign in through the real form with a real account (not a fixture) — closes the FE-RV-7 half not already
   covered by item 6 above.
3. Walk every screen once, comparing each `entities/*` mapper's *(assumed)* wire-shape comments against the
   real response body. Each mismatch has exactly one file to edit (the table above) — no other file should
   need to change, per every stage's own "the mapper is the single adjustment point" discipline.
4. Re-run the full gate (`pnpm gate && pnpm budget && pnpm size && pnpm e2e`) against the live backend fixture
   toggle disabled, to confirm nothing that depended on the deterministic fixture silently broke.
5. Record the outcome per item — CLOSED with evidence, or a specific new *(assumed)* correction — in an
   updated register, not by editing this Runbook's checkmarks in place.

---

## Appendix — what this Runbook deliberately does not attempt

Per the owner's binding requirements at FS15's GO: **no item above may be marked closed from local assumption.**
This document exists precisely so that temptation never arises — every item states its blocking infrastructure
plainly, and none of the workstation-only work FS15 performed (the secrets scan, the gated-fields audit, the
local Lighthouse pass) is represented anywhere above as satisfying an item it does not.
