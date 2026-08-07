# FS4 — Auth & RBAC · Implementation Report (v1.0)

**Track:** Web Platform (Console) · **Stage:** FS4 (Auth & RBAC) · **SoT:** `FRONTEND_MASTER_SPEC.md`
(§F7.1/§F7.2, SEC-1…SEC-3) against the frozen contract **`API_SPEC.md` §Auth** · **Date:** 2026-07-30 ·
**Plan:** `STAGE_FS4_PLAN.md` (approved).

**Result:** authentication is **real**. The session is the backend-issued HttpOnly cookie, `/auth/me` is the
single truth (server-resolved and client-refreshed), sign-in is a real form mapped 1:1 to the contract
(`email/password/otp?`), and **the mock seam no longer exists — provably**: a triple kill-switch makes any
auth stand-in impossible to ship (FS2 R4 / FS3 R3 closed by mechanism). The contract was **not extended** —
no new backend API was invented; where the contract is silent (register), the UI is honest. All ten gates
green, executed for real; the full E2E matrix now authenticates through the real form (44 passed).
**No `app/` change · no ONYX token-value change · no architecture change · no SoT edit.**

---

## 1. Scope delivered (maps to STAGE_FS4_PLAN §2)

| Task | Delivered | Status |
|---|---|---|
| **T-FS4.0** Dependency intake | `react-hook-form 7.54.2` (exact pin, import-checked) — the stage's only new dependency | ✅ Verified |
| **T-FS4.1** Auth API layer | wire mirrors of §Auth (`LoginRequestDTO`, `AuthMeWireDTO {user, role}` — field casing *(assumed)*, FE-RV-7) · single mapper `mapAuthMe` (unknown role ⇒ null, never invented permissions) · `['session']` key · **login/logout clear the whole query cache** (nothing survives an identity change) · retry **none** on auth · MSW fixtures for 200/401/429/network | ✅ Verified |
| **T-FS4.2** BFF + gateway seam | `app/api/auth/{login,logout,me}` route handlers (Stage 2 §4 "cookie handling"; `me` is the thin client-refresh relay) · `AuthGateway` seam: **real** proxy (forwards backend `Set-Cookie` VERBATIM — the session value is never parsed; login chains `/auth/me` to learn the role) · **fixture** gateway (5 deterministic accounts, public demo credential, local/ci only) · HttpOnly **`onyx-role` hint** maintained strictly alongside the session (reflection only — backend is the boundary) | ✅ Verified |
| **T-FS4.3** Mock deletion + assertion | `mock-login`/`mock-logout`/`readMockSession`/"Continue as Owner" **deleted**; **triple kill-switch:** (a) server-env refuses `AUTH_FIXTURE_FORCE` outside local/ci (build/boot failure) · (b) the fixture module **throws at import** in staging/production (and the selector never imports it there) · (c) `auth-integrity.test.ts` greps `src/` for any remnant | ✅ **FS2 R4 closed by mechanism** — each lock is itself unit-tested |
| **T-FS4.4** Session bootstrap | protected group layouts (`workspace/platform/account`) call `requireSession()` — server-side `/auth/me` re-check (SEC-2), redirect on 401; root layout hydrates `AuthProvider` with the real session (provider API unchanged — the FS1 seam swapped exactly as designed); resolution deduped per render (React `cache`) · **`entities/session`** — the first entity slice (`useSessionQuery`, SWR 60 s) | ✅ Verified |
| **T-FS4.5** `features/auth` | the first feature slice: `LoginForm` (react-hook-form + feature-owned Zod; email · password · **optional OTP** straight from `otp?`; first-issue-per-field errors; 401 without user enumeration; 429 honouring Retry-After; network distinct) · `useLogin` (validated same-origin `next=`) · `useLogout` (best-effort; wipes cache) wired into the AvatarMenu · **Register = honest by-invitation state** (the contract has no `/auth/register`) · demo accounts documented on-screen in local/ci only | ✅ Verified |
| **T-FS4.6** Middleware | authenticated = backend session cookie **presence** (name via `SESSION_COOKIE_NAME`, *(assumed)* default — FE-RV-7); role from the hint; **session-without-hint passes through** to the server check (no false 403); `decideAccess()` **byte-identical to FS2** | ✅ Verified — FS2 unit suite untouched and green |
| **T-FS4.7** Tests | +23 unit/component (147 total): fixture gateway per role · both kill-switch locks · schema/`safeNextPath`/mapper · middleware real-session semantics (incl. "session value is never a role") · LoginForm per state + axe · **E2E rewritten**: one `signIn(role)` form helper replaced every mock POST; new journeys — deep-link `next=` restore, sign-out (session really gone), wrong credentials, Register + axe | ✅ Verified |
| **T-FS4.8** Gates + report | all ten gates; this report; README + FE-RV register updated | ✅ |

