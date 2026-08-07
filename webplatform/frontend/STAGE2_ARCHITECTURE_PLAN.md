# Stage 2 — Frontend Architecture & Engineering Specification (v1.0)

**Track:** Web Platform · **SoT:** `FRONTEND_MASTER_SPEC.md` (this document implements §F5 "how"). **No code.**
Goal: make **80–90% of engineering decisions now**, so implementation needs no architecture "on the fly."
Consumes the frozen backend via `/api/v1` / `app.services.*` / public Protocols — **no backend change**;
ONYX v1.0 + backend freezes intact. After approval: **Stage 3 — Frontend Technical Specification**, then
disciplined implementation (FS1…FS15). **Awaiting approval; nothing here is implemented.**

> Versions below are the **target majors** at v1.0; exact pinned versions are locked in Stage 3 / FS1 against
> the test gate (§14). Rationale is given for every choice (owner requirement).

---

## 1. Architectural principles

**Why this architecture.** A **Server-Components-first Next.js App Router** app organized by **Feature-Sliced
Design (FSD)** layers, with a **typed data layer** (server-state cache + SSE streaming) and **ONYX tokens** as
the styling source of truth. This mirrors the backend's winning formula: strict layering + explicit contracts
+ enforced boundaries + gates. RSC-first minimizes client JS (premium performance); FSD gives the same
"independent modules, one-directional deps" discipline that held the backend Architecture Freeze.

**Immutable principles (change ⇒ ADR, §15):**
1. **RSC by default; client components are opt-in islands** where interaction/state demands.
2. **FSD layer direction is one-way:** `app → widgets → features → entities → shared`; lower never imports
   higher; `shared` imports nothing internal. Enforced by lint (§14).
3. **Semantic ONYX tokens only** in components; no hard-coded colors; both themes via token maps.
4. **Server state ≠ UI state ≠ URL state ≠ draft ≠ streaming ≠ session** — six owners, never blurred (§7).
5. **Client-of-core:** no backend business logic re-implemented; RBAC reflected, enforced server-side.
6. **Accessibility & type-safety are gates, not goals** (WCAG AA+, `strict`, 0 unjustified `any`).
7. **Streaming-first;** no blocking spinners on AI surfaces.

**Extensible (add without breaking):** new feature slice · new entity · new widget · new workspace (D3 A9) ·
new theme (token map) · new chart type · new query hook — all additive under the same layers.

## 2. Technology stack (each choice justified)

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router)** | RSC, streaming SSR, file routing, layouts, route handlers; owner-specified |
| UI runtime | **React 19** | Server Components, `use`, transitions, `useOptimistic` (native optimistic UI) |
| Language | **TypeScript (strict)** | 0 unjustified `any`; contracts mirror backend DTO; refactors are safe |
| Package mgr / build | **pnpm** + Next/Turbopack | fast, strict deps; workspace-ready for future packages |
| Styling | **ONYX tokens as CSS variables (SoT)** + **Tailwind CSS v4** (mapped to tokens via `@theme`) + **CSS Modules** for complex internals | token discipline + utility velocity + an escape hatch; no utility-soup for bespoke components |
| A11y primitives | **Radix UI** (dialog/menu/tabs/popover/tooltip/select/toast/switch/checkbox/scroll-area) | WCAG-correct, unstyled, token-friendly — meets AA+ without re-inventing focus/ARIA |
| Command palette | **cmdk** | accessible, fast, matches D1 §6.4 palette model |
| Icons | **lucide-react** | single outline family, 1.5px, matches D2 §10 (no mixed styles) |
| Server state | **TanStack Query v5** | caching, retry, dedup, cancellation, SWR, optimistic + rollback — exactly D4 §7 |
| Global/UI state | **Zustand** (small stores) + React Context (theme only) | minimal boilerplate, RSC-safe islands; no Redux ceremony |
| URL state | **nuqs** + App Router `searchParams` | typed, shareable view state (D4 §7); restores exact views |
| Forms | **react-hook-form + Zod** | performant uncontrolled forms; **shared Zod schemas** for validation |
| Tables | **TanStack Table** (headless) + **TanStack Virtual** | full control to match D2 tables; virtualization for logs/jobs/audit |
| Charts | **visx** (composable D3 primitives) | precise ONYX-token charts (D2 §12) without a heavy opinionated lib |
| Markdown | **react-markdown + remark-gfm + rehype-sanitize**, **Shiki** for code | safe rendering + reading-grade output + tokenized code blocks (D2 §17/§18) |
| Streaming | **SSE-over-fetch** (`fetch` + `ReadableStream`, cookie-auth, abortable) | sends auth cookie, cancelable (Stop), integrates with Query; polling fallback |
| Dates/format | **date-fns** + `Intl` | tree-shakeable, locale-ready |
| Testing | **Vitest + React Testing Library**, **Playwright** (+ `@axe-core/playwright`), **Storybook + Chromatic**, **MSW** | full pyramid incl. a11y + visual regression (§12) |
| Lint/format | **ESLint (typescript-eslint strict, jsx-a11y)** + **Prettier** + **dependency-cruiser** | style + a11y + **boundary enforcement** |
| Fonts | **next/font local** (self-hosted Inter + JetBrains Mono) | no CDN (CSP-safe), no FOUT, matches D2 §3 |

