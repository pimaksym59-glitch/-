# FS2 — Routing & Navigation (Plan)

**Track:** Web Platform implementation · **SoT:** `FRONTEND_MASTER_SPEC.md` · implements Stage 2 + Stage 3 §5/§6
on top of the accepted FS1 scaffold. **This is a PLAN. No code yet.**

**Goal of FS2:** turn the FS1 skeleton into a **fully navigable, keyboard-complete, RBAC-reflecting shell** —
every route reachable, every navigation surface real, every view deep-linkable and restorable. Screens stay
stubs; **no business data, no feature slices**. Frozen inputs (D1–D4, ONYX v1.0, Stage 2/3, backend contract)
are consumed as-is; **no `app/` / Protocol / MASTER_SPEC change**.

**Why this plan exists:** FS2 had no plan document. Per `DESIGN_FREEZE_AND_ROADMAP.md` §4 and handoff §15, a
stage may not begin without an approved plan. Awaiting approval; on GO I implement FS2, run the gates, write
`FS2_REPORT.md`, and stop.

---

## 1. Scope

**IN:** navigation model (D1 §6) · sidebar rail + persistence · topbar (channel-switcher shell, breadcrumbs,
bell entry, avatar menu) · full Command Palette modes · keyboard system + cheat-sheet · per-route RBAC
reflection + 403 permission state · Universal Inspector URL contract (`?inspect=`) · URL state (nuqs) + global
UI store (Zustand) · per-route loading/error/not-found states · route transitions + prefetch-on-intent ·
responsive navigation (tablet rail / mobile bottom tabs + sheet) · navigation-serving primitives · heading &
landmark semantics · navigation tests (unit/component/E2E/axe) · **FE-RV-1 remediation** (Storybook toolchain).

**OUT:** any entity data or API calls beyond the FS1 health smoke-check · feature slices · the 24-component
ONYX library (**FS3**) · real authentication/session (**FS4**) · Dashboard/Chat/Knowledge/Memory/Studio/
Prompts/Analytics/Admin content (**FS5+**) · AI behaviour behind the palette's `/` mode (seam only).

**Carried over from the FS1 postmortem** (each becomes a task below): R1 FE-RV-1 · R2 unwired `zustand`/`nuqs` ·
R4 middleware is cookie-presence only · R5 `@inspector` exists only in `(workspace)` · R6 per-route bundle
measurement · R8 heading/selector conventions · R9 three open frontend ADRs due before FS3.

## 2. Task sequence (each with a completion criterion)