## 2. Gate results (executed, not simulated)

| # (Stage 2 §14) | Gate | Result |
|---|---|---|
| 1 · 2 · 3 | ESLint · Prettier · `tsc` strict | ✅ clean · clean · **0 errors** |
| 4 | Vitest | ✅ **147 passed / 28 files** (FS3: 124) |
| 4b | Playwright E2E | ✅ **44 passed, 0 failed**, 4 viewport-skipped — full 3-project matrix; every journey signs in through the **real form** |
| 5 | Accessibility | ✅ **0 violations** — and the gate **found a real defect** (§6.3): dark-theme primary-button hover was 3.63:1; fixed by token usage, then re-scanned clean |
| 6 | size-limit | ✅ 343.18 kB ≤ 345 kB (⚠ headroom 1.8 kB — §7 R3) |
| 7 | `pnpm budget` | ✅ **worst route 140 kB / 180 kB** (login absorbed react-hook-form; headroom 40 kB) |
| 8 | dependency-cruiser | ✅ **0 violations** (312 modules, 461 deps) — first `features/*`/`entities/*` slices pass the FSD rules they were designed for |
| 9 | Storybook build | ✅ full library builds; Chromatic upload still **FE-RV-6** |
| 10 | Contract | ✅ DTO mirrors match §Auth; **no endpoint added or changed** |

## 3. Definition of Done (plan §4) — verification

- [x] Real form → contract request; backend-issued HttpOnly cookie is the session; no token ever client-side.
- [x] **Mock seam absent — grep-test-proof**; staging/production builds with any stand-in **cannot compile**
  (both locks unit-tested by flipping `NEXT_PUBLIC_APP_ENV`).
- [x] All five roles E2E through the real cookie pair; viewer → 403 permission state; unauthenticated →
  `/login?next=` with the open-redirect guard (unit + E2E).
- [x] Failure states specific and safe (401/429/network per D4 §8); credentials never in URLs/logs/keys.
- [x] First feature + entity slices pass boundaries; features import no siblings.
- [x] Ten gates green; login route within budget.
- [x] Unverifiable-here items are **FE-RV-7**, not claims (§4).

## 4. FE-RV register (honest status)

| ID | Item | Status |
|---|---|---|
| FE-RV-3 · FE-RV-4 · FE-RV-5 | Docker · CI run · font pin | ⏳ open (unchanged) |
| FE-RV-6 | Chromatic baseline upload | ⏳ open (token still absent; 54 story files) |
| **FE-RV-7** *(new)* | **Live auth round-trip** | ⏳ open — cannot execute without the live backend: real `SESSION_COOKIE_NAME` + cookie flags/SameSite behind Caddy · `/auth/me` wire field casing (`AuthMeWireDTO` is an *(assumed)* mirror; `mapAuthMe` is the single adjustment point) · real 401/429 semantics + Retry-After · CSRF posture for `/api/v1` (§Auth defines none; a header seam is trivial to add if the backend states one) · `Secure` behaviour over HTTPS. Implemented against the contract + MSW; exercised end-to-end via the fixture gateway. **Never reported as live-verified.** |

## 5. Decisions & deviations (all PATCH — no architecture, token-value or contract change)

1. **BFF `me` relay added** alongside login/logout (plan §3 listed two): the client-side session refresh must
   flow through the same gateway seam or local/ci would diverge from real deployments. Cookie-handling BFF
   scope (Stage 2 §4); zero new backend surface.
2. **Role learning chains `/auth/me` after login** — the contract's login returns only `{user}`; the role is
   read from `/auth/me` using the fresh cookies. Contract-true; no invented response field.
3. **Session-without-hint ⇒ middleware pass-through.** The alternative (403) would fake authority the edge
   does not have; the server layout resolves the truth. An attacker-set cookie value is never interpreted as
   a role (unit-tested).
4. **`Input` accepts `ref` as a prop** (React 19 style) so react-hook-form's `register` spreads cleanly —
   additive library MINOR; no D2 contract change.
5. **Fixture accounts are visible on the login screen in local/ci only** — an honest demo affordance that is
   unrepresentable in staging/production by the same kill-switch that guards the gateway.