**Open technology ADRs (decide before FS3):** chart lib (visx vs a lighter custom SVG layer) · styling depth
(Tailwind v4 + CSS Modules vs pure CSS Modules/vanilla-extract) · observability vendor (§11).

## 3. Project structure (FSD + App Router)

```
src/
  app/                      # Next App Router — THIN: routing, layouts, route groups, loading/error, route handlers
    (public)/               # landing, login, register
    (workspace)/            # dashboard, chat, knowledge, memory, studio, prompts, playground, analytics, channels
    (platform)/             # admin, providers, health, jobs, logs, audit, flags, billing, notifications
    (account)/              # settings, profile, docs
    @inspector/             # parallel route slot for the Universal Inspector (drawer/sheet)
    providers.tsx           # client providers (Query, theme, toasts)
    api/                    # route handlers (BFF proxy to /api/v1 when needed; SSE relay)
  widgets/                  # composite blocks: AppShell, Sidebar, Topbar, CommandPalette, Inspector, Notifications
  features/                 # user actions: send-message, publish-post, rotate-key, filter-analytics, requeue-job…
  entities/                 # domain + its UI/hooks: channel, conversation, document, memory, image, prompt, job, user, provider, audit
  shared/
    ui/                     # ONYX component library in code (atoms + compounds) = the design system
    lib/                    # api client, query client, streaming, rbac, errors, format
    config/                 # tokens map, routes, rbac matrix, env, query keys
    hooks/                  # cross-cutting hooks (useAnnouncer, useDraft, useShortcuts…)
    types/                  # shared types mirroring public DTO / API_SPEC
  styles/                   # tokens.css (ONYX), globals.css, themes
```

**Module boundaries & import rules (enforced, §14):**
- Direction: `app → widgets → features → entities → shared`. Lower **never** imports higher; siblings don't
  cross-import except through `shared`. `shared` imports nothing internal.
- **Public interfaces:** each slice exposes a single `index.ts` (public API); deep imports are forbidden.
- **Allowed deps:** `entities` may use `shared`; `features` may use `entities`+`shared`; `widgets` may use
  `features`+`entities`+`shared`; `app` composes everything and owns routing only.
- Their proposed folders map here: `components→shared/ui`, `lib→shared/lib`, `hooks→shared/hooks`,
  `providers→app/providers.tsx`, `styles→styles/`. File-level detail is Stage 3.

## 4. Data Layer

**API client (`shared/lib/api`).** A typed `apiFetch<T>()` wrapper: base `/api/v1`, `credentials:'include'`
(cookie session), JSON, `AbortSignal`, a generated/hand-written **request+response type per endpoint**
mirroring `API_SPEC.md`/DTO, and a normalized error (§4 errors). A **BFF layer** (`app/api/*` route handlers)
is used only where needed — SSE relay, cookie handling, and hiding internal URLs — never to re-implement
backend logic.

