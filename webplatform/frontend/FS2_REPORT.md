# FS2 — Routing & Navigation · Implementation Report (v1.0)

**Track:** Web Platform (Console) · **Stage:** FS2 (Routing & Navigation) · **SoT:**
`FRONTEND_MASTER_SPEC.md` (implements Stage 2 + Stage 3 §5/§6, D1 §5–6, D2 §13.7/§13.8/§13.14) ·
**Date:** 2026-07-29 · **Plan:** `STAGE_FS2_PLAN.md` (approved).

**Result:** the FS1 skeleton is now a **fully navigable, keyboard-complete, RBAC-reflecting shell**. All ten
engineering gates are green, executed for real. **Two FE-RV items from FS1 are closed** (FE-RV-1 Storybook,
FE-RV-2 full Playwright matrix); one narrower item is newly opened and honestly flagged. **No `app/` change ·
no ONYX token-value change · no architecture change · no SoT edit.**

---

## 1. Scope delivered (maps to STAGE_FS2_PLAN §2)

| Task | Delivered | Status |
|---|---|---|
| **T-FS2.0** FE-RV-1 remediation | Storybook migrated to `@storybook/react-vite`; `@storybook/nextjs` + the `webpack` devDependency removed; `next/link` + `next/navigation` Storybook mocks | ✅ **FE-RV-1 closed** — `build-storybook` succeeds (38 s) |
| **T-FS2.1** State ownership wiring | `shared/lib/store` (Zustand: sidebar, activeChannel, palette recents) + `StoreHydrator`; `NuqsAdapter` mounted; sidebar/channel persisted to cookie and applied SSR via `data-sidebar` | ✅ Verified |
| **T-FS2.2** Sidebar | rail/expanded (`⌘\`), cookie-persisted, rail tooltips, RBAC-filtered groups, Iris left-marker, ScrollArea, prefetch-on-intent | ✅ Verified |
| **T-FS2.3** Topbar | channel-switcher **shell** (`⌘.`, honest empty state), registry-derived breadcrumbs (≤3, `aria-current`), notifications entry, avatar menu (profile/theme/density/settings/sign-out) | ✅ Verified |
| **T-FS2.4** Command Palette | modes `(none)` / `>` / `@` / `#` / `/`; grouped results; recents; RBAC filtering; keyboard hints footer | ✅ Verified |
| **T-FS2.5** Keyboard system | registry-driven (`shared/config/shortcuts.ts`); `⌘K` `⌘.` `⌘/` `⌘\` `⌘⇧L` `⌘⇧D`; `g`-chords (8 destinations); text-entry guard; `⌘/` cheat-sheet **generated from the registry** | ✅ Verified |
| **T-FS2.6** Route protection + RBAC | pure `decideAccess()` shared by middleware and tests; unauthenticated → `/login?next=`; forbidden → **rewrite** to the 403 permission state (URL preserved) | ✅ Verified |
| **T-FS2.7** Inspector routing | `?inspect=type:id` URL contract + `useInspector` (nuqs); desktop drawer / mobile sheet; **slot decision documented** (§5.10) | ✅ Verified |
| **T-FS2.8** Route states & transitions | `ListSkeleton` / `DetailSkeleton` / `ChartSkeleton` variants wired per route type; segment `error.tsx`; segment `not-found.tsx`; 240ms cross-fade honouring reduced-motion; prefetch-on-intent | ✅ Verified |
| **T-FS2.9** Responsive navigation | tablet rail; mobile bottom tab bar + full nav sheet; ≥44px targets | ✅ Verified |
| **T-FS2.10** Navigation primitives | `Tooltip`, `Sheet`, `Breadcrumbs`, `ScrollArea` — Radix-backed, token-only, **capped at four and marked for FS3 formalization** | ✅ Verified |
| **T-FS2.11** Semantics & selectors | landmarks (`banner`/`navigation`/`main`/`complementary`), one `h1` per screen, skip-link target, documented selector policy (§7) | ✅ Verified |
| **T-FS2.12** Tests | 28 new unit/component tests; 11 E2E navigation journeys across **3 projects** | ✅ **FE-RV-2 closed** |
| **T-FS2.13** Open ADR proposals | three proposals prepared **for owner decision** (§8) — not self-approved | ✅ Presented |
| **T-FS2.14** Gate + report | all gates run; this report; README updated | ✅ |

## 2. Gate results (executed, not simulated)

| # (Stage 2 §14) | Gate | Command | Result |
|---|---|---|---|
| 1 | ESLint (ts-eslint strict + jsx-a11y + react-hooks) | `pnpm lint` | ✅ clean |
| 2 | Prettier | `pnpm format:check` | ✅ clean |
| 3 | `tsc --noEmit` strict, 0 unjustified `any` | `pnpm typecheck` | ✅ **0 errors** |
| 4 | Unit / component / integration | `pnpm test` | ✅ **55 passed / 13 files** (FS1: 27) |
| 4b | E2E journeys | `pnpm exec playwright test` | ✅ **35 passed, 0 failed**, 4 viewport-skipped |
| 5 | Accessibility (axe) | E2E, 3 projects | ✅ **0 violations** — shell, palette, cheat-sheet, landing, stubs |
| 6 | Bundle-size | `pnpm size` | ✅ 331.39 KB ≤ 345 KB (metric reframed, §5.9) |
| 7 | Performance budget | build report | ⚠️ **168 KB per-route First Load < 180 KB** — headroom fell 42 → **12 KB** (§6 R1) |
| 8 | Boundaries (dependency-cruiser) | `pnpm boundaries` | ✅ **0 violations** (146 modules, 204 deps) |
| 9 | Visual regression | `pnpm build-storybook` | ✅ builds (**FE-RV-1 closed**); Chromatic upload → **FE-RV-6** |
| 10 | Contract vs `API_SPEC.md` | `pnpm typecheck` + MSW | ✅ unchanged — FS2 added **no** endpoint or DTO |

**E2E coverage (3 projects × journeys):** sidebar rail collapse + cookie persistence + reload · palette
keyboard-only navigation · palette honest seams (`#`, `/`) · `g`-chords + text-entry guard · cheat-sheet from
registry · inspector deep-link · RBAC permission state for a viewer · RBAC-filtered sidebar/palette ·
unauthenticated redirect with `next=` · mobile tab bar + nav sheet · axe on every navigation surface.

## 3. Definition of Done (plan §4) — verification

- [x] All 25 routes reachable via **sidebar, palette, `g`-chord, breadcrumb and direct URL**; RBAC-reflected;
  forbidden → permission state, never a crash *(E2E: RBAC tests)*.
- [x] **Operable end-to-end without a mouse**; `⌘/` documents the live registry *(E2E: keyboard-only journeys)*.
- [x] Sidebar rail, active channel, inspector target **persisted and deep-linkable** *(E2E: reload + `?inspect=`)*.
- [x] Desktop / tablet / mobile navigation with shaped skeletons, error + not-found scopes, reduced-motion-safe
  transitions.
- [x] Ten gates green incl. Storybook build (**FE-RV-1**) and full Playwright matrix (**FE-RV-2**).
- [x] **No business logic**: screens remain stubs; no entity hooks; no feature slices; no API calls added.

## 4. FE-RV register (honest status)

| ID | Item | Status |
|---|---|---|
| **FE-RV-1** | Storybook static build + visual baseline | ✅ **CLOSED** — builds on the Vite builder |
| **FE-RV-2** | Full Playwright matrix (desktop-light, mobile) | ✅ **CLOSED** — all three projects executed |
| **FE-RV-3** | Docker image build + container healthcheck | ⏳ open — no container runtime exercised here |
| **FE-RV-4** | CI pipeline execution (GitHub Actions) | ⏳ open — workflow authored, never run |
| **FE-RV-5** | `next/font/local` binary pin | ⏳ open — currently build-time self-hosted, CSP-safe |
| **FE-RV-6** | **Chromatic visual baseline upload** *(new)* | ⏳ open — needs a `CHROMATIC_PROJECT_TOKEN`; the **build** that feeds it is now green |

FE-RV-6 is deliberately narrow: FS2 removed the *technical* blocker (the build), leaving only an account/
credential step that cannot be performed in this environment. It is **not** reported as a pass.

## 5. Decisions & deviations (all PATCH — no architecture, token or contract change)

1. **Storybook → `@storybook/react-vite`.** Removes an entire bundler from the toolchain rather than patching
   the webpack conflict (FS1 postmortem §8.4). `@storybook/nextjs` and the `webpack` devDependency were
   removed; `next/link` + `next/navigation` are aliased to local stubs so navigation components render in
   isolation.
2. **`@radix-ui/react-dropdown-menu` added** for the channel switcher and avatar menu (accessible primitives,
   FE-ADR-7).
3. **`NuqsAdapter` mounted outermost** as a *technical adapter* for the URL-state library mandated by
   FE-ADR-5. It owns no state and does not change the seven providers or their order — **Stage 3 §7 is intact**.
4. **Zustand is a module-level store, not a provider.** Stage 3 §7 freezes the provider tree; Zustand needs no
   provider. SSR correctness comes from the root layout stamping `data-sidebar` from the cookie (the proven
   theme/density mechanism) plus a `StoreHydrator` that seeds the client store once.
5. **The mock session cookie now carries the role** (`onyx-session=<role>`). This makes all five RBAC paths
   testable without inventing a role-switch UI. It still carries **no secret** and is replaced in FS4.
6. **403 is a `rewrite`, not a redirect** — the original URL is preserved, so granting the permission makes the
   page work without re-navigating.
7. **Palette + cheat-sheet are `dynamic()` overlays** mounted on first open (Stage 2 §9: heavy client modules
   are lazy). This keeps `cmdk` out of the initial route bundle.
8. **`text-tertiary` → `text-secondary` on small text** in the new surfaces (palette footer/path hints,
   cheat-sheet, switcher). A **usage** fix for WCAG AA; **ONYX token values are unchanged** (§9).
9. **`size-limit` reframed.** Code-splitting the overlays *raised* the aggregate glob (329.8 → 331.4 KB) while
   improving real UX — proving again (FS1 §3.6) that the aggregate is not the UX budget. It is now labelled a
   **total-JS regression detector** at 345 KB; the authoritative budget remains **per-route First Load JS**
   (168 KB < 180 KB), read from the build report.
10. **Inspector slot decision (T-FS2.7).** The `@inspector` **parallel route** stays workspace-only — that is
    where server-rendered entity inspectors will live (FS5+). The **URL contract `?inspect=` works in every
    route group** through the shell-level panel. Extending the parallel slot later is therefore additive, not
    a retrofit.

## 6. Defects found and fixed during FS2

| # | Symptom | Root cause | Fix |
|---|---|---|---|
| 1 | Palette returned **no results** for `@analytics` | cmdk scored items against the **raw input including the mode prefix**; `@analytics` matches nothing | `shouldFilter={false}` + manual filtering on the **stripped** query |
| 2 | axe contrast failures in palette/cheat-sheet/switcher | `text.tertiary` (`#6B7280`) on 11–13px text — **the same class as FS1 §3.2** | moved those call sites to `text.secondary`; token values untouched |
| 3 | axe `scrollable-region-focusable` on the cheat-sheet | the scrollable dialog had **no focusable child** (no close button) | added a real `Dialog.Close` — better UX *and* a fixed rule |
| 4 | 22 E2E failures on first full run | `test.skip(fn)` is only valid inside `describe` | switched to the `testInfo.project.name` form |
| 5 | Palette/​chord tests intermittently wrong | lazy-mounting the palette introduced a **race**: keystrokes landed on the document, where `g` is a chord | `openPalette()` helper awaits dialog visibility **and** input focus |
| 6 | `next` package corrupted **3×** during the stage | pnpm-on-Windows relinking (FS1 §3.5). One instance was **my own violation** of the documented prevention: piping a build into `head`, which SIGPIPEs it | `pnpm install --force`; builds are never piped through truncating filters, and the dev server is stopped before rebuilds |

Defects 1, 2, 3 and 5 were invisible to `tsc`, ESLint and unit tests — they surfaced only when the **built app
was executed**. That is the third stage in a row where this held (FS1 postmortem §8.1).

## 7. Conventions established (FS1 postmortem R8 closed)

- **Landmarks:** `banner` (topbar) · `navigation` — "Primary", "Primary mobile", "Breadcrumb" · `main`
  (`#main-content`, skip-link target) · `complementary` ("Inspector").
- **Headings:** exactly one `h1` per screen (the screen title). Composed blocks (EmptyState) use `h2`.
- **Test selectors:** role-based, and **role + level** for headings (`getByRole('heading', { level: 1 })`).
  Accessible names are the contract; no `data-testid` was needed in FS2.
- **Colour usage:** `text.tertiary` is for ≥16px or decorative meta only; small UI text uses `text.secondary`.
  **FS3 must encode this in the component library** (§9 risk).

## 8. Open ADR proposals — for owner decision (T-FS2.13)

Stage 2 §15 requires these closed **before FS3**. Presented as proposals; **no ADR was created**, per handoff
§12.

| ADR | Options | Recommendation | Rationale |
|---|---|---|---|
| **Chart library** | (a) **visx** (Stage 2 default) · (b) a thin custom SVG layer | **(a) visx**, with charts behind `dynamic()` | D2 §12 needs token-exact axes/tooltips/ramps; visx is composable primitives, not an opinionated chart lib, and lazy-loading keeps it off the per-route budget — which matters now that headroom is 12 KB |
| **Styling depth** | (a) **Tailwind v4 + CSS Modules** (current) · (b) pure CSS Modules / vanilla-extract | **(a) keep current** | FS1+FS2 shipped 146 modules with zero token violations and the theme flips without a rebuild; a migration would spend FS3 budget re-proving a solved problem |
| **Observability vendor** | (a) Sentry · (b) OpenTelemetry → self-hosted · (c) defer, keep the provider-agnostic sink | **(c) defer to FS14/FS15**, keep the seam | The sink seam already exists (Stage 2 §11) and nothing before FS14 needs a vendor; choosing early would bind a contract to unproven needs |

## 9. Risks entering FS3

| # | Risk | Mitigation |
|---|---|---|
| R1 | **Bundle headroom is 12 KB** (168/180 KB) and FS3 adds the 24-component library | every heavy module (charts, markdown, Shiki, editor) must be `dynamic()` from the start; measure per-route First Load in the FS3 gate, not at the end |
| R2 | The `text.tertiary` usage rule is a **convention, not a mechanism** — it has now caused defects twice | FS3 must encode it in the component API (e.g. a `tone` prop that cannot select tertiary for small text) and keep axe running per component |
| R3 | Per-route budget is still **read by eye** from the build report (FS1 R6 carried) | automate parsing of the Next build output in the FS3 gate |
| R4 | Mock auth (`onyx-session=<role>`) is now more capable — and therefore more dangerous if it survives | FS4 must delete it **and** add a build-time assertion that fails on staging/production |
| R5 | Chromatic (FE-RV-6) still unbaselined while FS3 creates the components that most need it | obtain the token before FS3 component work, or accept explicit visual-regression debt |
| R6 | Palette `#`/`/` seams and the channel-switcher shell are **placeholders users can see** | they state their own status honestly; FS5/FS6 replace them — do not let them silently become "done" |

## 10. Freeze & invariant compliance

- **Backend untouched** — no file under `app/` read-for-import or modified; FS2 added **no endpoint, no DTO,
  no API call**. Architecture Freeze + Production Code Freeze intact.
- **ONYX v1.0 intact** — no token value changed. Contrast fixes were *usage* changes. Aurora remains AI-only
  (logo mark, AI seam). New primitives consume semantic tokens only.
- **Frontend Architecture Freeze intact** — FSD one-way layering enforced (0 violations, 146 modules); the
  seven-provider tree and its order are unchanged; six state owners respected (server=Query, UI=Zustand,
  URL=nuqs, session=Auth, streaming=Streaming, local=component). FE-ADR-1…11 honored. **No ADR created.**
- **Sources of Truth untouched** — `FRONTEND_MASTER_SPEC.md`, Stage 2, Stage 3, D1–D4 unmodified.
- **Invariants (§19)** — `app/` unchanged · frontend consumes only the contract · acyclic boundaries ·
  `tsc` strict 0 unjustified `any` · gated/mock data honest · RBAC reflected client-side, enforced server-side ·
  streaming-first untouched · staged delivery with a stop for acceptance.

## 11. Next step

**STOP — FS2 complete. Awaiting explicit GO for FS3 (ONYX Component Library).** No FS3 work has begun. Before
FS3 starts, the three ADR proposals (§8) need your decision, per Stage 2 §15.
