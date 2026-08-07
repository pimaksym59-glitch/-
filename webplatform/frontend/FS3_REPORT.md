# FS3 — ONYX Component Library · Implementation Report (v1.0)

**Track:** Web Platform (Console) · **Stage:** FS3 (ONYX Component Library) · **SoT:**
`FRONTEND_MASTER_SPEC.md` (implements D2 §13 — the 24 core components — and D2 §14 — the AI set — through the
Stage 3 §2 inventory) · **Date:** 2026-07-29 · **Plan:** `STAGE_FS3_PLAN.md` (approved) · **ADR inputs:**
`FE_ADR_DECISIONS.md` (visx · Tailwind v4 + CSS Modules · observability deferred).

**Result:** the complete ONYX component library exists in code — **all 24 D2 §13 components and the full §14
AI set**, token-only, storied, state-tested, with the per-route budget now **machine-enforced** and the
`text.tertiary` rule **encoded in the type system**. All ten gates green, executed for real. The new budget
gate caught a real 8 kB-over-budget regression mid-stage and forced a structural fix (§6.1) — exactly what it
was built for. **No `app/` change · no ONYX token-value change · no architecture change · no SoT edit ·
FS2 E2E suite still green (35/35).**

---

## 1. Scope delivered (maps to STAGE_FS3_PLAN §2)