- **REST:** all CRUD/reads via TanStack Query. **Query keys**: `[resource, params, channelId]` (channel scope
  always included). Policy: `staleTime` per resource (lists 30s, detail 60s, config 5m), `gcTime` 5m,
  background revalidate (SWR).
- **SSE / Streaming:** `shared/lib/stream` provides `openStream(url, {signal})` over `fetch`+`ReadableStream`
  (sends cookie, cancelable). `useAssistantStream` appends tokens to a transient streaming store and, on
  `done`, **reconciles** the final message into the Query cache. Used by Chat, Playground, ingestion progress,
  generation status, log tail, job transitions.
- **WebSocket (future):** the data layer is transport-agnostic behind hooks; if the backend later adds WS
  (RV), a `useLiveChannel` adapter swaps in with no feature-code change. Not required for v1.
- **Caching:** SWR via Query; persisted cache (IndexedDB) for instant paint of lists/last-viewed; explicit
  "updated" affordance when background data materially changes.
- **Retry:** exponential backoff, **skip on 4xx** (except 408/429), honor `Retry-After` on 429; max attempts
  per resource class.
- **Cancellation:** every request/stream carries an `AbortSignal`; route changes and stale queries abort.
- **Deduplication:** Query dedupes concurrent identical keys; mutations serialize per entity.
- **Error handling:** normalize to `AppError { kind: validation|permission|conflict|rateLimit|network|server|
  gated, message, correlationId?, retryable }`; mapped to the Error Recovery matrix (D4 §8).
- **Offline:** an `online/offline` detector disables writes (global banner), serves cached reads, **queues
  safe writes**, auto-resumes on reconnect.

## 5. Rendering Strategy (per page type)

Default: **Server Component**; add `"use client"` only for interactivity/state. Streaming SSR via
`<Suspense>` for fast TTFB; skeletons stream in.

| Screen group | Strategy |
|---|---|
| Landing | **Static/ISR** (marketing-extensible), minimal client |
| Login / Register | Server shell + small client form (server actions for auth) |
| Dashboard / Analytics / Billing | **RSC** initial data (server fetch) + **client islands** for streaming counters, charts, interactions |
| AI Chat / Playground / Image Studio | Server shell + **client-heavy** (streaming, stateful composer) |
| Knowledge / Memory / Prompts | RSC lists + reader; client for editor/retrieval-preview/streaming |
| Admin / Providers / Jobs / Logs / Audit / Flags / Notifications | RSC lists (dynamic) + client interactions; Logs/Jobs client streaming (tail/transitions) |
| Settings / Profile | RSC + client forms; theme/density applied SSR (cookie) to avoid FOUC |
| Documentation | **Static/ISR** + client search/AI answer |

**Rules:** no secrets or heavy libs in client bundles; charts/markdown/editor/image-studio are `dynamic()`
client imports; `loading.tsx` per segment provides ONYX skeletons; `error.tsx` per segment provides scoped
recovery (§4/§D4 §8).

## 6. Component Architecture

Four tiers, mapped to FSD:
- **Atomic (`shared/ui`)** — ONYX primitives: Button, Input, Select, Badge, Card, Tabs, Tooltip, Avatar,
  Skeleton, Spinner, Kbd, Dialog, Menu, Popover, Toast, Table primitives, CodeBlock, Markdown. Styled with
  tokens; behavior via Radix where applicable. **Design-system layer** — no business logic.
- **Compound (`shared/ui` / `entities/*/ui`)** — MetricCard, DataTable, CommandPalette, FileUpload, Timeline,
  ActivityFeed, Chart wrappers, and the **AI components** (StreamingMessage, ThinkingState, ToolCall,
  Citation, MemoryCard, KnowledgeCard, ImageResult, PromptCard, VerificationBadge).
