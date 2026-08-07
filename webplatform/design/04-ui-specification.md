# Console — D4: FULL UI SPECIFICATION (handoff)

**ONYX Design System v1.0 · Screen Specification v1.0 · UI Contract v1.0.** Consolidated, developer-ready
specification. **Project documentation only — no production code.** Builds on D1 (Foundations), D2 (ONYX
tokens/components), D3 (25 screen maps). Console is a **client** of the frozen core via `/api/v1` /
`app.services.*` / public Protocols — **no `app/` changes, no backend changes**; RBAC reflected in UI,
enforced server-side; gated data never faked (§R10.3). Frontend *implementation* is a **separate later stage**
(Frontend Architecture) — not started here.

Sections: 1 Token reference · 2 Responsive rules · 3 Accessibility checklist · 4 Frontend Architecture Mapping
· 5 Component Dependency Matrix · 6 API Integration Mapping · 7 State Management · 8 Error Recovery · 9
Notification Strategy · 10 Design QA Checklist · 11 Handoff Checklist · 12 Versioning · 13 Evolution Rules.

---

## 1. Token reference (quick index → D2 is authoritative)

- **Color:** primitives (neutral / iris / aurora / functional / viz) → **semantic** (`background.*`, `surface.*`,
  `border.*`, `text.*`, `interactive.*`, `focus.ring`, `selection.bg`, `ai.*`, `status.*`) → component tokens.
  Components consume **semantic only**. Dark + Light values in D2 §2.
- **Type:** Inter + JetBrains Mono; scale display.lg 40 → body 14/22 → code 13/20 (D2 §3).
- **Space:** 4px base / 8px rhythm; comfortable + compact (D2 §4).
- **Radius:** xs4…3xl20 + pill (D2 §6). **Elevation:** Flat/Raised/Floating/Overlay/Modal (D2 §7). **Glass:**
  moderate, chrome-only (D2 §8). **Motion:** durations 80–480, easing standard/entrance/exit/emphasized;
  streaming/skeleton/reduced-motion (D2 §9).
- **Status vocabulary (single source):** Loading·Streaming·Queued·Running·Completed·Failed·Needs Review·
  Verified·Draft·Published·Scheduled·Paused (D2 §11).

## 2. Responsive rule set

**Breakpoints:** `xs <640 · sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`.

| Region | Mobile (<768) | Tablet (768–1023) | Desktop (≥1024) |
|---|---|---|---|
| Sidebar | bottom tab bar + sheet | 64px icon rail (tooltips) | 264 expanded / 64 rail (persist) |
| Topbar | 56, condensed (title + ⌘K + bell + avatar) | full | full |
| Content | single column, full-width, 16px gutter | single column, 24px gutter | centered measure (820 read / 1200 dash) |
| Inspector | full-screen **sheet** | slide-over **sheet** | right **drawer** 360–420 |
| Tables | card rows / sticky first col | condensed table | full table + inspector |
| Dialogs | full-screen sheet | centered modal | centered modal |
| Chat | full thread; history/inspector as sheets | history collapsible; inspector sheet | 3-pane |
| Charts | horizontal scroll | 2-col panels | grid |

**Rules:** touch targets ≥44px on touch tiers; hover affordances always have tap/focus equals; nothing
critical is desktop-only; content priority preserved across tiers; reflow usable to 320px and at 200% zoom.

## 3. Accessibility checklist (WCAG 2.1 AA+, verify at build)

- [ ] Text contrast ≥4.5:1 (≥3:1 large/semibold) both themes; UI/graphics ≥3:1; status never color-only.
- [ ] 100% keyboard operable; logical tab order; visible focus ring (`focus.ring`, 2px, offset 2) on every
      surface; no unintended traps; dialog focus-trap restores focus on close.
- [ ] Landmarks (banner/nav/main/complementary); labelled controls; icon-only buttons have `aria-label`.
- [ ] Live regions: streaming output + toasts announced **polite**; danger **assertive**; loading/streaming/
      error states announced.
- [ ] `prefers-reduced-motion` and `prefers-contrast` honored; future high-contrast theme = token map only.
- [ ] Zoom 200% + reflow 320px without loss; relative units so OS text scaling works.
- [ ] Forms: associated labels, `aria-invalid`, `aria-describedby`; errors reference the field.
- [ ] Command Palette / menus / tabs / tables have correct roles + keyboard patterns (D2 §13).
- [ ] Media: alt text; decorative marked; no info conveyed by color/motion alone.

