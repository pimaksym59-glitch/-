# FS1 — Infrastructure · Engineering Postmortem

**Scope:** the implementation of the `console/` scaffold (FS1), from GO to accepted gates.
**Audience:** the engineers executing FS2–FS15. **Purpose:** carry forward what the implementation taught us —
not what it produced (that is [`FS1_REPORT.md`](FS1_REPORT.md)).
**Date:** 2026-07-29 · **Verdict:** FS1 succeeded, but four of the eight defects found were only discoverable
by *executing* the build — a fact that should shape how later stages define "done".

---

## 1. What worked well

**1.1 The plan really did pre-decide the architecture.** Not one architectural question had to be resolved
mid-implementation. Stage 2 (§3 layering, §7 state ownership, §14 gates) and Stage 3 (§1 file map, §5 routing,
§7 provider order) were specific enough that implementation was transcription, not design. The claim in Stage 2
that it would settle "80–90% of engineering decisions" held up under load. **This is the single strongest
signal that the plan-first discipline is worth its cost.**

**1.2 One data registry drove four consumers.** `shared/config/routes.ts` is the only place the 25 screens are
described; the sidebar, the command palette, the middleware protection predicate, and the route stubs all read
from it. Adding a screen is one object literal, not five edits. The `as const satisfies Record<string, RouteDef>`
pattern gave both exhaustive typing and literal key inference (`RouteKey`), so `PageStub routeKey="dashboard"`
is compile-checked against the registry.

**1.3 Token-first CSS variables + `@theme inline` gave free theming.** Because the Tailwind theme map
*references* the CSS custom properties rather than copying their values, flipping `data-theme` re-points every
utility at once — no rebuild, no duplicate class trees, no `dark:` prefix sprawl. Dark/Light are genuinely
equal-weight, exactly as D2 intended, and the SSR cookie path produced **zero FOUC on the first attempt**.

**1.4 Boundaries were enforced before there was anything to enforce them on.** `dependency-cruiser.config.cjs`
was written at T-FS1.1, before any slice existed. Result: 116 modules, 137 dependencies, **0 violations**, and
no cleanup phase. Encoding the rule before the code is cheaper than auditing after.

**1.5 The offline test spine works with no backend at all.** MSW fixtures made `apiFetch` (typed success, DTO
shape, 5xx→`AppError` normalization) and `openStream` (token-by-token SSE, abort) genuinely testable while the
backend was untouched and unreachable. This mirrors the backend's own provider-fake discipline and is what will
keep FS4–FS11 honest.

**1.6 Stubs that tell the truth.** Every one of the 25 routes renders an ONYX `EmptyState` naming the screen and
its status, not a blank page. The scaffold is demonstrable and self-describing, and it makes the FS2+ diff
obvious (a stub is replaced, never merely filled in).

## 2. Decisions that were confirmed correct

| Decision | Confirming evidence from FS1 |
|---|---|
| **FE-ADR-3** FSD one-way layering + dependency-cruiser | 0 violations across 116 modules with no remediation work; layer direction never had to be argued |
| **FE-ADR-6** ONYX CSS vars as SoT + Tailwind v4 `@theme` | theme switch requires no rebuild; token values live in exactly one file; Design Freeze was trivially auditable |
| **Stage 2 §14 a11y as a *gate*, not a goal** | axe found **two real contrast defects** that typecheck, lint and unit tests all passed over (§3.1, §3.2). Without the gate they would have shipped |
| **Stage 3 §7 fixed provider order** | Notification→Announcer dependency, Shortcut→Theme dependency and Auth→Query dependency all resolved cleanly with zero circularity — the order was not arbitrary |
| **Stage 2 §11 "devtools never in production bundles"** | caught a real regression: React Query Devtools were statically bundled until made a dev-only dynamic import (§4.4) |
| **Three-status honesty (Implemented / Statically Verified / RV)** | let FS1 close with a genuinely blocked Storybook build without either faking a pass or stalling the stage |
| **Offline-first + deterministic fixtures** | the entire data/streaming layer was validated with the backend frozen and untouched |

## 3. Problems discovered (symptom → root cause → fix → prevention)

### 3.1 Unlayered base CSS silently defeated a design-system utility — **the most instructive defect**
- **Symptom:** axe reported the landing page's primary CTA at **4.21:1** (white-ish `#F4F6F8` on iris `#6E5BFF`),
  below AA. The markup said `text-on-accent`, which should have been `#FFFFFF`.
- **Root cause:** `base.css` was written outside any cascade layer. Tailwind v4 puts utilities in the
  `utilities` layer; **unlayered CSS always outranks layered CSS**, so the base rule `a { color: inherit }` beat
  `.text-on-accent`. The link inherited body text colour.