- **Feature (`features/*`)** — a user action + its state/data: `send-message`, `publish-post`, `rotate-key`,
  `filter-analytics`, `requeue-job`, `add-source`, `promote-prompt`. Owns its Query hooks + mutations.
- **Workspace/widget (`widgets/*`)** — screen-level composition: AppShell (Nav/Content/Inspector/Actions),
  Sidebar, Topbar, Inspector, Notifications, DashboardView, ChatView, AnalyticsView. Compose features +
  entities into a screen.

**Reuse rules:** anything cross-cutting lives in `shared/ui`; entity-specific UI lives with the entity;
feature UI is not imported by other features (compose via widgets); no prop-drilling across layers — use the
public `index.ts` + hooks. Progressive Disclosure (Beginner/Advanced/Power) is a **prop/context flag**, not a
component fork (same component, revealed affordances).

## 7. State Architecture (six owners — mirrors D4 §7)

| Kind | Owner | Rules |
|---|---|---|
| **UI State** | component `useState`/`useReducer` | ephemeral; never global; not persisted |
| **Server State** | **TanStack Query** | source of truth from API; SWR; invalidated on writes; keyed w/ channel scope |
| **Session State** | server cookie + read-only client `sessionStore` (user, role) hydrated from RSC | never holds tokens; drives RBAC-aware rendering |
| **Draft State** | `useDraft` (localStorage/IndexedDB) | composer/prompt/settings drafts; restore on return; unsaved-changes guard; cleared on save |
| **Streaming State** | transient Zustand `streamStore` | append-only, cancelable; reconciled into Query on done; survives scroll |
| **URL State** | **nuqs** / `searchParams` | filters/tabs/inspector/ranges — shareable, restorable, RBAC-checked |

**Global app store (Zustand, `shared/lib/store`):** theme, density, experienceLevel, activeChannel,
commandPaletteOpen, sidebarState, toasts. Theme/density/activeChannel persisted to **cookie** (SSR-applied, no
FOUC). Everything else is local, server-cached, or URL — no god-store.

## 8. Security

- **[SEC-1] Tokens/session:** HttpOnly + Secure + SameSite=Lax cookie set by the backend (§R10.4); **never**
  stored in `localStorage`/JS; the client only knows *whether* it's authenticated + the role (from a safe
  `/auth/me`).
- **[SEC-2] Route protection:** Next **middleware** guards protected route groups (redirect to `/login` w/
  return URL); **server-side** session check in the workspace/platform root layouts; client RBAC only *hides*
  (never the security boundary).
- **[SEC-3] CSRF:** align with backend CSRF strategy (double-submit / synchronizer, D2/§R10.4); mutations send
  the CSRF token; same-site cookies as defense-in-depth.
- **[SEC-4] XSS:** Markdown sanitized (`rehype-sanitize`); no `dangerouslySetInnerHTML` except through the
  sanitized renderer; escape all interpolation.
- **[SEC-5] CSP:** strict Content-Security-Policy (self scripts/styles, no inline where avoidable via nonces,
  no external hosts except configured API/CDN); `frame-ancestors 'none'`; report-only first.
- **[SEC-6] Secrets are write-only** in the UI — provider keys/bot tokens are submitted, **never fetched or
  rendered** (§R10.4). No secret ever enters the client bundle or logs.
- **[SEC-7] RBAC:** a `can(role, permission)` helper mirrors the backend matrix (§R10.5) for UI gating; 403 →
  permission state, not a crash; the palette/menus never list forbidden actions.

## 9. Performance

**Targets (staging, mid-tier device):** FCP < 1.2s · LCP < 2.0s · TTI < 2.5s · CLS < 0.05 · INP < 200ms.
**Budgets:** initial route JS ≤ ~180KB gz per route group (tightened in FS1); shared framework chunk cached
across routes.