## 4. Frontend Architecture Mapping (design ↔ implementation bridge)

Legend — **Layout:** `Auth`=centered card · `Shell`=Nav+Content+Inspector+Actions (A1). **WS:** W=Workspace,
P=Platform/Admin, A=Account, Pub=Public. Tokens: all screens use the **semantic** set; only screen-specific
extras are noted. "Assumed API" references `API_SPEC.md` areas — **no backend change**; transport in §6.

| # | Screen | Route | Layout / WS | Main components | AI components | Screen tokens | Assumed API | Key states | Inspector | RBAC |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Landing | `/` | Auth / Pub | Hero, Buttons, Card | (demo chat) | display.lg, aurora | — | static | — | public |
| 2 | Login | `/login` | Auth / Pub | Inputs, Button | — | surface.raised | `POST /auth/login` | loading/error | — | public |
| 3 | Register | `/register` | Auth / Pub | Inputs, Stepper, FileUpload | Streaming, Verification | ai.wash | `POST /auth/*`, `POST /channels`, publish | streaming/error | — | public→Owner |
| 4 | Dashboard | `/dashboard` | Shell / W | MetricCards, Timeline, ActivityFeed, Toasts | AI summary card | status.* | analytics, tasks, channels | instant/stream/cached | A3 item | role-scoped |
| 5 | AI Chat | `/chat/:id` | Shell / W | Chat, AIResponseCard, Markdown, CodeBlock, Composer | Streaming, Thinking, ToolCall, Citation | ai.accent | AI-gen (assumed SSE), knowledge, memory | streaming/error/empty | A3 sources | Editor+ |
| 6 | Chat History | `/chat` | Shell / W | Table/List, Inspector | AI search/summarize | — | conversations (assumed) | cached/empty | A3 conv | Editor+ |
| 7 | Knowledge | `/knowledge/:docId?` | Shell / W | List, Markdown reader, FileUpload, ChunkInspector | KnowledgeCard, Citation, Streaming | ai.wash | `GET/POST /knowledge`, ingest, retrieve | streaming/error/empty | A3 chunk | Editor/Admin w |
| 8 | Memory | `/memory/:scope?` | Shell / W | List, Timeline, Cards | MemoryCard, Streaming(trace) | ai.accent | memory (assumed) | streaming/empty | A3 entry+trace | Editor/Admin w |
| 9 | Image Studio | `/studio/:reqId?` | Shell / W | PromptComposer, ImageGrid, FileUpload | ImageResult, VerificationBadge, Streaming | aurora, status.* | `POST /images`, verify (§R6) | streaming/error/empty | A3 result | Editor/Admin |
| 10 | Prompt Library | `/prompts/:name?/versions/:v?` | Shell / W | List, Editor(Markdown), Diff | PromptCard, Streaming | interactive.* | `GET/POST /prompts` (versioned) | error/empty/cached | A3 version+diff | Editor/Admin w |
| 11 | AI Playground | `/playground` | Shell / W | Split panes, Streaming outputs, Selects | Streaming, ToolCall, ExplainDiff | ai.* | `POST /ai-studio` (dry-run §R10.9) | streaming/error | A3 run | Editor/Admin/Owner |
| 12 | Analytics | `/analytics` | Shell / W | Charts, MetricCards, FilterBar | AI explain, anomaly | viz.*, status.* | `GET /analytics` (+cost) | stream/cached/gated | A3 datapoint | read all |
| 13 | Telegram Bots (Channels) | `/channels/:id?` | Shell / W | List, Tabs, Timeline, Badges | AI drafts/schedule/explain | status.* | `GET/POST /channels`, publish/schedule | stream/error/empty | A3 connection | Owner/Admin manage |
| 14 | Admin Panel | `/admin/*` | Shell / P | Tables, Tabs, Dialogs | AI access summary | status.danger | `GET/POST /users`, sessions, config | cached/error | A3 user/config | Owner(+Admin subset) |
| 15 | Providers | `/providers` | Shell / P | Cards/List, HealthDot, Dialogs | AI routing advice | status.* | `GET /providers`, health, keys(WO) | stream/error/empty | A3 provider | Owner manage |
| 16 | Health | `/health` | Shell / P | Summary, ProbeList, HealthDot | AI triage | status.* | `GET /health` (live/ready) | stream/gated/error | A3 probe | Owner/Admin |
| 17 | Jobs | `/jobs` | Shell / P | Table, Timeline, Badges, BulkBar | AI diagnose/group | status.* | tasks (assumed), requeue intent | stream/error/empty | A3 task | Owner/Admin |
| 18 | Logs | `/logs` | Shell / P | Virtualized stream, FilterBar, JSON view | AI error analysis | text.*, code | logs (assumed), tail | streaming/error/empty | A3 entry | Owner/Admin |
| 19 | Audit | `/audit` | Shell / P | Table, DiffView, FilterBar | AI activity summary | status.* | `GET /audit-log` | cached/empty/error | A3 diff | Owner/Admin/Analyst r |
| 20 | Feature Flags | `/flags` | Shell / P | List, Toggle, Timeline | AI impact explain | interactive.* | flags (assumed) | cached/error | A3 flag | Owner/Admin |
| 21 | Billing | `/billing` | Shell / P | MetricCards, Charts, Table | AI forecast/savings | viz.*, status.* | analytics cost (api/image usage) | stream/cached/gated | A3 line-item | Owner manage |
| 22 | Notifications | `/notifications` | Shell / P | Grouped list, Tabs, Toasts | AI prioritize | status.* | notifications (assumed) | stream/empty | A3 item | all (own) |
| 23 | Settings | `/settings/*` | Shell / A | SettingsNav, Forms, Toggles | AI explain params | interactive.* | user prefs (assumed) | instant/cached | A3 help | personal all; org Owner/Admin |
| 24 | User Profile | `/profile` | Shell / A | Header, Tabs, ActivityFeed | AI activity summary | avatar, status.* | `GET /auth/me`, sessions | cached/stream | A3 session | self; others r |
| 25 | Documentation | `/docs/*` | Shell / A | Docs tree, Markdown reader, TOC | AI answer+Citations | ai.wash, code | docs content (static + AI) | streaming/cached | A3 TOC/related | public; runbooks scoped |