- **Fix:** wrap the element resets in `@layer base` (reduced-motion left unlayered deliberately, so it always
  wins).
- **Prevention:** any global element rule added in FS2+ must be inside `@layer base`. This class of bug is
  invisible to TypeScript, ESLint and unit tests — only a rendered-contrast check catches it.

### 3.2 A valid token used in an invalid context
- **Symptom:** `text.tertiary` (`#6B7280`) at 14px on inset/canvas measured **4.46:1** — five hundredths under AA.
- **Root cause:** *usage*, not the token. `#6B7280` is deliberately identical in both themes and is fine for
  large or non-essential meta text; I used it for small interactive labels (topbar search, sidebar group
  headings, palette headings, EmptyState secondary).
- **Fix:** those call sites moved to `text.secondary`. **No ONYX value was altered** — Design Freeze intact.
- **Prevention:** FS3 must codify the rule when it builds the real component library: *`text.tertiary` is
  permitted for ≥16px or decorative meta only; small UI text uses `text.secondary`.*

### 3.3 Tailwind toolchain version skew broke the build
- **Symptom:** `Error: Missing field 'negated' on ScannerOptions.sources` during PostCSS processing.
- **Root cause:** `tailwindcss`/`@tailwindcss/postcss` were pinned to `4.0.0`, but `.npmrc` carried
  `resolution-mode=highest`, which floated the native `@tailwindcss/oxide` scanner to a 4.1+ build. The JS
  plugin and the native binary disagreed on the options struct.
- **Fix:** removed `resolution-mode=highest`; aligned the whole family to `4.3.3`.
- **Prevention:** **pin toolchain families together and never float a package that ships a native binary.**
  A "harmless" resolution hint is a supply-chain hazard.

### 3.4 Storybook × Next bundler incompatibility (→ FE-RV-1)
- **Symptom:** `SB_BUILDER-WEBPACK5_0002 … Cannot read properties of undefined (reading 'tap')` at
  `Cache.shutdown` / `Compiler.close`.
- **Root cause:** `@storybook/nextjs@8.5.3` drives a webpack instance that is not Next 15.1's *bundled* webpack;
  the compiler-close hook set differs between them. Adding a real `webpack@5` devDependency did not help, and
  forcing `cache: { type: 'memory' }` did not either — the failure is in the close path, not the cache path.
- **Decision:** stop; do **not** disable the gate, do **not** claim a pass. Recorded as **FE-RV-1** with the
  stories and config left statically verified (they typecheck and lint clean).
- **Prevention:** resolve by moving to `@storybook/react-vite` (Vite is already present for Vitest, so this
  *reduces* toolchain surface) or Storybook 9. **This must land before FS3**, because FS3 builds the 24-component
  library and that is precisely when a visual baseline stops being optional.

### 3.5 `node_modules/next` self-destructed twice (environment fragility)
- **Symptom:** `Cannot find module '…/node_modules/next/dist/bin/next'` — the package directory existed but was
  empty.
- **Root cause:** pnpm on Windows re-linking the large `next` package while another process touched the store
  (a piped build interrupted by `grep … | head`, and `playwright install` / `pnpm add` running near a build).
  Recovery required `pnpm install --force` both times.
- **Prevention:** never chain a build behind a truncating pipe; never run `pnpm add` concurrently with a build;
  treat CI (Linux, frozen lockfile) as the authoritative environment. **This is a workstation hazard, not a
  product defect** — but it will bite FS2+ developers on Windows.

### 3.6 The bundle-size gate measured the wrong thing
- **Symptom:** `size-limit` reported 348.7 KB against a 320 KB budget, then 293.7 KB against 180 KB — neither
  number corresponded to what a user downloads.
- **Root cause:** a glob over `.next/static/chunks/**` sums *all* chunks including lazily-loaded and
  code-split ones; Next's meaningful figure is the **deduplicated per-route First Load JS** (~138 KB here,
  comfortably inside Stage 2 §9's ~180 KB).
- **Fix:** `size-limit` reframed as an explicit aggregate **baseline** (320 KB); the authoritative per-route
  number is read from the build report.
- **Open debt:** the budget cannot truly *bite* until per-route First Load is measured programmatically. See §6.

### 3.7 Ambiguous accessible names broke E2E selectors
- **Symptom:** Playwright strict-mode violation — `getByRole('heading', { name: 'Dashboard' })` matched both the
  page `<h1>Dashboard</h1>` and the EmptyState `<h2>Dashboard — coming soon</h2>`.
- **Root cause:** the stub composition puts two headings with overlapping accessible names in one document. The
  test was under-specified (no level).
