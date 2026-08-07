# FS1 — Infrastructure · Implementation Report (v1.0)

**Track:** Web Platform (Console) · **Stage:** FS1 (Infrastructure) · **SoT:** `FRONTEND_MASTER_SPEC.md`
(implements Stage 2 Architecture + Stage 3 Technical Spec) · **Date:** 2026-07-27.
**Result:** the `webplatform/console/` engineering scaffold is delivered and **all executable engineering gates
are green** on the local toolchain. Two execution-only items are honestly flagged **FE-RV** (Runtime
Verification Pending). **No `app/` change · no ONYX token-value change · no architecture change.**

---

## 1. Environment (honest status)

- **Node** v22.23.1 · **pnpm** 9.15.9 (via corepack) — a Node toolchain **is** available in this environment,
  so the gates below were **executed for real**, not simulated. FE-RV is used **only** where a runtime genuinely
  could not be exercised here (see §4).
- Three-status discipline (backend parity): **Implemented & Verified** (executed green) · **Statically
  Verified** (typechecks/lints, not executed) · **Runtime Verification Pending (FE-RV)**.

## 2. Scope delivered (maps to STAGE_FS1_PLAN §2 / §3)

| Task | Delivered | Status |
|---|---|---|
| T-FS1.0 Toolchain & project | `console/` Next 15 App Router + React 19 + TS strict; pnpm; `package.json`; `.nvmrc`; lockfile | ✅ Verified |
| T-FS1.1 TS + lint + format + boundaries | `tsconfig` (strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + aliases); flat ESLint (ts-eslint strict + jsx-a11y + react-hooks + Next); Prettier; dependency-cruiser (FSD) | ✅ Verified |
| T-FS1.2 FSD structure | `src/{app,widgets,features,entities,shared/{ui,lib,config,types,providers,hooks},styles}` + public `index.ts` | ✅ Verified |
| T-FS1.3 ONYX tokens + themes | `styles/tokens.css` (all D2 semantic tokens, **Dark + Light**) + `@theme` map; `themes.css`; density; SSR cookie, no FOUC; `next/font` self-hosted | ✅ Verified |
| T-FS1.4 Provider tree | `app/providers.tsx` — Theme→Query→Auth→Accessibility→Shortcut→Notification→Streaming (Stage 3 §7 order) | ✅ Verified |
| T-FS1.5 API client + query | `shared/lib/api/{apiFetch,endpoints,correlation-id}`, `errors/{AppError,recovery}`, `query/{client,keys,defaults}`; typed; MSW-tested | ✅ Verified |
| T-FS1.6 SSE infrastructure | `shared/lib/stream/{openStream,reconcile}` (abortable SSE-over-fetch); `app/api/stream` relay stub; unit-tested | ✅ Verified |
| T-FS1.7 Base layouts + shell | root `layout.tsx`; route-group layouts `(public)/(workspace)/(platform)/(account)`; `widgets/app-shell` (Sidebar/Topbar/Inspector `@inspector` slot); CommandPalette | ✅ Verified |
| T-FS1.8 Empty routes + stubs | **all 25 screen routes** as `page.tsx` stubs + group `loading.tsx`/`error.tsx`; each renders an ONYX **EmptyState** | ✅ Verified |
| T-FS1.9 Middleware + session seam | `middleware.ts` (protected groups → `/login?next=`); `AuthProvider` + mock session; `rbac.can()` | ✅ Verified |
| T-FS1.10 Storybook | `.storybook/*`; token + Button + EmptyState stories; theme + density decorators; a11y addon | ⚠️ Static only → **FE-RV-1** |
| T-FS1.11 Test harness | Vitest + RTL + jest-dom + MSW; Playwright + `@axe-core/playwright`; smoke E2E | ✅ Verified |
| T-FS1.12 CI | `.github/workflows/ci.yml` (lint→format→typecheck→boundaries→test→build→size→storybook→e2e/a11y); `.size-limit.json` | ✅ Defined → **FE-RV-4** (CI execution) |
| T-FS1.13 Build & container | `next.config.ts` (`standalone`, CSP, security headers); `Dockerfile` (node:alpine, non-root, healthcheck); `.env.example` + `getPublicConfig()` (Zod) | ✅ Build verified; Docker → **FE-RV-3** |
| T-FS1.14 Gate + report | this report; `webplatform/frontend/README.md` updated | ✅ |