> "Assumed API" items marked *(assumed)* are UI-driven views whose transport/endpoint is finalized in the
> Frontend Architecture stage **against the existing contract** (or a thin read adapter) — no backend redesign.

## 5. Component Dependency Matrix

`●` uses · `○` optional/contextual. "AI" = renders/participates in AI flows; "Inspector" = opens/populates A3;
"Keyboard" = has dedicated shortcuts; "A11y" = special ARIA/live-region needs beyond baseline.

| Component | Tokens | Motion | AI | Inspector | Keyboard | A11y |
|---|---|---|---|---|---|---|
| Buttons | ● | ● | ○ (AI variant) | ○ | ● | ● |
| Cards | ● | ● | ○ | ● | ○ | ● |
| Inputs | ● | ● | ○ | ○ | ● | ● |
| Select/Combobox | ● | ● | ○ | ○ | ● | ● |
| Tables | ● | ● | ○ | ● | ● | ● |
| Tabs | ● | ● | ○ | ○ | ● | ● |
| Sidebar | ● | ● | — | — | ● | ● |
| Topbar | ● | ● | ○ | — | ● | ● |
| Breadcrumbs | ● | ○ | — | — | ○ | ● |
| Dialogs/Modals | ● | ● | ○ | — | ● | ● |
| Dropdowns/Menus | ● | ● | ○ | ○ | ● | ● |
| Toasts | ● | ● | ○ (AI kind) | ○ | ○ | ● |
| Context Menu | ● | ● | ○ | ● | ● | ● |
| Command Palette | ● | ● | ● (`/` Ask AI) | ○ | ● | ● |
| Chat | ● | ● | ● | ● | ● | ● |
| AI Response Card | ● | ● | ● | ● | ● | ● |
| Markdown | ● | ○ | ● (citations) | ● | ○ | ● |
| Code Blocks | ● | ● | ○ | ○ | ● | ● |
| Charts | ● | ● | ○ (explain) | ● | ● | ● |
| Metric Cards | ● | ● | ○ | ● | ○ | ● |
| File Upload | ● | ● | ○ | ○ | ● | ● |
| Avatar | ● | ○ | — | ○ | — | ● |
| Timeline | ● | ● | ○ | ● | ● | ● |
| Activity Feed | ● | ● | ○ | ● | ● | ● |
| **AI: Streaming Message** | ● | ● | ● | ● | ● | ● |
| **AI: Thinking State** | ● | ● | ● | — | ○ | ● |
| **AI: Tool Call** | ● | ● | ● | ● | ○ | ● |
| **AI: Citation** | ● | ● | ● | ● | ● | ● |
| **AI: Memory/Knowledge Card** | ● | ● | ● | ● | ● | ● |
| **AI: Image Result** | ● | ● | ● | ● | ● | ● |
| **AI: Prompt Card** | ● | ● | ● | ● | ● | ● |
| **AI: Verification Badge** | ● | ● | ● | ○ | ○ | ● |

