# PROJECT_HANDOFF — PART 2 · Architecture, Decisions, Freezes, Invariants

*Read after PART1. Covers request items **3** (full architecture), **5** (all technical decisions and why),
**13** (decisions that must never be broken), plus freezes, invariants and the ADR registers.*

---

## 1. Backend architecture

### 1.1 Shape

A **modular monolith**, not microservices. Roles are *image commands* of one image, not separate services.

**Strict downward layering — enforced by an AST guard:**

```
api  →  services  →  (domain, repositories)  →  models / db
```

Lower layers never import higher ones. `app/` never imports `tests/` (guarded invariant).

### 1.2 Subsystems (`app/`, 27 packages, 256 modules)

| Package | Responsibility |
|---|---|
| `core/config` | Pydantic Settings — env-first, secrets-in-env, fail-fast; `python -m app doctor` |
| `core/errors` | unified error taxonomy |
| `core/redis/*` | RedisManager, KeyBuilder, TTL, Cache, Idempotency, RateLimiter (Lua), Lock, PubSub |
| `core/providers/*` | Provider base, registry, factory, errors, health + per-kind Protocols + deterministic fakes |
| `db/*`, `models/*`, `repositories/*` | async SQLAlchemy, **25 tables**, 8 enums, pgvector (1536 text / 512 CLIP-face), HNSW, partial-unique, GIN, FTS; Alembic; repositories |
| `workers/*` | own async queue engine: registry, dispatcher, executor, worker, retry, backoff, DLQ, hooks |
| `scheduler/*` | timing, DST, missed slots, holidays, advisory locks, scanner, materializer, runner |
| `api/*`, `middleware/*`, `schemas/*` | FastAPI factory, lifespan, DI, unified errors, pagination, health live/ready |
| `llm/*` | LLM provider abstraction |
| `content/*` | AI Engine — orchestrator, pipeline, selection, rewrite, fallback |
| `images/*` | Image Engine — aspect, size, safety, post-process (thumbnail, phash), regeneration |
| `telegram/*` | library-agnostic Telegram engine (**no aiogram**): mapping, router, registry, handlers, dispatcher, publishing; webhook + polling |
| `rag/*` | storage-agnostic RAG kernel + Knowledge |
| `memory/*` | per-channel Memory, independent of RAG |
| `validators/*` | **stdlib-only** rules, gates, decision + `OutputValidator` adapter |
| `analytics/*` | **stdlib-only** event, metrics, audit, tracing, export seams, retention |
| `admin/*` | **no FastAPI**: authn ⟂ authz ⟂ RBAC, sessions, CSRF, management, dashboards, AI-Studio; Web UI/SSO seams |
| `services/*` | application services consumed by the API |
| `notifications/`, `utils/` | present but empty (reserved) |

### 1.3 Key backend decisions and why *(subset of the 44-decision ledger in `MASTER_SPEC.md` Appendix A)*

| Decision | Why |
|---|---|
| Modular monolith; roles = image commands | one deployable, no distributed-systems tax for a single-operator product |
| Strict downward layering + AST guard | the discipline that held the Architecture Freeze for 20 stages |
| Provider abstraction + deterministic fakes (§R2.10) | the whole system is testable offline; real SDKs are deferred, not required |
| Ports + Protocols per subsystem | subsystems stay independent; adapters swap without touching business logic |
| **Protocols, not ABCs** | structural typing; no inheritance coupling |
| UUIDv7 via `uuid6` | time-ordered ids, index-friendly |
| Soft-delete + partial-unique + optimistic lock | safe deletion and concurrency without losing history |
| **Persona (voice) ≠ Actor (visual)** | a channel's writing identity is separate from its visual identity |
| Continuation-chaining pipeline (not a DAG) + LEAD_TIME | simpler to reason about; a failed gate stops the chain and routes to Needs Review |
| At-least-once publish → `needs_review`; dedup before send | never silently lose or duplicate a post |
| Per-bot rate-limit key | Telegram limits are per bot, not per channel |
| Scheduler: idempotent slot + advisory lock | safe against double-run and missed slots/DST |
| RAG channel isolation = **hard filter** (`WHERE channel_id`) | a channel can never leak another's knowledge (except Global Memory) |
| 5-role backend RBAC + `audit_log` + `config_versions` | governance is first-class, not bolted on |
| Analytics shows only available data; engagement **gated** | §R10.3 — never fabricate metrics |
| Self-learning = bandit (deferred) | designed, intentionally not built yet |
| Secrets via secret manager + least privilege | secrets never live in code, logs or UI |
| Python `>=3.13` (dev 3.14, prod 3.13-slim) | modern typing; prod pinned to the stable slim image |
| Validation & Analytics **stdlib-only**; Admin **no FastAPI**; Telegram **no aiogram**; Image provider-agnostic | keep subsystems free of framework lock-in so they remain swappable and testable |
| Test infrastructure lives **outside `app/`** (Stage 19) | production code never depends on test code |

---

## 2. Frontend architecture

### 2.1 Immutable principles (Stage 2 §1 — changing any requires an ADR)

1. **RSC by default;** client components are opt-in islands where interaction/state demands.
2. **FSD layer direction is one-way:** `app → widgets → features → entities → shared`. Lower never imports
   higher. `shared` imports nothing internal.
3. **Semantic ONYX tokens only** in components; no hard-coded colours; both themes via token maps.
4. **Six state kinds, six owners, never blurred.**
5. **Client-of-core:** no backend business logic re-implemented; RBAC reflected, enforced server-side.
6. **Accessibility and type-safety are gates, not goals.**
7. **Streaming-first;** no blocking spinners on AI surfaces.

### 2.2 Feature-Sliced Design layers

| Layer | Contains | May import |
|---|---|---|
| `app/` | Next App Router only: routing, layouts, route groups, loading/error, route handlers, providers | everything below |
| `widgets/` | screen-level composition (AppShell, Sidebar, Topbar, Inspector, CommandPalette, MobileNav, …) | features, entities, shared |
| `features/` | one user action + its data/state | entities, shared (**never a sibling feature**) |
| `entities/` | a domain object + hooks/mappers/UI | shared (**never a sibling entity**) |
| `shared/` | ui, lib, config, types, hooks, providers | nothing internal |