| Task | Delivered | Status |
|---|---|---|
| **T-FS3.0** Dependency intake | 23 exact-pinned deps: 10 Radix packages (era batch: select 2.1.4, popover 1.1.4, checkbox 1.1.3, switch 1.1.2, radio-group 1.2.2, tabs 1.1.2, context-menu 2.2.4, progress 1.1.1, avatar 1.1.2, separator 1.1.1) · @tanstack/react-table 8.20.6 + react-virtual 3.11.2 · react-markdown 9.0.3 + remark-gfm 4.0.0 + rehype-sanitize 6.0.0 · shiki 1.29.2 · **@visx/* 4.0.0** (§5.1) · axe-core 4.10.2 (dev, §5.2) | ✅ all import-checked on Node 22; build green post-intake |
| **T-FS3.1** Gate hardening | `scripts/check-route-budget.mjs` — runs `next build`, parses Next's authoritative route table, **fails >180 kB**, writes `.next/route-budget.json`; `pnpm budget` script; CI build step replaced by it; `tests/setup/axe.ts` per-component axe harness (jsdom rules honestly scoped, §5.2) | ✅ **FS2 R3 closed** — the gate bites (§6.1 proves it) |
| **T-FS3.2** API convention + tone | `shared/ui/README.md` (12-point convention) · `shared/ui/tone.ts` — `SmallTextTone` cannot name `tertiary`; `MetaTextTone` can; type-level proof in `tests/unit/tone.test.ts` (`@ts-expect-error` enforced by the tsc gate) · demonstrated on EmptyState | ✅ **FS2 R2 closed** |
| **T-FS3.3** Form & selection | Input · Textarea · SearchInput (⌘K hint) · Select (async row) · Combobox (cmdk-in-popover, multi + chips) · Checkbox (indeterminate) · Switch · RadioGroup · SegmentedControl (radiogroup semantics) · FilterBar + FilterChip; shared `FieldChrome` owns label/helper/error + aria wiring | ✅ Verified |
| **T-FS3.4** Containers & overlays | Card (static/interactive/selectable) · MetricCard (sm/md/lg, delta good/bad, sparkline, drill) · Tabs + TabPanel · Dialog (480/640/960, destructive separation) + ConfirmDialog · Menu (sections/shortcuts/submenu/destructive) · ContextMenu · Popover · Divider · ProgressBar · Avatar/AvatarGroup (deterministic muted tints) · **FS2 four formalized**: Tooltip (+delay/align), Sheet (=Drawer), Breadcrumbs, ScrollArea | ✅ Verified — FS2 call sites unchanged in behaviour (E2E green) |
| **T-FS3.5** Status & feedback | Badge + **StatusBadge** rendering only the 12-status registry · ToastCard (5 kinds incl. AI/aurora) now the presentational body inside NotificationProvider · ErrorState (inline/section/page, cause + correlation-id) · Timeline · ActivityFeed | ✅ Verified — registry-driven, no drift |
| **T-FS3.6** Heavy data display | DataTable (sort/aria-sort, selection + bulk bar, expandable, `j`/`k`/Enter, pagination or TanStack-Virtual, density-aware rows, sticky first column) + Pagination · Markdown (sanitized, GFM, callouts→status tokens, footnotes→citation chips) · CodeBlock (Shiki **ONYX dual themes** derived from the viz ramp, line numbers, diff mode, copy) · Charts on visx (Line/Area/Bar/Sparkline/Donut/Heatmap; token-only axes; keyboard-focusable datapoints; axis+shimmer loading) — **each with a `lazy.tsx` entrypoint** | ✅ Verified — none enters any route's First Load (budget gate) |
| **T-FS3.7** FileUpload | dropzone + browse equivalent · type/size validation with per-file reasons · per-file progress (announced) · retry/remove · Verified chip | ✅ Verified |
| **T-FS3.8** AI set (D2 §14) | StreamingMessage (thinking/streaming/done/error, Iris caret, Aurora edge only while streaming, Stop, jump-to-latest, whispers, hover actions) · ThinkingState (shimmer, no spinner) · ToolCall · Citation · MemoryCard · KnowledgeCard (match highlight + score bar) · ImageResult (verification chips, prompt disclosure) · PromptCard (guarded promote) · VerificationBadge (+Needs-Review counterpart) · TrustLabel · ExplainabilityPanel · AIComposer (⌘↵, Stop) + AIActionButton | ✅ Verified — presentational; deterministic demos only |
| **T-FS3.9** Stories | **44 story files** (every component × states; themes × densities via the toolbar globals); `build-storybook` green (59 s) | ✅ · Chromatic upload → **FE-RV-6 still open** (no token) |
| **T-FS3.10** Tests | **69 new tests** (124 total, was 55): per-state component tests + tone type-proof + registry mapping + sanitization + budget-critical behaviours; per-component axe | ✅ Verified |
| **T-FS3.11** Gates + report | all ten gates executed; this report; track README updated | ✅ |

## 2. Gate results (executed, not simulated)

| # (Stage 2 §14) | Gate | Command | Result |
|---|---|---|---|
| 1 | ESLint | `pnpm lint` | ✅ clean |
| 2 | Prettier | `pnpm format:check` | ✅ clean |
| 3 | `tsc --noEmit` strict, 0 unjustified `any` | `pnpm typecheck` | ✅ **0 errors** (and it now *enforces* the tone rule) |
| 4 | Unit / component | `pnpm test` | ✅ **124 passed / 23 files** (FS2: 55) |
| 4b | E2E | `pnpm e2e` | ✅ **35 passed, 0 failed**, 4 viewport-skipped — full 3-project matrix against the production build |
| 5 | Accessibility | axe per component (jsdom, structural) + Playwright axe (rendered, 3 viewports) | ✅ **0 violations** |
| 6 | Bundle-size detector | `pnpm size` | ✅ 328.23 kB ≤ 345 kB |
| 7 | **Per-route First Load JS — now machine-checked** | `pnpm budget` | ✅ **PASS — worst route 109 kB / 180 kB budget** (see §5.5 for the honest reading) |
| 8 | Boundaries (dependency-cruiser) | `pnpm boundaries` | ✅ **0 violations** (296 modules, 411 deps; FS2: 146/204) |
| 9 | Visual regression | `pnpm build-storybook` | ✅ builds (59 s, full library); Chromatic upload → **FE-RV-6** |
| 10 | Contract vs `API_SPEC.md` | `pnpm typecheck` + MSW | ✅ unchanged — FS3 added **no** endpoint, DTO or API call |

## 3. Definition of Done (plan §4) — verification

- [x] **Every D2 §13 component (1–24) and every §14 AI component exists in code**, mapped per Stage 3 §2,
  semantic tokens only. *(Sidebar §13.7 / Topbar §13.8 / CommandPalette §13.14 live as FS2 widgets — FS3
  delivered the `shared/ui` primitives beneath them, per plan scope; Chat components §13.15 = the AI set +
  AIComposer.)*
- [x] The **tone mechanism makes `text.tertiary` misuse unrepresentable** (compile-proof in the suite).
- [x] **Per-route First Load machine-checked ≤ 180 kB**; Table/Markdown/Shiki/Charts absent from route
  bundles (lazy entrypoints; verified by the gate + §5.5 chunk analysis).
- [x] Every component **storied** (44 files) in both themes × densities; `build-storybook` green.
- [x] **axe 0 violations** per component (structural, jsdom) and on all rendered E2E surfaces (3 viewports).
- [x] Ten gates green; boundaries 0; tsc strict 0.
- [x] **No business logic** — screens remain stubs; no API calls; AI components on deterministic props; FS2
  behaviour unchanged (35/35 E2E).

## 4. FE-RV register (honest status)

| ID | Item | Status |
|---|---|---|
| FE-RV-3 | Docker image build + container healthcheck | ⏳ open (unchanged — FS14/FS15) |
| FE-RV-4 | CI pipeline execution | ⏳ open (workflow updated: build step → `pnpm budget`; never executed) |
| FE-RV-5 | `next/font/local` binary pin | ⏳ open (unchanged) |
| FE-RV-6 | Chromatic visual baseline upload | ⏳ **open** — no `CHROMATIC_PROJECT_TOKEN` was available this stage; the full-library Storybook build that feeds it is green. **The visual-regression debt the owner accepted in R5/R4 of the plan now exists in its largest form: 44 story files without a baseline.** Providing a token closes it without code changes. |

No new FE-RV items were opened. Nothing was reported green that did not execute.

## 5. Decisions & deviations (all PATCH — no architecture, token-value or contract change)

1. **visx pinned to 4.0.0** (not 3.12.0): v3 declares React ≤18 peers; v4.0.0 declares `react ^18 || ^19` —
   the only era version that is peer-correct against React 19.0.0. Family pinned together (PART4 §3.2).
2. **`axe-core` 4.10.2 added as a devDependency** for the per-component harness. jsdom cannot evaluate
   rendering-dependent rules, so `color-contrast` is **explicitly disabled there and documented** — rendered
   contrast remains covered by the Playwright axe gate (3 viewports), as in FS1/FS2. No fabricated coverage.
3. **`sideEffects: ["**/*.css"]` declared in package.json** — our modules are side-effect-free except CSS;
   this unlocks correct tree-shaking of component re-exports (a §9-technique build hint, not an architecture
   change).