## 6. API Integration Mapping (per workspace — no backend change)

Transport policy: **REST for reads/writes** (existing `/api/v1`); **Streaming** where the backend exposes it
(assumed **SSE** for AI text; else **degrade to polling**); **Polling** for near-real-time lists; **WebSocket**
only if/when the backend adds it (future, RV) — the UI is transport-agnostic behind a data layer designed in
the Frontend Architecture stage.

| Workspace | Primary APIs (contract) | Streamed | Cached | Polled | WebSocket (future) |
|---|---|---|---|---|---|
| Dashboard | analytics, tasks, channels | live counters, needs-review | tiles, last view | jobs/needs-review (5–15s) | job/needs-review push |
| AI Chat | AI generate, knowledge, memory | **response tokens (SSE)**, tool steps | conversations, recent | — | live collab (future) |
| Knowledge | knowledge CRUD, ingest, retrieve | ingest progress, retrieval preview | source list, docs | ingest status | — |
| Memory | memory read/trace | trace build | entries | — | — |
| Image Studio | images create/verify (§R6) | generation + verification status | recent results | batch status | generation push (future) |
| Prompt/Playground | prompts (versioned), ai-studio dry-run | dry-run tokens | prompts, versions | — | — |
| Analytics/Billing | analytics, cost (api/image usage) | live counters | ranges, charts | — | — |
| Channels | channels, publish/schedule | publish/health status | channel list | publish status (5–15s) | publish push (future) |
| Admin/Providers/Flags | users, config, providers, health | provider/session health | lists | health (10–30s) | — |
| Jobs/Health/Logs | tasks, health, logs | **log tail**, job transitions, probe state | recent lists | jobs/health (5–15s) | tail/health push (future) |
| Audit | audit-log | — | records | — | — |
| Notifications | notifications | incoming items | recent | unread (15–30s) | push (future) |

**Rules:** optimistic writes reconcile with server truth; gated endpoints (engagement) render Gated cards, no
polling of nonexistent data; secrets are write-only (never fetched/rendered); every request carries the
active-channel scope; RBAC errors (403) route to a permission state, not a crash.

## 7. State Management Strategy (library-agnostic)

Six state kinds, with clear ownership and rules:

- **Local UI State** — ephemeral, component-scoped (open/closed, hover, input focus, selected tab). Lives with
  the component; never persisted beyond the session unless it's a preference.
- **Server State** — the source of truth fetched from the API; **cache-and-revalidate** (stale-while-
  revalidate). Keyed by resource + params (+ active channel). Invalidated on relevant writes.
- **Cached State** — persisted client cache for instant paint (lists, last-viewed, docs tree, prefs). Shows
  cached → revalidates in background; explicit "updated" affordance if data changed materially.
- **Streaming State** — append-only in-flight data (chat tokens, log tail, job transitions, generation status).
  Buffered, cancelable (Stop), reconciled into Server State on completion; survives scroll; never blocks UI.
- **Optimistic Updates** — user actions apply instantly (toggle flag, rename, mark read, requeue), then reconcile;
  on failure, roll back + explain (Error Recovery §8). Only for safe, reversible actions; destructive actions
  are confirmed, not optimistic.
- **Draft State** — unsaved user work (composer text, prompt edits, settings forms). Auto-persisted locally,
  restored on return, cleared on successful save; "unsaved changes" guard on navigation.