6. **Cookie writes in BFF responses are RAW `set-cookie` appends only** — mixing `headers.append` with
   `NextResponse.cookies.set()` silently drops appended values (§6.2). Documented at the helper.

## 6. Defects found and fixed during FS4

| # | Symptom | Root cause | Fix |
|---|---|---|---|
| 1 | Component tests: every submit path reported "offline" | MSW handlers for the BFF were registered with absolute URLs that never matched the relative fetches | path-only matchers (`/api/auth/…`) |
| 2 | **E2E: sign-in never landed — 37 failures.** The browser got the role hint but NOT the session cookie | `NextResponse.cookies.set()` re-serializes the cookie map and **drops** previously `headers.append`-ed `set-cookie` values — the verbatim backend cookie was silently discarded | all auth cookies via raw appends (`roleHintSetCookie`); warning documented at the helper (§5.6) |
| 3 | **axe: dark primary-button hover 3.63:1** (white on `interactive.hover` #8172ff) — a defect present since FS1, surfaced by FS4's first-ever axe scan of /login | `interactive.hover` in dark is not AA against `text.onAccent` at button text sizes | usage fix (the sanctioned kind): primary hover tints with **`interactive.active`** (AA in both themes; light was already passing); press feedback = the D2 §13.1 scale, reduced-motion safe. Token values untouched. Flagged as a D4 §12/§13 candidate: revisit `interactive.hover` × `on-accent` small text |
| 4 | E2E strict-mode: two `role=alert` elements | Next's route announcer is also an alert | assert the specific error text |
| 5 | E2E axe scanned the hover state | the pointer parked over the button after a click-navigation | `mouse.move(0,0)` before scanning |
| 6 | Empty-submit showed the wrong email message | zod emits BOTH `min(1)` and `.email()` issues; the last overwrote the first | first-issue-per-field |
| 7 | `next` package corrupted **3×** during the stage | PART4 §3.1 (recoveries + clean rebuilds; numbers re-verified) | `pnpm install --force` |

Defects 2, 3, 4, 5 were invisible to typecheck/lint/unit tests — the fifth stage in a row where executing the
built app found what static gates cannot (FS1 postmortem §8.1).

## 7. Risks entering FS5

| # | Risk | Mitigation |
|---|---|---|
| R1 | **FE-RV-7 assumptions** (cookie name, wire casing, CSRF posture) surface only against the live backend | every assumption has exactly one adjustment point (`SESSION_COOKIE_NAME` env · `mapAuthMe` · an `apiFetch` header seam); no rework beyond those |
| R2 | The fixture gateway now powers ALL E2E — drift between fixture and real backend behaviour would hide bugs | the fixture implements only the §Auth contract semantics; anything beyond login/me/logout stays MSW/contract-typed; FE-RV-7 is the reconciliation point |
| R3 | **size-limit headroom is 1.8 kB** (343.2/345) — react-hook-form consumed the detector budget | the detector (not the UX budget) needs re-baselining; propose the new baseline in the FS5 plan for owner approval, as FS1 §3.6 defined the procedure |
| R4 | `interactive.hover` × on-accent small text is now a known trap other components could re-enter | flagged for a D4 §12/§13 decision; until then the Button comment is the rule of record |
| R5 | Role-hint ≠ session invariant depends on BFF discipline (set/cleared only alongside the session) | both handlers unit/E2E-tested; the middleware treats hint-without-session as unauthenticated (presence check first) |

## 8. Freeze & invariant compliance

**Backend untouched** — no `app/` read-for-import or modification; **no endpoint invented, none changed**; the
frontend adapted to the contract in both directions (OTP field added *because* the contract has `otp?`;
register honest *because* the contract has nothing). **ONYX v1.0 intact** — the §6.3 contrast fix changed
which token a state uses, never a value. **Frontend Architecture Freeze intact** — provider tree/order
unchanged; `decideAccess` byte-identical; FSD boundaries 0 violations with the first real slices; six state
owners respected (`['session']` in Query; no new global state). **SoT untouched. No ADR created.**
Responsibility separation preserved exactly as planned: middleware = reflection, BFF = cookie handling,
server layouts = truth via `/auth/me`, backend = boundary.

## 9. Next step

**STOP — FS4 complete. Awaiting your acceptance, and afterwards an explicit GO for FS5 (Dashboard).**
No FS5 work has begun. On acceptance I can refresh the handoff set on your word. Standing offers: a
`CHROMATIC_PROJECT_TOKEN` closes FE-RV-6 (config-only); the first live-backend session closes most of FE-RV-7.