- **Fix:** assert `{ level: 1, name }`.
- **Signal for later:** this is a heading-hierarchy smell as much as a test smell. FS2 introduces real
  navigation and breadcrumbs; heading structure needs to be deliberate, and E2E selectors should specify
  role **and** level.

### 3.8 Two lint findings worth keeping rather than suppressing
- `react-hooks/rules-of-hooks` fired on a Storybook decorator calling `useEffect` inside a non-component
  function → refactored into a real `DensityLayer` component (the rule was right).
- `jsx-a11y/no-autofocus` fired on the command palette input → suppressed **with a written justification**
  (autofocus is correct for a command dialog; Radix owns the focus trap and restore). One targeted
  `eslint-disable-next-line` with a reason, not a rule relaxation.

## 4. PATCH-level changes made during implementation

None of these altered architecture, ONYX token values, or any contract. All are recorded in `FS1_REPORT.md` §5.

| # | Change | Why |
|---|---|---|
| 1 | Tailwind family pinned `4.0.0` → **4.3.3**; `resolution-mode=highest` removed from `.npmrc` | §3.3 native/JS skew |
| 2 | `base.css` wrapped in `@layer base` | §3.1 cascade-layer correctness |
| 3 | `text-tertiary` → `text-secondary` on small UI text (topbar, sidebar, palette, EmptyState secondary) | §3.2 WCAG AA usage fix — token values untouched |
| 4 | React Query Devtools → dev-only `next/dynamic` import | Stage 2 §11 compliance; removed from the production bundle |
| 5 | `webpack@5` added as a devDependency | required by the Storybook webpack builder (does not affect the Next app) |
| 6 | `eslint: { ignoreDuringBuilds: true }` in `next.config.ts` | linting is a dedicated gate (flat config); avoids Next's legacy ESLint path. Type errors still fail the build |
| 7 | Storybook decorator refactored to a component; one justified `jsx-a11y/no-autofocus` disable | §3.8 |
| 8 | `.size-limit.json` reframed as an aggregate baseline | §3.6 |
| 9 | E2E heading assertions specify `level: 1`; axe failures now print violation ids/targets | §3.7 + faster diagnosis |

## 5. Open FE-RV items carried out of FS1

| ID | Item | Blocking? | Owner stage |
|---|---|---|---|
| **FE-RV-1** | Storybook static build + Chromatic baseline (gate 9) | **Blocks FS3** — a component library without a visual baseline is unverifiable | resolve in **FS2** |
| **FE-RV-2** | Full Playwright matrix (`desktop-light`, `mobile`) | No — wired, only `desktop-dark` executed locally | FS2 (via CI) |
| **FE-RV-3** | Docker image build + container healthcheck | No | FS14/FS15, or first staging deploy |
| **FE-RV-4** | CI pipeline execution (GitHub Actions) | No — but until it runs, "the gates pass" means "on one workstation" | first PR |
| **FE-RV-5** | `next/font/local` binary pin (currently build-time self-hosted via `next/font/google`) | No — already CSP-safe and CDN-free | any stage before FS15 |

## 6. Risks entering FS2

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | **FE-RV-1 unresolved when FS3 starts** | the 24-component library lands with no visual-regression protection; ONYX drift becomes undetectable | fix the Storybook toolchain **during FS2**, before component work begins |
| R2 | **Declared-but-unwired dependencies** — `zustand` and `nuqs` are installed but not yet used (state ownership §7 has no runtime home yet) | dependencies without enforcement invite ad-hoc state | FS2 must actually wire URL state (nuqs) and the global UI store (Zustand) per Stage 2 §7, or drop them |
| R3 | **Mock auth seam leaking forward** — `/api/auth/mock-login` + `readMockSession` exist and grant `owner` | a scaffold stand-in reaching staging would be a security incident, not a bug | FS4 replaces it; until then it must never be built with `NEXT_PUBLIC_APP_ENV=staging\|production`. Add an explicit guard/assertion when real auth lands |
| R4 | **Middleware checks cookie presence only** — no per-route RBAC yet | a user could reach a route their role forbids and see a stub; the backend remains the real boundary | FS2 wires per-route permission reflection from `routes.ts`; FS4 wires real session validation |
| R5 | **`@inspector` slot exists only in `(workspace)`** | Platform/Account screens have no Inspector contract; retrofitting parallel routes later is disruptive | FS2 decides explicitly: extend the slot to `(platform)`/`(account)` or document the deliberate exclusion |
| R6 | **Per-route bundle budget not programmatically enforced** (§3.6) | budgets can silently rot as FS5+ adds charts/markdown/editor | FS2/FS3: parse Next's build output for per-route First Load, or adopt a per-entry `size-limit` config |
| R7 | **Windows/pnpm `next` module fragility** (§3.5) | lost developer time, confusing false failures | CI is authoritative; document the `pnpm install --force` recovery; avoid concurrent pnpm operations |
| R8 | **Heading hierarchy / selector stability** (§3.7) | brittle E2E as real screens replace stubs | establish heading rules and role+level selector conventions in FS2's navigation work |
| R9 | **Open frontend ADRs still unresolved** — chart library, styling depth, observability vendor | Stage 2 §15 requires them decided **before FS3** | raise them at the end of FS2, as the frozen plan requires |