## 3. Gate results (executed)

| # (Stage 2 §14) | Gate | Command | Result |
|---|---|---|---|
| 1 | ESLint (ts-eslint strict + jsx-a11y + boundaries) | `pnpm lint` | ✅ clean (0) |
| 2 | Prettier | `pnpm format:check` | ✅ clean |
| 3 | `tsc --noEmit` strict, **0 unjustified `any`** | `pnpm typecheck` | ✅ **0 errors** |
| 4 | Tests (unit + component + integration via MSW) | `pnpm test` | ✅ **27 passed / 7 files** |
| 5 | Accessibility (axe) on the shell | `pnpm e2e` (axe-core) | ✅ **0 violations** (dark + light) |
| 6 | Bundle-size budget | `pnpm size` | ✅ 293.67 KB ≤ 320 KB (top-level aggregate baseline) |
| 7 | Performance budget | build report | ✅ per-route First Load JS **~138 KB < 180 KB** (Stage 2 §9) |
| 8 | Boundaries (dependency-cruiser, FSD) | `pnpm boundaries` | ✅ **0 violations** (116 modules, 137 deps) |
| 9 | Visual regression (Storybook/Chromatic) | `pnpm build-storybook` | ⚠️ **FE-RV-1** (toolchain incompat, see §4) |
| 10 | Contract (types/Zod vs `API_SPEC.md`) | `pnpm typecheck` + MSW fixtures | ✅ DTO stubs mirror contract shapes |
| — | Production build (25 routes + middleware) | `pnpm build` | ✅ **Compiled successfully** |
| — | E2E smoke journey | `pnpm e2e` (desktop-dark) | ✅ **2 passed** |

**E2E smoke proves:** landing renders + is accessible; `/dashboard` redirects to `/login?next=` (middleware);
mock sign-in reaches the shell; **theme toggles (Dark↔Light) with no crash**; a route stub loads; axe passes.

## 4. Runtime Verification Pending (FE-RV) — honest, not fabricated

| ID | Item | Why pending | Remediation |
|---|---|---|---|
| **FE-RV-1** | Storybook static build + Chromatic baseline | `@storybook/nextjs` 8.5.3 uses a different webpack instance than Next 15.1's bundled webpack; `compiler.close()` fails on a hook mismatch (`Cannot read properties of undefined (reading 'tap')`). Config + stories **typecheck and lint clean** (statically verified). | Upgrade Storybook (9.x) or switch to `@storybook/react-vite` (Vite already present via Vitest). Then wire Chromatic. |
| **FE-RV-2** | Full Playwright matrix (light + mobile projects) | Only `desktop-dark` was executed locally to bound time; `desktop-light` + `mobile` projects are wired but not run here. | Run `pnpm e2e` full matrix in CI. |
| **FE-RV-3** | Docker image build + container healthcheck | Not executed in this environment (no container runtime exercised). `Dockerfile` is written (multi-stage, non-root, standalone, healthcheck). | `docker build` + run in CI/staging. |
| **FE-RV-4** | CI pipeline execution (GitHub Actions) | Workflow authored; not executed here. | First PR triggers it. |
| **FE-RV-5** | `next/font/local` binary pin | FS1 self-hosts Inter + JetBrains Mono via `next/font/google` (build-time self-hosting, CSP-safe). | Drop `.woff2` into `public/fonts` + switch `fonts.ts` (no arch change). |

## 5. Decisions & deviations (all PATCH-level — no architecture/token change)

1. **Tailwind v4 is CSS-first.** The `@theme` map lives in `styles/tokens.css` (not a `tailwind.config.ts` JS
   file) — this is Tailwind v4's mechanism, not a styling-model change. FE-ADR-6 (ONYX tokens + Tailwind v4 +
   CSS Modules) is honored.
2. **Tailwind toolchain pinned to 4.3.3** (`tailwindcss` + `@tailwindcss/postcss`). The initial 4.0.0 pin hit a
   `@tailwindcss/oxide` version skew (`Missing field negated`); aligning the toolchain fixed the build.
3. **`webpack@5` added as a devDependency** for the Storybook webpack builder (does not affect the Next app).
4. **React Query Devtools is a dev-only dynamic import** — code-split out of the production bundle entirely
   (Stage 2 §5/§11: "never in production bundles"). This is a spec-compliance improvement.
