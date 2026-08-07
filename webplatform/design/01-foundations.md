# Console — D1: Foundations & Concept

**Design System:** ONYX · **Product:** Console (working names) · **Track:** Web Platform (client of the frozen
core). **This document is D1 of the Stage-1 design set. No code.** It defines vision, principles, information
architecture, navigation, and primary flows. Tokens/components → **D2**; screen maps → **D3**; handoff spec →
**D4**.

**Boundaries:** Console is a **client** of the completed backend via `/api/v1` (`API_SPEC.md`), `app.services.*`
and public Protocols; it never changes `app/`, public Protocols, or `MASTER_SPEC.md`. Architecture Freeze &
Production Code Freeze remain ACTIVE. Backend runtime stays Runtime Verification Pending — the UI is designed
to the API **contract** and degrades gracefully for gated/unavailable data (§R10.3).

---

## 1. Product vision & positioning

**Console is the command surface for an autonomous AI content platform** — where one operator runs many
Telegram channels that generate, validate, illustrate, schedule and publish content on their own. Console
makes an inherently automated system feel **calm, legible, and in-control**.

**Positioning statement.** *A premium, AI-first operations console: the clarity of Linear, the writing surface
of Notion, the conversational depth of Claude/ChatGPT, the dashboard rigor of Stripe/Vercel, and the restraint
of Apple HIG — applied to autonomous content operations.*

**What makes it world-class (the bar):**
- **Perceptual speed** — a user understands any screen in < 2 seconds. Hierarchy does the explaining, not
  labels.
- **Click economy** — every primary action is reachable in ≤ 2 interactions; the Command Palette makes it 1.
- **Streaming-first** — AI output, logs, metrics and jobs render *as they arrive*; the UI never "freezes to
  think."
- **Quiet luxury** — generous space, one confident accent, hairline structure; no neon, no visual noise.
- **Trustworthy at enterprise scale** — RBAC, audit, health and cost are first-class, never bolted on.

## 2. Audience, roles & jobs-to-be-done

Roles mirror the backend RBAC (§R10.5) — the UI adapts (shows/hides/locks) per role; RBAC is enforced server-
side, the UI only *reflects* it.

| Role | Primary job | Console emphasis |
|---|---|---|
| **Owner** | Run the business; govern users/keys/billing | Everything; Admin/Providers/Billing/Feature Flags unlocked |
| **Admin** | Operate channels & platform day-to-day | Channels/Scheduler/Jobs/Health/Audit-read; no user/key management |
| **Editor** | Create & shape content | AI Chat, Prompts, Knowledge, Image Studio, Content ops |
| **Analyst** | Understand performance & cost | Analytics, Cost, Audit-read; read-only elsewhere |
| **Viewer** | Observe | Read-only dashboards/analytics |

**Top jobs-to-be-done:** "spin up a channel and get a great first post out"; "chat with the AI to draft/refine
content"; "teach the system our style & knowledge"; "see what it's about to publish and why"; "prove quality &
cost to a stakeholder"; "diagnose a stuck pipeline fast"; "govern access & keys safely."

## 3. Design principles (the ten tenets)

1. **Content over chrome.** Maximize the canvas; minimize persistent UI. Chrome recedes; content and AI output
   lead.
2. **One accent, used with intent.** Iris/Indigo signals interactivity and AI presence. The **Aurora gradient**
   appears *only* on genuine AI moments (generation, streaming, "magic"). Never decorative, never neon.
3. **Space is a feature.** Large paddings, clear rhythm (8px system). Empty is elegant, not unfinished.
4. **Legibility is non-negotiable.** WCAG AA minimum for all text/controls, both themes. Type scale tuned for
   long reading (chat, docs, logs).
5. **Keyboard is a first-class citizen.** Command Palette (⌘K) is the primary way to navigate and act; every
   key action has a shortcut; the mouse is optional.
6. **Streaming, not spinners.** Prefer progressive rendering, skeletons, and token-by-token output over blocking
   loaders. The system shows its work.
7. **Progressive disclosure.** Show the 20% that matters; reveal depth on demand (details drawers, expandable
   rows, "advanced" sections).
8. **Consistency compounds.** One grid, one spacing scale, one set of tokens, one interaction language across
   all 25 screens.
