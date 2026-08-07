# FS4 — Auth & RBAC (Plan)

**Track:** Web Platform implementation · **SoT:** `FRONTEND_MASTER_SPEC.md` (§F7.1/§F7.2) · implements
Stage 2 §8 (SEC-1…SEC-3) + Stage 3 §3 (`features/auth`), §4 (`entities/session`), §8 (Auth endpoint group)
against the frozen backend contract **`API_SPEC.md` §Auth**: `POST /auth/login {email,password,otp?} → 200
{user} + cookie | 401` · `POST /auth/logout → 204` · `GET /auth/me → 200 {user, role}`. **This is a PLAN.
No code yet.**

**Goal of FS4:** replace the scaffold mock session with **real cookie-session authentication** — the
backend-issued HttpOnly/Secure/SameSite cookie is the session, `/auth/me` is the truth, the login screen is a
real form, and route protection validates the real session. The stage's non-negotiable (FS2 R4 → FS3 R3):
the **mock seam is deleted** and a **build-time assertion makes it impossible to ship a staging/production
build with any auth stand-in**. Frozen inputs consumed as-is; **no `app/` / Protocol / MASTER_SPEC change**.

**Entry conditions — satisfied:** FS3 accepted (2026-07-29); ADR-FE-1…3 decided; FS4 had no plan document —
this plan is the first deliverable, per the FS2 precedent.

---

## 1. Scope

**IN:** typed auth API layer for the three contract endpoints (DTOs mirror `API_SPEC.md`; `SessionVM`
mapper; Query key `['session']`; login/logout invalidate everything — Stage 3 §8 row 1) · **BFF auth route
handlers** (`app/api/auth/login|logout`) for cookie handling — exactly the role Stage 2 §4 assigns the BFF —
proxying to `/api/v1/auth/*`, forwarding `Set-Cookie`, and maintaining an **HttpOnly role-hint cookie** so
middleware can reflect per-route RBAC without decoding the backend's opaque session id (reflection only —
the backend stays the boundary, SEC-2) · an **AuthGateway seam**: the real proxy gateway by default, plus a
**deterministic fixture gateway** (one account per role) that exists ONLY for `local`/`ci` and is
**build-guarded out of staging/production** · **deletion of the FS1/FS2 mock seam** (`/api/auth/mock-login`,
`/api/auth/mock-logout`, `readMockSession`, the "Continue as Owner" button) + the assertion (§2 T-FS4.3) ·
server-side session bootstrap: protected group layouts resolve `/auth/me` (401 → `/login?next=`) and hydrate
the existing `AuthProvider` (its API is unchanged — the FS1 seam anticipated exactly this swap) ·
**`entities/session`** — the project's first entity slice (`useSessionQuery`, mappers) · **`features/auth`**
— the project's first feature slice: `LoginForm` on **react-hook-form + Zod** (email · password · optional
OTP field, straight from the contract's `otp?`), `AppError`-mapped failure states, `useLogin`/`useLogout`,
logout wired into the AvatarMenu · **Register screen** per contract honesty (§5 D3) · middleware update
(real cookie presence + role hint; `decideAccess` stays pure and unchanged) · tests incl. a **rewritten E2E
auth journey** (form-based login per role replaces the mock POST) · gates + `FS4_REPORT.md`.

**OUT:** functional screens and entity data beyond the session (**FS5+**) · `POST /auth/sessions/revoke` and
user management (feature `manage-users` — **FS12 Admin**) · MFA enrollment/management UI (only the login
`otp?` field ships; §R10.4 management is FS12/FS13) · SSO (backend seam only, RV) · password reset (no
contract endpoint) · notifications/settings surfaces (**FS13**) · observability vendor (ADR-FE-3) · no
`app/` / Protocol / SoT / ONYX-token-value change · no new backend endpoints — the frontend adapts to the
contract, never the reverse.