**Techniques:** RSC to keep client JS small; **route-level code splitting** (App Router) + `dynamic()` for
charts/markdown/editor/image-studio; **prefetch on intent** (hover/focus) for likely navigations; **TanStack
Virtual** for logs/jobs/audit/large lists; `next/image` for media; **self-hosted fonts** via `next/font/local`
(no CDN, no FOUT); streaming SSR + Suspense for fast first paint; persisted Query cache for instant repeat
paints; memoization only where measured. Performance budget is a **gate** (§14, size-limit + Lighthouse CI).

## 10. Accessibility (engineering realization of WCAG AA+)

- **Focus management:** Radix handles dialog/menu focus-trap + restore; a `useFocusReturn` for custom
  overlays; visible `:focus-visible` ring (`--focus`, 2px offset 2) everywhere; skip-to-content link.
- **Live regions:** a `useAnnouncer` (polite/assertive) announces streaming output, toasts, loading/error
  transitions; danger = assertive.
- **Keyboard:** global shortcut manager (`useShortcuts`) implements the D1 §6.5 map + per-screen shortcuts;
  roving `tabindex` for menus/lists/tables; full keyboard operability is an E2E test.
- **Semantics:** landmarks (banner/nav/main/complementary), correct roles via Radix, labelled controls,
  `aria-current`, `aria-invalid`/`aria-describedby` on forms; icon-only buttons have `aria-label`.
- **Prefs:** `prefers-reduced-motion` and `prefers-contrast` honored via token/motion maps; 200% zoom + 320px
  reflow verified; relative units.
- **Enforcement:** `eslint-plugin-jsx-a11y` in lint; `@axe-core/playwright` per screen in E2E; the D4 §3
  manual checklist per screen at review.

## 11. Observability (client-side, no backend change)

- **Errors:** React error boundaries (segment `error.tsx` + `global-error.tsx`) + a Query error handler feed a
  **provider-agnostic sink** (Sentry-compatible seam; vendor is an open ADR) — PII/secret-scrubbed.
- **Metrics:** `web-vitals` (LCP/INP/CLS/FCP/TTFB) reported to the sink; feature usage events optional +
  privacy-safe.
- **Tracing:** the client generates a **correlation id** per request and sends `X-Request-Id` so it aligns
  with the backend's structured logs (§R12.9) — **read-side only**, no backend change.
- **Diagnostics:** a dev-only overlay (React Query Devtools, render profiler, a11y warnings) gated to
  development; never in production bundles.

## 12. Testing Strategy (pyramid, backend-grade discipline)

| Level | Tooling | Scope |
|---|---|---|
| **Unit** | Vitest | `shared/lib` (api/errors/rbac/format), hooks, pure logic |
| **Component** | Vitest + RTL + **MSW** | `shared/ui` + `entities/*/ui` states (empty/loading/error/streaming) |
| **Integration** | Vitest + RTL + MSW | feature flows (send-message, publish, filter-analytics) with mocked API |
| **E2E** | **Playwright** + `@axe-core/playwright` | critical journeys (D3 Part C) incl. keyboard + a11y; gated integration vs staging optional |
| **Visual regression** | **Storybook + Chromatic** | ONYX components + key screens vs the Preview baseline |
| **Contract** | Zod schemas / generated types vs `API_SPEC.md` | request/response shapes stay in sync with the backend |

**Rules:** deterministic (MSW fixtures, fixed clock/seed); offline-first (no live backend for unit/component/
integration); E2E against staging is **gated**; coverage targets set in FS1; a11y + visual are **gates**.

## 13. Deployment

- **Build:** Next `output: 'standalone'` → Docker image (node:alpine) as a **separate service** from the
  backend (own container), reverse-proxied by the same Caddy (§R12.5) — data stores stay internal.
- **Env matrix (mirrors §R12.1):** Local / CI / Staging / Production; each with its own API base URL, feature
  flags, and public config. **No secrets in the client bundle**; runtime secrets are server-only (route
  handlers/middleware).
- **Config:** public runtime config via server env exposed through a typed `getPublicConfig()`; build-time env
  validated (Zod) — build fails on missing/invalid.