**Cross-cutting:** URL is the source of truth for shareable view state (filters/tabs/inspector) — restored on
load, RBAC-checked. Global concerns (theme, density, active channel, auth/session, experience level, toasts,
command palette) live in an app-level store; everything else is local or server-cached.

## 8. Error Recovery (per error type — user always understands)

| Error type | Recover | Retry | Refresh | Offline | Escalation |
|---|---|---|---|---|---|
| **Validation (field/form)** | fix inline; message references field | n/a | n/a | keep draft | link to docs/help |
| **Section fetch fail** | error card, rest of page intact | one-tap Retry | soft revalidate | show last cached + "offline" chip | link to Health |
| **Page/critical fail** | full error state + correlation id | Retry | Refresh | cached read-only if available | Health/Docs/Support link |
| **Write conflict (409/version)** | show diff, keep user input | Retry with merge | reload latest | queue draft | — |
| **Permission (403)** | permission state ("your role can't…") | n/a | n/a | n/a | request access / contact owner |
| **Rate limit (429)** | back-off with visible wait; honor `retry_after` | auto after wait | n/a | queue if safe | — |
| **AI generation fail** | preserve partial output; explain | Retry / Regenerate | n/a | n/a | switch model (Playground) |
| **Ambiguous pipeline (§R7.4)** | route to **Needs Review** (never silent) | manual review | n/a | n/a | Jobs/DLQ |
| **Provider/backend down** | Gated/degraded state (honest) | Retry | n/a | cached + banner | Health + runbook |
| **Offline (network)** | global offline banner; disable writes | auto-resume on reconnect | auto-revalidate | read cached; queue safe writes | — |

**Principles:** never a bare "Something went wrong"; state *what* happened, *why*, and the *next step*; keep
user input; distinguish gated/offline from real failure; destructive/irreversible failures give recovery
guidance + correlation id.

## 9. Notification Strategy (channel per intent)

| Channel | Use | Persistence | Example |
|---|---|---|---|
| **Toast** | transient confirmation/soft error, non-blocking | 4–6s (persist on hover), max 3 | "Draft saved", "Copied", "Requeue queued" |
| **Banner** | persistent, context-wide condition | until resolved/dismissed | "Offline", "Provider degraded", "Read-only (permission)" |
| **Inline** | field/section-scoped status/error | until resolved | form errors, ingest failure on a file |
| **Modal** | blocking decision / destructive confirm / critical | until acted | "Delete channel?", "Rotate key?", MFA step |
| **Background Job** | long async work with progress | in Notifications center + Jobs | ingestion, batch generate, bulk publish |
| **Streaming Notifications** | live incremental events | ephemeral → center for record | chat tokens, log tail, job transitions, generation status |

**Rules:** critical outcomes never rely on a toast alone (also center/inline). Danger = assertive announce;
info = polite. Toasts for the moment, **Notifications center** for the record. Never modal-spam; escalate to
modal only for blocking decisions or irreversible actions. Every background job is inspectable and cancelable
where safe.

## 10. Design QA Checklist (verify implementation against spec)

- [ ] **Spacing** — 8px rhythm; paddings match density; page/section gaps per D2 §4; no ad-hoc values.
- [ ] **Typography** — Inter/JetBrains; scale/weights/tracking per D2 §3; tabular figures in tables/metrics;
      72ch reading measure.
- [ ] **Contrast** — AA both themes; status not color-only; focus ring AA on all surfaces.
- [ ] **Motion** — durations/easing per D2 §9; streaming caret+aurora; skeleton shimmer; reduced-motion fallback.
- [ ] **Responsive** — breakpoint behaviors per §2; ≥44px touch; 200% zoom; 320px reflow; nothing desktop-only.
- [ ] **Accessibility** — §3 checklist fully passed.
- [ ] **States** — every screen has empty (4-part), loading (skeleton/streaming), error (3-scope), success.
- [ ] **Keyboard** — global map (D1 §6.5) + per-screen shortcuts; ⌘K reaches every action; cheat-sheet `⌘/`.
- [ ] **Streaming** — token/word progressive render; Stop works; auto-scroll + jump-to-latest; no blocking
      spinners on AI surfaces.
- [ ] **Inspector** — any entity opens in A3 without navigation; deep-linkable; tabs consistent; esc restores
      focus.