9. **Truthful states.** Gated/unavailable data is labeled (§R10.3), never faked. Errors are specific and
   recoverable. Destructive actions are guarded.
10. **Motion with meaning.** Transitions explain spatial relationships and continuity; they are calm
    (120–320ms), physical, and fully respect `prefers-reduced-motion`.

## 4. Experience pillars (the areas that must feel exceptional)

These get the deepest treatment in D3; here we set their intent.

- **AI Chat Experience** — the emotional center. Streaming responses, message actions (copy/retry/branch/insert
  to channel), inline citations to Knowledge/Memory, model/route indicator, cost/latency whisper. Feels like
  Claude/ChatGPT, but wired to *your* channels and pipeline.
- **Prompt Workspace** — author, version, and test prompts (§R10.6). Split editor + live Playground; variables;
  diff between versions; "promote to active."
- **Knowledge Workspace** — ingest, browse and search the KB (documents/chunks, §R9.3). Reader-grade typography;
  chunk inspection; retrieval preview ("what the AI would see").
- **Memory Explorer** — a legible view into per-channel style/persona/actor memory (§R9): scopes, entries,
  style features; "why did it write like this?" traceability.
- **Image Studio** — prompt → generate → verify. Aspect/size presets, identity references, safety/regeneration
  status, phash/CLIP checks surfaced calmly (§R6).
- **Dashboard** — the daily driver: what's scheduled, what published, what needs review, cost today, health at
  a glance. One screen, zero clutter.
- **Analytics** — cost/quality/system/content-diversity that are always available; engagement clearly marked
  *gated* until a stats adapter exists (§R10.3/§R11).
- **Admin Console** — governance made safe: users/roles, providers/keys (write-only), audit, config versions,
  feature flags, health, jobs (§R10).

## 5. Information Architecture

### 5.1 Object model (domain nouns → UI objects)

Workspace › **Channels** › {Posts, Schedule, Persona, Actors, Memory} · **Conversations** (AI Chat) ·
**Knowledge** (Documents › Chunks) · **Prompts** (Name › Versions) · **Images** (Requests › Results) ·
**Providers** · **Jobs/Tasks** · **Analytics snapshots** · **Users/Roles** · **Audit** · **Config versions** ·
**Feature flags** · **Notifications**. Every list item deep-links to a detail surface; every detail surface has
a stable URL.

### 5.2 Surfaces (three, one shell)

1. **Workspace** (creator surface) — the default. Scoped by the active **Channel/Workspace** switcher.
2. **Platform & Admin** (governance) — RBAC-gated; visually distinct header accent (subtle), same shell.
3. **Account & Content** — pre-auth (Landing/Login/Register) and personal (Settings/Profile/Docs).

### 5.3 Sitemap (25 screens)

```
Public
├─ Landing
├─ Login
└─ Register

App shell (authenticated)
├─ Workspace
│  ├─ Dashboard                         (home)
│  ├─ AI Chat                           (+ Chat History as a left rail / route)
│  ├─ Knowledge Base                    (Documents → Document → Chunks)
│  ├─ Memory                            (Memory Explorer: scopes → entries)
│  ├─ Image Studio                      (Requests → Result)
│  ├─ Prompt Library                    (Prompts → Prompt → Versions)
│  ├─ AI Playground                     (model/prompt dry-run, §R10.9 isolated)
│  ├─ Analytics                         (Cost / Quality / System / Diversity; Engagement=gated)
│  └─ Telegram Bots                     (Channels/Bots → Channel detail)
│
├─ Platform & Admin  (RBAC-gated)
│  ├─ Admin Panel                       (users, roles, sessions, config versions)
│  ├─ Providers                         (list, capabilities, health, keys=write-only)
│  ├─ Health Dashboard                  (liveness/readiness, probes)
│  ├─ Jobs Dashboard                    (queue/tasks, DLQ requeue)
│  ├─ Logs                              (structured log viewer)
│  ├─ Audit                             (audit_log, filters)
│  ├─ Feature Flags                     (toggles, rollout seams)
│  ├─ Billing                           (plan, usage, cost forecast)
│  └─ Notifications                     (center + preferences)
│
└─ Account & Content
   ├─ Settings                          (appearance/theme/density, account, security)
   ├─ User Profile                      (identity, sessions, activity)
   └─ Documentation                     (in-app docs / help)
```

### 5.4 Route & URL model (principles)