- **CDN & caching:** `/_next/static` immutable + long-cache via CDN; HTML per rendering strategy (static/ISR/
  dynamic); Query persisted cache client-side.
- **CI/CD:** pipeline `lint → typecheck → test → build → a11y → bundle-size → visual` before deploy (§14),
  gated/manual promote to staging→prod. Real pipeline execution is a later ops concern (RV).

## 14. Engineering Gates (merge criteria — analog of the backend gate)

A change cannot merge unless **all** pass:
1. **ESLint** (typescript-eslint strict + jsx-a11y + import/boundaries) — clean.
2. **Prettier** — formatted.
3. **`tsc --noEmit`** strict — 0 errors, **0 unjustified `any`**.
4. **Tests** — unit/component/integration green; E2E green on the critical set.
5. **Accessibility** — `axe` automated pass + jsx-a11y clean; manual checklist per touched screen.
6. **Bundle-size budget** — `size-limit` within per-route budgets.
7. **Performance budget** — Lighthouse CI within §9 targets on key routes.
8. **Boundaries** — `dependency-cruiser` shows no layer/import violations (FSD direction).
9. **Visual regression** — Chromatic diff reviewed against the Preview baseline.
10. **Contract** — API types/Zod schemas match `API_SPEC.md`.

## 15. Frontend ADR list (decisions requiring an ADR to change)

Fundamental decisions locked at v1.0; changing any requires a written ADR (mirrors the backend discipline):
- **FE-ADR-1** Next.js App Router as the framework/rendering model.
- **FE-ADR-2** RSC-by-default rendering strategy.
- **FE-ADR-3** Feature-Sliced Design layering + one-way import boundaries.
- **FE-ADR-4** TanStack Query as the server-state authority.
- **FE-ADR-5** State ownership split (six kinds; Zustand for global UI; nuqs for URL).
- **FE-ADR-6** Styling model: ONYX tokens (CSS vars) + Tailwind v4 + CSS Modules.
- **FE-ADR-7** Radix UI (+ cmdk) as the accessibility primitive layer.
- **FE-ADR-8** Auth model: HttpOnly cookie session, middleware-guarded routes, no client-stored tokens.
- **FE-ADR-9** Streaming transport: SSE-over-fetch with polling fallback (WS is a future adapter).
- **FE-ADR-10** Testing stack (Vitest/RTL/Playwright/Storybook/MSW) + the ten engineering gates.
- **FE-ADR-11** Deployment as a separate Next service behind the shared reverse proxy.

**Open ADRs to resolve before FS3:** chart library (visx vs custom SVG) · styling depth (Tailwind+CSS Modules
vs pure CSS Modules/vanilla-extract) · observability vendor.

---

## Architecture check (plan)

- **Conforms to `FRONTEND_MASTER_SPEC`** (§F3 principles, §F5 constraints, §F6 gates, §F7 security, §F8
  budgets). **Conforms to D1–D4** (RSC realizes performance; FSD realizes Workspace Consistency + Universal
  Inspector via parallel routes; tokens realize ONYX; six-state model realizes D4 §7; gates realize QA).
- **Backend impact: none** — client-only; consumes existing `/api/v1`; SSE/WS are frontend/optional-future
  concerns; Architecture Freeze + Production Code Freeze intact.
- **New risks:** streaming transport depends on backend SSE (else polling — designed for) · RSC/App-Router
  learning curve · chart/styling ADRs open — all mitigated by the ADR gate and plan-first discipline.

## What Stage 3 will add (not now)

File-level structure and naming; which components are **shared vs feature vs reusable**, **lazy vs eager**,
**server vs client**; the exact module public interfaces; the screen→file mapping (D3/D4 → files); the
component inventory with props/variants; the query-hook inventory per entity; the concrete env schema and
pinned dependency versions.

---

**STOP — Stage 2 complete. Awaiting your approval to proceed to Stage 3 (Frontend Technical Specification).**
No code will be written until Stage 2 **and** Stage 3 are approved. Backend + ONYX freezes intact.