4. **The FS1 root `shared/ui` barrel is removed; the public API is component entrypoints**
   (`@/shared/ui/<component>`, AI set as `@/shared/ui/ai`). Measured cause: with the full library exported,
   every route paid for unused client components — 168 → **188 kB, over budget** (§6.1). Component-level
   entrypoints are the same granularity `shared/lib` has used since FS1 (`@/shared/lib/api`, …), so the
   shared-layer convention is now uniform; deeper-than-entrypoint imports remain forbidden. Documented in
   `shared/ui/README.md` §11.
5. **Bundle numbers, honestly.** After §5.3/§5.4 Next attributes **105–109 kB** First Load per route (worst:
   `/` at 109). The *total* per-route chunk union (including deferred/lazy chunks) is **191.0 kB — essentially
   identical to FS2's 191.7** measured the same way: total JS did not shrink magically; webpack now defers
   more of the shell out of the critical path. Both numbers are recorded in `.next/route-budget.json` + this
   report; the field-perceived impact is verified at FS15 (Lighthouse, plan §8.2). The authoritative gate
   metric remains Next's First Load table, as defined since FS1 §3.6.
6. **Shiki syntax palette = custom ONYX dual themes** (`onyx-shiki-theme.ts`) whose accent colors are
   transcriptions of the frozen `--viz-*` hexes (D2 §13.18 "derived from the viz palette"); backgrounds are
   transparent so the token `background.sunken` owns the surface; the theme flip is two CSS rules in
   `themes.css`. Token *values* untouched. Highlighting is progressive — plain `<pre>` renders first, so
   content never blocks on WASM (and tests run without it).
7. **CodeBlock uses `dangerouslySetInnerHTML` for Shiki output only** — the input is a plain-string prop that
   Shiki itself escapes; no user HTML enters this path (SEC-4 rationale documented inline). Markdown remains
   fully `rehype-sanitize`d.
8. **Drawer = the formalized FS2 Sheet** (left/right/bottom family); the new centered `Dialog` (confirm/form/
   rich widths + destructive separation) is its own component — matching D2 §13.10's two shapes without a
   breaking rename.
9. **Toast visuals extracted to `ToastCard`** (storyable/testable); `NotificationProvider` now renders it.
   Provider tree, order and responsibilities unchanged (Stage 3 §7 intact).
10. **Lint config additions**: `scripts/**` gets Node globals (the budget script); `no-empty-function` is off
    for stories/tests only (intentional no-op handlers). Production-code rules unchanged.

## 6. Defects found and fixed during FS3