- [ ] **AI Components** — Trust labels (Generated/Verified/Needs Review + Source Available/None) + Explainability
      (why/data/confidence/limits) present on every AI block; gated data honest.
- [ ] **Tokens** — only semantic tokens used; theme switch flips cleanly; no hard-coded colors.
- [ ] **Status language** — one vocabulary everywhere (D2 §11), identical visuals per status.

## 11. Handoff Checklist (what each role receives)

**Frontend developer**
- D1–D4 + this mapping (routes, components, tokens, states, Inspector, RBAC per screen); ONYX token set
  (semantic + primitives, both themes); component specs (anatomy/variants/states/motion/a11y); responsive rule
  set; State Management + Error Recovery + Notification strategies; Preview Artifact (visual reference).
- Explicitly: the frontend **implementation architecture** (framework, data layer, routing, theming impl) is a
  **separate next stage** — this handoff is the *design contract*, not the app.

**Backend developer**
- The **API Integration Mapping** (§6) listing which existing `/api/v1` areas the UI consumes, and where the
  UI *assumes* streaming (SSE) / polling. **No backend change is requested by the design**; any streaming/WS
  endpoints are optional future work (RV) documented for planning — Architecture/Production Code Freeze intact.

**QA**
- The **Design QA Checklist** (§10) + Accessibility checklist (§3) + per-screen states (D3) + Status language +
  keyboard map + Error Recovery matrix (§8) as test oracles; the Preview Artifact for visual regression
  reference; RBAC matrix (which role sees/does what per screen).

**UX Designer**
- D1–D4 as the living design source; ONYX versioning + Evolution Rules (§12/§13) for extending the system; the
  Future-proof workspace slots (D3 A9) for new modules; the token architecture for new themes/brands.

## 12. Versioning (independent design evolution)

Three versioned artifacts, semver, evolving independently of the backend:
- **ONYX Design System v1.0** — tokens + components (D2). Consumers pin a major.
- **Screen Specification v1.0** — the 25 screen maps (D3) + this handoff (D4).
- **UI Contract v1.0** — the design↔API mapping (§4/§6): routes, component usage, assumed data, RBAC. The
  stable interface between design and implementation.

**Rules:** bump **MAJOR** on a breaking change (below); **MINOR** for backward-compatible additions; **PATCH**
for fixes/clarifications. Each artifact has a changelog; releases are tagged (e.g., `onyx-ds-v1.0.0`). A
`design-tokens` reference table is the machine-handoff surface (name→value, both themes) for a future
token-pipeline — spec only, no code now.

## 13. Evolution Rules (how ONYX grows safely)

**Add freely (non-breaking, MINOR):**
- New **semantic status** (register in D2 §11 first) · new **component variant/size** that doesn't alter
  existing ones · new **screen/workspace** using existing patterns (D3 A9: Voice/Automation/Agent/Marketplace/
  Integrations) · new **theme/brand** via primitive→semantic map · new **chart/metric type** in the viz rules ·
  new **AI component** following the AI framework · new **icon** in the existing family.

**Breaking change (requires MAJOR + migration note):**
- Renaming/removing a **semantic token** or changing its meaning · changing a component's **default variant/
  anatomy/behavior** · altering the **spacing/type/radius scales** · changing the **status vocabulary** meaning
  · changing **elevation/motion** semantics · changing a **route** or the **UI Contract** shape · reducing
  accessibility guarantees.

**Requires a new version (not just a token tweak):**
- Any change that forces consumers to update code/markup, or that changes visual/interaction meaning across
  screens.

**Must never happen without an ADR (mirrors the core's discipline):**
- Coupling the design system to a specific backend detail; introducing a token that bypasses the semantic
  layer; a one-off style outside the system.

**Guarantee:** existing components/screens keep working across MINOR/PATCH; new capability is added by
extension, not modification — the same principle that kept the core's Architecture Freeze intact.

---

**STATUS:** D1→D4 complete. **Next:** the non-production **Preview Artifact** (Style Tile · Theme Preview
Dark+Light · Component Gallery · Dashboard/AI Chat/Analytics previews), then **STOP**. Frontend *implementation*
is a separate later stage (**Frontend Architecture design first**) — not started here. No `app/`, Protocol, or
`MASTER_SPEC.md` changes; Freezes intact.