## 7. What to verify on first run against real infrastructure

These cannot be validated offline and should be the first checklist after the console meets the live backend.

1. **Session cookie round-trip.** The backend-issued HttpOnly/Secure/SameSite cookie (§R10.4) must be visible to
   Next middleware — verify domain/path/SameSite behave correctly behind Caddy, and that a cross-origin API
   base (if used) does not silently drop it.
2. **Correlation-id continuity.** Confirm a client-generated `X-Request-Id` actually appears in the backend's
   structured logs (§R12.9). This is the whole point of the header; it is currently unproven end-to-end.
3. **SSE through the reverse proxy.** Verify Caddy does not buffer or compress `text/event-stream`, that tokens
   arrive incrementally rather than batched at completion, and that idle timeouts don't sever long streams.
   If real backend SSE endpoints don't exist yet, confirm the polling fallback path (FE-ADR-9) instead.
4. **CSP promotion.** Collect `Content-Security-Policy-Report-Only` reports under real usage, confirm
   self-hosted fonts need no external `font-src`, then promote to enforcing. Removing `'unsafe-inline'` from
   `style-src` will require nonces — measure before deciding.
5. **No secrets in the client bundle.** Grep the built `.next/static` chunks for token/key patterns and confirm
   only `NEXT_PUBLIC_*` values are present (§F7.4).
6. **RBAC with a real non-owner role.** The mock session is always `owner`; the `analyst`/`viewer` paths and the
   403 → permission-state behaviour (§F7.2 — "never a crash") are untested against real responses.
7. **Real performance numbers.** Lighthouse against staging on a mid-tier device vs §F8.1 (FCP < 1.2s,
   LCP < 2.0s, TTI < 2.5s, CLS < 0.05, INP < 200ms). FS1's 138 KB First Load is a healthy starting point but
   proves nothing about field performance.
8. **Container behaviour.** `docker build` → non-root runtime, healthcheck passing, standalone server binding
   correctly behind the shared Caddy (FE-RV-3).
9. **Gated data honesty.** As soon as any analytics surface is wired, confirm engagement panels render the
   **Gated** state (§R10.3) rather than empty or zero values.

## 8. Conclusions for the following stages

1. **"Typechecks and lints" is not "works."** Four of eight defects (§3.1, §3.2, §3.3, §3.4) were invisible to
   `tsc`, ESLint and unit tests. Every stage from FS2 onward must **build and run** before it claims a gate,
   and the a11y gate must execute against the rendered output, not the source.
2. **Run the a11y gate early and often, not at the end.** axe paid for itself immediately by catching a cascade
   bug and a contrast bug. Deferring it to a stage's final hour converts cheap fixes into rework.
3. **Encode rules before writing the code they constrain.** The boundary config (written first) produced zero
   violations; the contrast rule (never written down) produced two. FS3 should ship the `text.tertiary` usage
   rule *with* the component library, not after it.
4. **Pin toolchain families as units.** No floating resolutions, especially for packages with native binaries.
   Prefer fewer bundlers: consolidating Storybook onto Vite (already present) removes an entire class of §3.4
   failures rather than patching around it.
5. **Keep the registry-driven pattern.** `routes.ts` proved that one typed data source feeding many consumers is
   both less code and less drift. Extend the pattern (status vocabulary, permissions) instead of hand-wiring.
6. **Don't let a blocked item soften a gate.** FE-RV-1 was recorded as pending rather than disabled or declared
   green. That discipline is only valuable if the RV register is actually burned down — **FE-RV-1 has a
   deadline: before FS3.**
7. **Scaffold stand-ins need expiry conditions, not just comments.** The mock session is documented, but
   documentation is not a guard. When FS4 replaces it, add an assertion that fails the build in
   staging/production rather than trusting a code comment.
8. **The plan-first method is validated — keep paying its cost.** Zero architectural decisions were needed
   mid-flight. FS2 should be planned to the same depth, and the three open frontend ADRs (§6 R9) must be closed
   before FS3 as Stage 2 §15 requires.

---

**FS1 postmortem complete. No further files created. FS2 not started — awaiting explicit GO.**
