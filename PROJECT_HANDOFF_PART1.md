# PROJECT_HANDOFF — PART 1 · Goal, Completion, History, Owner Requirements

*Read after `PROJECT_HANDOFF.md`. Covers request items **1** (goal), **2** (completion), **15** (accumulated
owner requirements), **16** (full change history by stage), plus the forward roadmap.*

---

## 1. What this project is *(request item 1)*

### 1.1 The product in one paragraph

An **autonomous AI content platform for Telegram**. One operator runs many Telegram channels that generate
their own content — text and images — validate it, illustrate it, schedule it and publish it, while remembering
each channel's style and avoiding repetition. The **backend** is the engine that does all of this. The
**frontend ("Console")** is the premium command surface that makes an inherently automated system feel calm,
legible and in-control.

### 1.2 Track A — Backend: *AI Telegram Automation Platform*

A production-ready, **offline-verifiable modular monolith** in Python. It autonomously:

- generates post text with an LLM and rewrites it through a quality loop,
- generates and verifies images (safety, perceptual-hash uniqueness, regeneration),
- validates output through quality gates before anything is published,
- publishes on a schedule to Telegram channels, honouring rate limits and DST,
- remembers per-channel style/persona/actor **Memory** and channel-isolated **Knowledge** (RAG),
- records analytics, audit, health and cost.

Everything runs **offline** via provider/port fakes: there is no dependency on live LLM, Telegram, Postgres or
Redis to run the test suite. Real adapters are deliberately deferred behind Protocols.

### 1.3 Track B — Frontend: *Console* web platform

A premium, AI-first web client — "the clarity of Linear, the writing surface of Notion, the conversational depth
of Claude/ChatGPT, the dashboard rigour of Stripe/Vercel, the restraint of Apple HIG, applied to autonomous
content operations" (D1 §1).

- **25 screens** across three surfaces: Workspace (creator), Platform & Admin (governance), Account & Content.
- **Streaming-first** AI UX; **keyboard-first** and command-palette-first; **WCAG 2.1 AA+**; dark + light
  themes of equal weight; RBAC-aware.
- A **pure client** of the frozen backend: it consumes `/api/v1` only and never re-implements business logic.

### 1.4 The relationship between the tracks

The frontend is a **client of the core**. It never requires a backend change. Any streaming endpoint it would
like (SSE/WS) is optional future backend work recorded as RV, never a prerequisite. The backend's freezes
(Architecture Freeze, Production Code Freeze) remain active throughout frontend development.

---

## 2. Completion status *(request item 2)*

### 2.1 Numbers

| Component | Status | Evidence |
|---|---|---|
| Backend stages | **20 / 20 = 100%** | tags `stage-1-baseline` … `stage-20-docs`, HEAD `a8224ec` |
| Backend gate | green | ruff clean · `mypy --strict` Success (385 files, 0 `type: ignore`) · pytest **466 passed / 6 skipped** |
| Backend runtime verification | **0 / 18** | RV-1…RV-18 require live infra; see `RUNTIME_VERIFICATION_REGISTRY.md` |
| Frontend design | **100%** | D1, D2 (ONYX), D3, D4 + published Preview Artifact — all accepted, frozen |
| Frontend engineering architecture | **100%** | Stage 2 (Architecture) + Stage 3 (Technical Spec) — accepted, frozen |
| Frontend implementation | **15 / 15 accepted (100%) — COMPLETE** | FS1–FS15 ✅ (**FS15 accepted 2026-08-07**) · no FS16 on the roadmap |
| Frontend runtime verification | **0 / 17 open items** | FE-RV-3/4/6/7…17 require live infra; see `webplatform/frontend/PRODUCTION_READINESS_RUNBOOK.md` — the frontend's analogue of `RUNTIME_VERIFICATION_REGISTRY.md` |
| Frontend gates | green (nine of ten; one accepted carry-over) — **the terminal gate state of the implementation track** | **800** unit/component tests (103 files — the FS14 floor of 794/102 plus one FS15 cross-cutting test) · **400 E2E / 0 failed / 17 skipped** across 3 viewports, unchanged from FS14 (real form sign-in; chat + knowledge + memory + studio + prompt + analytics + platform + account + **five D3 Part C cross-screen journeys** + three D4 §3 polish checks) — the CI workflow that runs this matrix was itself fixed at FS15 (it previously ran only one of three projects) · axe 0 violations (incl. the avatar menu and command palette, scanned for the first time at FS14) · 0 boundary violations (**609 modules, 1578 deps** — byte-identical to FS14) · Storybook ✅ 54 stories · contract ✅ · machine-checked route budget (32 routes; /health 139, /billing 144, /analytics 148, /memory 150, /prompts 150, /providers 154, /studio 165, /dashboard 168, /jobs 172, /audit 175, /knowledge 176, /admin 179, /settings 121, /profile 121, seams 111, stubs 107, commons 107, /api/telemetry 107 server-only, worst **/chat 180 KB / 180** — headroom **0.0 kB**, now in its terminal state) · size-limit **766.23/777** (threshold UNCHANGED since FS13 — re-confirmed at the FS15 acceptance sync with zero movement, since FS15 shipped zero `src/` modules; rule №33 intact; First Load 180 kB stays the authoritative, non-revisable UX budget) · Prettier RED on one pre-existing file (`.size-limit.json`, accepted as a legacy carry-over, reaffirmed at FS14 and FS15) |

### 2.2 What "done" means per track

- **Backend is done in the sense that matters:** every module, contract, test and document exists and is
  statically verified. It has never been run against real Postgres/Redis/Telegram/LLM — by design. That work is
  the Production Readiness Review (RV-1…RV-18), which is *operational*, not development.
- **Frontend implementation is done in full, not just "decided":** every architectural and visual question
  is answered and frozen, AND all fifteen FS stages that build on those answers are delivered and accepted.
  Of the UI itself, **fifteen screens are real** — the Dashboard (FS5), AI Chat (FS6), Knowledge
  (FS7), Memory (FS8), Image Studio (FS9), the Prompt Library (FS10), Analytics (FS11), the six FS12
  governance screens (Admin, Jobs, Audit, Health, Providers, Billing) and the two FS13 account screens
  (Settings, User Profile), end-to-end on the deterministic fixtures, **and — as of FS14 — proved to work
  together**: five D3 Part C journeys (Compose → Pipeline, Cite → Source, Alert → Triage, Explain-this,
  Everything ⌘K) walk across these fifteen screens in E2E, with every step the frozen contract cannot back
  stated as a named seam rather than silently skipped. **Three more are contract-verified ABSENCE screens**
  (`/logs`, `/flags`, `/notifications`): they are finished, not pending — the frozen contract carries no call
  for them, and they say so. The remaining **3 routes** (`/channels`, `/playground`, `/docs`) still render
  honest placeholders — verified directly against `shared/config/routes.ts` (24 route entries total: 3
  public + 15 real + 3 absence + 3 stub) at the FS14 sync, confirmed at the FS14 GO and again at the FS15
  GO to stay stubs (owner ruling D9) — building any of them would be screen work requiring a new stage and a
  new GO; **the roadmap names no such stage**, so this is not a gap in FS15, it is the roadmap's own
  boundary. *(Earlier revisions of this handoff said "7 remain", counting against D3's 25-screen sitemap,
  where "Chat History" is a separate design entry that FS6 implemented inside `/chat`'s own catch-all route
  rather than as a second URL. The route-registry count of 3 is the one this project's gates and reports
  actually check.)* *(FS13 is a hybrid worth noting: Settings is a REAL screen whose Account, Security and
  notification-delivery SECTIONS are verified absences — the FS12 screen-level rule applied one level down.)*
  **FS15 (Production Readiness, accepted 2026-08-07) built no screen and shipped no `src/` module** — its
  subject was deployment infrastructure and honest verification-of-what-this-environment-can-verify, not the
  product surface, and §3.20 records it in full. What remains for the frontend, exactly as for the backend,
  is **Runtime Verification** — real infrastructure this project has never had — not further implementation.

### 2.3 The 6 skipped backend tests

`pytest` reports 466 passed / **6 skipped**. The 6 are gated integration tests behind `RUN_INTEGRATION=1`
requiring live services. They are intentionally not counted as passing — this is the same honesty rule the
frontend uses for FE-RV.

---

## 3. Full history — what happened, stage by stage *(request item 16)*

### 3.1 Pre-history

An older build of the system existed. At Stage 1 it was archived into `legacy/` and never touched again. Do not
resurrect or reference it.

### 3.2 Backend — 20 stages (all delivered, accepted, tagged)

| Stage | Tag | What it delivered |
|---|---|---|
| 1 | `stage-1-baseline` | 23 packages, toolchain, AST-based layering guard; old build moved to `legacy/` |
| 2 | `stage-2-config` | Pydantic Settings (env-first, secrets-in-env, fail-fast), `python -m app doctor` |
| 3 | `stage-3-docker` | one multi-stage Dockerfile (non-root, 3.13-slim), compose (pgvector/redis/caddy) |
| 4 | `stage-4-database` | async DB, **25 ORM tables** (8 enums, pgvector 1536/512, HNSW + partial-unique + GIN + FTS, `tasks`), Alembic, repositories |
| 5 | `stage-5-redis` | RedisManager, KeyBuilder, TTL, Cache, Idempotency, RateLimiter (Lua), Lock, PubSub |
| 6–7 | *(folded into 4)* | ORM/repositories were absorbed into Stage 4 |
| 8 | `stage-8-queue` | own async queue engine: registry, dispatcher, executor, worker, retry, backoff, DLQ, hooks |
| 9 | `stage-9-scheduler` | timing, DST, missed-slot handling, holidays, advisory locks, scanner, materializer, runner |
| 10 | `stage-10-api` | FastAPI factory, lifespan, DI, unified errors, pagination, health live/ready |
| 11 | `stage-11-providers` | Provider base/registry/factory/errors/health + per-kind Protocols + deterministic fakes |
| 12 | `stage-12-ai-engine` | `app/content/*` — orchestrator, pipeline, selection, rewrite, fallback (on FakeLLM) |
| 13 | `stage-13-rag` | `app/rag` (storage-agnostic kernel + Knowledge) and `app/memory` (independent) |
| 14 | `stage-14-validation` | `app/validators` — stdlib-only rules/gates/decision + `OutputValidator` adapter |
| 15 | `stage-15-image-engine` | `app/images` — aspect, size, safety, post-process (thumbnail/phash), regeneration |
| 16 | `stage-16-telegram-engine` | `app/telegram` — library-agnostic (no aiogram): mapping/router/registry/handlers/dispatcher/publishing; webhook + polling |
| 17 | `stage-17-analytics` | `app/analytics` — stdlib-only: event, metrics, audit, tracing, export seams, retention |
| 18 | `stage-18-admin-panel` | `app/admin` — no FastAPI: authn ⟂ authz ⟂ RBAC, sessions, CSRF, management, dashboards, AI-Studio; Web UI/SSO seams |
| 19 | `stage-19-tests` | `tests/framework\|contract\|e2e` **outside `app/`**: SeedManager, factories ⟂ fixtures, 9 strategies, contract + E2E, independence guard |
| 20 | `stage-20-docs` | full `docs/` tree, release engineering, 8 summary/registry documents; **`app/` untouched** |

Every backend stage followed the same ritual: plan → approval → implement → gate → 3 reports
(`STAGE<N>_REPORT`, `CODE_AUDIT_STAGE<N>`, `RELEASE_NOTES_STAGE<N>`) → 3 commits (feat/test/docs) + 1 tag →
STOP for acceptance.

### 3.3 Frontend — design phase (D1–D4 + Preview)

| Artifact | Content |
|---|---|
| **D1 Foundations** (`design/01-foundations.md`) | vision, positioning, 10 design principles, audience/roles, information architecture, the 25-screen sitemap, route/URL model, navigation model (shell anatomy, sidebar, topbar, command palette with 5 modes, the full keyboard map, breadcrumbs, search/notifications, state persistence), 10 primary user flows, streaming-first principles, voice/microcopy, responsiveness, accessibility posture, design KPIs |
| **D2 ONYX Design System** (`design/02-design-system.md`) | the 3-tier token model, full colour ramps, semantic tokens for **both themes**, typography scale, spacing/density, grid/breakpoints/shell dimensions, radius, 5-level elevation, glass rules, motion system, iconography, **the single status vocabulary (12 statuses)**, data-viz rules, **24 core components**, the **AI component set**, empty/loading/error patterns, accessibility, extensibility patterns |
| **D3 Screen Maps** (`design/03-screens.md`) | all 25 screens in a 17-field format + Part A frameworks + Part C journeys |
| **D4 Full UI Specification** (`design/04-ui-specification.md`) | frontend-architecture mapping, dependency matrix, API integration, state model, error recovery, notifications, QA/handoff checklists, **§12 versioning + §13 evolution rules** (the only legal way to change ONYX) |
| **Preview Artifact** (`design/preview.html`) | published visual reference standard |

Closed at **Design Freeze — ONYX v1.0** (`DESIGN_FREEZE_AND_ROADMAP.md`).

### 3.4 Frontend — engineering architecture

| Stage | Document | Content |
|---|---|---|
| **Stage 2** | `frontend/STAGE2_ARCHITECTURE_PLAN.md` | 15 sections: principles, technology stack with a justification per choice, FSD project structure + import rules, data layer, rendering strategy per page type, component architecture, **six state owners**, security (SEC-1…SEC-7), performance, accessibility, observability, testing strategy, deployment, **the ten engineering gates**, and the **FE-ADR list** |
| **Stage 3** | `frontend/STAGE3_TECHNICAL_SPEC.md` | file-level realization: full file map, component inventory, feature inventory, entity inventory, **routing map for all 25 routes**, hook inventory, **provider inventory and exact nesting order**, API layer per endpoint group, build specification, engineering readiness checklist |

Closed at **Frontend Architecture Freeze v1.0** (`FRONTEND_ARCHITECTURE_FREEZE.md`).

### 3.5 FS1 — Infrastructure (delivered, accepted)

**Plan:** `frontend/STAGE_FS1_PLAN.md` (T-FS1.0 … T-FS1.14). **Reports:** `FS1_REPORT.md`, `FS1_POSTMORTEM.md`.

