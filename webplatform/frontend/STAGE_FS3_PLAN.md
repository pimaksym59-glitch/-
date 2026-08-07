# FS3 — ONYX Component Library (Plan)

**Track:** Web Platform implementation · **SoT:** `FRONTEND_MASTER_SPEC.md` · implements **D2 §13 (the 24
core components) + D2 §14 (the AI component set)** through the Stage 3 §2 component inventory, on top of the
accepted FS1/FS2 scaffold. **This is a PLAN. No code yet.**

**Goal of FS3:** turn `shared/ui` from the FS1/FS2 minimal set into the **complete ONYX component library in
code** — every D2 §13 component and every §14 AI component, token-only, accessible, storied in both themes,
tested per state — so that FS4–FS13 build screens by **composing** the library, never by inventing UI.
Screens stay stubs; **no business data, no feature slices, no API integration**. Frozen inputs (D1–D4, ONYX
v1.0, Stage 2/3, backend contract) are consumed as-is; **no `app/` / Protocol / MASTER_SPEC change**.

**Entry conditions — satisfied:** the three open frontend ADRs are **decided by the owner (2026-07-29,
`FE_ADR_DECISIONS.md`)**: ADR-FE-1 **visx** (heavy graphics only via `dynamic()`), ADR-FE-2 **Tailwind v4 +
CSS Modules kept, no CSS-in-JS**, ADR-FE-3 **observability deferred to FS14/FS15, seams only**. Stage 2 §15's
gating condition for FS3 is met. Chromatic (FE-RV-6) still needs a project token — see §5/§6 R4.

---

## 1. Scope

**IN:** the 24 core components of D2 §13 (each per its frozen *anatomy · variants · sizes · states · tokens ·
a11y · motion* contract) · the D2 §14 AI set (StreamingMessage, ThinkingState, ToolCall, Citation, MemoryCard,
KnowledgeCard, ImageResult, PromptCard, VerificationBadge + TrustLabel/ExplainabilityPanel, AIComposer/
AIActionButton per Stage 3 §2) · formalization of the four FS2 primitives (Tooltip, Sheet→Dialog/Drawer
family, Breadcrumbs, ScrollArea) · a shared **component-API convention** including the `tone` mechanism that
encodes the `text.tertiary` usage rule (FS2 R2) · dependency intake for this stage (visx, TanStack
Table + Virtual, react-markdown + remark-gfm + rehype-sanitize, Shiki, additional Radix packages) ·
**gate hardening**: automated per-route First Load parsing (FS2 R3) and per-component axe · stories for every
component (both themes × both densities) · component/unit tests per state · Chromatic baseline **if** a token
is provided (else FE-RV-6 stays open, §6 R4).

**OUT:** functional screens and real data (**FS5+**) · feature/entity slices and Query hooks against real
endpoints (**FS4+**) · real authentication (**FS4**) · form logic / `react-hook-form` + Zod form wiring
(arrives with the first real forms, **FS4+**; FS3 ships the input *primitives* only) · `date-fns` (arrives
with the first screen that needs locale dates) · any AI behaviour against a real backend (stories use the
deterministic FS1 demo stream; real streaming is **FS6**) · observability vendor work (**ADR-FE-3:
FS14/FS15**) · route/navigation changes (FS2 is accepted; widgets Sidebar/Topbar/CommandPalette are **not
rebuilt** — FS3 supplies the `shared/ui` primitives beneath them; no file relocation unless a boundary
violation forces it, and then as a documented PATCH) · no `app/` / Protocol / SoT change · no ONYX token-value
change.

**Carried over from FS2 (§9 risks → tasks below):** R1 bundle headroom 12 KB → T-FS3.0/T-FS3.6 lazy
discipline + T-FS3.1 automated budget; R2 `text.tertiary` mechanism → T-FS3.2; R3 budget-by-eye → T-FS3.1;
R5 Chromatic baseline → T-FS3.9; (R4 mock-auth and R6 placeholder seams belong to FS4/FS5–6 and are only
guarded here: FS3 must not touch them).