| Task | Produces | Done when |
|---|---|---|
| **T-FS2.0** FE-RV-1 remediation | Storybook on `@storybook/react-vite` (reuses the existing Vite/Vitest toolchain) or SB 9; Chromatic config | `pnpm build-storybook` **succeeds**; token/Button/EmptyState stories render in both themes; gate 9 becomes enforceable |
| **T-FS2.1** State ownership wiring | `shared/lib/store` (Zustand: sidebar, activeChannel, palette, recents), `nuqs` adapter in the provider tree, cookie persistence for SSR-relevant keys | Stage 2 §7 owners are real, not declared; sidebar/channel/filters survive reload; SSR reads cookie without FOUC |
| **T-FS2.2** Sidebar | rail/expanded toggle (`⌘\`), persisted per user, rail tooltips, RBAC-filtered groups, count/status-dot slots, active Iris marker | collapse persists across reload; rail is keyboard-operable with accessible names; tablet defaults to rail |
| **T-FS2.3** Topbar | channel-switcher **shell** (`⌘.`, no channel data), breadcrumbs (≤3, `aria-current`), notifications bell entry (no data), avatar menu (profile/theme/density/settings/sign-out) | breadcrumbs derive from the route registry; every control keyboardable; switcher opens/closes with focus restore |
| **T-FS2.4** Command Palette (full model) | modes `(none)` / `>` commands / `@` go-to / `#` search / `/` Ask-AI **seam**; grouped results; shortcut hints; recents; RBAC filtering | each mode is reachable by prefix; forbidden actions never listed; results grouped + announced; `esc` restores focus |
| **T-FS2.5** Keyboard system | `useShortcuts` registry (global + per-scope registration), `g`-chords (`g d/c/k/m/i/p/a/b`), `⌘/` cheat-sheet dialog, `⌘.`/`⌘\`/`⌘⇧L`/`⌘⇧D` | D1 §6.5 global map works end-to-end; chords don't fire inside inputs; cheat-sheet lists the live registry (not a hardcoded copy) |
| **T-FS2.6** Route protection + RBAC reflection | per-route permission map consumed by `middleware.ts`; server-layout re-check seam; **403 permission state** screen; `next=` preserved | a role lacking a permission gets the permission state, **never a crash or a blank**; middleware decisions are unit-tested |
| **T-FS2.7** Universal Inspector routing | `?inspect=type:id` URL contract + `useInspector`; `@inspector` slot decision for `(platform)`/`(account)` (extend or document exclusion); drawer (desktop) / sheet (mobile) | deep-linking `?inspect=` opens the panel without navigation; `esc` closes and restores focus; state is shareable |
| **T-FS2.8** Route states & transitions | per-route-type `loading.tsx` skeleton variants (list / detail / chart per Stage 3 §5), segment `error.tsx` with recovery, segment `not-found.tsx`, 240ms cross-fade transitions, prefetch-on-intent | every route shows a shaped skeleton (not a spinner); transitions honour `prefers-reduced-motion`; no white flash |
| **T-FS2.9** Responsive navigation | tablet icon rail; mobile bottom tab bar + nav sheet; touch targets ≥44px; 320px reflow | navigation is complete on all three tiers; nothing critical is desktop-only; verified at 320px and 200% zoom |
| **T-FS2.10** Navigation-serving primitives | `Tooltip`, `Sheet`/`Drawer`, `Breadcrumbs`, `ScrollArea` (Radix-backed, minimal) | each is token-only, a11y-correct, story-covered; **explicitly marked for formalization in FS3** (no API sprawl) |
| **T-FS2.11** Semantics & selector policy | landmark structure, one `h1` per screen, skip-link target, documented heading + test-selector conventions | axe clean on every navigation surface; E2E selectors use role+level per the written policy (FS1 §3.7 closed) |
| **T-FS2.12** Tests | unit (route/RBAC map, URL state, shortcut registry, breadcrumb derivation); component (sidebar, palette, breadcrumbs, inspector); **E2E journeys** (keyboard-only navigation, palette go-to, inspector deep-link, RBAC redirect, responsive nav) + axe; **full Playwright matrix** | `pnpm test` + `pnpm e2e` green across `desktop-dark`/`desktop-light`/`mobile` → **closes FE-RV-2** |
| **T-FS2.13** Open ADR proposals | written proposals for the three Stage 2 §15 open ADRs (chart library · styling depth · observability vendor) | proposals presented **for owner decision** — not self-approved, per handoff §12 (no automatic ADRs) |
| **T-FS2.14** Gate + report | all gates run; `FS2_REPORT.md`; per-route bundle measurement (FS1 R6); living docs updated | gates green (or honestly FE-RV-flagged); report with the three statuses; **STOP** |

## 3. Deliverables (file-level, maps to Stage 3 §1)

`src/shared/lib/store/*` · `src/shared/hooks/{useShortcuts,useInspector,useGChord,useDensity,…}` ·
`src/shared/ui/{tooltip,sheet,breadcrumbs,scroll-area}/*` · `src/widgets/{sidebar,topbar,command-palette,
inspector,mobile-nav,shortcut-cheatsheet}/*` · `src/app/**/{loading,error,not-found}.tsx` +
`(platform)/(account)` `@inspector` decision · `src/app/_states/PermissionState.tsx` · `src/middleware.ts`
(per-route RBAC) · `src/shared/config/{routes,rbac,shortcuts}.ts` (extended) · `tests/{unit,component,e2e}/*` ·
`.storybook/*` (Vite builder). **No `entities/`, no `features/`, no real screens.**

## 4. Definition of Done (FS2)

- Every one of the 25 routes is reachable by **sidebar, palette, `g`-chord, breadcrumb and direct URL**, and is
  RBAC-reflected; a forbidden route renders the **permission state**, never a crash.
- The product is **operable end-to-end without a mouse**; `⌘/` documents the live shortcut registry.
- Sidebar rail, active channel, inspector target and per-screen filters are **persisted and deep-linkable**
  (URL state via nuqs; UI state via Zustand; theme/density/sidebar via cookie, SSR-applied).
- Navigation works on desktop / tablet / mobile with correct skeletons, error and not-found scopes, and
  reduced-motion-safe transitions.
- **All ten gates green**, including **Storybook build (FE-RV-1 closed)** and the **full Playwright matrix
  (FE-RV-2 closed)**; axe clean on every navigation surface.
- **Still no business logic:** screens remain stubs; no entity hooks; no feature slices.

## 5. Gates & environment

All ten Stage 2 §14 gates run as in FS1 (`pnpm gate` + build + size + e2e + storybook). FS2 additionally
**raises** two gates FS1 could not fully enforce: **gate 9 (visual regression)** becomes real once T-FS2.0
lands, and **gate 5 (a11y)** extends from the shell to every navigation surface at three viewports.
Per-route First Load JS is measured from the build output (FS1 R6) and recorded as the FS3 baseline.

**Environment honesty:** any check that cannot be executed here (e.g. Chromatic upload without a project token,
Docker, CI) is reported as **FE-RV**, never as a pass — the FS1 discipline is unchanged.

## 6. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | **Scope creep into FS3** — navigation primitives quietly becoming the component library | T-FS2.10 is capped at four Radix-backed primitives, each marked for FS3 formalization; anything else is deferred |
| R2 | **Scope creep into FS5** — the channel switcher wanting real channels | switcher ships as a **shell** with no data source; channel data is FS5 |
| R3 | FE-RV-1 remediation (builder swap) destabilizes the toolchain | do it **first** (T-FS2.0) so the rest of FS2 is built on a green Storybook; Vite is already present for Vitest |
| R4 | Keyboard shortcuts colliding with browser/OS or firing inside inputs | central registry with scope + input-guard; conflicts unit-tested; cheat-sheet generated from the registry |
| R5 | Mock auth (`owner` only) makes RBAC paths untestable | tests drive `can()` and the route map directly with all five roles; real session remains FS4 |
| R6 | Inspector parallel-route retrofit across groups is disruptive later | T-FS2.7 forces an explicit, documented decision **now** |

## 7. Not in FS2 (explicit)

No real authentication or session validation (FS4) · no entity data hooks, API calls or Query usage beyond the
existing health smoke-check · no feature slices · no ONYX component library beyond the four navigation
primitives (FS3) · no Dashboard/Chat/Knowledge/Memory/Studio/Prompts/Playground/Analytics/Channels/Admin
content (FS5+) · no AI behaviour behind the palette `/` mode · no `app/` / Protocol / MASTER_SPEC change · no
ONYX token-value change.

---

**STOP — FS2 plan complete. Awaiting your approval to implement FS2 (Routing & Navigation).** On approval I
implement §2 in order, run the gates (§5), write `FS2_REPORT.md`, and stop for acceptance. FS3 will not be
started.