Delivered the `console/` engineering scaffold: Next.js 15 App Router + React 19 + TypeScript strict; pnpm;
FSD directory structure with public `index.ts` per slice; **all D2 semantic tokens for both themes** plus the
Tailwind v4 `@theme` map; theme + density via SSR cookie with no FOUC; self-hosted fonts; the **seven-provider
tree in the exact Stage 3 §7 order**; typed `apiFetch` with correlation-id and `AppError` normalization;
TanStack Query client/keys/defaults; **SSE-over-fetch `openStream`** + relay route; the app shell
(sidebar/topbar/inspector slot/command palette); **all 25 routes as ONYX EmptyState stubs** with
loading/error scopes; middleware route protection + mock session seam; Storybook; Vitest + RTL + MSW;
Playwright + axe; ESLint/Prettier/dependency-cruiser; CI workflow; `next.config.ts` with CSP; Dockerfile;
Zod-validated public env.

**Gate at acceptance:** ESLint ✅ · Prettier ✅ · tsc strict ✅ 0 errors · dependency-cruiser ✅ 0 violations
(116 modules) · Vitest ✅ 27 tests · build ✅ (per-route First Load ~138 KB) · size ✅ · E2E + axe ✅ 0 violations.
**Flagged FE-RV-1…FE-RV-5.**

**Notable FS1 defects (all fixed, all documented in the postmortem):** unlayered `base.css` silently defeating
a Tailwind utility (contrast 4.21:1 on the primary CTA); `text.tertiary` used on small text (4.46:1); a
Tailwind toolchain version skew from a floating `resolution-mode=highest`; the Storybook × Next webpack
conflict; `next` package corruption on Windows; the size-limit metric measuring the wrong thing; ambiguous
heading names breaking E2E selectors.

### 3.6 FS1 Postmortem (delivered on owner request)

`FS1_POSTMORTEM.md` — an engineering postmortem, not a report: what worked, which decisions were confirmed,
8 defects in *symptom → root cause → fix → prevention* form, PATCH changes, open FE-RV, risks into FS2, what to
verify on real infrastructure, and 8 lessons for later stages. Its headline finding: **four of eight defects
were invisible to typecheck/lint/unit tests and only appeared when the built app was executed.**

### 3.7 FS2 — Routing & Navigation (delivered, accepted)

**Important process event:** the owner said "GO on FS2, work strictly within `STAGE_FS2_PLAN.md`" — but that
document **did not exist**. Per `DESIGN_FREEZE_AND_ROADMAP.md` §4 and the staged-delivery rule, implementation
was **refused**, the missing input was reported, and a plan was written instead. The owner explicitly confirmed
this was correct and then approved the plan. **This precedent matters: if a required input document is missing,
stop and say so.**

**Plan:** `frontend/STAGE_FS2_PLAN.md` (T-FS2.0 … T-FS2.14). **Report:** `FS2_REPORT.md`.

Delivered: Storybook migrated to the **Vite** builder (closing FE-RV-1); Zustand UI store + nuqs URL state
properly wired (closing an FS1 debt); sidebar with rail collapse, cookie persistence and rail tooltips; topbar
with channel-switcher shell, registry-derived breadcrumbs, notifications entry and avatar menu; the **full
command palette** with all five modes; the **registry-driven keyboard system** with `g`-chords and a `⌘/`
cheat-sheet generated from the registry; **per-route RBAC** with a 403 permission state via rewrite; the
`?inspect=type:id` Inspector URL contract; per-route-type skeletons, error and not-found scopes, route
transitions and prefetch-on-intent; responsive navigation (tablet rail, mobile tab bar + sheet); four
navigation primitives (Tooltip, Sheet, Breadcrumbs, ScrollArea); semantics + selector conventions; 28 new tests
and 11 E2E journeys across three viewports.

**Gate at acceptance:** all ten gates green; **FE-RV-1 and FE-RV-2 closed**; **FE-RV-6 opened** (Chromatic
upload needs a project token).

**Notable FS2 defects (all fixed):** cmdk scoring against the raw input including the mode prefix (palette
returned nothing); `text.tertiary` contrast failures *again*; the cheat-sheet's scrollable region having no
focusable child; `test.skip(fn)` misuse; a lazy-mount race in tests; and the `next` corruption recurring —
once caused by violating the project's own documented prevention rule.

### 3.8 FS3 — ONYX Component Library (delivered, accepted 2026-07-29)

**Inputs:** `frontend/FE_ADR_DECISIONS.md` (the owner decided the three open ADRs: **visx** with all heavy
graphics via `dynamic()` · **keep Tailwind v4 + CSS Modules, no CSS-in-JS** · **observability deferred to
FS14/FS15, seams only**) — satisfying the Stage 2 §15 gate. **Plan:** `frontend/STAGE_FS3_PLAN.md`
(approved). **Report:** `FS3_REPORT.md`.

Delivered: **all 24 D2 §13 components + the full §14 AI set** (~45 component directories, 54 story files, 69
new tests — 124 total); the per-route First Load budget became a **machine-checked gate**
(`scripts/check-route-budget.mjs`, `pnpm budget`, wired into CI — closes FS2 R3); the `text.tertiary` usage
rule became a **type-level mechanism** (`shared/ui/tone.ts` — closes FS2 R2); heavy components
(DataTable/Markdown/CodeBlock/Charts) are strictly lazy with `lazy.tsx` entrypoints; Shiki syntax palette =
custom ONYX dual themes transcribed from the frozen viz ramp; 23 exact-pinned dependencies added
(visx **4.0.0** — the React-19-peer-correct family — TanStack Table/Virtual, react-markdown+sanitize, shiki,
10 Radix packages, axe-core dev).

**Defining event:** the new budget gate **caught a real regression mid-stage** — with the full library, the
FS1 root `shared/ui` barrel pushed 27 routes to 188 KB (> 180). Structural PATCH fix: the barrel was removed;
the public API is **component entrypoints** (`@/shared/ui/<component>`, AI set as `@/shared/ui/ai`) — the
same granularity `shared/lib` has used since FS1. Result: worst route 109 KB (Next's table), with the honest
note that the total per-route chunk union (~191 KB) is unchanged vs FS2 — attribution shifted after
`sideEffects` was declared; field impact is verified at FS15 (Lighthouse).

**Notable FS3 defects (all fixed):** the barrel/budget regression; TanStack `getRowCanExpand` missing (rows
silently never expanded); Markdown callout detection via the unreliable hast `node` → React-children
extraction; `userEvent.upload` pre-filtering by `accept` (test-side); jsdom gaps for Radix/charts (guarded
stubs); the Windows/pnpm `next` corruption struck **3×** — once with no install adjacent at all.

### 3.9 FS4 — Auth & RBAC (delivered, accepted 2026-07-30)

**Plan:** `frontend/STAGE_FS4_PLAN.md` (approved). **Report:** `FS4_REPORT.md`.

Delivered **real cookie-session authentication** against the frozen `API_SPEC.md` §Auth (`login {email,
password, otp?}` · `logout` · `me → {user, role}`), with the contract **never extended**: BFF route handlers
(`app/api/auth/{login,logout,me}`, Stage 2 §4 "cookie handling") over an **AuthGateway seam** — the real
proxy forwards the backend `Set-Cookie` verbatim (the session value is never parsed) and maintains an
HttpOnly `onyx-role` **hint** (UI reflection only); a deterministic **fixture gateway** (5 public demo
accounts) exists for local/ci only. **The FS1/FS2 mock seam was deleted under a triple, unit-tested
kill-switch** (server-env build refusal · module-scope throw in staging/production · source-grep test) —
FS2 R4 closed by mechanism. Server layouts re-check the session via `/auth/me` (SEC-2); the first
`features/auth` and `entities/session` slices landed and passed the FSD boundary rules; the whole E2E suite
now signs in through the real form (44 journeys, all five roles); Register is the honest by-invitation state
(the contract has no `/auth/register`). One new dependency: `react-hook-form 7.54.2`.

**Notable FS4 defects (all fixed):** `NextResponse.cookies.set()` silently DROPS `headers.append`-ed
`set-cookie` values — the forwarded session cookie was lost (all auth cookies are now raw appends); axe's
first-ever /login scan caught a **dark-theme primary-button hover at 3.63:1** (present since FS1) — fixed by
token usage (`interactive.active` tint + D2 press-scale), flagged as a D4 §12/§13 candidate; MSW absolute
URLs never matched relative BFF fetches; zod double-issues overwrote field messages; the `next` corruption
struck 3 more times. **New FE-RV-7** (live auth round-trip: cookie name, wire casing, CSRF posture) — owner
accepted as Runtime Verification, not a defect.

### 3.10 FS5 — Dashboard (delivered, accepted 2026-08-01)

**Plan:** `frontend/STAGE_FS5_PLAN.md` — approved with one exception: the §5.1 proposal to pre-raise the
size-limit detector (345→430 kB) was REJECTED; the binding order became **rule №33** (implement → gates →
measure → only-if-blocking: growth analysis + evidence-based proposal). **Report:** `FS5_REPORT.md`
(§11 = the acceptance addendum). The stage was implemented across a session transfer (mid-FS5 handoff);
the resume followed PART4 §11.2 of the mid-FS5 handoff exactly.

Delivered: the **first functional screen**. The FS1 dashboard stub was replaced by an RSC initial-data page
(cookies → `serverApiOrNull` for `/channels`, active channel = `onyx-channel` cookie ?? first, parallel
analytics/cost/tasks/needs-review fetches → entity mappers → hydrated Query islands). Screen per D3 §4:
four metric-tile families with **per-card error isolation** (proven by a test failing only the analytics
fixture), the honest **Gated** engagement tile (§R10.3 — canonical copy, never zeros), read-only schedule
Timeline, Needs-Review queue (`j/k/↵`, real **202 queue intents** with queued-truth toasts), lazy activity
feed, greeting + Compose → `/chat`, an **honest AI-summary seam** (FS6 replaces it), D2 §15 onboarding empty
state, RBAC render variants. The **fixture pattern generalized to data**: ONE deterministic DTO-typed
dataset feeds the server branch, a browser MSW worker AND node MSW (path-only handlers), under the FS4-style
triple kill-switch (env refusal · module-scope throw · static-import grep test) with the
`onyx-fixture-scenario` cookie (default|empty) — registered as **FE-RV-8**. The **real ChannelSwitcher**
closed FS2 R6/R8; the Inspector gained its first entity views (`post` with history Timeline + RBAC-gated
review actions; `job` with attempts/run-at/error) behind the unchanged FS2 `?inspect=` contract.
+33 tests (180 total); E2E grew to 64 with 7 dashboard journeys.

**Notable FS5 defects (all fixed; FS5_REPORT §6):** `msw/browser` unresolvable in the SSR pass (exports map
`node: null`) → server-side webpack alias; **cross-channel stale initialData** — switching channels seeded
the new channel's queries with the old channel's server data (invisible to every static gate; caught ONLY by
the E2E switch journey) → `forChannelId` scoping; the MetricCard source whisper (12px `text.tertiary`)
failed rendered axe contrast → usage fix to `secondary` (third tertiary-contrast precedent; D4 §12/§13
candidate: define "decorative"); toast copy matched twice (toast + polite announcer) in strict mode; jsdom
`matchMedia` gap; the `next` corruption struck once more (11th).

**Acceptance (2026-08-01):** FS5 accepted; size-limit decision = **Option A: 485 kB** (growth is real
Dashboard dependency weight — visx, Inspector and related chunks; the fixture/msw chunk deliberately NOT
excluded so the control stays strict; rule №33 intact — corrected once, after the factual per-chunk
analysis). `pnpm size` re-run green: 475.37/485 kB.

### 3.11 FS6 — AI Chat (delivered, accepted 2026-08-01)

**Plan:** `frontend/STAGE_FS6_PLAN.md` — approved with three deviations (D1 local-first conversations · D2
verbatim relay-over-dry-run streaming posture · D3 no fabricated AI artifacts) and **six binding owner
conditions**: one ConversationRepository (components never touch storage; single swap point for a future
backend API) · relay verbatim-only, no generation logic, no simulated token cadence · no self-generated AI
trust fields (tool calls/citations/confidence/sources/anomaly) · the dashboard AI card strictly
user-invoked with gated metrics never in the prompt · FSD/SoT/ONYX/deps untouched, no new ADRs · heavy
parts lazy, rule №33, 485 untouched during the stage. **Report:** `FS6_REPORT.md` (§11 = acceptance) +
**`FS6_REPORT_SIZE_ADDENDUM.md`** (the dedicated bundle analysis behind the 560 kB ruling).

Delivered: the **working AI surface**. `/chat` real (three-pane; streamed turns over the frozen
`POST /studio/dry-run` §R10.9 via the BFF SSE relay `app/api/ai/stream` — AiGateway seam with a
kill-switched deterministic fixture for local/ci; **Stop cancels the upstream request** and preserves
partial output as an honest `partial` message); `useAssistantStream` (transient Zustand streaming owner;
reconcile-on-done); local-first conversations (`shared/lib/persist` + `entities/conversation` with THE
repository; caps 50/200, oldest-unpinned eviction, local truth stated in the UI); features `send-message`
(⌘↵/⇧↵/↑/⌘⌫; wire-only cost/model) and `insert-to-channel` (**201 draft + optional 202 generate** — the
first chat→pipeline bridge, visible to the FS5 dashboard); Inspector `conversation` view; palette **`/`
Ask AI real** (`?q=` consumed once) + `New chat` command; dashboard **"What changed today?" real** —
user-invoked only, prompt from the pure `buildSummaryPrompt` (gated excluded even against smuggled wire
numbers — unit-proven), TrustLabel + ExplainabilityPanel (confidence honestly absent), wire cost; chat
shortcuts registered (registry honesty: FS5's `j/k/↵` list entries flipped active too). +35 tests (215
total); E2E 88 with 9 chat/AI journeys. **FE-RV-9** registered (dry-run wire shape · upstream streaming
capability *(assumed absent — relay forwards verbatim if present)* · post-create body).

**Notable FS6 defects (all fixed; FS6_REPORT §6):** the budget gate caught /chat at **204 kB** → lazy
leaves (Thread/HistoryRail/InsertDialog), re-measured 178/180 — a structural fix, never a threshold; a
**real UX bug** — the queued nuqs `?q=` clear RACED the created-conversation `router.replace` and stranded
the user on `/chat` (found live in the preview browser; the replace now drops `?q=` itself); Playwright's
`getByLabel` substring pitfall (matched 5 "Conversation…" elements); a ⌘K-vs-hydration race; jsdom layout
stubs for the virtualized thread; `no-dynamic-delete` lint. The `next` corruption did NOT strike in FS6.

**Acceptance (2026-08-01):** stage work accepted first; the size-limit decision was DEFERRED until a
dedicated addendum. The addendum corrected two report statements (growth vs FS5 = **+74.96 kB**, not
+64.96; the FS6 AI fixture is in no client chunk while the FS5-sanctioned data-fixture chunk legitimately
carries the reply string), showed 59% of the aggregate is lazy, per-route First Load untouched (all ≤178),
pre-FS6 heavy chunks byte-identical, and the growth = commons re-partition (net-zero) + real AI-surface
weight (markdown pipeline first-in-bundle ~30 kB, virtualizer+select 10.8, chat/summary ~13.5). **Owner's
ruling: size-limit = 560 kB — a one-time re-baseline; rule №33 unchanged; First Load 180 kB reaffirmed as
the authoritative, non-revisable UX budget.** `pnpm size` re-run green: 550.33/560.

### 3.12 FS7 — Knowledge (delivered, accepted 2026-08-01)

**Plan:** `frontend/STAGE_FS7_PLAN.md` — approved "in principle" first, then FINALLY approved after the
owner required three additions, which were written into the plan and became binding: **§3.1** a per-module
rendering/loading matrix (Server/Client · eager/lazy · First-Load impact), **§3.2** the query-key
**invalidate graph**, **§3.3** a poimённый **FS6 no-touch guarantee** protecting the /chat budget.
Deviations approved with the plan: **D1** no retrieval/chunk/ingest-SSE endpoints exist → those surfaces
are honestly absent (never simulated); **D2** "retrieval-fed citations" are realized as **provenance-fed**
(the citation points at the document the user fed into the prompt); **D3** the `/knowledge` RBAC PATCH;
**D4** *(assumed)* multipart upload transport → FE-RV-10. **Reports:** `FS7_REPORT.md` (§12 = acceptance)
+ **`FS7_REPORT_SIZE_ADDENDUM.md`** (§6 = the 598 kB ruling). The stage was implemented across a laptop
power-loss; work resumed from the exact interruption point with no rework.

Delivered: the **channel-isolated Knowledge workspace** (D3 §7) on the frozen `/documents` group (§R9.3,
seven calls, nothing invented): RSC initial-data page with `forChannelId` scoping → list pane (ingest
StatusBadge, `j/k/↵` → Inspector, shareable `?q=` + source facet — honest LIST filtering, never sold as
retrieval) · **LAZY** reader (sanitized Markdown via the existing lazy entrypoint, honest fallback for
metadata-only wires) · version Timeline (§R9.10) · D2 §15 canonical empty state · `features/add-source`
(multipart upload → assign; an **honest** per-file machine — in-flight = *Queued* because fetch exposes no
upload progress, *Verified* = upload accepted, ingestion truth **polled** per FE-ADR-9 since the contract
has no ingest SSE; 202 re-ingest queued-truth + jobs invalidation; guarded soft delete; channel assign;
PUT new version) · `features/ask-document` (**the first real Citation/KnowledgeCard data**: user-invoked
Summarize/question over the UNTOUCHED FS6 relay, a pure `buildDocumentPrompt` unit-proven to contain only
the selected document + the question, TrustLabel Generated · Source Available, a Citation resolving to the
actual source, a KnowledgeCard **without** a fabricated score, Explainability with confidence honestly
absent, wire-only cost, Stop preserves partial, nothing auto-runs) · Inspector `document` (LAZY registry
row) · palette **`#` real for knowledge** + the D1 §6.7 topbar search entry · knowledge shortcuts (`n`,
`/`) · the **retrieval honesty surface** (the D3 "Retrieval Preview" region states the truth instead of
simulating scores) · the `/knowledge` route permission PATCH `content.edit` → **`content.view`** (D3 §7 +
§R10.5 «ро»: analyst/viewer read, every write/AI affordance call-site-gated). +39 tests (254 total); E2E
grew to 117 with 10 knowledge journeys. **FE-RV-10** registered.

**Notable FS7 defects (all fixed; FS7_REPORT §6):** a **latent FS5-era race** — `FixtureBoot` started the
MSW worker in a `useEffect` (bottom-up, after child queries), so on a HARD navigation the first `/api/v1`
fetch could beat the worker, 404 and stick (4xx skips retry); invisible until FS7 because earlier journeys
always arrived via client-side navigation → fixed by a transport **boot-gate** awaited in `apiFetch`
(resolved no-op in production; armed synchronously during render in the fixture env) · a **real axe
`heading-order` defect** — a document body starting with `# Title` rendered a second h1 inside the reader
→ fixed by demoting embedded document headings in the widget (`demoteMarkdownHeadings`; the ONYX Markdown
contract untouched), with the test lesson that heading selectors near embedded markdown need **role +
level** · jsdom `Blob`/`File` lack `stream()/arrayBuffer()/text()` so multipart uploads hung under undici
→ guarded polyfills + direct (non-clone) body reads + duck-typed File · the **stale-webServer** hazard
(a surviving Playwright server + a rebuilt `.next` = 108 phantom failures) · `/chat` First Load moved
178 → **179 kB** from sanctioned byte-level commons additions + webpack re-partition **with zero chat-file
edits** (proved twice: mtimes + content grep) · the `next` corruption struck **5 times**, every one
auto-recovered.

**Acceptance (2026-08-01):** nine gates green on delivery; the tenth (size-limit) honestly RED at
**587.74/560** with the threshold untouched and the dedicated addendum filed (rule №33 procedure — the
plan §6.2 had predicted exactly this). The owner reviewed a full evidence pack (route table · size output ·
eager/lazy split · per-chunk attribution · machine proof that **no FS7 chunk appears in any page's First
Load manifest** · two-way no-touch proof) and ruled **Option A: size-limit = 598 kB** (`pnpm size` re-run
green **587.74/598**, headroom 10.3) and **`/chat` = 179 kB as the accepted reference number**. The
acceptance addendum also **corrected the report's own** `next`-corruption count from 2 to **5** after an
audit (honesty rule applied retroactively).

### 3.13 FS8 — Memory (delivered, accepted 2026-08-02)

**Plan:** `frontend/STAGE_FS8_PLAN.md` — approved in principle, then FINALLY approved after the owner
required **four more fixed sections**, now binding for every later plan: **§3.4** a state-ownership matrix
(owner · persistence · invalidation source · server/client · cache lifetime · replacement seam, with the
hard rule *no state belongs to Query and Zustand at once*), **§3.5** a URL navigation contract (every
transition expressible as a URL and reversible by Back), **§3.6** per-chunk bundle ownership (one importer,
first-load trigger, could-it-reach-commons, and the mechanical proof), **§3.7** checkable regression
invariants I1–I8. Deviations approved with the plan: **D1** the frozen contract has **no `/memory`
endpoint** (no trace, no pin/exclude, no Global scope, no raw memory rows) → honest seams; **D2** the
Memory Explorer *is* the memory levels the contract exposes (§R9.1: Persona incl. Style Memory §R9.12 ·
Actors · published posts); **D3** **no "explain influence"** — a model claim about attribution would be
fabrication, so explain-style over ONE persona record replaces it; **D4** the `/memory` RBAC PATCH;
**D5** *(assumed)* persona/actor wire shapes → FE-RV-11. The owner also mandated **T-FS8.1 (the commons
offload) as the stage's first action**. **Reports:** `FS8_REPORT.md` (§12 = acceptance) +
**`FS8_REPORT_SIZE_ADDENDUM.md`** (§6 = the 628 kB ruling).

Delivered: the **Memory Explorer** (D3 §8) — RSC channel-scoped initial data (`forChannelId`) → entries
**grouped by kind** (Persona · Actors · Published posts) with `j/k/↵`, a shareable `?q=` filter and a scope
rail whose **Global** tab is an honest unavailable state · **Style Memory made legible** (§R9.12 —
`persona.style_features` as derived *parameters, never stored texts*, with unknown backend keys surfaced
honestly by raw key) · **guarded persona editing** (`PATCH /personas/{id}` + `POST /personas/{id}/archive`,
confirmed mutations, the **§R4.2 optimistic lock** honoured — a stale `version` renders an honest 409
conflict, never a silent overwrite; audit stated as a backend fact, §R10.8) · **explain-style** (the honest
replacement for "explain influence": user-invoked AI over ONE persona record through the UNCHANGED FS6
relay, prompt unit-proven, **MemoryCard renders real provenance** — its first real data) · LAZY Inspector
`persona`/`actor` rows · the palette **`#` Memory group kept structurally separate from Knowledge**
(§R9.3) · memory shortcuts (`/`, guarded `e`) · **honest-absence surfaces** for trace/Global/pin/exclude ·
the `/memory` RBAC PATCH to `content.view` · and **T-FS8.1**, the keyboard-registry split by concern, which
measurably moved `/chat` 179 → **178** and `/knowledge` 176 → **175** before any feature code. +53 tests
(307 total); E2E grew to 145 with 10 memory journeys. **FE-RV-11** registered.

**Notable FS8 defects (all fixed; FS8_REPORT §6):** a **real navigation defect found by E2E** — the
`?scope=` toggle wrote the URL with nuqs's default `replace`, so Back left the screen instead of returning
to the channel scope, violating the plan's own §3.5 (fixed: `history: 'push'` for scope only, filters stay
`replace`) · two strict-mode selector collisions (the persona voice line appears both as a list preview and
in the detail pane → assertions scoped to the `Memory detail` region) · two existing specs updated as
FS8 made factually necessary (the shortcuts import path after the module split; the palette `#` copy) ·
the `next` corruption struck **3 times**, every one auto-recovered; no stale-webServer incident (the FS7
kill-port habit held).