- Stable, human-readable, deep-linkable paths: `/dashboard`, `/chat/:conversationId`, `/knowledge/:docId`,
  `/memory/:scope`, `/studio/:requestId`, `/prompts/:name/versions/:v`, `/analytics`, `/channels/:id`,
  `/admin/users`, `/providers`, `/health`, `/jobs`, `/logs`, `/audit`, `/flags`, `/billing`, `/settings`,
  `/profile`, `/docs`.
- The **active channel** is a workspace context (switcher), not a URL prefix for most screens; channel-scoped
  detail uses `/channels/:id`.
- Every filter/tab/selection is URL-encoded (query params) so views are shareable and restorable.

### 5.5 Depth & hierarchy rules

- Max **3 levels** to any content (surface › list › detail). Deeper detail uses **drawers/panels**, not new
  full-page levels, to preserve context.
- One primary action per screen (a single accented button); secondary actions are quiet; destructive actions
  are separated and confirmed.

## 6. Navigation model

### 6.1 App shell anatomy

```
┌────────────────────────────────────────────────────────────────────┐
│  Topbar: [channel switcher] [breadcrumb/context]   [search ⌘K][●bell][avatar] │
├───────────┬────────────────────────────────────────────────────────┤
│  Sidebar  │                                                        │
│  (nav)    │                 Content canvas                         │
│  Workspace│                 (single primary column,                │
│  Platform │                  generous margins; optional            │
│  Account  │                  right context/detail drawer)          │
│           │                                                        │
└───────────┴────────────────────────────────────────────────────────┘
```

Regions: **Topbar** (context + global actions), **Sidebar** (primary nav, collapsible to icon rail),
**Content canvas** (the star; one focused column), optional **Right drawer** (details/inspector without leaving
context), transient **Command Palette / Dialogs / Toasts** overlays.

### 6.2 Sidebar (primary navigation)

- Grouped: **Workspace** · **Platform & Admin** (only groups the role can access) · pinned **Account** at the
  bottom.
- Each item: icon + label + (optional) count/status dot. Active item uses a subtle Iris left-marker + tint —
  never a heavy fill.
- **Collapsible** to a 64px icon rail (tooltip labels); state persists per user. On tablet it defaults to the
  rail; on mobile it becomes a bottom tab bar + sheet (see D3).
- No nested accordions deeper than one level — depth lives in the content, not the nav.

### 6.3 Topbar

- Left: **Channel/Workspace switcher** (⌘. to open) + breadcrumb showing the current context.
- Right: **Search / Command Palette entry** (⌘K), **Notifications** bell (unread dot), **Avatar** menu
  (profile, theme toggle, settings, sign out). Minimal — everything else lives in the palette.

### 6.4 Command Palette — the primary navigator (⌘K)

The palette is *the* way to move and act; the sidebar is the discoverable fallback.