## 2. Task sequence (each with a completion criterion)

| Task | Produces | Done when |
|---|---|---|
| **T-FS3.0** Dependency intake | `visx` (per ADR-FE-1) · `@tanstack/react-table` + `@tanstack/react-virtual` · `react-markdown` + `remark-gfm` + `rehype-sanitize` · `shiki` · Radix additions (Select, Popover, Checkbox, Switch, Radio Group, Tabs as needed) — pinned exact, families pinned together (PART4 §3.2), installed under the safe pnpm order (PART4 §3.1) | every new dependency declared + installed + import-checked on the pinned toolchain; `pnpm build` still green; **per-route First Load unchanged** (all new deps are lazy or tree-shaken out of routes); lockfile committed state consistent |
| **T-FS3.1** Gate hardening (before component work) | a script parsing Next build output into a **machine-checked per-route First Load gate** (≤ 180 KB, closes FS2 R3); per-component axe harness (Storybook a11y addon + axe in component tests) | `pnpm gate` (or a dedicated `pnpm budget`) **fails** if any route group exceeds budget; axe runs per component, not only per E2E surface |
| **T-FS3.2** Component-API convention | a written convention module: variant/size/state prop patterns, `forwardRef` + `className` passthrough, `data-*` state attributes, token-only styling rule, and the **`tone` mechanism**: small-text components cannot select `text.tertiary` (≥16px/decorative-meta only, encoded in types — FS2 R2 closed) | convention documented in `shared/ui/README.md` (or equivalent) and demonstrated by the first refactored components (Button, EmptyState); `tsc` rejects an illegal tone at compile time |
| **T-FS3.3** Form & selection primitives | Input/Textarea/SearchInput (D2 §13.3) · Select/Combobox/Dropdown-field (§13.4) · Checkbox/Switch/Radio · FilterBar/SegmentedControl (Stage 3 §2) | each matches its D2 anatomy/states (incl. invalid/readonly/filled, async loading row for combobox); labels + `aria-invalid`/`aria-describedby` correct; axe clean; storied + state-tested |
| **T-FS3.4** Containers, overlays & navigation formalization | Card/MetricCard (§13.2/§13.20) · Tabs (§13.6) · Dialog/Modal (§13.10) + Drawer (formalizing FS2 Sheet) · Menu/ContextMenu/Dropdown (§13.11/§13.13) · Popover · Tooltip/Breadcrumbs/ScrollArea formalized (FS2 four) · Divider/ProgressBar · Avatar/AvatarGroup (§13.22) · Kbd (kept) | Radix-backed where the inventory says so; focus-trap/restore correct; destructive dialog variant separates the danger action; FS2 call-sites migrated to the formalized APIs with zero behaviour change (E2E stays green) |
| **T-FS3.5** Status & feedback | Badge/**StatusBadge** wired to the 12-status vocabulary registry (`shared/types/status.ts` — registry-driven, no drift) · Toast/Toaster kinds incl. AI kind (§13.12) · EmptyState/ErrorState/Skeleton/Spinner formalized (§15/§16 scopes: inline/section/page) · Timeline (§13.23) · ActivityFeed (§13.24) | every status renders from the vocabulary registry; toasts announce via the existing `useAnnouncer`; error states carry cause + retry + correlation-id slot; storied + tested |
| **T-FS3.6** Heavy data display (**all `dynamic()`**) | Table/DataTable/Pagination on TanStack Table + Virtual (§13.5: sort, column show/hide, row select, bulk bar, expandable rows, virtualization, sticky first column) · Markdown renderer (§13.17: sanitized, callouts, citations slot) · CodeBlock (§13.18: Shiki, copy, diff mode) · Charts on **visx** (§13.19/§12: Line/Area/Bar/Sparkline/Donut/Heatmap) with axis+shimmer skeletons | none of these enters any route's First Load (verified by the T-FS3.1 gate); each has empty/loading/error states per §15–16; charts consume viz tokens only; Markdown is sanitize-enforced (SEC-4) |
| **T-FS3.7** FileUpload | dropzone + per-file progress + validation errors + retry/remove + Verified chip (§13.21) | keyboard-equivalent to drag-drop; progress announced; storied with all states (idle/uploading/error/verified) |
| **T-FS3.8** AI component set (D2 §14 / Stage 3 §2) | StreamingMessage (progressive tokens, Iris caret, Aurora edge sweep, Stop, jump-to-latest, model/cost whisper, hover actions) · ThinkingState (shimmer, reduced-motion static) · ToolCall · Citation (popover + Inspector hook) · MemoryCard/KnowledgeCard · ImageResult (verification chips) · PromptCard · VerificationBadge + TrustLabel/ExplainabilityPanel (Trust: Generated/Verified/Needs-Review + Source-Available/None) · AIComposer/AIActionButton | **presentational only** — stories drive them with deterministic props and the FS1 demo stream; Aurora appears **only** on genuine AI moments; streaming states never use a blocking spinner; reduced-motion honoured; axe clean |
| **T-FS3.9** Stories & visual baseline | a story per component × both themes × both densities, with a11y addon; Chromatic wired and baseline uploaded **if** `CHROMATIC_PROJECT_TOKEN` is provided | `pnpm build-storybook` green with the full library; if the token exists → **FE-RV-6 closed**, else it stays honestly open and gate 9 = "Storybook builds + stories reviewed" (§5) |
| **T-FS3.10** Tests | component tests per state (default/hover-equivalent/disabled/loading/invalid/empty/error/streaming as applicable), unit tests for variant/tone logic and status-registry mapping; existing E2E kept green (routes unchanged) | `pnpm test` green with the enlarged suite; `pnpm e2e` green across all three projects; coverage of `shared/ui` meaningful, not decorative |
| **T-FS3.11** Gate + report | all ten gates run (incl. the new automated budget gate); `FS3_REPORT.md`; living docs updated (track README, FE-RV register) | gates green or honestly FE-RV-flagged; report with the three statuses; **STOP for acceptance** |

**Sequencing rule:** T-FS3.0 → T-FS3.1 → T-FS3.2 are strictly first (toolchain settled, gates armed,
convention fixed) so that every component task lands against an enforcing gate — the FS1 lesson "encode rules
before the code they constrain".

## 3. Deliverables (file-level, maps to Stage 3 §1/§2)

`src/shared/ui/<component>/` per inventory — form/selection: `input/ textarea/ search-input/ select/ combobox/
checkbox/ switch/ radio/ filter-bar/ segmented-control/`; containers/overlays: `card/ metric-card/ tabs/
dialog/ drawer/ menu/ context-menu/ popover/ divider/ progress-bar/ avatar/` (+ formalized `tooltip/ sheet/
breadcrumbs/ scroll-area/`); status/feedback: `badge/ status-badge/ toast/ empty-state/ error-state/ skeleton/
spinner/ timeline/ activity-feed/`; heavy (lazy): `data-table/ pagination/ markdown/ code-block/ chart/`;
`file-upload/`; AI: `src/shared/ui/ai/{streaming-message, thinking-state, tool-call, citation, memory-card,
knowledge-card, image-result, prompt-card, verification-badge, trust-label, explainability-panel, ai-composer,
ai-action-button}/`. Plus `shared/ui/README.md` (API convention), the budget-gate script, stories co-located
per component, `tests/{unit,component}/*` extensions. **No `entities/`, no `features/`, no route changes, no
new endpoints.**

## 4. Definition of Done (FS3)

- **Every D2 §13 component (1–24) and every §14 AI component exists in code**, matching its frozen anatomy/
  variants/sizes/states/tokens/a11y/motion contract, styled by **semantic tokens only** (zero hard-coded
  colours; zero token-value edits).
- The **`tone` mechanism makes the `text.tertiary` misuse unrepresentable** at the type level (FS2 R2 closed).
- **Per-route First Load JS is machine-checked ≤ 180 KB** in the gate (FS2 R3 closed) and did not materially
  grow: Table/Markdown/Shiki/Charts are `dynamic()` and absent from route bundles (ADR-FE-1 discipline).
- Every component is **storied in Dark + Light × comfortable + compact** with a11y addon; `build-storybook`
  green; Chromatic baseline uploaded if a token was provided (else FE-RV-6 explicitly open).
- **axe: 0 violations per component** and on all existing E2E surfaces; keyboard operability per D2 a11y
  contracts (roving focus, focus-trap/restore, announcements via the existing announcer).
- All ten gates green; FSD boundaries 0 violations; `tsc` strict 0 errors / 0 unjustified `any`.
- **Still no business logic:** screens remain stubs; no API calls; AI components run only on deterministic
  demo props/stream; FS2 behaviour unchanged (E2E green).

## 5. Gates & environment

All ten Stage 2 §14 gates run as in FS2, with two changes FS3 itself introduces: **gate 6/7** gains the
automated per-route First Load check (T-FS3.1), and **gate 9** becomes fully real if the Chromatic token is
provided (baseline upload closes FE-RV-6); without the token, gate 9 = Storybook build + story review, and
FE-RV-6 remains open — never reported as a pass.

**Environment honesty:** Docker (FE-RV-3), CI execution (FE-RV-4) and `next/font/local` (FE-RV-5) remain
open and untouched by FS3. Dependency installation follows the safe pnpm order (PART4 §3.1) — no installs
near builds, no truncating pipes — and the pinned-family rule (PART4 §3.2).

## 6. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | **Bundle regression** — the library drags heavy deps into route bundles (12 KB headroom) | T-FS3.1 gate is armed **before** component work; every heavy module `dynamic()` from its first commit; T-FS3.0 verifies budgets immediately after install |
| R2 | **API sprawl / invented variants** — 24 components tempt improvisation | D2 §13 anatomy/variants/states are the **frozen contract**; the Stage 3 §2 inventory is the file map; anything not in D2/Stage 3 is out of scope (MINOR/MAJOR path otherwise) |
| R3 | **Scope creep into features** — components reaching for data | components accept props only; no Query hooks against real endpoints; AI components run on deterministic stories (real wiring FS6+) |
| R4 | **Chromatic token absent** while the library is born | request the token at GO; if unavailable, FE-RV-6 stays open and visual-regression debt is explicit in `FS3_REPORT.md` (owner-accepted, FS2 R5) |
| R5 | **Windows/pnpm corruption** during the largest dependency intake since FS1 | strict PART4 §3.1 order; installs batched once at T-FS3.0; `pnpm install --force` recovery documented |
| R6 | **FS2 regression while formalizing the four primitives** | migration of call-sites is behaviour-preserving; the FS2 E2E suite (35 tests, 3 projects) must stay green throughout |
| R7 | **Shiki/Markdown security or size surprises** | `rehype-sanitize` enforced (SEC-4); Shiki loaded lazily with a minimal language set; both covered by the budget gate |

## 7. Not in FS3 (explicit)

No real authentication or session change (FS4) · no entity/feature slices, no Query hooks on real endpoints ·
no functional screens — all 25 routes keep their stubs (FS5+) · no form logic (`react-hook-form`/Zod wiring —
FS4+) · no real AI/streaming integration (FS6) · no observability vendor (ADR-FE-3: FS14/FS15; seams only) ·
no navigation/routing changes (FS2 accepted) · no `app/` / Protocol / SoT / ONYX-token-value change · no
commits/pushes unless instructed.

---

**STOP — FS3 plan complete. Awaiting your explicit GO to implement FS3 (ONYX Component Library).** On GO I
implement §2 in order, run the gates (§5), write `FS3_REPORT.md`, and stop for acceptance. If a
`CHROMATIC_PROJECT_TOKEN` can be provided at GO, gate 9 closes FE-RV-6 during T-FS3.9.