Each slice exposes a single `index.ts` public API; deep imports are forbidden. Enforced by
`dependency-cruiser.config.cjs` — currently **0 violations across 609 modules / 1578 dependencies**
(unchanged since the FS14 acceptance; re-confirmed byte-identical at the FS15 acceptance, since FS15 shipped
no `src/` module — the frontend implementation track's terminal count).

### 2.3 The six state owners (Stage 2 §7 / D4 §7)

| Kind | Owner | Rule |
|---|---|---|
| **UI state** | component `useState`/`useReducer` | ephemeral, never global, not persisted |
| **Server state** | **TanStack Query** | source of truth from the API; SWR; invalidated on writes; keys include channel scope |
| **Session state** | server cookie + read-only client store hydrated from RSC | never holds tokens; drives RBAC-aware rendering |
| **Draft state** | `useDraft` (localStorage/IndexedDB) | composer/prompt/settings drafts; unsaved-changes guard |
| **Streaming state** | transient Zustand store | append-only, cancelable, reconciled into Query on `done` |
| **URL state** | **nuqs** / `searchParams` | filters, tabs, inspector target, ranges — shareable and restorable |

**Global UI store (Zustand):** theme, density, experience level, active channel, palette state, sidebar state,
toasts. Theme/density/sidebar/active-channel persist to **cookie** so SSR applies them with no FOUC.

**The no-double-ownership rule (formalized at FS8, plan §3.4):** *no state is owned by TanStack Query and
Zustand at the same time.* Server data lives in Query only; streamed tokens live in the transient assistant
store only; shareable UI state lives in the URL (nuqs); ephemeral state dies with its component. Since FS8
this is enforced by **source-level tests**, not review: an AI feature must contain no `queryClient` write,
no FS8-era slice may call `useUiStore.setState`, the transient key namespace (`persona:<id>`) provably
cannot collide with a Query key, and derived projections (e.g. `StyleFeatureList`) must be stateless.

### 2.4 The seven-provider tree — order is frozen (Stage 3 §7)

```
NuqsAdapter                      ← technical adapter (FS2), not an eighth provider
  └ ThemeProvider                1. cookie theme/density, no FOUC — outermost so tokens exist first
      └ QueryProvider            2. TanStack QueryClient; devtools are a dev-only dynamic import
          └ AuthProvider         3. read-only session (user, role); exposes useSession, can()
              └ AccessibilityProvider  4. live-region announcer + reduced-motion context
                  └ ShortcutProvider   5. global keyboard map + palette/switcher/cheatsheet state
                      └ NotificationProvider  6. Radix Toaster; needs the announcer
                          └ StreamingProvider 7. stream registry, Stop-all, correlation-id source
```

**Why this order:** tokens must exist before anything renders; auth needs Query; shortcuts need auth for
RBAC-filtered actions; notifications need the announcer; streaming is innermost because it is the most
transient. **Do not reorder.**

### 2.5 Data layer

- **`apiFetch<T>()`** — base `/api/v1`, `credentials: 'include'` (cookie session), JSON, `AbortSignal`,
  `X-Request-Id` correlation header, errors normalized to `AppError`.
- **`AppError`** kinds: `validation | permission | notFound | conflict | rateLimit | network | server |
  gated | unknown`. `gated` is deliberately distinct from a failure (§R10.3). Each kind maps to a recovery
  affordance (D4 §8).
- **Retry policy:** exponential backoff, **skip on 4xx** (except 408/429), honour `Retry-After`.
- **Streaming:** `openStream()` — SSE **over `fetch` + ReadableStream**, not `EventSource`, because it sends
  the auth cookie and is cancelable. Polling fallback where the backend has no SSE endpoint — **exercised
  for real since FS7**: document ingestion has no SSE in the contract, so the entity hook polls
  (`refetchInterval` while a document is queued/running, stops at ready/failed) and the UI never fakes a
  progress stream. WS is a future adapter behind the same hooks.
- **Transport boot gate (FS7):** `apiFetch` awaits `transportGate()` — a resolved no-op in production; in
  the fixture env `FixtureBoot` arms it synchronously during render with the MSW-worker start promise, so
  the first client fetch after a hard navigation cannot race the interceptor (see PART4 §3.4).
- **BFF route handlers** (`app/api/*`) exist only for the SSE relay, cookie handling and hiding internal URLs —
  **never** to re-implement backend logic.

### 2.6 Rendering strategy per screen group (Stage 2 §5)

| Group | Strategy |
|---|---|
| Landing | static/ISR, minimal client |
| Login / Register | server shell + small client form |
| Dashboard / Analytics / Billing | RSC initial data + client islands for streaming counters and charts |
| AI Chat / Playground / Image Studio | server shell + client-heavy (streaming, stateful composer) |
| Knowledge / Memory / Prompts | RSC lists + reader; client for editor/retrieval-preview |
| Admin / Providers / Jobs / Logs / Audit / Flags / Notifications | RSC lists + client interactions; Logs/Jobs stream |
| Settings / Profile | RSC + client forms; theme/density applied SSR (**built at FS13; the SSR path in `app/layout.tsx` + `shared/config/theme.ts` was deliberately NOT touched, and the no-FOUC duty is proved in E2E against the initial HTML document**) |
| Documentation | static/ISR + client search |

Charts, markdown, editor and image-studio modules are **`dynamic()` client imports** — this is now
budget-critical (see §5.3).

### 2.7 Security model (Stage 2 §8)

| Id | Rule |
|---|---|
| SEC-1 | Session = HttpOnly + Secure + SameSite cookie set by the backend; **never** in localStorage/JS |
| SEC-2 | Next middleware guards protected route groups; server layouts re-check; client RBAC only *hides* |
| SEC-3 | CSRF aligned with the backend strategy; same-site cookies as defense-in-depth |
| SEC-4 | XSS: Markdown sanitized via `rehype-sanitize`; no raw `dangerouslySetInnerHTML` |
| SEC-5 | Strict CSP, `frame-ancestors 'none'`, **report-only first** |
| SEC-6 | Secrets are **write-only** in the UI — submitted, never fetched or rendered |
| SEC-7 | `can(role, permission)` mirrors the backend matrix for UI gating; 403 → permission state, never a crash |

### 2.8 The ten engineering gates (Stage 2 §14 / §F6) — a change cannot merge unless **all** pass

1. **ESLint** (typescript-eslint strict + jsx-a11y + import/boundaries) — clean.
2. **Prettier** — formatted.
3. **`tsc --noEmit`** strict — 0 errors, **0 unjustified `any`**.
4. **Tests** — unit/component/integration green; E2E green on the critical set.
5. **Accessibility** — axe automated pass + jsx-a11y clean; manual checklist per touched screen.
6. **Bundle-size budget** — `size-limit` within budget.
7. **Performance budget** — within Stage 2 §9 targets on key routes.
8. **Boundaries** — dependency-cruiser shows no layer/import violations.
9. **Visual regression** — Chromatic diff reviewed against the Preview baseline.
10. **Contract** — API types/Zod schemas match `API_SPEC.md`.

### 2.9 Performance targets and budgets

- FCP < 1.2s · LCP < 2.0s · TTI < 2.5s · CLS < 0.05 · INP < 200ms (staging, mid-tier device).
- **Initial route JS ≤ ~180 KB gzipped per route group.** *(Historical note: 168 KB at FS2; since FS3 the
  number is MACHINE-CHECKED by `pnpm budget` — worst route 140 KB at FS4, 158 KB (/dashboard) at FS5,
  178 KB (/chat) at FS6, 179 KB (/chat) at FS7 and FS8, 178 KB at FS9, 179 KB at FS10 and FS11. **At FS12
  acceptance: worst /chat 180 KB — ZERO headroom, the hardest constraint in the project; the nine platform
  routes entered at /admin 179, /audit 174, /jobs 172, /providers 153, /billing 144, /health 139 and the
  three seam routes 111; /knowledge 176, /dashboard 168, /studio 165, /memory 150, /prompts 150,
  /analytics 148, stub routes 107, shared commons 107.**)* The budget itself is non-revisable.
  See PART4 §4 R1.
- **Commons bytes are the scarcest resource, and rounding is not causation.** FS8 proved both halves: the
  T-FS8.1 registry split really did move `/chat` 179 → 178 and `/knowledge` 176 → 175, yet `/chat` returned
  to 179 **without a single FS8 byte on the route** — webpack re-partitioned the shared graph and Next's
  rounding followed, while the true chunk union *fell* 175.10 → 174.74 kB. **FS9 closed the loop with a
  CONTROL BUILD:** `/memory` moved 148 → 149 (and the stubs 106 → 107) while the memory page chunk itself
  *shrank* 11.8 → 8.43 kB; a build with FS9's single byte-level addition to that graph removed still
  reported 149 kB, and 0 FS9 markers exist in any of the 23 `/memory` First Load chunks. **FS10 repeated it
  once more** (`/chat` 178 → 179 with zero FS10 markers in the route's 16 First Load chunks and a control
  build still reporting 179). **FS11 produced the strongest proof yet:** `/dashboard` 167 → 168,
  `/knowledge` 175 → 176, `/studio` 164 → 165 and commons 106 → 107 — with zero FS11 markers across all 59
  First Load chunks of those routes and every pre-existing chunk byte-identical — and a control build that
  reverted the new route to a stub (leaving all other FS11 code in place) returned **every** protected route
  to its exact baseline. Diagnose budget movements from `app-build-manifest.json` and, when an invariant is
  at stake, prove the cause with a control build — never from a plausible story.
- **A route's First Load can grow with its chunk SET unchanged (FS10).** The first FS10 build put `/chat` at
  182 kB and every other route +3–4 kB while each route's chunk list was name-for-name identical: the growth
  lived in the **webpack runtime's chunk-id map**, which had roughly doubled because the stage became the
  **first product consumer** of `shared/ui`'s CodeBlock and thereby made Shiki's per-grammar chunk graph
  reachable from the app entry. The lesson is now a rule: before consuming a heavy `shared/ui` module for
  the first time, check whether it is currently unreferenced and measure the runtime chunk before/after.

---

## 3. All accepted frontend ADRs (FE-ADR-1…11) — changing any requires a written ADR

| ADR | Decision | Why |
|---|---|---|
| **FE-ADR-1** | Next.js App Router as framework/rendering model | RSC, streaming SSR, file routing, layouts, route handlers; owner-specified |
| **FE-ADR-2** | RSC-by-default rendering | minimises client JS; premium performance |
| **FE-ADR-3** | Feature-Sliced Design + one-way boundaries | mirrors the backend discipline that held its freeze |
| **FE-ADR-4** | TanStack Query as the server-state authority | caching, retry, dedup, cancellation, SWR, optimistic + rollback |
| **FE-ADR-5** | State-ownership split (six kinds; Zustand global UI; nuqs URL) | prevents a god-store; makes views shareable |
| **FE-ADR-6** | Styling = ONYX tokens (CSS vars) + Tailwind v4 + CSS Modules | token discipline + utility velocity + an escape hatch |
| **FE-ADR-7** | Radix UI (+ cmdk) as the accessibility primitive layer | WCAG-correct focus/ARIA without re-inventing it |
| **FE-ADR-8** | Cookie-session auth, middleware-guarded routes, no client-stored tokens | §F7.1; the client never holds a token |
| **FE-ADR-9** | Streaming = SSE-over-fetch, polling fallback, WS as a future adapter | sends the auth cookie; cancelable; integrates with Query |
| **FE-ADR-10** | Testing stack (Vitest/RTL/Playwright/Storybook/MSW) + the ten gates | full pyramid incl. a11y and visual regression |
| **FE-ADR-11** | Deployment as a separate Next service behind the shared reverse proxy | frontend scales and deploys independently of the backend |

## 4. Open ADRs

### 4.1 Frontend — ✅ decided by the owner 2026-07-29 (`webplatform/frontend/FE_ADR_DECISIONS.md`)

| ADR | Owner's decision |
|---|---|
| ADR-FE-1 Chart library | **visx**; heavy graphics modules only via `dynamic()`; no alternatives without a new ADR |
| ADR-FE-2 Styling depth | **keep Tailwind v4 + CSS Modules**; CSS-in-JS is not to be used |
| ADR-FE-3 Observability vendor | **deferred to FS14/FS15**; early stages keep only the architectural seams |

The Stage 2 §15 gating condition for FS3 is satisfied; changing any of these requires a new ADR.

**Status update, not a decision change:** ADR-FE-3's deferred option was **executed at FS14** (Option A: a
vendor-agnostic seam, server-side only, no SDK bound — `FE_ADR_DECISIONS.md` itself was not reopened, since
executing a deferred option is not the same act as deciding one). **FS15 explicitly did not touch this** —
production readiness was scoped to exclude new frontend functionality. **The vendor binding remains
undecided**, open to whichever future work (a live-infra stage, a new explicit ADR) the owner authorizes.