| # | Symptom | Root cause | Fix |
|---|---|---|---|
| 1 | **`pnpm budget` FAILED: 27 routes at 188 kB > 180** the moment the full library landed | the FS1 root barrel: route stubs and widgets importing one symbol statically received the whole client-component library (re-export chains defeat tree-shaking for client modules) | §5.3 + §5.4 — `sideEffects` + component-entrypoint public API; worst route now 109 kB. **The T-FS3.1 gate did exactly what FS2 R1/R3 demanded: it turned a silent regression into a hard failure** |
| 2 | Expandable table rows never expanded | TanStack requires `getRowCanExpand` for arbitrary (non-subRow) expansion — default is `false`, the toggle silently no-ops | pass `getRowCanExpand: () => true` when `renderExpanded` is provided |
| 3 | Markdown callouts rendered as plain quotes | the marker was read from the hast `node` prop, which react-markdown v9 does not reliably deliver | extract the marker from the rendered React children (`extractReactText`) — no dependency on renderer internals |
| 4 | FileUpload rejection test saw only one rejected file | `userEvent.upload` itself pre-filters by the input's `accept` — the component's validation never received the file | test passes `{ applyAccept: false }`; the component's own validation is what's under test |
| 5 | Radix Select/Menu unusable in jsdom | jsdom lacks `scrollIntoView`/pointer-capture APIs | guarded stubs in `vitest.setup.ts` (+`ResizeObserver` for charts) |
| 6 | `next` package corrupted **3×** during the stage | the known Windows/pnpm relink fragility (PART4 §3.1): twice adjacent to `pnpm add`, once with **no install in between** — the hazard is broader than "installs near builds" | `pnpm install --force` recovery each time; one clean `.next` rebuild to rule out stale cache before trusting numbers |

Defects 1–3 were invisible to typecheck/lint and surfaced only through the executed gates and tests — the
fourth stage in a row confirming FS1 postmortem §8.1.

## 7. Conventions established

- **Import policy:** runtime code imports `@/shared/ui/<component>` (or `@/shared/ui/ai`); heavy components
  are consumed via their `lazy` entrypoints or route-level `dynamic()`; nothing deeper than a component's
  `index.ts`.
- **Tone policy is now a mechanism**, not a convention: small-text slots type `SmallTextTone`; meta/large
  slots type `MetaTextTone`; the compile gate holds it.
- **Status policy:** `StatusBadge` + the `STATUS` registry are the only way to render a status.
- **Component-API convention** (variants as literal unions, `FieldChrome` for form a11y, `data-*` states,
  Radix for behaviour, reduced-motion safety) is written down in `shared/ui/README.md` and demonstrated by
  every component in the library.

## 8. Freeze & invariant compliance

- **Backend untouched** — no `app/` read-for-import or modification; no endpoint, DTO or API call added.
- **ONYX v1.0 intact** — zero token-value changes (the Shiki theme *transcribes* frozen viz hexes and says
  so; contrast discipline is now typed). Aurora appears only on genuine AI moments (streaming edge, AI
  button/toast/badge).
- **Frontend Architecture Freeze intact** — FSD one-way boundaries 0 violations (296 modules); the seven
  providers and their order unchanged; six state owners respected (the library is stateless/presentational);
  FE-ADR-1…11 and ADR-FE-1…3 honoured (visx; Tailwind v4 + CSS Modules, no CSS-in-JS; observability seams
  untouched). **No ADR created.**
- **Sources of Truth untouched.** Staged discipline observed: plan → GO → implement → gates → report → STOP.

## 9. Risks entering FS4

| # | Risk | Mitigation |
|---|---|---|
| R1 | **First Load attribution shifted** (§5.5): 105–109 kB per Next, 191 kB total union — if the deferred shell chunks ever hurt real interactivity, the budget won't see it | FS15 Lighthouse (already planned) measures field metrics; keep both numbers in every future gate run (`route-budget.json` records them) |
| R2 | **44 story files with no visual baseline** (FE-RV-6) — the exact debt R5 warned about, now at full size | provide `CHROMATIC_PROJECT_TOKEN`; upload is config-only |
| R3 | Mock auth is still live and FS4 must **delete it + add the build-time assertion** (FS2 R4 carried) | first task of FS4's plan |
| R4 | The library is broad and only stub-exercised — real screens (FS5+) will stress prop APIs and may want MINOR additive extensions | extensions go through the D2 §18 extension patterns; anything touching a D2 contract is a D4 §12/§13 versioned change, never ad-hoc |
| R5 | Windows/pnpm corruption struck even without adjacent installs (§6.6) | treat every unexplained build failure as §3.1 first (`pnpm install --force`), and treat CI (FE-RV-4) as the authoritative environment once it runs |

## 10. Next step

**STOP — FS3 complete. Awaiting your acceptance, and afterwards an explicit GO for FS4 (Auth & RBAC).**
No FS4 work has begun. On acceptance, the handoff set (PROJECT_HANDOFF §0/§3, PART1 §5.1, PART4 §10) should be
refreshed to record FS3 as delivered — say the word and I will update the living handoff documents.