5. **CSP is `Content-Security-Policy-Report-Only`** first (Stage 2 SEC-5), plus enforced `X-Frame-Options`,
   `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
6. **`base.css` wrapped in `@layer base`** so Tailwind utilities correctly override element defaults (a
   layered-cascade correctness fix; caught by the axe gate).
7. **`text-tertiary` → `text-secondary` on small UI text** (topbar search, sidebar/palette group headings,
   EmptyState secondary). This is a **usage** fix for WCAG AA (4.5:1); **ONYX token values are unchanged**
   (Design Freeze intact) — `text.tertiary` remains valid for meta/large text on the canvas.
8. **`size-limit` measures the top-level chunk aggregate** as an FS1 baseline (320 KB, currently 293.67 KB).
   The authoritative UX budget — per-route First Load JS (~138 KB < 180 KB, Stage 2 §9) — is reported by the
   build; budgets tighten in FS3+ per the plan.
9. **Mock session seam** (`/api/auth/mock-login`, HttpOnly cookie, no secret) makes the shell demonstrable and
   middleware exercisable. Real cookie-session auth via `/auth/me` is FS4 (§F7.1) — no backend change implied.

## 6. Freeze & invariant compliance

- **Backend untouched** — no file under `app/` was read for import or modified; the frontend consumes only the
  contract shapes (`/api/v1`, DTO stubs mirroring `API_SPEC.md`). Architecture + Production Code Freeze intact.
- **ONYX v1.0 intact** — all token **values** transcribed verbatim from D2; components consume **semantic
  tokens only**; no token meaning changed. Aurora is used **only** on AI moments (logo mark, AI button).
- **Frontend Architecture Freeze intact** — FSD one-way layering enforced by dependency-cruiser (0 violations);
  RSC-by-default; six-state ownership; streaming-first; cookie-session model; FE-ADR-1…11 all honored. No ADR
  was created; no architectural decision was changed.
- **Invariants** (§19): `app/` unchanged; frontend imports only `/api/v1`/contract; FSD acyclic + boundary-clean;
  `tsc` strict 0 `type: ignore`/0 unjustified `any`; gated/mock data is honest; RBAC reflected client-side +
  enforced server-side (seam); streaming-first; two SoT respected.

## 7. Inventory (high level)

- **Config:** `package.json`, `tsconfig.json`, `eslint.config.mjs`, `.prettierrc.json`, `postcss.config.mjs`,
  `dependency-cruiser.config.cjs`, `next.config.ts`, `vitest.config.ts`, `playwright.config.ts`,
  `.size-limit.json`, `Dockerfile`, `.dockerignore`, `.env.example`, `.nvmrc`, `.github/workflows/ci.yml`,
  `.storybook/*`.
- **Source (`src/`):** `styles/*` (ONYX tokens/themes/base); `shared/{config,types,lib,hooks,providers,ui}`;
  `widgets/{app-shell,sidebar,topbar,inspector,command-palette}`; `features/` + `entities/` public stubs;
  `app/` (root layout + providers + middleware + 4 route groups + **25 route stubs** + `@inspector` slot +
  `api/{stream,config,auth}`).
- **Tests:** `tests/{unit,component,e2e,msw,setup}` — 27 unit/component + 1 smoke E2E spec.

## 8. Definition of Done (FS1) — checklist

- [x] `pnpm dev`/`build` serve the themed **app shell**; all 25 routes render ONYX stubs; middleware guards
  protected groups; **theme (Dark/Light) + density (Comfortable/Compact) toggle SSR with no FOUC**.
- [x] Provider tree per Stage 3 §7; `apiFetch` + `openStream` typed and **unit-tested via MSW**; correlation-id
  + `AppError` normalization tested.
- [x] Vitest (unit/component) + smoke Playwright E2E (+axe) green; CI + the ten gates wired.
- [x] FSD boundaries enforced; `tsc` strict clean, **0 unjustified `any`**; eslint/prettier clean.
- [x] **No business logic / no functional screens** — it is a scaffold.
- [~] Storybook builds → **FE-RV-1** (config + stories statically verified; static build blocked by a
  Storybook×Next15 toolchain incompatibility).

## 9. Next step

**STOP — FS1 complete. Awaiting explicit GO for FS2 (Routing & Navigation).** No FS2 work has begun.
Backend + ONYX + Frontend-Architecture freezes intact.