### 4.2 Backend — open with active defaults

| ADR | Default in force |
|---|---|
| **ADR-001** MTProto stats adapter (§R12.14) | *not introduced* |
| **ADR-002** deployment environment | *VM + Compose + Caddy* |

---

## 5. Decisions taken during implementation (FS1 + FS2) — all PATCH-level

None of these changed architecture, token values or any contract.

### 5.1 FS1 decisions

1. **Tailwind v4 is CSS-first** — the `@theme` map lives in `styles/tokens.css`, not a JS config. This is
   Tailwind v4's mechanism, not a styling-model change; FE-ADR-6 is honoured.
2. **Tailwind toolchain pinned to 4.3.3** (`tailwindcss` + `@tailwindcss/postcss`) after a native/JS version
   skew broke the build. **Lesson: pin toolchain families together; never float a package with a native binary.**
3. **React Query Devtools = dev-only dynamic import** — Stage 2 §11 forbids devtools in production bundles.
4. **CSP is `Content-Security-Policy-Report-Only` first** (SEC-5), with enforced `X-Frame-Options`,
   `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
5. **`base.css` wrapped in `@layer base`** so Tailwind utilities correctly override element defaults.
6. **`text-tertiary` → `text-secondary` on small UI text** — a *usage* fix for WCAG AA; token values untouched.
7. **Mock session seam** (`/api/auth/mock-login`, HttpOnly cookie, no secret) so the shell is demonstrable and
   middleware is exercisable. Real auth is FS4.
8. **Fonts via `next/font/google`** — build-time self-hosted, CSP-safe, no runtime CDN. Switching to
   `next/font/local` with committed `.woff2` is a drop-in (FE-RV-5).

### 5.2 FS2 decisions

1. **Storybook → `@storybook/react-vite`.** The webpack builder conflicted with Next 15's bundled webpack
   (`Compiler.close` hook mismatch). Moving to Vite — already present for Vitest — **removed a bundler**
   instead of patching around one. `@storybook/nextjs` and the `webpack` devDependency were deleted.
   `next/link` and `next/navigation` are aliased to local stubs in `.storybook/mocks/`.
2. **`@radix-ui/react-dropdown-menu` added** for the channel switcher and avatar menu (FE-ADR-7).
3. **`NuqsAdapter` mounted outermost as a *technical adapter***, not an eighth provider: it owns no state and
   changes none of the seven responsibilities or their order. Stage 3 §7 remains intact.
4. **Zustand is a module-level store, not a React provider.** Stage 3 §7 freezes the provider tree and Zustand
   needs no provider. SSR correctness comes from the root layout stamping `data-sidebar` from the cookie (the
   proven theme/density mechanism) plus a `StoreHydrator` that seeds the client store once.
5. **The mock session cookie carries the role** (`onyx-session=<role>`), making all five RBAC paths testable
   without inventing a role-switch UI. Still no secret; deleted in FS4.
6. **403 is a `rewrite`, not a redirect** — the original URL is preserved, so granting the permission makes the
   page work without re-navigating.
7. **Palette + cheat-sheet are `dynamic()` overlays** mounted on first open (Stage 2 §9), keeping `cmdk` out of
   the initial route bundle.
8. **`size-limit` reframed** as a *total-JS regression detector* (345 KB then; 485 after FS5; 560 after
   FS6; 598 after FS7; **628 kB since the FS8 acceptance** — §5.3/§5.4) after code-splitting **raised** the aggregate while improving
   real UX. The authoritative budget is **per-route First Load JS** from the build report. See §5.3.
9. **Inspector slot decision:** the `@inspector` **parallel route** stays workspace-only (where server-rendered
   entity inspectors will live, FS5+); the **URL contract `?inspect=` works in every route group** through the
   shell-level panel. Extending the parallel slot later is additive, not a retrofit.
10. **Manual palette filtering** (`shouldFilter={false}`) because cmdk scores against the raw input, which
    includes the mode prefix (`@analytics` matched nothing).

### 5.3 The bundle-metric decision (important, easy to get wrong)

There are **two different numbers** and they must not be confused:

| Metric | Meaning | Budget | Current (FS15 acceptance — the terminal state of the implementation track) |
|---|---|---|---|
| **Per-route First Load JS** | what a user actually downloads for a route (deduplicated) — **the UX budget from Stage 2 §9**; reaffirmed by the owner at FS6 through FS15 as authoritative and non-revisable | 180 KB | **180 KB** (worst: /chat — **ZERO headroom, held through FS14 by a measured refusal and through FS15 unconditionally (zero `src/` modules shipped)**; /admin 179, /knowledge 176, /audit 175, /jobs 172, /dashboard 168, /studio 165, /providers 154, /memory 150, /prompts 150, /analytics 148, /billing 144, /health 139, /settings 121, /profile 121, seams 111, stubs 107, commons 107, /api/telemetry 107 server-only) |
| **`size-limit` aggregate** | the sum of all top-level chunks, including lazy ones (**63.6% of it IS lazy** at FS14, unchanged at FS15) — an **architectural-regression detector only** | **777 KB** (unchanged since the ninth re-baseline at FS13 acceptance; neither FS14 nor FS15 needed a tenth ruling — both measured green with room to spare; rule №33 unchanged) | 766.23 KB |

Code-splitting *increases* the aggregate while *improving* the real metric. Do not "fix" the aggregate by
un-splitting code.

---

### 5.4 FS3–FS5 decisions (all PATCH; authoritative detail lives in the stage reports)

The per-stage reports are the record of truth (`FS3_REPORT.md` §5, `FS4_REPORT.md` §5, and — once written —
`FS5_REPORT.md`). The architecture-relevant ones to know cold:

1. **`shared/ui` public API = component entrypoints; NO root barrel** (FS3): a full-library barrel measurably
   broke the route budget (168→188 KB); `@/shared/ui/<component>` matches `shared/lib`'s granularity.
   `sideEffects: ["**/*.css"]` declared. Heavy components only via `lazy.tsx`/`dynamic()` (ADR-FE-1).
2. **The typed text-tone mechanism** (FS3, `shared/ui/tone.ts`): `text.tertiary` on small text is
   unrepresentable at the type level; enforced by the tsc gate.
3. **Auth realization of SEC-1/SEC-2** (FS4): BFF route handlers own cookie handling (verbatim Set-Cookie
   forwarding via RAW header appends ONLY — `NextResponse.cookies.set()` drops appended values); an
   AuthGateway seam with a triple-kill-switched fixture for local/ci; middleware = presence + role-hint
   reflection; server layouts re-check via /auth/me; `decideAccess` byte-identical since FS2.
4. **The fixture-environment pattern generalized to DATA** (FS5, delivered): one deterministic DTO-typed
   dataset (`shared/lib/fixtures/dataset.ts`, pure `resolveFixture`) feeds server RSC fetches, a browser MSW
   worker AND node-MSW test handlers in local/ci; `FixtureBoot` is a technical adapter (NuqsAdapter
   precedent) — the seven-provider tree is untouched; triple kill-switch incl. a **static-import grep lock**
   (dynamic `import()` behind the env check is the only legal access from outside the slice — the
   server-fetch/dashboard-page pattern). FE-RV-8 reconciles with the live backend.
5. **Budget/threshold governance — rule №33** (owner ruling at FS5 GO): never pre-raise a threshold; measure
   at the gate, then propose from evidence if blocked. Applied once: at FS5 acceptance the owner set the
   detector to **485 kB** from the per-chunk analysis (FS5_REPORT §7/§11); the fixture/msw chunk is
   deliberately NOT excluded from the measurement.
6. **FS5 PATCH decisions to know cold** (authoritative detail: `FS5_REPORT.md` §5–§6): channel-scoped RSC
   initialData carries **`forChannelId`** and never seeds another channel's query keys (fixes a real
   cross-channel data bug found only by E2E) · `DashboardInitial.channels` is nullable — the onboarding hero
   renders only for a CONFIRMED empty list, never on failure · `msw/browser` is webpack-aliased away in the
   SERVER pass only (`next.config.ts`; msw exports `node: null`) · the MetricCard source whisper uses
   `secondary` (12px real text — the third `text.tertiary` contrast precedent; D4 §12/§13 candidate: define
   "decorative") · the E2E empty-state journey uses the `onyx-fixture-scenario=empty` cookie instead of a
   channel-less fixture account · jsdom setup carries a guarded `matchMedia` stub.
7. **FS8 PATCH decisions to know cold** (authoritative detail: `FS8_REPORT.md` §5–§6 + the size addendum):
   the keyboard registry is **split by concern** — `shortcuts.ts` (chord map, types, text-entry guard) stays
   in commons, `shortcuts-catalog.ts` (the `SHORTCUTS` array + scope labels) ships only inside the lazy
   cheat-sheet chunk; registry-driven UI is unchanged (one source per concern) and a test fails if the
   catalogue returns to commons or gains a second consumer · **entity-local paths again** (`personaPaths`,
   `actorPaths`; they are the FE-RV-11 adjustment points) · **content memory reuses `entities/post`**
   (§R9.1's content level *is* published posts — no invented "memory entry" shape) ·
   **`?scope=` pushes history** while list filters stay `replace` (a
   real reversibility defect caught by E2E) · **actors are read-only in FS8** (references are a §R6.1
   generation input owned by FS9; no placeholder affordance) · **unknown `style_features` keys render by
   raw key** with a quiet marker — the `parseStatus` discipline applied to jsonb, so a wire change degrades
   gracefully · **Inspector rows for `persona`/`actor` are LAZY** (the panel sits in shell commons).
8. **FS7 PATCH decisions to know cold** (authoritative detail: `FS7_REPORT.md` §5–§6 + the size addendum):
   **entity-local endpoint paths** — `documentPaths` lives in `entities/document/paths.ts`, NOT in shared
   `endpoints.ts`, because that shared module sits in every route's commons and knowledge-only bytes must
   not tax other routes (`endpoints.ts` carries a pointer comment) · `apiFetch` gained an additive
   **`formData`** option (the single multipart upload seam, FE-RV-10) and awaits the **transport boot
   gate** · the **DocumentInspector is a LAZY registry row** (the Inspector panel sits in shell commons —
   a static import would tax every route) · `ShortcutProvider` gained an additive **`openPaletteWith`**
   (the D1 §6.7 topbar search entry; provider tree/order untouched) · **upload phases map honestly** onto
   the frozen FileUpload contract (in-flight = *Queued*, since fetch exposes no upload progress and 0%
   would be false precision; *Verified* = upload accepted; ingestion truth is polled on the list) ·
   **embedded document headings are demoted** (h1→h4, cap h6, fenced code preserved) by a pure widget-level
   helper so content can never out-rank page structure — the ONYX Markdown contract stays untouched ·
   E2E lesson: heading selectors near embedded markdown need **role + level** (FS2 convention), and on
   mobile single-pane screens `.first()` can land on a `display:none` pane — scope to the visible region.
9. **FS6 PATCH decisions to know cold** (authoritative detail: `FS6_REPORT.md` §5–§6 + the size addendum):
   the AI relay is **VERBATIM-only** (owner condition — a JSON upstream = ONE `result` frame + `[DONE]`,
   zero cadence; an SSE upstream pipes byte-for-byte; unit-locked) · **ONE ConversationRepository** is the
   sole storage toucher; `getConversationRepository()` is the single future-API swap point; Stage 3's
   `message` entity is folded into `entities/conversation` until that API exists · the AI fixture lives in
   `ai-gateway/fixture.ts` (auth-gateway precedent — a static dataset import would break the FS5 grep lock;
   fixture pacing exists ONLY in the stand-in) · `useAssistantRunner` takes its key per call (a first turn
   creates its conversation and streams under the new id) · the `?q=` Ask-AI hand-off must NOT clear the
   query via nuqs on the created path — the queued URL write races and clobbers `router.replace` (real bug,
   found live) · chat heavy leaves are lazy (Thread/HistoryRail/InsertDialog — the budget gate caught 204 kB
   and forced the split) · StreamingMessage/AIComposer 12px whispers use `secondary` (pre-emptive fourth
   application of the tertiary rule) · E2E: Playwright `getByLabel` matches by SUBSTRING — use
   `{ exact: true }` around the chat's "Conversation…" labels, and anchor post-stream assertions on the done
   `done` marker (wire cost) because the transient streaming node is replaced on completion.
10. **FS9 PATCH decisions to know cold** (authoritative detail: `FS9_REPORT.md` §5–§6 + the size addendum):
    **entity-local QUERY KEYS** — `entities/image/keys.ts` and `entities/location/keys.ts` own their key
    builders so `shared/config/query-keys.ts` gains zero rows (the FS7 entity-local `paths.ts` precedent
    extended one layer up; this is now the default zero-commons mechanism, lock-tested) · `ShortcutScope`
    gained a **type-only** `'studio'` member (erased at build ⇒ zero commons bytes; the rows and label ship
    inside the lazy cheat-sheet chunk) · **an ONYX card is never wrapped in a button**: `ImageResult` owns
    its own prompt disclosure, so the grid card is presentational and the affordances sit beside it (a real
    axe `nested-interactive` violation, fixed in the WIDGET — the ONYX contract untouched) · **no
    virtualizer in the studio** (TanStack Virtual is /chat-scoped and stays there; the grid pages over the
    contract's own list) · deleting from a detail pane routes to the list explicitly rather than calling
    `history.back()` · an honest-absence surface must render on **every** viewport, not only where a
    desktop pane happens to show it · `entities/actor/model.ts` was deliberately NOT extended with a
    reference count because no live wire proves one exists (FE-RV-12 asks).

11. **FS10 PATCH decisions to know cold** (authoritative detail: `FS10_REPORT.md` §5–§6 + the size addendum):
    the **PromptCard MINOR extension** — `variablesCount?` became optional and `active?: boolean | null`
    accepts `null` to render **no badge**; owner-approved in advance under D4 §13, backward compatible for
    every existing call site, and the **only** change to an ONYX component's public API in the project ·
    the version **diff renders its own lines** rather than using the ONYX CodeBlock, because that module
    reaches Shiki and FS10 would have been its first product consumer (a measured, control-proved cost on
    every route — PART2 §2.9); the D2 §13.18 add/remove semantics and the frozen status tokens are kept,
    plus screen-reader labels so colour is never the only signal · **entity-local paths AND keys, with no
    channel dimension at all** (the first such surface; lock-tested by arity) · the **draft owner** is one
    feature-owned module over the FS6 `persist` primitive — components never touch storage (the
    ConversationRepository discipline at feature scale) · `ShortcutScope` gained a **type-only** `'prompts'`
    member (erased at build) · the provenance card's `source` must stay **short**, because that slot is
    `ml-auto shrink-0` and a long string collapses the `truncate` title to zero width · the version reader
    is a plain `<pre>`: no highlighter and **no variable highlighting**, since the contract documents no
    templating · `⌘S` is scoped to the composer while the generic `detail-save`/`detail-edit` catalogue rows
    stay **inactive**.

12. **FS11 PATCH decisions to know cold** (authoritative detail: `FS11_REPORT.md` §5–§6 + the size addendum):
    the FS11 reporting layer lives in a **SEPARATE entity slice** `entities/analytics-report`, because
    re-exporting `'use client'` hooks from the FS5 `entities/analytics` barrel put a 5.23 kB chunk into
    `/dashboard`'s First Load (the FS3 barrel lesson at slice scope, measured and control-proved); the new
    slice imports **nothing** from the FS5 one — the snapshot is mapped through its own `mapMetricEntry`, so
    there is no cross-entity import and no duplicated logic · **the snapshot uses the same metric vocabulary
    as every panel** (`mapSnapshotEntries` → `MetricEntryVM[]`), so gated engagement flows through the
    identical §R10.3 path instead of a bespoke branch · **neutral snapshot labels** ("Cost", "Published")
    because the endpoint accepts a range and the wire's `*_today` naming would be wrong for any other window
    (FE-RV-14 asks what the backend does) · **queries live in the view, charts do not** — the five reads are
    cheap and both the export and the AI panel need their values, so the hooks are route-eager and every
    chart-bearing panel is `dynamic()` · **no polling and no "live counters"**: the contract exposes no
    analytics stream, so panels are SWR-cached with an explicit fetched-at whisper · **panel headings are
    `h2`** (one `h1` per screen; a real `heading-order` violation was found by axe and fixed this way) · the
    `[`/`]` handler **reuses `shiftRange`** from the feature rather than a local copy.
13. **FS12 PATCH decisions to know cold** (authoritative detail: `FS12_REPORT.md` §4 + the size addendum):
    the admin queue lives in a **SEPARATE `entities/job-queue` slice** because FS5's `JobInspector` is a
    STATIC import inside `widgets/inspector/Inspector.tsx` — i.e. `entities/job` is already in **every**
    route's First Load, so extending its barrel would have taxed all 31 routes (the `analytics` /
    `analytics-report` reasoning, at its most expensive) · queue keys are rooted at **`['queue', …]`, never
    `'jobs'`**, because `review-post`, `insert-to-channel` and `add-source` already invalidate the BARE
    PREFIX `['jobs']`, which the FS11 positional trick could not have survived; the coupling that IS wanted
    (a cancelled publish refreshing the dashboard timeline) is declared explicitly in `requeue-job` ·
    **a `useMutation` hook never lives in an eager view** — it drags TanStack's mutation machinery and
    Next's `dynamic()` runtime into the route (8.5 kB; `/jobs` 183 → 172 kB once the lazy component owned
    its own hook) · **static markup lives in the RSC page**, not inside a `'use client'` widget · **six
    Inspector rows are ONE lazy chunk** (`PlatformInspectors.tsx`), because every `dynamic()` adds an entry
    to the global runtime chunk-id map that sits in commons · `entities/probe` **reuses the FS1 commons key
    `queryKeys.health()`** (it existed with zero importers, so reuse costs zero rows anywhere) while the
    FS1 `endpoints.health` row is left **byte-identical and unused** rather than "fixed", since editing a
    commons module for no user-visible gain spends `/chat` headroom · the audit jsonb comparison is
    **duplicated** inside `entities/audit` rather than shared with `entities/config-version`, because FSD
    forbids a cross-entity import and the only other home is commons — twenty pure lines are cheaper than a
    commons byte · **`shared/ui/data-table` is deliberately unused**: the first-consumer measurement refused
    it (+58 B gz in the runtime map, rounding `/memory` up), so the tables are ONYX-primitive lists with the
    same interaction contract, and **TanStack Table remains in no bundle** · a probe state is rendered with
    the D2 §12 **calm dot system** (green/amber/red/**grey unknown**) and **no new D2 §11 status is
    registered** — a health indicator is data-viz, not the cross-screen status vocabulary · task statuses map
    only where the equivalence is exact, and `deferred`/`cancelled`/`dead` stay **raw labels**.

14. **FS13 PATCH decisions to know cold** (authoritative detail: `FS13_REPORT.md` §4–§6 + the size addendum):
    **theme and density were NOT moved** into the new preferences module — they keep the FS1 cookie mechanism
    that `app/layout.tsx` reads during SSR, which is what makes the no-FOUC duty hold, and the Appearance
    panel simply calls the setters `ThemeProvider` has exposed since FS1 (so both commons files stay
    byte-identical) · **one storage toucher per surface, again** (`features/change-settings/model/
    preferences.ts` — the ConversationRepository discipline at feature scale, after `promptDraft.ts`), with
    `useSyncExternalStore` over a module-level cache so the server snapshot is the DEFAULT and no rendered
    preference is ever a guess about what the browser holds · **the D5-B toast-mute READ side lives in
    `shared/lib/notifications`** because FSD forbids `NotificationProvider` importing a feature — it is a
    cookie read with **no storage primitive and no imports**, deliberately the smallest thing that closes the
    gap, and it is the measured cause of the accepted I2 deviation · **`danger` is refused three independent
    times** (absent from the writable union, stripped by `sanitize()` on read and on write, refused by the
    emitter before it reads the cookie) · **the profile identity projection is a WIDGET-level pure module**
    (`widgets/profile/identity.ts`), because `entities/session` is reached through `AuthProvider` and is
    therefore already in every route's First Load — the FS9 "resolve at the widget level" precedent applied to
    the most expensive possible slice · **the activity read reuses FS12's `useAuditRecords` verbatim** and the
    actor is enforced by a **non-nullable type plus the component boundary**, not by a habit · **five settings
    panels are ONE lazy chunk and the activity family is another**, because every `dynamic()` adds an entry to
    the commons runtime chunk-id map (the FS12 rule; two boundaries cost +48 B gz) · **static honesty markup
    is rendered by the RSC pages** and passed to the client view as a slot, so it never enters the route
    bundle · an unknown `/settings/<segment>` resolves to Appearance rather than 404-ing a preference screen
    (`parseStatus` discipline applied to a URL segment).

15. **FS14 PATCH decisions to know cold** (authoritative detail: `FS14_REPORT.md` §4–§7 + the size addendum):
    **the observability seam is SERVER-ONLY** — `src/instrumentation.ts` + `app/api/telemetry/route.ts`
    ship zero client bytes; the client half (`shared/lib/observability/*`) was built, measured in two
    independent placements, cost three protected routes 1 kB each in both, and was **removed** when the
    pre-declared fallback executed, then **frozen removed** by the owner's acceptance ruling — a source-level
    test asserts the module does not exist, so it cannot reappear without a fresh measurement · **the
    telemetry payload is an ALLOWLIST, not a filter** — `TelemetryEvent` has exactly four fields (`kind`,
    `scope`, `name`, `digest`) and no field can represent a message, a stack or a pathname, so no scrubbing
    pass can be forgotten because there is nothing to forget · **`app/global-error.tsx` cannot assume any
    provider** (it replaces the whole document when the root layout itself fails) — it renders its own
    `<html>`/`<body>` with plain token utilities and no `shared/ui` import, and stamps `data-theme="dark"`
    literally since the cookie read that would normally supply it did not run · **the font pin narrows to
    LATIN-only** — `next/font/local` cannot express the `unicode-range` subsetting Google's stylesheet used,
    so Cyrillic/Greek/Vietnamese/latin-ext now fall back to the system stack; English UI copy is unaffected,
    non-Latin channel CONTENT is not, and the trade is reversible in one file
    (`shared/config/fonts.ts`) · **the enforced CSP is authored but never sent** — `next.config.ts` documents
    it as a comment-adjacent constant, and a unit test asserts the response header key is still
    `Content-Security-Policy-Report-Only`, so a future edit cannot silently promote it · **three route-local
    cross-links replace zero shared modules** — each lives in the RSC page or the widget that already owns
    the route, imports no new feature or entity, and was byte-compared individually (one, the Dashboard →
    Jobs hop, was rebuilt from `next/link` to `router.push` after measurement showed the import cost 4 kB
    for zero benefit) · **progressive disclosure reads `useAccountPreferences` directly in two Inspector
    rows** (`TaskInspector`, `AuditInspector`), both already-lazy `PlatformInspectors` members, so the read
    costs nothing new in any route's First Load · **the journey suite is one file**
    (`tests/e2e/journeys.spec.ts`), deliberately, so the D3 Part C inventory has one home rather than being
    scattered across the per-screen specs it draws on.

16. **FS15 PATCH decisions to know cold** (authoritative detail: `FS15_REPORT.md` §1–§5 + the size
    addendum): **FS15 ships zero `src/` modules — there is no application-level PATCH decision to record**,
    the first stage of which that is true. The decisions that exist are all infrastructure/tooling: the
    **Docker Compose overlay lives at `webplatform/docker-compose.console.yml`, never in root
    `docker-compose.yml`** (D2 Option A — the first frontend-stage edit to deployment infra, done by
    addition, not by touching a shared file; the console gets no published port in this shape, since the
    root Caddyfile's own stated rule is that only Caddy publishes ports, and the shared route is deferred to
    the Runbook rather than guessed at) · **the secrets scanner excludes `node_modules`** — its first real
    run matched an AWS-key-shaped pattern inside Next's own vendored `amphtml-validator` WASM blob, and the
    exclusion is a documented, justified scope decision, not a weakened check · **the Lighthouse runner
    drives a Playwright-launched Chromium over CDP rather than letting Lighthouse spawn its own** — direct
    invocation of the Playwright-bundled `chrome.exe` fails on this workstation with a Windows
    side-by-side (WinSxS) error, verified while building the tool, not assumed · **the same runner passes
    `--extra-headers` as a file path, never inline JSON** — inline JSON did not survive Windows `cmd.exe`
    shell-quoting on the first real authenticated run.

## 6. Active freezes — all in force

| Freeze | Scope | How it changes |
|---|---|---|
| **Architecture Freeze (backend)** | active since backend Stage 2; no stage changed the frozen architecture | new ADR required |
| **Production Code Freeze (backend)** | `app/`, public Protocols, business logic, layering must not change | MAJOR + ADR |
| **Design Freeze — ONYX v1.0** | design system, screen spec, UI contract | only via D4 §12 versioning + §13 evolution rules |
| **Frontend Architecture Freeze v1.0** | FRONTEND_MASTER_SPEC, D1–D4, ONYX, Stage 2, Stage 3 | no architecture changes during implementation |

*(Verified intact at the FS14 acceptance and re-verified byte-for-byte at the FS15 acceptance — the terminal
check of the implementation track: 0 boundary violations across **609 modules / 1578 dependencies**,
including no cross-entity import between `analytics`, `analytics-report`, `prompt`, `image`, `location`,
`actor`, `persona`, `document`, `job`, `job-queue`, `platform-user`, `config-version`, `audit`, `probe`,
`api-key` and `cost-report`; the seven-provider tree and its order unchanged (FS14's root error boundary is
outside the tree by design — it renders when the tree itself has failed); no ADR created; no dependency
added at FS14 or FS15. **One sanctioned exception to the ONYX component-contract freeze exists:** FS10's
PromptCard MINOR extension — two additive, backward-compatible optional props — approved by the owner in
advance under the D4 §13 "add freely" rule, because the alternative was fabricating a variables count and an
activation badge. Token **values** remain untouched, as they have been since FS1 — FS14's two contrast fixes
(the avatar menu role label, the palette placeholder) were both usage changes, the sixth application of that
rule; **FS15 touched no `shared/ui` file and no token, so the count of usage-fix precedents stays at six.**)*

**Change categories (both tracks):** **PATCH** (fix, no contract change) · **MINOR** (additive, no break) ·
**MAJOR** (breaking → new spec version + ADR).

---

## 7. Sources of Truth and authority order

- **Backend SoT:** `MASTER_SPEC.md` v2.0 (requirement ids `R<section>.<n>`).
  Hierarchy: `MASTER_SPEC` > `DATABASE_SPEC` / `API_SPEC` / `TEST_PLAN` > `docs/adr` > `docs/spec` (historic) >
  code.
- **Frontend SoT:** `webplatform/FRONTEND_MASTER_SPEC.md` v1.0 (ids `F<section>.<n>`).
  Hierarchy: `FRONTEND_MASTER_SPEC` > Stage 2 Architecture > Stage 3 Technical Spec > code.
  ONYX v1.0 and the backend contract are **frozen inputs**.
- **On any conflict the higher document wins.** Never restate a requirement as new truth in a lower document.

---

## 8. Project invariants — must always hold *(request item 13)*

1. Backend `app/` never changes (Production Code + Architecture Freeze).
2. The frontend never imports or edits `app/`; it consumes only `/api/v1` / public Protocols. **`app/` never
   imports `tests/`** (backend invariant, guarded).
3. Layering guard green; all domain subsystems independent; no cyclic dependencies (backend **and** FSD
   frontend).
4. `mypy --strict` with 0 `type: ignore` (backend); `tsc` strict with 0 unjustified `any` (frontend).
5. Offline-first; gated/unavailable data is honest, never fabricated (§R10.3); secrets are write-only.
   **Nothing the contract cannot back is simulated** — retrieval preview/chunks/scores (FS7); the memory
   trace, Global scope and pin/exclude (FS8); free-form image generation, the image binary itself,
   accept/attach-to-post and any safety or identity verdict (FS9); prompt activation, variables, deletion
   and author names (FS10); anomalies, cost forecasts, recommendations, experiments, system metrics and live
   counters on analytics (FS11) — where **a gated metric shows no value even when the wire carries a
   number**, and an algorithm version is rendered only when the response carries one (§R11.9); providers,
   logs, feature flags, notifications, invoices, plans, cost forecasts, probe history, session inventories
   and user deactivation (FS12 — **a screen with no contract call states the absence on every viewport,
   ships zero fixture data, and is protected by a negative-lock test**); user preferences, account
   self-edit, password change, MFA enrolment or state, avatar upload, session inventory, sign-in history,
   data export and SSO (FS13 — the same rule applied to a **section** rather than a screen, where
   **a browser-local preference is never presented as an account setting**, **no MFA state is rendered
   because "off" is indistinguishable from "unreported"**, and **a control that would change nothing is not
   shipped at all**); a per-post validation result, a post↔image link, chunk-level retrieval and a memory
   influence trace inside a cross-screen JOURNEY (FS14 — the same rule applied to a **journey step** rather
   than a screen or section: where the contract cannot back a hop, the journey states the fact as a **named
   seam** instead of silently ending or fabricating the missing step); upload progress or data freshness
   the transport never reports; any AI claim of influence, attribution or causation. Citations, memory cards, image cards and prompt cards carry **user provenance**, never model
   claims. **No placeholder art, thumbnail or data-URI ever stands in for a binary the contract does not
   serve — fixtures included.** **AI may exercise a governed artifact but never author one, and AI output is
   never auto-saved** (FS10, §R11.4).
6. RBAC enforced server-side; the UI only reflects it (5 roles: owner/admin/editor/analyst/viewer).
7. Streaming-first UX; no blocking spinners on AI surfaces; **Aurora only on AI moments, never neon**.
8. Two Sources of Truth; lower documents never override them.
9. Every stage ends with green gates + reports + a STOP for approval; no stage starts without explicit GO.
10. Changes classified PATCH/MINOR/MAJOR; MAJOR ⇒ new spec version + ADR.
11. **No state belongs to Query and Zustand at once** (FS8 §3.4): server data = Query · streamed tokens =
    the transient assistant store · shareable UI state = the URL (nuqs) · ephemeral = component state.
    Enforced by source-level tests.
12. **Every screen state is a URL** and every transition is reversible by the browser Back button
    (FS8 §3.5); `push` vs `replace` is decided per key, not by default.
13. **Prompts ≠ Images ≠ Memory ≠ Knowledge is structural** (§R9.3 "не смешивать", generalized at FS9 and
    again at FS10): separate routes, entities, query keys, ONYX cards and palette groups (**four** distinct
    `#` groups); no cross-entity import (dependency-cruiser proves it). **Memory ≠ AI Chat**, **Studio ≠ AI
    Chat** and **Prompts ≠ AI Chat**: no memory, image or prompt affordance inside the chat surface.
    **Analytics ≠ Dashboard ≠ Health/Jobs ≠ Billing** (FS11): its own route, its own entity slice and its own
    range-scoped keys, and it derives **no** system metric from unrelated endpoints — the two surfaces that
    read the same `/analytics` resource keep provably non-colliding key namespaces.
14. **A secret is write-only by mechanism** (FS12): the value exists only as a request body, no VM field
    can hold one, nothing persists it, and **no mask is rendered either** — a mask is still key material.
    Locked by a source-level test and an E2E journey.
15. **A platform-wide surface carries no channel dimension, and that is enforced structurally** (FS10):
    the `prompts` record has no `channel_id`, so no prompt query key, path or fetcher may even *accept* a
    `channelId` (lock-tested by function arity), and no channel-scoped screen may import the prompt surface
    — nor it them (both directions lock-tested). Any future platform-wide surface inherits this standard.
16. **A personal view of a platform-wide resource is scoped BY TYPE** (FS13): `GET /audit-log?actor=` drops
    a falsy actor, so a blank or missing user id would widen a personal feed into the whole platform's
    record. The hook takes a **non-nullable `string`**, the component boundary renders the absence, and a
    source-level test asserts the arrangement. **A missing scope is an absence, never "no filter".**
17. **Client telemetry, if it ever exists, is an ALLOWLIST, never a denylist** (FS14): `TelemetryEvent`
    represents exactly `{kind, scope, name, digest}` — no field can hold a message, a stack trace or a
    pathname, so no scrubbing pass can be forgotten because nothing else can be expressed. Server-side
    logging (`instrumentation.ts`) follows the same shape. **Currently no client module implements this at
    all** — the seam was measured, cost three protected routes 1 kB, and was refused; the owner ruled it
    stays that way (§6, PART4 §7.2).
18. **A cross-screen journey is proved with a fact from the wire at every hop, never by a URL change alone**
    (FS14): a 202's queued wording, a returned task id, a served number — never merely "the page navigated".
    Where the contract cannot back a hop, the seam is asserted by its own copy, so "the step is missing" and
    "the step is explained" cannot be confused with each other or with a passing assertion that proves
    nothing.

## 9. Absolutely forbidden

- Modifying `app/`, any public Protocol, backend business logic, layering, or the meaning of the 25 DB
  tables/DTOs.
- Modifying `MASTER_SPEC.md` or `FRONTEND_MASTER_SPEC.md`.
- Changing ONYX v1.0 token meaning, component contracts or the status vocabulary outside D4 §12/§13.
- Changing frontend architecture (Stage 2/3 decisions, FSD layers, FE-ADRs) during implementation.
- Changing the Python version.
- Pushing to remote.
- Starting a new stage without explicit approval.
- Presenting simulated runtime as "done".
- Putting secrets in code, logs or UI.
- Touching `legacy/`.
- Creating an ADR automatically.

---

*Continue with `PROJECT_HANDOFF_PART3.md` (structure, files, versions, environment, commands).*