**Carried from FS3 (§9):** R3 mock deletion + assertion → T-FS4.3 (the stage's core); R1/R2/R5/R6 are not
FS4 scope and only guarded (budget gate runs as always; placeholders stay honest).

## 2. Task sequence (each with a completion criterion)

| Task | Produces | Done when |
|---|---|---|
| **T-FS4.0** Dependency intake | `react-hook-form` (exact pin, era-consistent, declared→installed→import-checked; Zod already present) — the only new dependency; safe pnpm order (PART4 §3.1) | import-check green; `pnpm build` green; `pnpm budget` unchanged for non-login routes |
| **T-FS4.1** Auth API layer | `shared/lib/api/endpoints` + typed `LoginRequestDTO/SessionDTO` mirrors of `API_SPEC.md` §Auth; `SessionVM` mapper; Query key `['session']` + invalidation policy (login/logout → clear ALL query cache); MSW fixtures for 200/401/429/network per endpoint | DTO shapes typecheck against the contract; MSW-driven unit tests cover success + each failure class; retry = **none** for auth (Stage 3 §8) |
| **T-FS4.2** BFF handlers + gateway seam | `app/api/auth/{login,logout}/route.ts` → `AuthGateway`: **real gateway** proxies to `/api/v1/auth/*` (forwards `Set-Cookie` verbatim, never parses the session value), sets/clears the **HttpOnly `onyx-role` hint** from the response `{user.role}`; **fixture gateway** (deterministic accounts `owner@console.local`… per role, fixed password, no secrets) selected ONLY when `NEXT_PUBLIC_APP_ENV ∈ {local, ci}` | real path is the default; fixture module **throws at import when env is staging/production**; handlers never log or echo credentials; role hint carries a role name only (UI reflection, not a secret) |
| **T-FS4.3** Mock deletion + build assertion | `mock-login`/`mock-logout` routes, `readMockSession`, mock LoginForm button **deleted**; `assertAuthIntegrity`: (a) env guard in `env.ts` — staging/production with the fixture flag set fails the build; (b) module-scope throw in the fixture gateway (defense-in-depth); (c) a unit test greps the source tree for `mock-login|readMockSession` and fails if any survive | a `NEXT_PUBLIC_APP_ENV=production` build containing any stand-in **cannot compile/boot**; the grep-test is green only when the seam is gone (FS2 R4 closed **by mechanism, not by promise**) |
| **T-FS4.4** Session bootstrap | protected group layouts (`(workspace)/(platform)/(account)`) resolve the session server-side via `/auth/me` with forwarded cookies (401 → redirect `/login?next=`); root layout hydrates `AuthProvider` with the real `SessionDTO`; `entities/session` slice: `useSessionQuery` (client refresh/reval), public `index.ts` | AuthProvider's public API unchanged (Stage 3 §7 intact); server re-check exists per SEC-2 (middleware is not the only gate); first entity slice passes boundaries |
| **T-FS4.5** `features/auth` slice | `LoginForm` (react-hook-form + Zod: email format, password required, **optional OTP** per `otp?`), error mapping — 401 → "wrong credentials" (no user enumeration), 429 → Retry-After message, network → offline banner affordance; `useLogin` (redirect to validated same-origin `next=`, default `/dashboard`), `useLogout` (invalidate all → `/login`); AvatarMenu signs out for real; **Register screen** = honest "access is by invitation" state (the contract has **no** `/auth/register` — §5.4) with a link to Login | form is keyboard-complete, labelled, `aria-invalid` wired (library FieldChrome); no credential ever appears in a URL, log or query key; feature exposes only its `index.ts`; features import no sibling features |
| **T-FS4.6** Middleware & RBAC reflection | middleware checks the **backend session cookie presence** (name via server env `SESSION_COOKIE_NAME`, *(assumed)* default confirmed at runtime — §6 R1) + reads the `onyx-role` hint for the pure, unchanged `decideAccess()`; 403 rewrite behaviour preserved; hint absent-but-cookie-present → treated as authenticated-unknown-role (server layout resolves truth) | `decideAccess` unit tests still pass untouched; all five roles exercised through the real cookie pair in tests; unauthenticated → `/login?next=` exactly as FS2 |
| **T-FS4.7** Tests | unit: gateway selection guards, role-hint set/clear, `next=` open-redirect validation, mappers; component: LoginForm per state (default/invalid/submitting/401/429/OTP visible); integration (MSW): login → session in cache → RBAC-aware render → logout clears; **E2E rewritten**: form login per role via the fixture gateway (replaces every mock POST call), deep-link `next=` restore, logout journey, viewer 403 state, axe on Login/Register — 3 projects | `pnpm test` + full `pnpm e2e` matrix green; **no E2E path uses the deleted mock**; axe 0 violations on the new surfaces |
| **T-FS4.8** Gates + report | all ten gates (incl. `pnpm budget`); `FS4_REPORT.md`; track README + FE-RV register updated (new **FE-RV-7**, §4) | gates green or honestly FE-RV-flagged; report with the three statuses; **STOP** |

**Sequencing rule:** T-FS4.2 and T-FS4.3 land together in one motion — the fixture gateway may not exist for
a single commit without its staging/production kill-switch.

## 3. Deliverables (file-level, maps to Stage 3 §1/§3/§4)

`src/features/auth/{index.ts, ui/LoginForm.tsx, ui/RegisterNotice.tsx, model/{useLogin,useLogout}.ts,
model/schema.ts}` · `src/entities/session/{index.ts, model/useSessionQuery.ts, lib/mappers.ts}` ·
`src/app/api/auth/{login,logout}/route.ts` + `src/shared/lib/auth-gateway/{real,fixture,select}.ts` ·
`src/shared/config/auth.ts` (rewritten: cookie names + role-hint helpers; mock reader **deleted**) ·
`src/shared/config/env.ts` (+server env schema: `SESSION_COOKIE_NAME`, fixture flag; integrity assertion) ·
`src/middleware.ts` (updated) · group layouts (session resolution) · `(public)/login/LoginForm.tsx`
(replaced), `(public)/register/page.tsx` (honest state) · `widgets/topbar/AvatarMenu.tsx` (real sign-out) ·
`tests/{unit,component,e2e}/*` (auth suites rewritten/added) · **deleted:** `app/api/auth/mock-login/`,
`app/api/auth/mock-logout/`, `readMockSession`. **No other screens change; no new endpoints invented.**

## 4. Definition of Done (FS4)

- Sign-in is a **real form** against the contract (`email/password/otp?`); the session is the
  **backend-issued HttpOnly cookie**; the client never stores or sees a token (SEC-1); `/auth/me` is the
  single truth, server-resolved for protected layouts and cached under `['session']`.
- **The mock seam does not exist in the tree** (grep-test-proof), and a staging/production build containing
  any auth stand-in **fails at build time** — FS2 R4 / FS3 R3 closed by mechanism.
- All five roles are exercised end-to-end through the real cookie pair (fixture gateway in `local`/`ci`);
  forbidden → 403 permission state; unauthenticated → `/login?next=` with a validated same-origin redirect.
- Login failures are specific and safe: 401 without user enumeration, 429 honouring Retry-After, network
  distinct from auth failure (D4 §8 recovery classes); credentials never in URLs/logs.
- First `features/*` and `entities/*` slices exist and pass FSD boundaries (features import no siblings).
- **All ten gates green** incl. `pnpm budget` (login route absorbs react-hook-form and stays ≤180 kB) and
  the full Playwright matrix; axe 0 violations incl. the new Login/Register surfaces.
- What cannot be verified without the live backend is **FE-RV-7**, not a claim (§5).

## 5. Gates, environment & honesty

All ten Stage 2 §14 gates run as in FS3 (fast block → `pnpm budget` → e2e → storybook; safe pnpm order;
installs batched at T-FS4.0). **New FE-RV-7 — live auth round-trip:** backend cookie name/flags/SameSite
behind Caddy, `/auth/me` contract on the wire, real 401/429 behaviour, and the CSRF posture (§6 R2) cannot
be executed against a real backend in this environment — they are implemented against the contract + MSW,
exercised via the fixture gateway, and **registered FE-RV-7** (this is FS1-postmortem §7.1/§7.6 made formal).
Never reported as a pass.

## 6. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | **Backend session-cookie name is not stated in `API_SPEC.md`** — middleware needs it for the presence check | server env `SESSION_COOKIE_NAME` with an *(assumed)* default; single source in `shared/config/auth.ts`; confirmed at FE-RV-7; no code change beyond env on mismatch |
| R2 | **CSRF strategy**: §Auth defines no CSRF token for `/api/v1`; SEC-3 requires alignment with the backend | same-site cookie defense now; a request-header seam in `apiFetch` reserved for a backend-defined token; posture confirmed at FE-RV-7 — **no backend change requested** |
| R3 | **Fixture gateway is a sharper tool than the mock it replaces** | triple guard (env-schema build failure · module-scope throw · grep unit test); fixture ships zero secrets; report documents the kill-switch |
| R4 | **No `/auth/register` endpoint** vs the D3 Register screen | Register renders the honest by-invitation state (§R10.3 spirit); if the owner later wants self-serve signup, that is a backend MAJOR — flagged, not invented |
| R5 | **E2E rewrite churn** — every journey authenticates | one shared `signIn(role)` helper via the real form; journeys otherwise untouched; full matrix must stay green |
| R6 | **Login route budget** absorbs react-hook-form | measured in `pnpm budget` (login was 107 kB post-FS3; headroom ~73 kB); form libs stay off other routes |
| R7 | The role-hint cookie could be mistaken for a security mechanism | it is HttpOnly, carries only a role name, is set/cleared strictly alongside the session by the BFF, and every doc/comment states: **reflection only — the backend is the boundary** (SEC-2/§F3.2) |

## 7. Not in FS4 (explicit)

No functional screens or entity data beyond the session (FS5+) · no user management / sessions-revoke (FS12)
· no MFA management UI (login `otp?` field only) · no SSO, no password reset (not in the contract) · no
Chromatic work (FE-RV-6 unchanged — token still welcome) · no `app/` / Protocol / SoT / token-value change ·
no commits/pushes unless instructed.

---

**STOP — FS4 plan complete. Awaiting your approval to implement FS4 (Auth & RBAC).** On approval I implement
§2 in order, run the gates (§5), write `FS4_REPORT.md`, and stop for acceptance. FS5 will not be started.