**Acceptance (2026-08-02):** nine gates green on delivery; size-limit honestly RED at **617.59/598**, the
threshold untouched and the addendum filed. Before ruling, the owner demanded a **full evidence pack** —
and it **disproved the report's own causal claim**: the `178 → 179` movement on `/chat` was NOT caused by
FS8's commons additions (no FS8 string exists in any of the route's 16 First Load chunks; `/chat` does not
even import `query-keys`), but by **webpack shared-graph re-partition plus Next's rounding**, while the
union walk-gzip actually *decreased* 175.10 → 174.74 kB. Both documents were corrected to the measured
explanation *before* acceptance. The owner then ruled **Option A: size-limit = 628 kB** (`pnpm size` re-run
green **617.59/628**, headroom 10.4) and confirmed **`/chat` = 179 kB as the standing reference**.

### 3.14 FS9 — Image Studio (delivered, accepted 2026-08-02)

**Plan:** `frontend/STAGE_FS9_PLAN.md` — approved with **eight deviations D1–D8** and the seven fixed
sections the owner has required since FS7/FS8 (§3.1 rendering matrix · §3.2 invalidate graph · §3.3
file-by-file no-touch guarantee · §3.4 state-ownership matrix · §3.5 URL navigation contract · §3.6
per-chunk bundle ownership · §3.7 numeric invariants I1–I8), with **T-FS9.1 (the zero-commons mechanism)
mandated as the stage's first action**. The deviations, each a contract finding rather than a preference:
**D1** the frozen contract has **no image-CREATE endpoint** (D4 §4's assumed `POST /images` does not exist),
so free-form generation is an honest seam — image generation is the backend pipeline stage `generate_image`
(§R2.5) and the only client-expressible intent is regeneration; **D2** the contract exposes **no media
URL** (`images.storage_path` is an object KEY, §R6.8), so the console renders image RECORDS and says why —
no placeholder art, thumbnail or data-URI anywhere, fixtures included; **D3** what the Studio IS: grid ·
record detail · §R6.5 attempt history · §R6.4 similarity report · 202 regeneration · guarded soft delete ·
§R6.1 references · read-only locations; **D4** no accept/attach-to-post (no post-update call exists);
**D5** verification chips are wire-derived and a **safety verdict is honestly absent** (§R6.7 is
backend-side, no wire field); **D6** no AI prompt-improvement (a rewritten prompt would be a dead end) —
**explain-verification** instead; **D7** the `/studio` RBAC PATCH to `content.view`; **D8** *(assumed)*
image/similarity/reference wire shapes → FE-RV-12. **Reports:** `FS9_REPORT.md` (§12 = acceptance) +
**`FS9_REPORT_SIZE_ADDENDUM.md`** (§6 = the 655 kB ruling).

Delivered: the **Image Studio** (D3 §9) — RSC channel-scoped initial data (`forChannelId`) → a record grid
whose ONYX **ImageResult** cards finally carry real data (**their first**), with verification derived from
the wire only · a LAZY record detail (prompt + negative disclosure · generation parameters · the scene with
actor and location resolved at the WIDGET level, since `entities/image` never imports a sibling entity · the
**§R6.5 attempt history** with unrecognised results shown raw · the **§R6.4 similarity report** — phash ≠
scene metadata ≠ CLIP, grouped by mechanism, unknown report keys by raw name — **the first REAL verification
data in the product**) · **202 regeneration** with honest polling (an unknown wire status polls nothing) and
a **guarded soft delete** · the stage's entry duty, the **actor reference upload**
(`POST /actors/{id}/references`, §R6.1) over the FS7 multipart seam with no invented progress and §R6.2 copy
· **explain-verification** (user-invoked AI over ONE image record + its report through the UNCHANGED FS6
relay; `buildImagePrompt` unit-proven to carry only that record and to forbid safety/identity/uniqueness
claims) · a LAZY Inspector `image` row · the palette **`#` Images group kept separate from Knowledge AND
Memory** · studio shortcuts (`/`, guarded `r`; `⌘↵ generate` and `a accept` deliberately NOT registered) ·
honest-absence surfaces for generation, the picture itself, accept/attach and safety · the `/studio` RBAC
PATCH · and **T-FS9.1**, the zero-commons mechanism: **entity-local query keys** (`entities/image/keys.ts`,
`entities/location/keys.ts`), leaving `shared/config/query-keys.ts` with **zero added rows**, lock-tested.
+59 tests (366 total); E2E grew to 179 with 12 studio journeys. **FE-RV-12** registered.

**Notable FS9 defects (all fixed; FS9_REPORT §6):** a **real a11y defect found by axe** — every grid card
was `role="button"` wrapping `ImageResult`'s own prompt-disclosure button (`nested-interactive`, WCAG 4.1.2,
all three viewports) → the card became presentational with explicit Open/Inspect buttons (the FS7
DocumentList pattern) · a **real UX defect found by E2E** — `history.back()` after deleting a deep-linked
record could leave the workspace → `router.push('/studio')` · a **real honesty defect found by the mobile
project** — the "generation lives in the pipeline" seam was `xl`-only, so mobile users saw no reason for the
missing Generate button → the seam now renders on every viewport · four test-side corrections (the grid is
newest-first, so `j` moves down from `img_tech_3`; a `Seed` strict-mode collision; the recorded ⌘K
hydration race; the portal-rendered file input) · one I7-legal existing-spec update (the palette copy now
names Images). The `next` corruption did **not** strike (count stays 19); no stale-webServer incident.

