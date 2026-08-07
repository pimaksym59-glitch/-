# FS1 — Infrastructure (Plan)

**Track:** Web Platform implementation · **SoT:** `FRONTEND_MASTER_SPEC.md` · implements Stage 2 + Stage 3.
**This is a PLAN. No code yet.** Goal of FS1: an **engineering scaffold**, not a functional product — the
skeleton on which FS2…FS15 build with zero further architecture decisions. Frozen inputs (D1–D4, ONYX v1.0,
Stage 2/3, backend contract) are consumed as-is; **no `app/` / Protocol / MASTER_SPEC change**. Awaiting
approval; on GO I implement FS1, run the gates, write the FS1 report, and stop.

---

## 1. Scope (fixed by the freeze record §4)

**IN:** Next.js project · TypeScript config · App Router · FSD structure · ONYX design tokens · themes (Dark/
Light) · base layouts · Provider Tree · API Client · basic SSE infrastructure · Storybook · Vitest · Playwright
· MSW · ESLint · Prettier · CI · empty routes · screen stubs.
**OUT:** Dashboard · Chat · Analytics · Knowledge · Image Studio · Prompt Library · Admin · **any business
logic** (no entity data hooks beyond a health smoke-check, no feature slices, no real screens).

## 2. Task sequence (each with a completion criterion)

| Task | Produces | Done when |
|---|---|---|
| **T-FS1.0** Toolchain & project | `console/` Next.js app (App Router, React, TS strict), pnpm, `package.json`, `pnpm-lock.yaml`, `.nvmrc` | `pnpm install` resolves; `pnpm dev` serves a blank themed shell |
| **T-FS1.1** TS + lint + format | `tsconfig.json` (strict + `noUncheckedIndexedAccess`, path aliases), `eslint.config.js` (typescript-eslint strict + jsx-a11y + import), `.prettierrc`, `dependency-cruiser.config.js` (FSD boundaries) | `tsc --noEmit`, `eslint`, `prettier --check`, `depcruise` all pass on the scaffold |
| **T-FS1.2** FSD structure | `src/{app,widgets,features,entities,shared/{ui,lib,config,types,providers},styles}` with `index.ts` public stubs | boundary lint enforces layer direction; empty slices compile |
| **T-FS1.3** ONYX tokens + themes | `styles/tokens.css` (all D2 semantic tokens, **Dark + Light**), `tailwind.config.ts` `@theme` map, `themes.css`, `next/font/local` (Inter + JetBrains Mono) | theme + density toggle flips tokens SSR (cookie) with no FOUC; Storybook shows both themes |
| **T-FS1.4** Provider Tree | `app/providers.tsx` (Theme→Query→Auth→Accessibility→Shortcut→Notification→Streaming, Stage 3 §7), `shared/providers/*` | providers mount once; nesting/order match the spec; hydration clean |
| **T-FS1.5** API client | `shared/lib/api/{apiFetch,endpoints,errors,correlation-id}`, `shared/lib/query/{client,keys,defaults}`; typed against `API_SPEC.md` shapes | `apiFetch` typed + unit-tested via MSW; `AppError` normalization tested; correlation-id header set |
| **T-FS1.6** SSE infrastructure | `shared/lib/stream/{openStream,reconcile}`, `app/api/stream` relay stub | `openStream` reads a mocked SSE (MSW) token-by-token, is abortable, reconciles; unit-tested |
| **T-FS1.7** Base layouts + shell | `app/layout.tsx`, route-group layouts `(public)/(workspace)/(platform)/(account)`, `widgets/app-shell` (Sidebar/Topbar/Inspector `@inspector` slot) — **static, no data** | shell renders; sidebar/topbar/command-palette open; `@inspector` slot mounts empty |
| **T-FS1.8** Empty routes + stubs | all 25 routes (Stage 3 §5) as `page.tsx` stubs + `loading.tsx`/`error.tsx`; each renders an ONYX **EmptyState** placeholder | every route resolves, is RBAC-guarded by middleware, shows a themed stub; no business logic |
| **T-FS1.9** Middleware + session seam | `middleware.ts` (route protection stub → `/login?next=`), `AuthProvider` reads a mock session | protected groups redirect when unauthenticated (mock); RBAC `can()` stub wired |
| **T-FS1.10** Storybook | `.storybook/*`, stories for tokens + a couple of primitive stubs, both themes + density decorators, a11y addon | `pnpm storybook` builds; token/theme stories render; Chromatic baseline configured |
| **T-FS1.11** Test harness | `vitest.config.ts` (+ RTL, jest-dom, MSW server), `playwright.config.ts` (+ `@axe-core/playwright`), `tests/{msw,e2e,setup}`; a smoke E2E (“shell renders, theme toggles, a route stub loads”) | `pnpm test` (unit) + `pnpm e2e` (smoke) green; axe passes on the shell |
| **T-FS1.12** CI | `.github/workflows/ci.yml` (lint→typecheck→test→build→a11y→bundle→boundaries→visual), `size-limit.config.js` | pipeline defined; runs the gates on the scaffold (execution env-dependent, see §5) |
| **T-FS1.13** Build & container | `next.config.ts` (`output:'standalone'`, CSP headers, self-hosted fonts), `Dockerfile` (node:alpine, non-root, healthcheck), `.env.example` + `getPublicConfig()` (Zod-validated) | production build succeeds; env schema validated; no secrets in client bundle |
| **T-FS1.14** Gate + report | run all gates; write `FS1_REPORT.md` (+ audit/notes); update `webplatform/frontend/README.md` | gates green (or RV-flagged per §5); report with three statuses; stop |