- **Modes (by prefix):**
  - *(none)* — fuzzy across everything (navigate + actions + recent).
  - `>` **Commands** — actions ("New chat", "Publish draft", "Requeue job", "Toggle theme", "Switch role
    view").
  - `@` **Go to** — navigate to any screen/entity (channels, conversations, documents, prompts, users…).
  - `#` **Search entities** — content search (posts, knowledge, logs, audit) with type filters.
  - `/` **Ask AI** — start or continue an AI action inline (draft, summarize, explain a metric).
- **Behavior:** instant, keyboard-only operable, shows shortcut hints, remembers recents, respects RBAC (never
  lists actions the role can't perform). Results are grouped and previewed.

### 6.5 Keyboard system (foundational map; per-screen shortcuts in D3)

| Scope | Shortcut | Action |
|---|---|---|
| Global | `⌘K` | Command Palette |
| Global | `⌘.` | Channel/Workspace switcher |
| Global | `⌘/` | Keyboard shortcut cheat-sheet |
| Global | `g` then `d/c/k/m/i/p/a/b` | Go to Dashboard/Chat/Knowledge/Memory/Image/Prompts/Analytics/Bots |
| Global | `⌘\` | Toggle sidebar rail |
| Global | `⌘⇧L` | Toggle light/dark theme |
| Global | `⌘⇧D` | Toggle comfortable/compact density |
| Chat | `⌘↵` | Send · `⇧↵` newline · `↑` edit last · `⌘⌫` stop streaming |
| Lists | `j/k` move · `↵` open · `x` select · `⌘a` select all |
| Detail | `e` edit · `⌘s` save · `esc` close drawer |
| Destructive | always require explicit confirm (never a bare shortcut) |

`g`-chords follow the GitHub/Linear model; the cheat-sheet (`⌘/`) is always one keystroke away.

### 6.6 Breadcrumbs, context & switching

- Breadcrumbs show the path within a surface and are clickable; they never exceed 3 crumbs (deeper = drawer).
- The **channel switcher** sets workspace scope globally and is reflected in the breadcrumb; switching preserves
  the current screen where meaningful (e.g., stay on Analytics, swap channel).

### 6.7 Search & Notifications

- **Search** is folded into the palette (`#`) plus a persistent topbar entry; results are typed and deep-link.
- **Notifications** center groups by kind (pipeline/needs-review, jobs, health/alerts, billing, system); a
  quiet bell dot for unread; per-kind preferences in Settings. Never modal-spam; toasts for the immediate,
  center for the record.

### 6.8 State persistence & deep-linking

- Theme, density, sidebar state, last channel, and per-screen filters persist per user. All shareable state is
  in the URL; opening a shared URL restores the exact view (respecting the viewer's RBAC).

## 7. Primary user flows

Concise, click-economical journeys (full step/branch detail + states in D3). "Streaming-first" means the
result surface begins rendering immediately.

### 7.1 First-run onboarding
Landing → **Register** → verify → **Welcome** (create first Channel: name, persona seed, language) → **Connect
bot** (paste token — write-only) → **Guided first post**: "Generate a post" → streaming draft → validate badge
→ image preview → **Schedule/Publish**. Outcome: a real first post in < 5 minutes, ≤ 6 primary actions.

### 7.2 Create & publish content (the 5-stage pipeline as UX, §R13.2)
From Dashboard or Chat: **Compose** → `generate_text` (streaming draft, rewrite loop visible) → `validate`
(quality gates shown as pass/fail chips) → `generate_image` (preview + checks) → **Review** (single approval
surface: text + image + why) → `publish` (schedule or now) → `collect_metrics` (later appears in Analytics).
Continuation-chaining is visible: a failed gate stops the chain and routes the item to **Needs Review** (§R8.4/
§R7.4) — never a silent failure.

### 7.3 AI Chat session (streaming-first)
`⌘K → New chat` (or `g c`) → type → **⌘↵** → tokens stream in with a live model/route + cost whisper → message
actions: copy, retry, branch, **insert into channel as draft**, cite sources → history auto-saved to the left
rail. Inline citations open the Knowledge/Memory drawer without leaving the chat.

### 7.4 Knowledge ingestion & retrieval preview
Knowledge → **Add source** (upload/drag or paste) → ingest progress (chunking) → document reader with chunk
inspector → **Retrieval preview**: enter a query, see exactly which chunks the AI would retrieve (channel-
isolated, §R2.6). Outcome: trust in what the AI "knows."

### 7.5 Memory exploration
Memory → pick **scope** (channel/global) → browse entries + **style features** → "explain this post" opens a
trace from a published post back to the memory/knowledge that shaped it. Read-first; edits are guarded and
audited.

### 7.6 Image generation & verification
Image Studio → prompt + **aspect/size preset** + optional identity references → **Generate** (streaming
status) → result with calm verification chips (safety ok, phash unique, regen count) → accept / regenerate /
attach to a post (§R6).

### 7.7 Prompt authoring & Playground
Prompt Library → open prompt → **version editor** (variables highlighted) → **Playground** split-pane: run
against a model with sample vars (dry-run, isolated §R10.9) → compare output to previous version (diff) →
**Promote to active**. Cost estimate shown before running.

### 7.8 Analytics review
Analytics → time range + channel → **reliable panels first** (Cost, Quality, System, Content-diversity);
Engagement panels render as **"Gated — requires stats adapter"** with a clear explainer (§R10.3), never fake
numbers → export/share (URL-encoded state).

### 7.9 Admin governance
Admin → **Users & Roles** (invite, set role, revoke sessions) · **Providers** (health, capabilities, rotate
keys — write-only, never displayed) · **Config Versions** (compare/rollback) · **Audit** (who did what) ·
**Feature Flags** (toggle, rollout seam). Every mutation is confirmed and audit-logged; destructive actions are
double-guarded.

### 7.10 Health & incident triage
Health → liveness/readiness at a glance → drill to failing probe → cross-link to **Jobs** (DLQ requeue as a
queue *intent*, §R10.1) and **Logs** (filtered to the incident) → follow the matching runbook. Fast path:
`⌘K → "requeue job"`.

## 8. Streaming-first & AI-first interaction principles (foundational)

- **Progressive rendering everywhere:** chat tokens, generation status, logs, job lists, and long tables render
  incrementally with skeletons; the first meaningful paint is < 400ms perceived.
- **The AI is a presence, not a modal:** it lives inline (chat, compose, "ask about this metric"), signaled by
  the Iris accent and, at true generation moments, the Aurora shimmer — subtle, brief, never neon.
- **Always interruptible & steerable:** stop/regenerate/branch are always available; nothing the AI does is a
  dead-end.
- **Show provenance:** model/route, cost, latency, and source citations are quietly available (whisper text),
  building trust without clutter.
- **Optimistic + reconciled:** user actions feel instant (optimistic UI) and reconcile with server truth;
  conflicts surface calmly.

## 9. Content, voice & microcopy principles

- **Plain, precise, human.** Short labels; verbs for actions ("Publish", "Requeue", "Rotate key"). No jargon in
  primary UI; technical terms live in tooltips/docs.
- **Explain, don't scold.** Errors state what happened and the next step. Empty states teach and offer the
  first action.
- **Honest about limits.** Gated features say why (and what unlocks them). Costs and risks are stated before
  the click.
- **Quiet by default.** One idea per surface; secondary detail is one interaction away.

## 10. Responsiveness & platform strategy (principles; specs in D3/D4)

- **Desktop-first** (enterprise console) with three fluid tiers: **Desktop** (multi-region shell + drawers),
  **Tablet** (icon-rail nav, drawers become sheets), **Mobile** (bottom tab bar, single-column, sheets &
  full-screen flows). Content priority is preserved across tiers; nothing critical is desktop-only.
- Touch targets ≥ 44px on tablet/mobile; hover-only affordances always have a tap/focus equivalent.

## 11. Accessibility posture (WCAG 2.1 AA baseline; full checklist in D4)

- Contrast AA for text and UI (both themes); never rely on color alone (icons + text for status).
- Full keyboard operability (the whole product is usable without a mouse); visible, high-contrast focus rings.
- Semantic structure, proper roles/labels, live regions for streaming output and toasts; `prefers-reduced-
  motion` and `prefers-contrast` honored; theme-independent legibility.
- Screen-reader announced states for loading/streaming/errors; dialogs trap focus and restore it on close.

## 12. Design KPIs (how we'll judge success)

Time-to-first-post < 5 min · any primary action ≤ 2 interactions (1 via palette) · first meaningful paint <
400ms perceived · 0 blocking spinners on AI surfaces · AA contrast pass 100% · keyboard-complete for all key
flows · "no cluttered screens" (one primary action per screen).

## 13. What D1 defers

- **D2 (Design System / ONYX):** exact color ramps & both themes, type scale, spacing/grid, radius, elevation/
  shadow, glass/blur/depth, motion tokens, and all 24 components with variants/states/tokens.
- **D3 (Screen Maps):** each of the 25 screens — layout, placement, actions, empty/loading/error states,
  mobile/tablet/desktop behavior, transitions.
- **D4 (FULL UI SPECIFICATION):** consolidated handoff, the accessibility checklist, and the responsive rule
  set.
- **Preview Artifact** (after D4): non-production style tile + UI preview + component gallery.

## 14. Open questions for approval (small, non-blocking)

1. **Terminology:** call the primary object **"Channels"** or **"Bots"** in the nav (backend has both; I
   propose **Channels** with Telegram Bots as a channel connection)? 
2. **Landing scope:** full marketing landing, or a lightweight product sign-in landing (enterprise console
   style)? I propose **lightweight** with a marketing-ready structure.
3. **Onboarding depth:** guided first-post wizard (proposed) vs. drop-into-empty-dashboard.

I'll assume the proposed answers unless you steer otherwise; none blocks D2.

---

**STOP — D1 complete. Awaiting your approval to proceed to D2 (Design System / ONYX: tokens + components).**