**Acceptance (2026-08-02):** nine gates green on delivery; size-limit honestly RED at **644.32/628**, the
threshold untouched and the addendum filed. The owner requested a **full evidence pack** and ruled after it:
**Option A — size-limit = 655 kB** (`pnpm size` re-run green **644.32/655**, headroom 10.7). The pack
confirmed: eager/lazy **245.70 / 384.54 kB (61.0% lazy**, up from 60.2%) · **all seven FS9-carrying chunks
in the detector glob are lazy** and appear in **zero** page First Load lists (the only FS9 code any manifest
lists is the `/studio` route's own eager shell) · the **I2 deviation is ruled resolved**: `/memory` 148 →
149 and the stubs 106 → 107 are **webpack re-partition + Next rounding**, established by three independent
measurements (the route's page chunk *shrank* 11.8 → 8.43 kB while First Load rose; a **control build** with
FS9's single byte-level addition to that graph removed still reported 149; 0 FS9 markers across all 23
`/memory` First Load chunks) · no-touch intact by mtime and import scan. **Post-FS9 standing reference
numbers:** `/chat` **178** · `/knowledge` 175 · `/dashboard` 167 · `/studio` 164 · `/memory` 149 · stubs 107.

### 3.15 FS10 — Prompt Library (delivered, accepted 2026-08-03)

**Plan:** `frontend/STAGE_FS10_PLAN.md` — approved with **ten deviations D1–D10** and the seven fixed
sections required since FS7/FS8 (§3.1 rendering matrix · §3.2 invalidate graph · §3.3 no-touch guarantee ·
§3.4 state-ownership matrix · §3.5 URL navigation contract · §3.6 per-chunk bundle ownership · §3.7 numeric
invariants I1–I8), with **T-FS10.1 (the zero-commons mechanism) mandated as the stage's first action**. The
owner ruled three of the deviations explicitly at approval and added **two new binding requirements**:

- **D6 → Option 1:** a **MINOR, fully backward-compatible PromptCard extension** (two additive optional
  props) rather than leaving the ONYX card data-starved — the alternative would have been fabricating a
  variables count and an Active/Draft badge. This is the **first sanctioned change to an ONYX component's
  public API**, approved in advance under D4 §13.
- **D8 → the contract-only path:** "test-this-version" via `POST /studio/dry-run` through the existing FS6
  relay — *no AI-generated prompt drafts, no auto-save, no refine, no compare-models, no new AI capability
  outside the contract*.
- **D9 → accepted:** the `/prompts` RBAC PATCH `content.edit` → `content.view`.
- **Requirement A (new):** the Prompt Library is the project's first surface that is **principally not
  channel-scoped**, and that must be proved by a dedicated **lock test** — no prompt query key may accept a
  `channelId`.
- **Requirement B (new):** because it is the first platform-wide surface, its **absence of influence** on
  Dashboard, Knowledge, Memory, Studio and Chat must be proved separately (*no cross-scope ownership*), to
  the FS8/FS9 evidence standard.

The other deviations were contract findings: **D1** the identity is `type`, not `name`, and the record has
**no `channel_id`** (platform-wide) · **D2** there is **no activation** (no promote call, no `is_active`) ·
**D3** editing **is** versioning; there is no update and no delete · **D4** there is no `GET /prompts/{id}` ·
**D5** there is **no variables field and no documented templating** (§R5.3 names the backend prompt-builder
as the assembler) · **D7** the diff is a pure client-side derivation of two served texts · **D10**
*(assumed)* wire shapes → FE-RV-13. **Reports:** `FS10_REPORT.md` (§12 = acceptance) +
**`FS10_REPORT_SIZE_ADDENDUM.md`** (§8 = the 677 kB ruling).

Delivered: the **versioned prompt surface** (D3 §10) on **three** contract calls — a list of prompt **types**
whose ONYX **PromptCard** rows finally carry real data (no Active/Draft badge, no variables count, because
the contract backs neither) · a LAZY version detail reading the chain from `GET /prompts/{id}/versions`, with
the text rendered **exactly as stored** and the author shown as a **raw id** · a **real diff** between any two
versions, computed by a pure dependency-free line diff and rendered with the D2 §13.18 add/remove semantics
plus screen-reader labels · the contract's **only** write (`POST /prompts` = a new version, confirmed and
never optimistic per §R11.4, reporting the **server-assigned** version with **201 truth, never 202 wording**)
backed by a per-type unsaved draft behind **one feature-owned module** · a LAZY Inspector `prompt` row · a
palette **`#` Prompts group** kept separate from Knowledge, Memory **and** Images (four groups) ·
**test-this-version**, the owner-approved D8 surface · honest-absence surfaces for activation, deletion,
variables, per-channel prompts, author identity and model comparison · the `/prompts` RBAC PATCH · and
**T-FS10.1**, which kept the eager total to **+0.70 kB** — the smallest eager delta of any FS stage.
+95 tests (461 total); E2E grew to 218 with 14 prompt journeys. **FE-RV-13** registered.