## 3. Deliverables (scaffold file set → maps to Stage 3 §1)

The complete `console/` skeleton: config (`tsconfig/eslint/prettier/tailwind/postcss/next/vitest/playwright/
depcruise/size-limit/Dockerfile/.env.example`), `src/app/*` (layouts, providers, 25 route stubs, `@inspector`,
`api/*`), `src/widgets/app-shell|sidebar|topbar|inspector|command-palette`, `src/shared/{ui (minimal
primitives used by the shell: Button, EmptyState, Skeleton, Kbd, ThemeToggle), lib (api/query/stream/errors/
rbac/format), config (routes/rbac/env/keys), types (Status enum, DTO stubs), providers}`, `src/styles/*`,
`.storybook/*`, `tests/*`, CI. **No feature slices, no entity data hooks, no real screens** (those are FS3+).

## 4. Definition of Done (FS1)

- `pnpm dev` serves the themed **app shell**; all 25 routes render ONYX stub placeholders; middleware guards
  protected groups; **theme (Dark/Light) + density (Comfortable/Compact) toggles work SSR with no FOUC**.
- Provider tree mounts per Stage 3 §7; `apiFetch` + `openStream` exist, are typed, and are **unit-tested via
  MSW**; correlation-id + `AppError` normalization work.
- Storybook builds with token/theme stories (visual baseline); Vitest (unit) + a smoke Playwright E2E (+axe)
  are green; CI pipeline and all ten gates are **wired** (§14, Stage 2).
- FSD boundaries enforced (dependency-cruiser); `tsc --noEmit` strict clean, **0 unjustified `any`**; eslint/
  prettier clean.
- **No business logic / no functional screens** — it is a scaffold. FS1 report written; stop for approval.

## 5. Gates & environment

FS1 wires the ten engineering gates (Stage 2 §14). Some are **fully enforced now** (eslint, prettier, tsc,
boundaries, unit tests, a11y-on-shell, Storybook baseline); others become **fully meaningful as content
arrives** (bundle/perf budgets tighten in FS3+, visual regression grows with components) — they are configured
now and enforced progressively.

**Environment:** implementing FS1 produces the **source scaffold**. Executing it (`pnpm install`, dev,
Storybook, Playwright, CI, Docker build) requires a **Node toolchain**. If Node is unavailable in the current
environment, execution/verification is treated as **Runtime Verification Pending (FE-RV-1)** — the source is
delivered and statically reviewed, and the run is confirmed once a Node toolchain is available (mirrors the
backend's RV discipline). This will be stated honestly in the FS1 report.

## 6. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | Scope creep into features/business logic | FS1 excludes list is hard; screens are stubs only; review against §1 |
| R2 | Node toolchain unavailable here | source-first delivery + FE-RV-1 flag; no fabricated "green" runs |
| R3 | Token/theme SSR flash (FOUC) | theme/density from cookie applied in root layout before paint (Stage 2 §7) |
| R4 | Boundary drift | dependency-cruiser in CI from day one |
| R5 | Contract drift vs `API_SPEC.md` | types/Zod stubs mirror the contract; contract gate wired |

## 7. Not in FS1 (explicit)

No Dashboard/Chat/Analytics/Knowledge/Image-Studio/Prompt-Library/Admin; no entity data hooks (beyond a health
smoke-check); no feature slices; no real forms/tables/charts (only the minimal primitives the shell needs); no
`app/`/Protocol/MASTER_SPEC changes.

---

**STOP — FS1 plan complete. Awaiting your approval to implement FS1 (Infrastructure).** On approval I create
the `console/` scaffold per §2–§3, run/ wire the gates (§5), write `FS1_REPORT.md`, and stop for your review.