**Notable FS10 defects (all fixed; FS10_REPORT §6):** a **REAL budget/architecture defect** — the first build
failed the route budget at `/chat` **182 kB** with the First Load chunk *set* unchanged; manifest forensics
located the entire growth in the **webpack runtime's chunk-id map** (2.56 → 6.31 kB gz) because FS10 had
become the **first product consumer** of `shared/ui`'s CodeBlock, making Shiki's per-grammar graph reachable
app-wide — fixed **structurally** (the diff renders its own lines) and proved by a **control build** that
returned every protected route to its exact baseline; a **REAL a11y defect** found by axe (PromptCard's 12px
meta line at 3.78:1 — the **fifth** application of the tertiary rule, fixed by token *usage*); a **REAL
layout defect** found by E2E (an over-long `source` squeezed the provenance card's `truncate` title to **zero
width**, making the citation invisible — fixed at the call site, ONYX untouched); four test-side corrections;
one I7-legal existing-spec update (the palette copy now names Prompts); and the `next` corruption **3 times**
(#20–#22), all auto-recovered — with the lesson that the recovery habit must be **unpiped**, since a
pipeline's exit status is the last command's.

**Acceptance (2026-08-03):** nine gates green on delivery; size-limit honestly RED at **666.80/655**, the
threshold untouched and the addendum filed. The owner ruled after a full evidence pack: **Option A —
size-limit = 677 kB** (`pnpm size` re-run green **666.80/677**, headroom 10.20). The **I1 deviation is ruled
resolved**: `/chat` 178 → **179** is webpack re-partition + Next rounding, established by three independent
measurements (zero FS10 markers across the route's 16 First Load chunks · a **control build** with FS10's only
shell-commons addition removed still reporting 179 · the route's own page chunk byte-stable at 13.5 kB).
Requirements A and B were each proved by dedicated source-level assertions (23 in total) plus an E2E journey
and a byte-level baseline comparison. **Post-FS10 standing reference numbers:** `/chat` **179** ·
`/knowledge` 175 · `/dashboard` 167 · `/studio` 164 · `/prompts` **150** · `/memory` 149 · stubs 107 ·
shared commons 106.

### 3.16 FS11 — Analytics (delivered, accepted 2026-08-03)

**Plan:** `frontend/STAGE_FS11_PLAN.md` — approved with **twelve deviations D1–D12** and the seven fixed
sections required since FS7/FS8 (§3.1 rendering matrix · §3.2 invalidate graph · §3.3 no-touch guarantee ·
§3.4 state-ownership matrix · §3.5 URL navigation contract · §3.6 per-chunk bundle ownership · §3.7 numeric
invariants I1–I8), with **T-FS11.1 (the zero-commons lock AND the R1c first-consumer measurement) mandated as
the stage's first action**. The owner ruled three deviations explicitly at approval and added **five binding
requirements**:

- **D6 → option A:** **no System panel**; an honest seam stating that the frozen contract exposes no
  system-analytics endpoint, and **nothing derived from unrelated endpoints** (the alternative — a task-status
  roll-up from `/tasks` — was rejected).
- **D9 → option A:** export is **Copy link + a client-side CSV built only from data already in the browser**;
  no server export, no additional API call.
- **D10 → option A:** keep **explain-metrics**, gated by `content.edit`, over the existing verbatim FS6 relay,
  provenance-only, and forbidden from implying anomalies, forecasts, recommendations, hidden causes or
  engagement values the contract does not carry.
- **Requirement 1:** `/dashboard` is the stage's **primary protected route**; the byte comparison against the
  FS10 baseline is mandatory **after the first chart lands and again before acceptance**.
- **Requirement 2:** entity-local query keys remain mandatory — no analytics addition may expand shared
  query-key infrastructure.
- **Requirement 3:** any increase on a protected route must be **explained by measurement, never hypothesis**.
- **Requirement 4:** every chart heavier than the existing dashboard surface stays **lazy-first**.
- **Requirement 5:** if the detector goes red, follow **rule №33 exactly** — stop, produce a per-chunk
  evidence addendum, wait for a separate decision, and do not change the threshold.

The other deviations were contract findings: **D1** the range and the cost facet are the contract's own
parameters and the channel control already exists · **D2** engagement is **gated** and that is the screen's
headline · **D3** there is no anomaly endpoint or flag · **D4** there is no forecast endpoint · **D5** there
are no recommendations or experiments (and §R11.5 makes an audience split impossible) · **D7**
content-diversity is rendered only if the wire carries it · **D8** provenance is request-provenance, an
algorithm version appears only when the response carries one, and there are **no simulated live counters** ·
**D11** **no RBAC PATCH** — all five roles already read analytics · **D12** *(assumed)* wire shapes →
FE-RV-14. **Reports:** `FS11_REPORT.md` (§12 = acceptance) + **`FS11_REPORT_SIZE_ADDENDUM.md`** (§6 = the
696 kB ruling).

Delivered: the **analytics workspace** (D3 §12) on **five read calls** — a channel- and range-scoped RSC page
→ the reliable panels first (the channel snapshot as ONYX MetricCards · **Cost** on real ONYX charts through
the contract's own `group_by` facet · **Quality** · **Trends** · the **period report**), each with its own
skeleton, error card, honest empty state and **provenance line** (§R11.9) · **engagement rendered GATED**,
where a field flagged `gated` yields no value **even when the wire carries a number** (proven in the mapper,
the AI prompt and the CSV) · `?from=&to=`, `?group_by=` and `?period=` as Back-reversible URL state ·
**export without an endpoint** (Copy link + a client-side CSV that excludes and *names* gated series) · a
**datapoint Inspector** that is a pure projection of the Query cache and issues **zero requests** ·
**explain-metrics**, user-invoked over the loaded non-gated values through the unchanged FS6 relay · and
honest-absence surfaces for anomalies, forecasting, recommendations/experiments, system health and live
counters. **T-FS11.1** kept `shared/config/query-keys.ts` and `endpoints.ts` at **zero added rows** and
recorded the R1c measurement: becoming the visx family's *second* consumer moved the webpack runtime chunk
only **2.58 → 2.70 kB** (against FS10's +3.75 kB first-consumer failure). +81 tests (542 total); E2E grew to
261 with 15 analytics journeys. **FE-RV-14** registered.

**Notable FS11 defects (all fixed; FS11_REPORT §6):** a **REAL budget defect** — `/dashboard` 167 → 169 kB
after the first chart, diagnosed from `app-build-manifest.json` before any claim was written (chunk `625`,
5.23 kB, carrying the FS11 hooks, had entered the route's First Load because a `'use client'` module reached
through the **FS5 entity barrel** is bundled whole — the FS3 barrel lesson at slice scope), fixed
**structurally** by moving the FS11 modules into their own `entities/analytics-report` slice that imports
nothing from the FS5 one; a **REAL a11y defect** found by axe (`heading-order` — the panels, the gated card,
the honesty seams, the AI panel and the datapoint Inspector all used `h3` under the page's single `h1`), fixed
by promoting those section headings to `h2`; a **process defect** — an E2E run executed against a stale
artifact left behind by a control build, which is now a recorded habit (*rebuild after every control build*);
four test-side corrections (a `quality_score` served by two panels needed region-scoped assertions; the export
toast collides with the announcer; the Explainability disclosure must be opened before its limits are read;
the "nothing is fetched" assertion had to start recording after the panels settled); and two mobile skips
matching the studio precedent (the datapoint Inspector asserts the desktop drawer; mobile renders a sheet).
The `next` corruption did **not** strike (count stays 22); no stale-webServer incident.

**Acceptance (2026-08-03):** nine gates green on delivery; size-limit honestly RED at **685.08/677**, the
threshold untouched and the addendum filed. The owner ruled after the evidence pack: **Option A —
size-limit = 696 kB** (`pnpm size` re-run green **685.08 / 696**, headroom 10.92). The **I2 deviation is ruled
resolved**: `/dashboard` 167 → **168**, `/knowledge` 175 → **176**, `/studio` 164 → **165** and shared commons
106 → **107** are **webpack shared-graph re-partition when a 27th real route joins**, established by two
control builds (one isolating the Inspector registry row; one reverting the route to a stub, which returned
**every** protected route to its exact baseline) plus a zero-marker scan across all 59 First Load chunks of
the four protected routes. **Post-FS11 standing reference numbers:** `/chat` **179** · `/knowledge` 176 ·
`/dashboard` 168 · `/studio` 165 · `/prompts` 150 · `/memory` 149 · `/analytics` **148** · stubs 107 · shared
commons 107.

### 3.17 FS12 — Platform & Admin (delivered, accepted 2026-08-04)

**Plan:** `frontend/STAGE_FS12_PLAN.md` — approved with **fifteen deviations D1–D15** and the seven fixed
sections required since FS7/FS8, with **T-FS12.1 (the zero-commons lock, the R1c DataTable decision gate and
the protected-route baseline) mandated as the stage's first action**. The owner ruled four items explicitly
at approval: **D9 → Option A** (`/billing` is the platform-wide cost view on the contract's own `GET /cost`,
with plan/invoices/budgets/forecast as seams and **no AI forecast**), **D12 → Option A** (`explain-job` is
the stage's ONE AI surface), **D14 → Option B** (map only the five task statuses with an exact ONYX
equivalent; render `deferred`/`cancelled`/`dead` as explicit RAW labels; **no ONYX MINOR, zero commons
bytes**), and the **D1 sub-ruling** (FS12 owns the `/notifications` SCREEN as a seam; notification
PREFERENCES belong to FS13). Five binding requirements accompanied the GO: T-FS12.1 as a mandatory gateway
with an immediate structural fallback · `entities/job-queue` isolated from `entities/job` · queue keys fully
independent of the `['jobs', …]` hierarchy · every protected-route movement explained **only** by
measurement · rule №33 exactly if the detector went red. **Reports:** `FS12_REPORT.md` (§10 = acceptance) +
**`FS12_REPORT_SIZE_ADDENDUM.md`** (§6 = the 756 kB ruling).

**The contract reality that shaped the stage.** Stage 3 §8 had marked the providers, logs, flags,
notifications and billing rows *(assumed)*; FS12 is where they were finalized, and **the frozen `API_SPEC.md`
refutes five of them**. There is no `/providers` endpoint, no logs endpoint, no feature-flag endpoint, no
notifications endpoint and no plan/invoice/forecast endpoint anywhere in `/api/v1` — nor a `feature_flags`,
`notifications`, `sessions` or `providers` table among the frozen 25 (§R4.10). This is the FS9 precedent
(D4 §4's assumed `POST /images` did not exist either) at nine-screen scale, and it was decided the same way.

Delivered: **all nine routes of the `(platform)` group**. Six read the contract for real — **`/admin`**
(users · roles · a guarded per-user session revoke · config-version history with a **real client-side diff of
two SERVED snapshots** and a guarded rollback), **`/jobs`** (the Task Monitor on the contract's own
`?status=&type=&channel_id=` filters, attention-first ordering, **cancel / run / requeue as CONFIRMED 202
queue intents** with queued-truth wording), **`/audit`** (the immutable record with a real before→after jsonb
diff and a client-side CSV), **`/health`** (liveness ≠ readiness; probes rendered **only** as readiness names
them; an unrecognised state is grey **unknown**, never green; re-check is an honest refetch), **`/providers`**
(the project's **first secret-writing surface** — slot presence, write-only rotation, and provider health
only where readiness names a provider) and **`/billing`** (the platform-wide cost view). Three carry **no
contract call at all** — `/logs`, `/flags`, `/notifications` — and state fact · reason · remedy on **every**
viewport, with **no fixture log line, flag row, notification or invoice anywhere**, proved by a
**negative-lock test** (a first for this project) that asserts the resolver answers nothing for
`/providers`, `/logs`, `/flags`, `/notifications`, a session inventory or an export path. Seven new entity
slices, six features, seven widgets, six Inspector views behind **one** lazy chunk, a fifth palette `#`
group, and a type-only `platform` shortcut scope. **Five entities Stage 3 §4 had planned were deliberately
NOT created** (`flag`, `log`, `notification`, `provider`, `session`) — the contract models nothing for them
and an empty entity would have been the lie; a test asserts they do not exist. +150 tests (692 total); E2E
grew to 317 with 19 platform journeys. **FE-RV-15** registered.

**Notable FS12 defects (all fixed; FS12_REPORT §4):** a **REAL budget/architecture defect** — the first full
build put `/jobs` at **183 kB** and `/admin` at **181 kB**; manifest forensics located an 8.5 kB route-only
chunk carrying **TanStack Query's mutation machinery and Next's `dynamic()` client runtime**, dragged in
because an *eager* list view called `useQueueIntents`. Fixed **structurally** (the lazy component now owns
its own mutation hook; the platform dialogs became `dynamic()`; the static honesty block moved from the
client view into the RSC page): `/jobs` 183 → **172**, `/admin` 181 → **179**, `/providers` 162 → **153**,
with no threshold moved · **two REAL a11y defects found by axe** — a `heading-order` skip (the config
Comparison heading was an `h3` directly under the page `h1`, fixed by promoting the platform panel headings
to `h2`) and **`scrollable-region-focusable`** (the seam screens have zero interactive elements, leaving the
scrollable `#main-content` unreachable by keyboard — fixed **in the content, never in the shell**, by giving
each seam real navigation to the screens with the nearest real data) · five test-side corrections (three
strict-mode collisions on repeated copy, the `/403` state rendering an EmptyState title rather than a
heading, and a billing comparison that raced the lazily-rendered chart axis) · one I7-legal existing-spec
update (`fixtures.test.ts` asserted an exhaustive task-id list; the assertion was made **stronger**, not
weaker) · an **observed flake reported rather than hidden** (`AiComponents.test.tsx`, an FS3-era suite, timed
out on a *different* disclosure test in two of three full-suite runs and passed in isolation every time) ·
the `next` corruption struck **once** (#23), auto-recovered.

**Acceptance (2026-08-04):** eight gates green on delivery; **two ended RED and were reported RED with their
thresholds untouched** — size-limit at **744.70 / 696** (the dedicated addendum filed, no value proposed as
settled) and Prettier on **one pre-existing FS11 file** (`tests/e2e/analytics.spec.ts`, the only file in the
repo with CRLF terminators, mtime 2026-08-03, inside the no-touch set — so it was **not touched**). The owner
ruled both: **size-limit = 756 kB** (the eighth measured re-baseline; derived as 744.70 + the 10.92 kB
headroom granted at FS11, rounded up) and the Prettier failure accepted as a **legacy carry-over**, formatted
formatting-only and proved so (identical once CRLF is stripped; the 278-byte delta is exactly the 278 CR
characters; the spec re-runs green). **Invariants I1 and I2 remain reported as MISSED by 1 kB each** —
`/chat` 179 → **180** and `/memory` 149 → **150** — with **two control builds** attached: reverting the nine
FS12 routes to stubs returns `/chat` to 179 and the webpack runtime chunk from 2895 to 2789 B gz (so the
`/chat` movement is the route set), while `/memory` reads 150 in that control *and* in a second control that
removes the palette group (so its movement is the single lazy Inspector-registry reference, +28 B gz in
commons, tipping a route that sits on the rounding boundary). Acceptance did not re-write them.
**Post-FS12 standing reference numbers:** `/chat` **180 (ZERO headroom)** · `/admin` 179 · `/knowledge` 176 ·
`/audit` 174 · `/jobs` 172 · `/dashboard` 168 · `/studio` 165 · `/providers` 153 · `/memory` **150** ·
`/prompts` 150 · `/analytics` 148 · `/billing` 144 · `/health` 139 · seam routes 111 · stubs 107 · shared
commons 107.

### 3.18 FS13 — Settings / Profile / Notification preferences (delivered, accepted 2026-08-05)

**Plan:** `frontend/STAGE_FS13_PLAN.md` — approved with **fifteen deviations D1–D15** and the seven fixed
sections required since FS7/FS8, with **T-FS13.1 (the zero-commons lock, the protected-route baseline and
THREE pre-declared decision gates) mandated as the stage's first action**. The owner ruled five items
explicitly at approval: **D4 → Option A** (sign-out-other-sessions is a cross-link to `/admin`, not a
duplicated mutation), **D5 → Option B** (browser-local notification preferences, `danger` immutable),
**D6 → approved** (Experience Level ships only because FS13 makes it genuinely consumed), **D9 → approved**
(no new Inspector registry row and no new palette group, for the measured budget reason) and **D10 →
approved** (`⌘,` as a measured gate with a pre-declared abandon fallback). The implementation rules attached
to the GO: execute T-FS13 sequentially · measure, never hypothesize · keep rule №33 · no fabricated backend
behaviour · no simulated contract features · no commons bytes unless proven unavoidable · `/chat` (180) and
`/memory` are the primary protected routes · **stop immediately if a structural deviation becomes
necessary**. **Reports:** `FS13_REPORT.md` (§9 = acceptance) + **`FS13_REPORT_SIZE_ADDENDUM.md`** (§7 = the
777 kB ruling).

**The contract reality that shaped the stage.** D4 §4 marked the Settings screen's API *(assumed)* as
*"user prefs"*. The frozen `API_SPEC.md` refutes it outright: there is **no preferences resource of any
kind**, and the frozen `users` table carries **no preferences column** (`id · email · role · password_hash ·
mfa_secret_ref · status`). Nor is there any self-service account write — no `PATCH /users/me`, no password
change, no avatar upload, no name column; `PATCH /users/{id}` is owner-only and documented for **role**
alone. This is the FS9/FS12 precedent again, and it was decided the same way — except that FS13 is the first
stage where the answer is not "the screen is an absence" but **"the screen is real, and its persistence is
the browser, not the account"**.

Delivered: **both routes of the `(account)` group that had real screens to build.** `/settings/[[...section]]`
carries the six D3 §23 sections with the section in the **path** (Back-reversible; an unknown segment
resolves to Appearance rather than 404-ing a preference screen) — **Appearance** (theme + density through the
setters `ThemeProvider` has exposed since FS1, so `app/layout.tsx` and `shared/config/theme.ts` stay
byte-identical and the no-FOUC duty is preserved *by construction*), **Account** (read-only identity;
initials drawn from the e-mail because there is no name column), **Security** (three named absences plus an
owner-only cross-link), **Notifications** (the D5-B preferences), **Experience** (progressive disclosure,
consumed) and **Advanced** (a real reset plus the pointer that Appendix-B parameters are channel-scoped and
belong to the Channels screen). `/profile` carries identity, the **Sessions** verified absence, and
**Activity** — the stage's one real read, `GET /audit-log?actor=`, opening FS12's **already-registered**
`audit` Inspector view. **Two features** (`change-settings`, `explain-activity`), **two widgets**, and —
deliberately — **no entity slice at all**: identity is FS4's `entities/session` (already in every route's
First Load via `AuthProvider`, so its barrel was left alone — the FS12 `entities/job` lesson), activity is
FS12's `entities/audit`. **FS13 declares no query key, no endpoint path and no fetcher of its own, a first
for this project**; `shared/config/query-keys.ts` and `shared/lib/api/endpoints.ts` were never opened.
+92 tests (784 total, 101 files); E2E grew to 356 with 13 account journeys. **FE-RV-16** registered.

**The three decision gates, each executed as a task with its numbers written down:** `⌘,` shipped because
the webpack runtime chunk stayed **byte-identical** (2894 gz / 5311 raw) and no protected route moved; the
R1c first-consumer check **adopted** `shared/ui/switch` and `shared/ui/avatar` (both Radix packages had been
in **no bundle**) because the runtime chunk moved 2894 → **2893** gz with raw identical; and **D14 needed no
change at all** — `settings.manage` was already granted to all five roles, so `routes.ts` was never opened.
The same scan produced a correction: a naive grep reported `shared/ui/data-table` as having a consumer, but
the match was FS12's *comment* explaining why it is not used — **TanStack Table is still in no bundle**.

**The I2 deviation — the stage's defining event.** Two protected routes moved: **`/audit` 174 → 175** and
**`/providers` 153 → 154**. Implementation **stopped** and reported, per the owner's standing instruction.
The cause was established by **four clean builds**: **control C** (only the D5-B toast-mute read side
removed, every other FS13 byte present) returned both routes to baseline, and **build D** (the same logic
inlined in the provider, no new module) cost exactly the same — proving the price is inherent to *where* the
state is consulted, not to packaging. It is **not** the chunk-id map: the runtime chunk is *smaller* in the
full build than in the control. The structural reason: a toast preference must be consulted where toasts are
**emitted** — `NotificationProvider`, one of the frozen seven — and **FSD forbids a provider importing a
feature**, so the read side cannot live in the feature. The plan's assertion that `⌘,` would be "the stage's
ONLY commons edit" was therefore wrong, and said so. `/chat` **180** and `/memory` **150** stayed byte-stable
in every build and `pnpm budget` passed. **The owner ruled Option 1: keep the mechanism, report the deviation
exactly as measured, do not re-word it.**

**Notable FS13 defects (all fixed; FS13_REPORT §4.2):** a **REAL privacy defect found by a component test** —
`ActivityPanel` read `session?.userId` directly and guarded on `null`, but an **empty-string** id passes that
guard and `auditPaths.list` drops a falsy actor from the query string, so a blank id would have silently
turned a personal activity feed into the **platform-wide audit log**; fixed by routing the id through
`toIdentity`, which normalises `''` to `null`, and locked at source level afterwards · a **REAL
fixture-ordering defect found by the full E2E matrix** — FS13's new audit rows were dated *newer* than
FS12's, and the list renders newest-first, so `/audit`'s first row changed and an FS12 journey failed on all
three viewports; the lesson is that **additive-by-id is not sufficient when ORDER is itself an input to an
existing assertion** (the FS9 sorting rule), and the fix went into the fixture (dating the rows oldest), not
the spec · four test-side corrections (three source assertions matched the *prose* in doc comments rather
than the code, fixed with a comment-stripping helper; one E2E assertion used `getByRole('status')`, which
always matches the announcer's persistent live region — the recorded FS5 pitfall — and now asserts the toast
**copy**, which is strictly stronger) · one finding about `/users/me` (it reaches FS12's `PATCH /users/{id}`
branch and is honestly refused with 404, so the negative lock asserts it can never **succeed** rather than
that no route exists) · the `next` corruption struck **4 times** (#24–#27), every one auto-recovered, and at
FS13 the signature was confirmed by **reproducing** it rather than inferred from an exit code.

**One existing-spec update, made STRONGER (I7-legal):** `tests/unit/platform-fixtures.test.ts` asserted
`expect(all.length).toBe(5)` on the audit log. FS13 adds three rows, so the count is factually wrong; it was
replaced with an assertion that all five FS12 rows are still present **and** that each facet is both *sound*
(every row returned matches) and *complete* (no matching row withheld) — neither of which the old count
checked.

**Acceptance (2026-08-05):** nine gates green on delivery; size-limit honestly RED at **765.23 / 756** with
the threshold untouched and the dedicated addendum filed. **Prettier was clean** — nineteen files failed
mid-stage and every one was FS13's own, so there was **no legacy carry-over** (unlike FS12). The owner
accepted the I2 deviation exactly as reported — "do not re-word it, do not reinterpret it, do not attempt to
improve the explanation" — and ruled **size-limit = 777 kB** (`pnpm size` re-run green **765.23 / 777**,
headroom 11.77). **Post-FS13 standing reference numbers:** `/chat` **180 (ZERO headroom)** · `/admin` 179 ·
`/knowledge` 176 · `/audit` **175** · `/jobs` 172 · `/dashboard` 168 · `/studio` 165 · `/providers` **154** ·
`/memory` 150 · `/prompts` 150 · `/analytics` 148 · `/billing` 144 · `/health` 139 · `/settings` **121** ·
`/profile` **121** · seam routes 111 · stubs 107 · shared commons 107.

### 3.19 FS14 — Integration & Polish (delivered, accepted 2026-08-06)

**Plan:** `frontend/STAGE_FS14_PLAN.md` — approved with rulings on **D1 → Option A** (the pipeline journey
wires no publish/schedule mutation; the steps the contract cannot back are named seams), **D6 → Option A**
(the observability seam is vendor-agnostic, no SDK bound), **D7 → Option A** (the font pin uses the binaries
Next itself produced, copied into the repo), and confirmation of **D9** (`/channels`, `/playground`, `/docs`
stay stubs — building any is a separate stage), **D10** (progressive disclosure ships per screen, on
measurement) and **D13** (`global-error.tsx` as a measured gate with an abandon fallback). **T-FS14.1** (the
zero-commons lock, the R1i consumer trace, the protected-route baseline and three pre-declared decision
gates) ran first, exactly as ordered. **Reports:** `FS14_REPORT.md` (§11 = acceptance) +
**`FS14_REPORT_SIZE_ADDENDUM.md`** (§8 = the owner's ruling that no threshold action was needed).

**The contract reality that shaped the stage.** Verified before any feature code: `POST /posts/{id}/validate`
exists but **nothing reads a validation result** (the post resource carries no gate fields), and there is
**no call linking a post to its image** — so D1 §7.2's "validate chips" and "single Review surface: text +
image" cannot be assembled honestly, on top of FS9's finding that no media URL exists at all. Separately, the
observability "seam" FE-ADR-3 assumed already existed **did not**: no sink, no `instrumentation.ts`, no
`global-error.tsx`, no Query error handler anywhere in the shipped source. And the report-only CSP has
**always reported nowhere** — `next.config.ts` sends ten directives with no `report-uri`/`report-to`, so
"prepare the promotion from the report-only data" had no data to read.

Delivered: **the first stage whose subject is the space between screens.** Five **D3 Part C** journeys
proved end to end in `tests/e2e/journeys.spec.ts` (×3 viewports, 32 passed / 1 mobile skip) — **J1 Compose →
Pipeline** (Dashboard → streamed `/chat` turn over the unchanged FS6 relay → 201 draft + 202 generate intent
→ the Jobs queue → 202 approve → Analytics, with the three unbackable steps stated as **named seams**, never
skipped) · **J2 Cite → Source** (a citation opens its document in the Inspector without navigating away;
"the exact chunk" stays a refused simulation per FS7) · **J3 Alert → Triage** (Health → Jobs → a task's own
recorded error → a **202** requeue intent → Audit, with Logs and the runbook step named as absences) · **J4
Explain-this** (a persona's `explain-style` provenance card, with **no influence-trace claim** ever
producible — re-proven by a unit assertion) · **J5 Everything ⌘K** (every navigable route reachable from
the palette, proved **registry-driven** by iterating `ROUTE_LIST` rather than a hand-written list, and
RBAC-filtered). **Three route-local cross-links** close the gaps the journey audit found (Dashboard → Jobs,
Health → Jobs/Audit, Jobs → Dashboard/Chat/Audit), each measured to a zero-commons shape. The
**observability seam** shipped **server-only**: `src/instrumentation.ts` + the first-party `POST
/api/telemetry` route, allowlist-scrubbed to an error name and digest, correlation-id aligned with the
backend's structured logs (§R12.9) — **a client sink was built, measured in two independent placements, cost
`/billing`/`/dashboard`/`/jobs` 1 kB each in both, and was refused by its own pre-declared fallback**.
`app/global-error.tsx` (Stage 2 §11's root boundary) shipped on a +8 B gz measurement that moved no route.
**FE-RV-5 closed**: the two self-hosted font binaries are committed under `public/fonts/`, `fonts.ts` uses
`next/font/local`, the build emits 2 font files instead of 13. The **CSP promotion package** is authored
(every directive justified from source, the nonce-vs-`unsafe-inline` cost written down) and **deliberately
left disabled** — enforcement is **FE-RV-17**, opened at this stage. **Progressive disclosure** (D3 A2)
rolled out to `/jobs` and `/audit` (Advanced/Power reveal a raw record the screen already holds, zero extra
request) and was **refused** on `/analytics`, `/studio` and `/knowledge` (a tier there would reveal nothing
new — the FS13 fabricated-control rule applied a second time). The stage also ran the three D4 §3 checks
this project had never executed — 320px reflow across 15 screens, 200% zoom, `prefers-reduced-motion` — and
found a **real contrast defect** (the avatar menu's role label and the palette placeholder at
`text.tertiary`, 3.6:1 in dark — the **sixth** usage-rule application, token values untouched) that five
prior axe passes had missed because no scan had ever opened those two overlays. **FS14 created no entity
slice and declared no query key, endpoint path or fetcher of its own** — the second stage in a row (after
FS13). +10 unit tests (`tests/unit/csp-and-telemetry.test.ts`, 794 total / 102 files); E2E grew to 400 with
11 journey tests + 3 polish tests. **FE-RV-17** registered.

**Notable FS14 defects (all fixed; FS14_REPORT §5):** a **REAL a11y defect surviving five audits** — the
avatar menu and command palette only exist in the DOM once opened, so no scan had ever reached them, and an
11px `text.tertiary` role label measured 3.6:1 in dark (fixed by token *usage*, not value) · a **REAL
honesty gap** — `StudioHonesty`'s `attach` variant existed in code since FS9 and rendered **nowhere**; it now
renders in `ImageDetail`, where the missing affordance would have been · a **latent FS4-era test race**,
diagnosed by **three control builds** (each excluding one FS14 file with global reach — `global-error.tsx`,
the font pin, `instrumentation.ts`) plus a DOM probe, none of which explained it, until the probe showed the
register→login axe scan ran before the client navigation painted (0 of h1/main/form immediately, all three
1.5s later) — fixed as a strictly stronger wait-for-element assertion, not a weakened one · a missing seam
sentence for the validation-report absence, found by writing the J1 journey · the Windows/pnpm `next`
corruption struck **once** (#28), reproduced directly and auto-recovered.

**Two ESLint-vs-budget trades, both measured before being decided:** converting the Jobs/Health seam anchors
to `next/link` passed ESLint but cost `/jobs` 172→176 and `/health` 139→143; they were kept as plain anchors
with a **per-line suppression whose justification is the measurement itself**. The Dashboard cross-link
reused the router the view already held (`router.push`) instead of importing `next/link` fresh, costing
**zero** where the naive import cost 4 kB.

**Acceptance (2026-08-06):** nine gates green on delivery; the tenth — Prettier — was **RED on exactly one
pre-existing file**, `.size-limit.json` (CRLF terminators, mtime matching the FS13 acceptance's own threshold
edit — after that stage's Prettier gate had already run; FS14 never opened it). The owner ruled **both**
open questions at acceptance: (1) the server-only observability shape stands **exactly as measured**, and
`/api/telemetry` **stays without a client caller** by decision, not by omission; (2) the Prettier RED is a
**legacy carry-over**, ruled the same way as FS12's, and `.size-limit.json` is **not to be modified**.
`pnpm size` measured **766.23 / 777 kB — green**, and — for the first time since FS5 — **no threshold action
was needed or taken**; the size addendum records this as its own ruling (no re-baseline, because none was
required). **Post-FS14 standing reference numbers (unchanged from FS13 — every protected route held):**
`/chat` **180 (ZERO headroom)** · `/admin` 179 · `/knowledge` 176 · `/audit` 175 · `/jobs` 172 ·
`/dashboard` 168 · `/studio` 165 · `/providers` 154 · `/memory` 150 · `/prompts` 150 · `/analytics` 148 ·
`/billing` 144 · `/health` 139 · `/settings` 121 · `/profile` 121 · seam routes 111 · stubs 107 ·
shared commons 107 · `/api/telemetry` 107 (server-only, new route).

### 3.20 FS15 — Production Readiness (delivered, accepted 2026-08-07) — THE TERMINAL STAGE

**Plan:** `frontend/STAGE_FS15_PLAN.md` — approved with rulings **D2 → Option A** (a frontend-local Docker
Compose overlay, `webplatform/docker-compose.console.yml`, with root `docker-compose.yml` and
`docker/Caddyfile` explicitly left untouched — the first time any frontend stage touched deployment
infrastructure at all, and it did so by addition rather than edit), **D3 → Option A** (the secrets-in-bundle
scan is a one-off verification, not wired into `ci.yml` as a permanent gate), **D4 → Option A** (a local
Lighthouse pass is run, but reported explicitly and repeatedly as a workstation measurement, never staging or
production evidence) and **D5 → confirmed** (FS15 is the roadmap's terminal stage; the report may describe
the frontend implementation track as complete while distinguishing that from open Runtime Verification). Five
binding requirements accompanied the GO: no fabricated production verification anywhere (an unreachable
infrastructure item becomes a documented Runbook procedure, never a simulated pass); FE-RV-3/4/17 may only be
closed by real execution on the required infrastructure, never from local assumption; no new frontend
functionality; no change to frozen backend code, contracts, either MASTER_SPEC, ADRs or ONYX tokens; no
commits, tags or pushes. **Reports:** `FS15_REPORT.md` (§11 = acceptance) + `FS15_REPORT_SIZE_ADDENDUM.md`
(§5 = the owner's "no threshold change" ruling) + **`PRODUCTION_READINESS_RUNBOOK.md`** (new document type
for this project — a standing procedure, not a stage narrative).

**The environment reality that shaped the stage, verified before any task began, not assumed:** `docker`,
`gh` and `act` are all **"command not found"** on this workstation. This is not a gap FS15 could code its way
past — it is the same category of fact as the backend's own RV-1…RV-18 ceiling, now stated for the frontend
explicitly and for the first time. So the roadmap's own entry duty for this stage — "FE-RV-3 + FE-RV-4
closed" — **could not be executed for real here**, and the stage was built around that fact rather than
around fabricating past it.

Delivered: **T-FS15.1** the zero-commons guarantee restated for an infra-only stage (FS15 ships **no `src/`
production module**, proven by a byte-for-byte manifest diff before/after, not merely asserted) · **T-FS15.2**
`webplatform/docker-compose.console.yml`, a frontend-local overlay wiring the FS1 Dockerfile into the
deployment topology FE-ADR-11 decided, with the shared-Caddy route deliberately deferred to the Runbook as
one manual step rather than guessed at · **T-FS15.3** a real, source-verified CI gap fixed — `ci.yml`'s E2E
step ran only `--project=desktop-dark`, one of the three shipped Playwright projects, even though every
stage since FS1 has certified all three on a workstation; verified by running the exact equivalent command
locally (400 passed / 0 failed / 17 skipped, unchanged) · **T-FS15.4.1** `scripts/check-no-secrets.mjs`, a
one-off scan whose first real run found a genuine hit — an AWS-access-key-shaped pattern inside **Next.js's
own vendored** `amphtml-validator` WASM blob — investigated (not dismissed), confirmed a false positive, and
fixed by excluding `node_modules` from the walk, documented in the script itself · **T-FS15.4.2**
`tests/unit/gated-fields-audit.test.ts`, one cross-cutting test proving §R10.3's three-part rule (no view
value, no AI-prompt leak, no export leak) across every gated-capable surface this project has ever shipped,
reusing the real production mappers/prompt-builders rather than re-implementing their logic · **T-FS15.4.3**
`scripts/lighthouse-local.mjs`, a reusable local Lighthouse runner — building it surfaced and fixed two real
bugs in the new tool itself (an `execFileSync` event-loop-starvation bug that broke the Playwright CDP
connection; a Windows `cmd.exe` shell-quoting bug in `--extra-headers`, fixed via Lighthouse's own documented
file-path alternative) — final numbers (perf 0.49–0.68, **a11y 1.0 on every route measured**) reported
throughout as a workstation measurement only · **T-FS15.5** `PRODUCTION_READINESS_RUNBOOK.md`, ten numbered
procedures (Docker validation, CI execution, five infra-gated FS1-postmortem-§7 items, CSP enforcement,
staging Lighthouse, and the one session that closes FE-RV-7…16 together), each with its exact command
sequence and single adjustment point, every one verified still present at its stated path · **T-FS15.6** all
ten gates executed for real, budget/size re-verified byte-for-byte, `FS15_REPORT.md` → STOP for acceptance.

**Notable FS15 findings (all in FS15's own new tooling, not in the shipped application — `FS15_REPORT.md`
§4–§5):** the false-positive AWS-key match inside Next's own vendored WASM dependency · the event-loop-
starvation bug in the Lighthouse runner (fixed: `execFileSync` → async `execFile`) · the shell-quoting bug in
the same runner (fixed: inline JSON header → a temp file path). **Zero defects were found in `src/`** —
expected, since FS15 read but never edited it. The Windows/pnpm `next` corruption did **not** strike this
stage (count stays 28).

**Acceptance (2026-08-07):** nine gates green on delivery; the tenth — Prettier — **RED on exactly the same
pre-existing file** every stage since FS12 has reported, `.size-limit.json`, untouched by FS15 for the same
reason it was untouched by FS14. `pnpm size` measured **766.23 / 777 kB — unchanged**, and the owner's
post-acceptance synchronization ruling confirmed **no threshold action was needed or required** —
`FS15_REPORT_SIZE_ADDENDUM.md` §5 records this as its own ruling, mirroring FS14's precedent exactly. **No
FE-RV closed at FS15** — FE-RV-3, FE-RV-4 and FE-RV-17 explicitly required real execution on infrastructure
this environment does not have, and the owner's binding requirements forbade closing them from assumption.
Two `FS1_POSTMORTEM.md` §7 checklist items **did** close for real, becoming executable for the first time
because the surfaces they check did not exist before FS5/FS11: no secrets in the client bundle, and gated-data
honesty (now one cross-cutting test). **Post-FS15 standing reference numbers (identical to post-FS14 — every
protected route held, because FS15 shipped no module that could move any of them):** `/chat` **180 (ZERO
headroom, now TERMINAL)** · `/admin` 179 · `/knowledge` 176 · `/audit` 175 · `/jobs` 172 · `/dashboard` 168 ·
`/studio` 165 · `/providers` 154 · `/memory` 150 · `/prompts` 150 · `/analytics` 148 · `/billing` 144 ·
`/health` 139 · `/settings` 121 · `/profile` 121 · seam routes 111 · stubs 107 · shared commons 107 ·
`/api/telemetry` 107 (server-only). **This is the last entry in this table** — the frontend implementation
track is complete; any future entry describes a new stage the owner has not yet authorized.

---

## 4. All accumulated owner requirements *(request item 15)*

These are extracted from every instruction the owner has given across the project. They are binding.

### 4.1 Process requirements

1. **Staged delivery, one stage at a time.** Plan first → STOP → approval → implement → gate → report → STOP.
2. **Never start a stage without explicit "GO".** Even when the next stage is obvious.
3. **Never start the *next* stage after finishing one.** Always stop and wait.
4. **Prepare only the plan when a stage begins.** No code before the plan is approved.
5. **Do not re-plan or rebuild finished work.** Treat prior stages as settled.
6. **Do not revisit accepted architectural decisions.**
7. **Do not propose architecture changes** unless asked.
8. **Report honestly.** Unverified checks are FE-RV, never "green". *(Explicitly praised twice.)*
9. **Write reports, not summaries**, when a report is asked for; write a **postmortem**, not a report, when a
   postmortem is asked for. The owner distinguished these sharply.
10. **Commit only when instructed. Never push to remote.** (All work is local by design.)
11. **Do not create ADRs automatically** — prepare proposals for the owner's decision.
12. **Confirm understanding before acting** when handed context (the owner's first message asked for explicit
    confirmation of backend state, frontend state, freezes, SoT and next step, then a stop).

### 4.2 Product requirements

13. All **25 screens** with D3 states and the unified status vocabulary.
14. **Universal Inspector**, **Universal Search** (⌘K / search / deep-link / sidebar), **Progressive
    Disclosure** (Beginner/Advanced/Power), **Workspace Consistency** (Nav/Content/Inspector/Actions).
15. Every AI block carries **Trust** (Generated / Verified / Needs-Review + Source-Available/None) and
    **Explainability** (why / data / confidence / limits).
16. **Dark + Light of equal weight**, plus density (comfortable/compact).
17. **Future-proof workspace slots** (Voice, Automation, Agent, Marketplace, Integrations) without reworking
    existing screens.
18. Premium quality bar: perceptual speed (<2s to understand a screen), click economy (≤2 interactions,
    1 via palette), streaming-first, quiet luxury, enterprise trust.

### 4.3 Engineering requirements

19. **All ten engineering gates** must pass before a stage is complete.
20. **TypeScript strict, zero unjustified `any`.**
21. **Accessibility is a gate.** WCAG 2.1 AA+.
22. **Architectural boundaries enforced in CI.**
23. **Offline-first**: do not simulate runtime; separate Implemented / Statically Verified / Runtime
    Verification Pending.
24. **New dependency ⇒ declare + install + import-check**; if incompatible, STOP and report.
25. **Secrets only via env**; never in code, logs, UI or bundle.
26. **Do not change the Python version.**
27. **Frontend never changes `app/`**, public Protocols or `MASTER_SPEC.md`; it consumes existing `/api/v1`.

### 4.4 Requirements introduced during the FS phase

28. **Do not exceed the stage's scope** (repeated at both FS1 and FS2 GO).
29. **Do not violate Design Freeze or Frontend Architecture Freeze.**
30. **Do not modify Sources of Truth.**
31. **Open FE-RV only for genuinely unverifiable items** — not as an escape hatch.
32. When handing off, produce a document that lets another Claude continue **without re-analysing the project**.
33. **Budgets/thresholds are never pre-raised** (FS5 GO ruling): implement → run gates → MEASURE; only if a
    threshold truly blocks, present a growth analysis and propose a new value from measurements and bundle
    structure. Applies to the size-limit detector and generalizes to every budget. *Applied nine times,
    each measure-first: FS5 acceptance → 485 kB (Option A from the per-chunk analysis); FS6 acceptance →
    560 kB after a DEDICATED technical addendum; FS7 acceptance → 598 kB; FS8 acceptance → 628 kB, again
    Option A but only after a DEDICATED addendum **and a full evidence pack**; FS9 acceptance → 655 kB;
    FS10 acceptance → 677 kB; FS11 acceptance → 696 kB; FS12 acceptance → 756 kB; FS13 acceptance →
    **777 kB**, same procedure and the same bar — expect it every time. **At the FS14 acceptance the
    detector needed NO tenth re-baseline**: measured 766.23 kB against the unchanged 777 kB, green with
    10.77 kB headroom — the rule's other half in practice, that a green measurement requires no ruling at
    all, not even a routine one. Every PAST re-baseline used the same reproducible derivation: **measured +
    the headroom granted at the previous ruling, rounded up to the next whole kB.** The 180 kB First Load
    budget has been reaffirmed at each acceptance as the authoritative, non-revisable UX gate; its binding
    reference is **/chat = 180 / 180 kB with ZERO headroom** (FS12, unchanged through FS14), which turns
    "add no commons bytes" from a target into a hard wall.*

### 4.5 Requirements introduced at the FS7 approval (binding for every later plan)

34. **Every plan must state, per new UI module: Server or Client · eager or lazy · whether it touches
    First Load** (the FS7 §3.1 rendering matrix). "Lazy-first" is no longer prose — it is a table.
35. **Every plan must publish the query-key invalidate graph** (writer → invalidated keys, plus the
    explicitly non-invalidating flows) — FS7 §3.2.
36. **Every plan must name, file by file, what the previous stage's surface is guaranteed NOT to touch**,
    and how any shared file it does edit cannot move the protected route's budget — FS7 §3.3. At
    acceptance this is proved, not asserted (mtimes + content grep + First-Load manifest).
37. **Evidence packs on demand.** At the FS7 acceptance the owner asked for raw gate output, per-chunk
    attribution and machine proofs before accepting. Keep the artifacts (`.next/route-budget.json`, size
    logs, build manifests) available until acceptance.

### 4.6 Requirements introduced at the FS8 approval / acceptance (binding for every later plan)

38. **Every plan must carry a state-ownership matrix** (owner · persistence · invalidation source ·
    server/client · cache lifetime · replacement seam) with the hard rule that **no state belongs to
    TanStack Query and Zustand at the same time** — and it must be enforced by source-level tests, not
    review (FS8 §3.4).
39. **Every plan must fix a URL navigation contract**: each screen state expressible as a URL, restorable
    by paste, and **reversible by the browser Back button**; `push` vs `replace` decided per key (FS8 §3.5
    — a real defect was caught by this rule at FS8).
40. **Every plan must state per-chunk bundle ownership**: for each new lazy chunk — the single importer,
    the first-load trigger, whether it could reach commons, and the **mechanical proof** it does not
    (FS8 §3.6).
41. **Regression invariants must be numeric and checkable, not intentions** (FS8 §3.7 I1–I8): the protected
    routes' First Load numbers, byte-identity of protected surfaces, key shapes, "no new FE-RV adjustment
    points", and "previous suites stay green without weakening". Each is proved at acceptance.
42. **Evidence beats narrative.** At FS8 the owner's evidence pack disproved a causal claim the report
    itself made; the wrong explanation was replaced before acceptance. When a measurement contradicts a
    hypothesis, the measurement wins — say so plainly and fix the document.

### 4.7 Requirements introduced at the FS9 approval / acceptance (binding for every later plan)

43. **A budget movement is diagnosed by CONTROL, not by argument.** At FS9 a `/memory` 148 → 149 movement
    was explained only after a control build (with the stage's single byte-level addition to that graph
    removed) reproduced 149 kB. When an invariant is missed, do not narrate a cause — build the control,
    measure it, and report the deviation with its proof.
44. **An invariant that cannot be held is reported, never re-worded.** FS9's I2 was delivered as
    "partially held" with three independent measurements attached, and the owner ruled on it. Never soften
    an invariant to make a stage look clean.
45. **Zero-commons is achieved structurally.** With the FS8 offload lever spent, FS9's answer was
    **entity-local query keys** — the FS7 entity-local `paths.ts` precedent extended one layer up, so
    `shared/config/query-keys.ts` gained zero rows. This is now the default mechanism for any new entity.
46. **Evidence packs are expected before a size ruling** (FS8 + FS9): the full route table, the full size
    output, the eager/lazy split with per-category and per-chunk attribution, a manifest check that every
    new lazy chunk is absent from every First Load, and the no-touch mtime + import scan.

### 4.8 Requirements introduced at the FS10 approval / acceptance (binding for every later plan)

47. **A platform-wide surface must PROVE it is not channel-scoped** (requirement A). The Prompt Library is
    the first screen whose records carry no `channel_id`. That is not a note in a document: a dedicated
    lock test asserts that no query key, path or fetcher can even *accept* a `channelId` (by function
    arity, not merely by call), that the slice contains no channel vocabulary at all, and an E2E journey
    proves a channel switch leaves the rendered surface byte-identical. Any future platform-wide surface
    inherits this standard.
48. **No cross-scope ownership, proved in BOTH directions** (requirement B). A new surface must show that
    the existing channel-scoped screens neither influence it nor depend on it: no FS-N module imports any
    protected slice, **and** no protected slice imports the new one; the RSC page makes no foreign
    round-trip; and every protected route's First Load is byte-compared against the pre-stage baseline.
49. **An ONYX component may gain a MINOR, backward-compatible prop rather than force a fabrication** —
    but only with the owner's advance approval under D4 §13, and only when the alternative is inventing
    data (FS10's PromptCard: `variablesCount?` optional, `active?: boolean | null` where `null` renders no
    badge). Every existing call site keeps rendering byte-identically. This is the first and so far only
    change to an ONYX component's public API.
50. **AI may TEST a governed artifact; it may not AUTHOR one.** D3 §10 asked for "AI drafts/refines
    prompts"; §R11.4 reserves prompt changes to an administrator, so FS10 shipped a contract-native
    dry-run of the human-authored version instead — with **no auto-save of AI output**, no refine and no
    model comparison. When a screen's AI row would produce a stored artifact, the honest analogue is to
    exercise it, not to write it.
51. **Check for "first consumer" before importing a heavy shared module.** A stage that becomes the first
    product consumer of a `shared/ui` heavyweight can tax **every** route through the webpack runtime's
    chunk-id map, with the per-route chunk *set* unchanged — a failure mode invisible to every earlier
    stage's habits. Check whether the module is currently unreferenced, and measure the runtime chunk
    before/after.

### 4.9 Requirements introduced at the FS11 approval / acceptance (binding for every later plan)

52. **A designated PRIMARY PROTECTED ROUTE is byte-compared twice.** At FS11 the owner named `/dashboard` and
    required the comparison **after the first risky artefact landed** (the first chart) and **again before
    acceptance** — not only at the end. The mid-stage check is what caught a real 2 kB regression while it was
    still cheap to fix structurally. Every later stage names its own primary protected route and checks it at
    both moments.
53. **A movement is explained by measurement, never by hypothesis** — restated by the owner as an explicit
    approval condition. FS11 answered it with two control builds: one isolating the stage's single
    shell-commons addition, one reverting the new route to a stub (which returned **every** protected route to
    its exact baseline). A control build that removes the *route* is now part of the toolkit, alongside the
    FS9/FS10 control that removes a single addition.
54. **A slice that another screen already imports must not gain `'use client'` modules in its barrel.** The
    FS3 barrel lesson applies at slice scope: re-exporting the FS11 hooks from the FS5 `entities/analytics`
    barrel put a 5.23 kB chunk into `/dashboard`'s First Load, because a client module reached through a
    barrel is bundled whole. The fix is a separate slice that imports nothing from the original — and the
    consuming screen is byte-compared immediately.
55. **Charts (and any module heavier than an existing surface) stay lazy-first** unless already part of an
    accepted eager shell — and the **first-consumer runtime-map check is executed as a task**, before/after,
    not asserted (FS11 measured 2.58 → 2.70 kB for the visx family's second consumer).
56. **Honest absence extends to freshness and to derivation.** D3 §12 asks for "live counters"; with no stream
    in the contract, FS11 ships SWR plus an explicit fetched-at whisper rather than a poll that would imply a
    freshness nobody promised (the FS7 "no invented progress" rule applied to time). And where a panel has no
    endpoint (system health), **nothing is derived from unrelated endpoints** — a made-up metric is worse
    than a named absence.
57. **A gated field wins over any value the wire carries.** §R10.3 is enforced in the mapper, not the view:
    a metric flagged `gated` yields `null` even when a number sits beside the flag, and that number provably
    reaches neither the UI, nor an AI prompt, nor an export. Fixtures deliberately carry such a field so the
    rule is exercised.

### 4.10 Requirements introduced at the FS12 approval / acceptance (binding for every later plan)

58. **A first-consumer gate must be able to say NO, and the fallback is declared BEFORE the measurement.**
    FS12's plan pre-declared what would happen if `shared/ui/data-table` moved a protected route — and it
    did (+58 B gz in the webpack runtime map, rounding `/memory` up; a control build with the probe removed
    returned a byte-identical runtime chunk). The fallback ran the same hour, with no debate: DataTable is
    unused and the tables are ONYX-primitive lists with the same interaction contract. **Declare the
    fallback in the plan; then the measurement decides, not a discussion.**
59. **A `useMutation` hook called from an EAGER view taxes the whole route.** It drags TanStack Query's
    mutation machinery *and* Next's `dynamic()` client runtime in as a route-only chunk — 8.5 kB at FS12,
    which alone put `/jobs` over budget. Move the hook **into the lazy component that uses it**; a per-row
    hook instance is also more accurate than one shared pending flag.
60. **Static markup belongs in the RSC page, not inside the client view.** Moving an honesty/explanatory
    block out of a `'use client'` widget into the server page removes it from the client bundle entirely.
61. **N lazy `dynamic()` rows of one screen family should be ONE chunk.** Every `dynamic()` anywhere adds an
    entry to the global webpack runtime chunk-id map, which lives in commons. Six separate Inspector rows
    grew it enough to round two protected routes up; consolidating them into a single lazy module cost one
    entry instead of six.
62. **When a whole SCREEN has no endpoint, it is still deliverable — as a verified absence.** FS12's three
    contract-less routes state **fact · reason · what would change it** on every viewport, ship **zero**
    fixture data, and are protected by a **negative-lock test** asserting the fixture resolver answers
    nothing for them. Such a screen is **finished, not pending**, and no FE-RV is opened for it: an FE-RV
    records an unverified assumption, while this is a verified fact about a frozen contract.
63. **A secret is write-only by MECHANISM, not by convention.** The value exists only as a request body; the
    VM has no field able to hold one; nothing persists it; **no mask is rendered either**, because a mask is
    still key material. Proved by a source-level lock test and by an E2E journey that types a key and
    asserts it appears nowhere afterwards.
64. **A UI RBAC mirror that contradicts the frozen matrix is a defect to fix, not a convention to keep.**
    The FS1 seed granted `admin` user and key management; `API_SPEC` gives them to the owner alone. FS12
    corrected the mirror and accepted the consequence: an admin now meets a **permission state inside a
    screen they may otherwise use** — which is the entry duty "403 renders a permission state, never a
    crash" applied one level below the route guard.
65. **A pre-existing gate failure is reported, not silently absorbed and not silently fixed.** FS12's
    Prettier gate went red on an FS11 file with CRLF terminators that FS12 never opened. It stayed untouched
    (it is inside the no-touch set), the mtime and terminator evidence went into the report, and the owner
    ruled it a legacy carry-over — after which the fix was proved formatting-only (identical once CRLF is
    stripped; the byte delta is exactly the CR count).

### 4.11 Requirements introduced at the FS13 approval / acceptance (binding for every later plan)

66. **A plan may not promise where commons will not be touched until it knows where the CONSUMER lives.**
    FS13's plan asserted `⌘,` would be "the stage's ONLY commons edit". That was wrong for a structural
    reason no amount of care would have avoided: a preference consulted inside one of the frozen seven
    providers cannot have its read side in a feature, because **FSD forbids a provider importing a feature**.
    Before making a zero-commons claim, trace the *consumer* of every new piece of state to its layer.
67. **When a necessary deviation appears mid-stage, STOP and report it with measurements — do not choose.**
    The owner's GO carried the rule explicitly ("stop immediately if a structural deviation becomes
    necessary"), and FS13 stopped with four builds already run, a control build isolating the cause, and
    three options costed. The ruling came back in one message. **Measuring before stopping is what made the
    stop useful**; deciding unilaterally would have spent the owner's authority.
68. **An accepted deviation is frozen wording.** The owner accepted `/audit` 174→175 and `/providers`
    153→154 "exactly as reported" and forbade re-wording, reinterpreting or "improving" the explanation at
    acceptance or in any later document. Rule 44 (report, never re-word) now has a second half: **once
    ruled, a deviation's text is fixed** — later stages cite it, they do not restate it.
69. **A control build must be paired with a SHAPE variant when the question is "could this be cheaper?"**
    FS13 ran control C (the addition removed) *and* build D (the same logic inlined without a new module).
    C established the cause; **D established that the cost was inherent rather than a packaging artefact**,
    which is what turned "we should try harder" into a ruling. When a cost looks avoidable, measure the
    alternative shape before proposing to pay it.
70. **A control that would change nothing must not ship.** Experience Level had lived in the Stage 2 §7
    store since FS1 with **no screen reading it**. Shipping the control alone would have been a fabricated
    capability — the §R10.3 honesty rule applied to *controls* rather than to data. FS13 shipped it only
    after making it genuinely consumed, and the copy names **which screens respond today** rather than
    promising all of them.
71. **A browser-local preference is never presented as an account setting.** The frozen contract has no
    preferences resource, so every panel that renders one states where it actually lives, and the RSC page
    carries a standing statement. A setting that silently fails to follow the user to another device is the
    same class of lie as a fabricated metric.
72. **When "off" is indistinguishable from "unreported", render NEITHER.** `mfa_enabled` arrives as an
    optional wire field that `mapAuthMe` defaults to `false`. The console therefore shows **no MFA state at
    all** and says why, rather than displaying "disabled" — which would be a claim the data cannot support.
    This is the FS12 "unknown stays grey, never green" rule applied to a boolean.
73. **A personal view of a platform-wide resource is scoped BY TYPE, not by care.** `GET /audit-log?actor=`
    drops a falsy actor from the query string, so a blank id would widen a personal feed into the whole
    platform's record. The hook takes a non-nullable `string`, the component boundary renders the absence,
    and a source-level test asserts the arrangement. **A missing scope is an absence, never "no filter".**
74. **Additive-by-id is not sufficient when ORDER is an input.** FS13's new fixture rows were dated newer
    than FS12's and silently changed which record `/audit` shows first, breaking an FS12 journey on three
    viewports. The no-touch guarantee must consider **rendered order**, not just row identity; the fix
    belongs in the fixture, never in the older stage's spec.
75. **Source-level lock tests must read CODE, not prose.** Every file in this project documents the rule it
    follows, so a naive `toContain` grep matches the explanation instead of the implementation — three FS13
    locks passed for the wrong reason until a comment-stripping helper was added. A lock that can be
    satisfied by a comment is not a lock.

### 4.12 Requirements introduced at the FS14 approval / acceptance (binding for every later plan)

76. **A first-consumer measurement can refuse the SAME candidate in two different shapes and still owe a
    third option.** The observability sink was measured as a boundary-level import and, separately, as a
    single root-only import; both cost the same three routes 1 kB each. Two shapes failing does not mean
    "try a third shape harder" — it means the module itself is the cost, and the pre-declared fallback
    (server-only) exists precisely so the search stops there rather than continuing indefinitely.
77. **A test failure gets the same control-build discipline as a bundle movement.** FS14 diagnosed a failing
    axe assertion with **three control builds**, each excluding one stage file with global reach, before a
    DOM probe (not a guess) found the real cause: a client-navigation race that predated the stage entirely.
    "Measure before explaining" is not a budget-only rule — it applies to any failure a stage's own changes
    are suspected of causing.
78. **An owner ruling on a measured trade-off is a standing decision, not a placeholder.** The owner did not
    rule "close FE-RV-17 eventually" — the owner ruled "no client caller is to be added" to
    `/api/telemetry`. A later stage inherits that as a decision already made, to be revisited only by an
    explicit new ruling, exactly as FS13's I2 wording is frozen (rule 68) and FS12's Prettier carry-over is
    frozen.
79. **A gate-passing "improvement" can still be the wrong call if it costs the budget.** ESLint's
    `no-html-link-for-pages` correctly flagged two seam anchors; converting them to `next/link` passed lint
    and failed budget (`/jobs` and `/health` both +4 kB). The fix was a per-line suppression **whose
    justification is the measurement itself** — not a stylistic exception, a costed one, following the
    project's existing per-line-with-written-reason suppression policy.
80. **The cheapest shape for a route-local action is often the router the component already holds.**
    Importing `next/link` afresh for a single cross-link cost `/dashboard` 4 kB; calling the `useRouter()`
    the component already imported cost zero. Before adding a navigation primitive, check what the component
    already has.
81. **A seam authored once can still go unrendered — the audit that finds a journey's gaps also finds dead
    honesty surfaces.** `StudioHonesty`'s `attach` variant existed since FS9 and was mounted nowhere. Writing
    the cross-screen journey is what surfaced it, because a journey exercises composition, not just a
    single screen's own tests.
82. **An axe scan only covers what is IN THE DOM at scan time — an overlay that mounts on interaction can
    hide a defect through every prior gate.** The avatar menu and command palette exist only once opened;
    five stages' worth of axe runs never opened them, and an 11px `text.tertiary` label sat at 3.6:1 in dark
    the whole time. A scan that never triggers an overlay is not evidence the overlay is accessible.
83. **A green budget measurement needs no ruling, and saying so plainly is itself the honest report.** FS14
    is the first stage since FS5 where `pnpm size` passed with room to spare; the report states that no
    threshold action was taken or needed, rather than manufacturing a re-baseline ritual the rule never
    required in the first place.

### 4.13 Requirements introduced at the FS15 approval / acceptance (the terminal stage — binding for any
future frontend work, since none of it is a "later plan" in the FS1–FS15 sequence)

84. **An environment's missing infrastructure is verified, never assumed, before a stage is scoped around
    it.** FS15 ran `docker --version`, `gh --version` and `act --version` before drafting a single task and
    got "command not found" for all three — a fact, not a guess — and every task in the plan was designed
    around that verified ceiling rather than discovered mid-stage.
85. **A stage that cannot execute real infrastructure verification converts each blocked item into a
    procedure, never a simulated pass.** `PRODUCTION_READINESS_RUNBOOK.md` is the mechanism: ten numbered
    items, each with the exact command sequence and single adjustment point, so closing FE-RV-3/4/6/7…17 the
    day infrastructure exists is execution, not investigation — but it is **not** the same as closing them
    now, and no later document may blur that distinction.
86. **A checklist item can wait years to become executable, and the stage that finally can run it should.**
    Two `FS1_POSTMORTEM.md` §7 items (no secrets in the bundle, gated-data honesty) were written down at FS1
    but needed surfaces that did not exist until FS5/FS11 shipped. FS15 is not "catching up" on old debt —
    it is the first stage for which those two checks were even possible.
87. **A new tool's own bugs get the same investigate-before-fixing discipline as a bug in the shipped
    product.** FS15's secrets scanner found an AWS-key-shaped false positive inside a vendored third-party
    WASM blob; rather than weaken the pattern to make the gate green, the match was traced to its exact
    binary context, confirmed as noise, and the scan was narrowed by a documented, justified exclusion. The
    same discipline applies to a brand-new script exactly as it applies to `src/`.
88. **A local measurement is not the measurement a target was written for, and saying so once is not
    enough.** FS15's Lighthouse pass is real signal (a11y 1.0 across every route measured) but is not §F8.1's
    staging-on-a-mid-tier-device number; every place that number appears — the report, the addendum, this
    handoff — repeats the caveat rather than stating it once and letting later readers forget the context.
89. **A stage that ships zero application code still proves that claim, it does not assume it.** FS15's
    "zero `src/` modules" guarantee was proved by a byte-for-byte diff of `route-budget.json` before and
    after, not inferred from the file list alone — the same standard every narrower no-touch guarantee since
    FS7 has been held to, applied here at its widest possible scope.

---

## 5. Roadmap forward

### 5.1 Frontend implementation stages

| Stage | Scope | Status |
|---|---|---|
| FS1 | Infrastructure | ✅ delivered |
| FS2 | Routing & Navigation | ✅ delivered |
| FS3 | ONYX Component Library (24 components of D2 §13 + the AI set of §14) | ✅ delivered (accepted 2026-07-29) |
| FS4 | Auth & RBAC (real cookie session; mock seam deleted under a triple kill-switch) | ✅ delivered (accepted 2026-07-30) |
| **FS5** | **Dashboard** — the first functional screen | ✅ delivered (**accepted 2026-08-01**) |
| **FS6** | **AI Chat** — the working AI surface | ✅ delivered (**accepted 2026-08-01**; size-limit re-baselined to 560 kB after the dedicated addendum) |
| **FS7** | **Knowledge** — the channel-isolated workspace | ✅ delivered (**accepted 2026-08-01**; size-limit re-baselined to **598 kB** after the dedicated addendum; `/chat` reference set to 179 kB) |
| **FS8** | **Memory** — the channel's voice, cast and published history | ✅ delivered (**accepted 2026-08-02**; size-limit re-baselined to **628 kB** after the dedicated addendum + a full evidence pack; `/chat` = 179 kB re-confirmed) |
| **FS9** | **Image Studio** — the image-record workspace | ✅ delivered (**accepted 2026-08-02**; size-limit re-baselined to **655 kB** after the dedicated addendum + a full evidence pack; the I2 rounding deviation ruled resolved; post-FS9 references `/chat` **178**, `/studio` 164, `/memory` 149, stubs 107) |
| **FS10** | **Prompt Library** — the versioned prompt surface, and the first platform-wide screen | ✅ delivered (**accepted 2026-08-03**; size-limit re-baselined to **677 kB** after the dedicated addendum + a full evidence pack; the I1 rounding deviation ruled resolved; post-FS10 references `/chat` **179**, `/prompts` 150) |
| **FS11** | **Analytics** — the cost/quality/trend surface | ✅ delivered (**accepted 2026-08-03**; size-limit re-baselined to **696 kB** after the dedicated addendum + a full evidence pack; the I2 re-partition deviation ruled resolved; post-FS11 references `/chat` 179 · `/knowledge` 176 · `/dashboard` 168 · `/studio` 165 · `/analytics` **148**) |
| **FS12** | **Platform & Admin** — the governance surface (9 routes) | ✅ delivered (**accepted 2026-08-04**; size-limit re-baselined to **756 kB** after the dedicated addendum; the Prettier legacy carry-over ruled; I1/I2 reported MISSED by 1 kB with two control builds; post-FS12 references `/chat` **180 (ZERO headroom)** · `/admin` 179 · `/audit` 174 · `/jobs` 172 · `/providers` 153 · `/billing` 144 · `/health` 139 · seams 111) |
| **FS13** | **Settings / Profile / Notification preferences** — the account surface | ✅ delivered (**accepted 2026-08-05**; size-limit re-baselined to **777 kB** after the dedicated addendum; the I2 deviation on `/audit` 174→175 and `/providers` 153→154 accepted **exactly as measured** with four builds and control C; post-FS13 references `/chat` **180 (ZERO headroom)** · `/audit` **175** · `/providers` **154** · `/settings` **121** · `/profile` **121**) |
| **FS14** | **Integration & Polish** — the D3 Part C cross-screen journeys | ✅ delivered (**accepted 2026-08-06**; size-limit **UNCHANGED at 777 kB** — measured 766.23, green, no re-baseline needed for the first time since FS5; every invariant HELD via pre-declared fallbacks, not deviations; the observability client sink measured and refused, then frozen server-only by owner ruling; FE-RV-5 closed; FE-RV-17 opened; the Prettier `.size-limit.json` RED accepted as a legacy carry-over per the FS12 precedent; post-FS14 references identical to post-FS13 — every protected route held) |
| **FS15** | **Production Readiness** — the terminal stage | ✅ delivered (**accepted 2026-08-07**; size-limit **UNCHANGED at 777 kB** — re-confirmed 766.23, zero `src/` modules shipped so zero movement was possible, proved rather than assumed; a frontend-local Docker Compose overlay + a real CI E2E-matrix fix + a one-off secrets scan + a cross-cutting gated-data audit test + a workstation-only Lighthouse pass; FE-RV-3/4/17 explicitly NOT closed — no Docker/CI/live backend exists in this environment — each given an exact procedure in `PRODUCTION_READINESS_RUNBOOK.md` instead; post-FS15 references identical to post-FS14 — every protected route held unconditionally) |
| — | **No FS16 exists on this roadmap.** The frontend implementation track is complete at FS15; any further stage is a new decision the owner has not yet made | — |

### 5.2 Backend forward work

Not stage work — operational:
- **RV-1…RV-18** — Production Readiness Review on live infrastructure (`RUNTIME_VERIFICATION_REGISTRY.md`).
- **2 open backend ADRs** with active defaults: **ADR-001** MTProto stats adapter (default: *not introduced*)
  and **ADR-002** deployment environment (default: *VM + Compose + Caddy*).
- Optional analytics computation §R11.4–R11.8 (bandit, experiments, report, forecast) — deferred by design.

### 5.3 Gating condition before FS3 — ✅ satisfied (2026-07-29)

Stage 2 §15 required the three open frontend ADRs decided before FS3. The owner decided them on 2026-07-29
(recorded in `webplatform/frontend/FE_ADR_DECISIONS.md`): **visx** (heavy graphics only via `dynamic()`) ·
**keep Tailwind v4 + CSS Modules, no CSS-in-JS** · **observability deferred to FS14/FS15, seams only**.
The observability half of that decision **came due and was executed at FS14** (Option A: a vendor-agnostic
seam, server-side only, no SDK bound — `FE_ADR_DECISIONS.md` itself was not reopened or edited, since
executing a deferred option is not the same act as deciding one).

---

*Continue with `PROJECT_HANDOFF_PART2.md` (architecture, decisions, freezes, invariants).*
