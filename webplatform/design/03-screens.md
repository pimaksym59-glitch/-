# Console — D3: Screen Maps (25 screens)

**Deliverable D3 of Stage-1.** Project documentation only — **no code.** Builds on D1 (Foundations) and D2
(ONYX Design System). Consumes the frozen core via `/api/v1` / `app.services.*` / public Protocols only — no
`app/` changes; RBAC reflected in UI, enforced server-side (§R10.5); gated data never faked (§R10.3).

Each screen is specified in a **single 17-field format** (below). Cross-cutting frameworks are defined once in
**Part A** and referenced by every screen so patterns stay identical (Workspace Consistency requirement).

**Per-screen fields:** Purpose · Primary User · Entry Points · Layout · Information Hierarchy · Primary Actions
· Secondary Actions · Keyboard Shortcuts · Empty State · Loading State · Error State · Permissions (RBAC) · AI
Assistance · Mobile · Tablet · Desktop · Related Screens. (AI Assistance embeds **Explainability**, **Trust**
and **Performance UX** per Part A.)

---

# Part A — Universal frameworks (apply to every screen)

### A1. Workspace consistency pattern (Navigation · Content · Inspector · Actions)
Every authenticated screen uses the same four regions so users never re-learn a section:
- **Navigation** — the global Sidebar (Workspace / Platform / Account groups) + Topbar (channel switcher +
  breadcrumb).
- **Content** — one focused primary column (reading measure per D2 §5); no dense second column.
- **Inspector** — the **Universal Inspector** right drawer (A3) for entity detail without navigating away.
- **Actions** — one accented primary button per screen (Content), quiet secondary actions, row/context menus,
  and the Command Palette (⌘K) mirroring every action.

### A2. Progressive disclosure — one UI, three tiers (Beginner · Advanced · Power User)
Controlled by a per-user **Experience Level** (Settings) + inline "Advanced" disclosures + density (`⌘⇧D`).
The **layout never changes** — affordances are revealed:
- **Beginner:** sensible defaults, guided empty states, AI suggestions up front, minimal visible controls.
- **Advanced:** filters, batch selection, secondary panels, raw parameters behind "Advanced" sections.
- **Power User:** keyboard-only operation, compact density, bulk actions, raw params / JSON / query view,
  saved views. Every screen below lists its three-tier deltas succinctly.

### A3. Universal Inspector (right drawer)
360–420px drawer, Overlay elevation (D2 §7). Opens for **any** entity (row, message, chunk, job, user…) via
click, `↵`, or deep link `?inspect=<type>:<id>` — **never** a full page load. Standard tabs: **Overview ·
Details · Why (Explainability) · Activity · Actions**. `esc` closes and restores focus; on mobile it becomes a
full-screen sheet. This is the single detail surface across the product.

### A4. Universal Search & addressability
Every entity is reachable four identical ways: **⌘K** (`@` navigate, `#` search), **Topbar Search**, **Deep
Link** (stable URL), **Sidebar**. Entities carry a canonical `{type, id, route, title}` so search, palette and
links resolve the same target. RBAC filters results.

### A5. AI Presence framework ("how can AI help *here*?")
Every screen exposes AI in-context (not only Chat): a persistent **"Ask AI"** affordance (`/` in palette or an
inline Iris button) + **contextual AI actions** listed per screen. AI output always carries **Explainability**
and **Trust** (A6/A7). AI is a presence, not a modal (D1 §8).

### A6. Explainability (shown on every AI result — Inspector "Why" tab + inline)
Four elements, always: **Why this result** (short rationale) · **Data used** (sources/filters/scope, channel-
isolated §R2.6) · **Confidence** (calm level: high/medium/low, never false precision) · **Limitations/Gated**
(what's uncertain or unavailable, §R10.3/§R11.9 provenance: source·filters·algorithm version·time).

### A7. Trust labels (on every AI block)
Exactly one generation state — **Generated · Verified · Needs Review** (D2 §11 vocabulary + Verification Badge)
— plus one sourcing state — **Source Available · No Sources** (Citation / Knowledge Card). Consistent
everywhere; color is never the only signal.

### A8. Performance UX legend (each screen declares its four)
**Instant** (shell + cached view) · **Lazy** (below-fold/on-demand) · **Streaming** (AI, logs, jobs, metrics)
· **Cached** (recent lists/last-viewed, revalidated in background). Target: first meaningful paint < 400ms;
no blocking spinners on AI surfaces (skeletons + streaming per D2 §9/§16).

### A9. Future-proof extension slots
New workspaces (**Voice Studio · Automation Studio · Agent Builder · Marketplace · Integrations**) drop into
the Sidebar **Workspace** group and reuse Nav/Content/Inspector/Actions + ONYX tokens + the AI framework +
Universal Search — **zero changes to existing screens**. Each new workspace = its own screens following the
same 17-field pattern; new statuses register in D2 §11 first.

---

# Part B — Screen maps

> Where a field is standard, it references Part A (e.g., "Inspector: A3, showing …"). Trust/Explainability/
> Performance appear under **AI Assistance** unless a screen needs more.

## 1. Landing (product-first, marketing-extensible)
- **Purpose:** convert & orient; a lightweight product sign-in landing that can grow into a full marketing site
  without architecture change (D1 §14).
- **Primary User:** prospect / returning user (unauthenticated).
- **Entry Points:** root URL, marketing links, sign-out redirect.
- **Layout:** centered hero (display.lg headline + subcopy + primary CTA), a restrained 3-up value row, a quiet
  product preview, footer. Glass topbar with Sign in / Get started.
- **Information Hierarchy:** value proposition → single CTA → proof → sign-in.
- **Primary Actions:** **Get started** (→ Register) · **Sign in** (→ Login).
- **Secondary Actions:** Docs, product tour, theme toggle.
- **Keyboard Shortcuts:** `⌘⇧L` theme; `↵` on focused CTA.
- **Empty State:** n/a (static).
- **Loading:** Instant shell; hero image lazy.
- **Error:** graceful fallback if preview media fails (static gradient).
- **RBAC:** public.
- **AI Assistance:** an optional "Ask what Console does" mini-prompt that opens a demo chat (Generated · No
  Sources label). Explainability: clearly marked as a demo.
- **Mobile:** single column, CTA sticky bottom.
- **Tablet:** centered, 2-up value row.
- **Desktop:** full hero, 3-up.
- **Related:** Login, Register, Documentation.

## 2. Login
- **Purpose:** authenticate quickly and safely (§R10.4).
- **Primary User:** returning user.
- **Entry Points:** Landing, deep links requiring auth (redirect back after login), sign-out.
- **Layout:** centered card (surface.raised, radius.2xl): email, password (write-only), optional OTP step,
  primary **Sign in**, SSO seams (disabled placeholders until RV-17), "Forgot password".
- **Information Hierarchy:** identity → credentials → sign in.
- **Primary Actions:** **Sign in**.
- **Secondary Actions:** Forgot password, SSO (seam), Create account.
- **Keyboard Shortcuts:** `↵` submit; `esc` clears field.
- **Empty State:** n/a.
- **Loading:** button loading state; no page spinner.
- **Error:** inline, specific ("Incorrect email or password", "Enter your one-time code") — never reveal which
  factor failed for security; lockout messaging on repeated failures.
- **RBAC:** public; role resolved post-auth.
- **AI Assistance:** none (deliberate — auth is trust-critical, no AI).
- **Mobile/Tablet/Desktop:** identical centered card; full-width fields on mobile.
- **Related:** Register, Landing, User Profile, Settings › Security.

## 3. Register
- **Purpose:** create an account and enter guided onboarding ("First post").
- **Primary User:** new user (becomes Owner of their workspace).
- **Entry Points:** Landing, Login.
- **Layout:** centered card: name, email, password (strength meter), terms; then a **3-step onboarding** (Create
  channel → Connect bot token [write-only] → Guided first post, D1 §7.1).
- **Information Hierarchy:** account → workspace → first value.
- **Primary Actions:** **Create account** → **Continue** through steps.
- **Secondary Actions:** Sign in instead, skip-to-dashboard (kept minimal per D1 §14 = guided preferred).
- **Keyboard Shortcuts:** `↵` next; `esc` back.
- **Empty State:** onboarding *is* the empty-workspace state (D2 §15).
- **Loading:** stepper with per-step progress; first-post generation Streams.
- **Error:** inline validation; token connect errors explain next step.
- **RBAC:** public → new Owner.
- **AI Assistance:** the guided first post — Streaming draft (Generated), validation → Verified/Needs Review,
  image preview; Explainability shows persona seed + defaults used.
- **Mobile:** full-screen steps; sticky Continue.
- **Tablet/Desktop:** centered card / stepper.
- **Related:** Dashboard, Telegram Bots (Channels), AI Chat.

## 4. Dashboard (home / daily driver)
- **Purpose:** answer "what's happening and what needs me?" in one glance.
- **Primary User:** Owner/Admin/Editor.
- **Entry Points:** post-login default, `g d`, logo.
- **Layout (Workspace pattern A1):** greeting + primary **Compose** action; a calm grid of Metric Cards (Cost
  today, Published today, Scheduled, Needs Review) → **Upcoming schedule** timeline → **Needs Review** queue →
  **Recent activity** feed. Inspector opens any item.
- **Information Hierarchy:** attention-needed (Needs Review) first, then plan (schedule), then health/cost, then
  ambient activity.
- **Primary Actions:** **Compose** (start pipeline / chat), **Review** items.
- **Secondary Actions:** switch channel, jump to Analytics/Jobs, customize tiles.
- **Keyboard Shortcuts:** `c` compose · `g a` analytics · `j/k` move items · `↵` open in Inspector.
- **Empty State:** onboarding hero → **Create your first channel** (D2 §15).
- **Loading:** Instant shell + tiles skeleton; lists Cached then revalidate.
- **Error:** per-card error (one failing metric doesn't break the page).
- **RBAC:** Editor sees content tiles; Analyst sees metrics read-only; Viewer read-only.
- **AI Assistance:** "What changed today?" summary card (Generated · Source Available → links to Analytics/
  Jobs); AI flags anomalies (cost spike, error rate) with Explainability (data used + confidence).
- **Performance UX:** Instant: shell/tiles. Lazy: activity feed. Streaming: live job/needs-review updates.
  Cached: last dashboard state.
- **Mobile:** stacked cards; Compose as sticky FAB; horizontal-scroll KPI row.
- **Tablet:** 2-col tiles; timeline below.
- **Desktop:** 3–4-col tiles + two-column lists under, Inspector on right.
- **Related:** AI Chat, Analytics, Jobs, Telegram Bots, Content review.

## 5. AI Chat (the emotional center)
- **Purpose:** converse with the AI to draft, refine, analyze, and act — wired to channels/pipeline.
- **Primary User:** Editor/Admin/Owner.
- **Entry Points:** `g c`, ⌘K "New chat", Dashboard Compose, "Insert to channel" flows, Chat History.
- **Layout:** left **Chat History** rail (conversations, searchable) · center **message thread** (D2 §14
  Streaming Message) · sticky **composer** (growable textarea, attach, model/route selector, Send ⌘↵, Stop) ·
  right **Inspector** for citations/sources/settings.
- **Information Hierarchy:** current thread > composer > history rail > inspector.
- **Primary Actions:** **Send** (⌘↵), **Stop** (⌘⌫), message actions (copy/retry/branch/insert-to-channel/cite).
- **Secondary Actions:** rename/pin/delete conversation, change model/route, attach knowledge, export.
- **Keyboard Shortcuts:** `⌘↵` send · `⇧↵` newline · `↑` edit last · `⌘⌫` stop · `⌘⇧o` new chat · `[ ]` prev/next
  conversation.
- **Empty State:** D2 §15 Chat empty (New chat + prompt suggestions).
- **Loading:** Thinking State (Aurora shimmer, not spinner) → Streaming tokens.
- **Error:** inline message error with retry; partial output preserved; rate-limit explained with wait.
- **RBAC:** Editor+; Analyst/Viewer read shared threads only.
- **AI Assistance:** the screen itself. **Trust** on every answer (Generated/Verified + Source Available/None);
  **Explainability**: model/route, sources cited, confidence, limits. Tool Call cards for retrieve/generate/
  validate steps.
- **Performance UX:** Instant: shell + history. Streaming: response tokens + tool steps. Lazy: older messages
  (virtualized). Cached: recent conversations.
- **Mobile:** full-screen thread; history + inspector as sheets; composer docked.
- **Tablet:** collapsible history rail; inspector as sheet.
- **Desktop:** three-pane (history · thread · inspector).
- **Related:** Chat History, Knowledge, Memory, Prompt Library, Telegram Bots.

## 6. Chat History
- **Purpose:** find, organize and resume conversations.
- **Primary User:** Editor+.
- **Entry Points:** Chat rail "See all", ⌘K `@`, `g c` then history.
- **Layout:** searchable list (title, snippet, model, time, pin), grouped by date; row → opens thread; Inspector
  shows conversation metadata + participants + cost.
- **Information Hierarchy:** recent/pinned first; search & filters (model, channel, date).
- **Primary Actions:** **Open**, **New chat**.
- **Secondary Actions:** pin, rename, delete (guarded), export, bulk-select (Advanced).
- **Keyboard Shortcuts:** `j/k`, `↵` open, `x` select, `#` search.
- **Empty State:** "No conversations yet" → New chat.
- **Loading:** list skeleton; Cached list then revalidate.
- **Error:** section error + retry.
- **RBAC:** own + shared per role.
- **AI Assistance:** AI **search** ("find the chat where we discussed pricing") and **summarize a conversation**
  (Generated · Source Available). Explainability: which messages matched.
- **Mobile:** full list; swipe actions.
- **Tablet/Desktop:** list + Inspector.
- **Related:** AI Chat.

## 7. Knowledge Base (Knowledge Workspace)
- **Purpose:** ingest, browse, search the KB and preview retrieval (§R9.3), channel-isolated (§R2.6).
- **Primary User:** Editor/Admin.
- **Entry Points:** `g k`, ⌘K, chat citations, onboarding.
- **Layout (A1):** Nav → **Content**: document list (title, source, size, ingest status) or document **reader**
  (Markdown, D2 §17) with **chunk inspector**; **Inspector**: chunk detail + retrieval score + "used by" ·
  **Retrieval Preview** panel (enter query → Knowledge Cards the AI would retrieve).
- **Information Hierarchy:** sources → document → chunks → retrieval preview.
- **Primary Actions:** **Add source** (File Upload D2 §13.21), **Search knowledge**.
- **Secondary Actions:** re-ingest, delete, exclude chunk, download, filter by source/date.
- **Keyboard Shortcuts:** `n` add source · `/` search · `j/k` navigate chunks · `↵` inspect.
- **Empty State:** D2 §15 Knowledge empty (Add source + "see how retrieval works").
- **Loading:** ingest progress streaming (chunking); reader skeleton.
- **Error:** per-file ingest errors (type/size/parse) with retry; retrieval errors inline.
- **RBAC:** Editor/Admin write; Analyst/Viewer read.
- **AI Assistance:** **Summarize document**, **suggest tags**, **answer from this doc** (Generated · Source
  Available with Citations). Explainability: retrieval score, chunks used, confidence; Trust badges per answer.
- **Performance UX:** Instant: list shell. Streaming: ingestion + retrieval preview. Lazy: document body.
  Cached: source list.
- **Mobile:** list → reader full-screen; chunk inspector as sheet.
- **Tablet:** list + reader; inspector sheet.
- **Desktop:** list · reader · inspector (three-pane on wide).
- **Related:** AI Chat (citations), Memory, Prompt Library.

## 8. Memory (Memory Explorer)
- **Purpose:** make per-channel style/persona/actor memory legible (§R9); answer "why did it write like this?"
- **Primary User:** Editor/Admin (Analyst read).
- **Entry Points:** `g m`, ⌘K, chat Memory Cards, "explain this post" from a published post.
- **Layout (A1):** scope switcher (channel / global) → **Content**: memory entries grouped by kind (published-
  post, style features, persona, actors) → **Inspector**: entry detail + **trace** (post ← memory/knowledge
  that shaped it).
- **Information Hierarchy:** scope → kind → entry → trace.
- **Primary Actions:** **Explain a post** (trace), **Search memory**.
- **Secondary Actions:** edit entry (guarded, audited), pin, exclude from generation, compare style over time
  (Advanced).
- **Keyboard Shortcuts:** `/` search · `j/k` · `↵` inspect · `e` edit (guarded).
- **Empty State:** "Memory grows as you publish. Here's what shapes this channel's voice."
- **Loading:** list skeleton; trace streams.
- **Error:** section error + retry.
- **RBAC:** Editor/Admin write (audited); Analyst/Viewer read; global scope owner/admin only.
- **AI Assistance:** **AI-assisted search** ("find memories about tone"), **explain influence** (Generated ·
  Source Available → Memory/Knowledge Cards). Explainability: which entries influenced output + confidence;
  Trust: edits marked, generation influence shown.
- **Performance UX:** Instant: shell. Streaming: trace. Lazy: deep history. Cached: entries.
- **Mobile:** scope + list; inspector sheet.
- **Tablet/Desktop:** list + inspector; trace as timeline (D2 §13.23).
- **Related:** Knowledge, AI Chat, Content/Posts, Analytics (style-consistency).

## 9. Image Studio
- **Purpose:** prompt → generate → verify photorealistic images and attach to posts (§R6).
- **Primary User:** Editor/Admin.
- **Entry Points:** `g i`, ⌘K, compose flow ("generate image"), post editor.
- **Layout (A1):** **Content**: prompt composer (prompt + negative + **aspect/size preset** + identity
  references via File Upload) and a results grid (Image Result cards D2 §14) → **Inspector**: result detail
  (prompt disclosure, verification chips, seed, regen history).
- **Information Hierarchy:** prompt & controls → generation status → results → verification.
- **Primary Actions:** **Generate**, **Accept / Attach to post**, **Regenerate**.
- **Secondary Actions:** batch generate (Advanced), download, edit negative/style, set references, compare
  variants.
- **Keyboard Shortcuts:** `⌘↵` generate · `r` regenerate · `↵` inspect · `a` accept.
- **Empty State:** "Describe an image. Presets and references keep your channel's look consistent."
- **Loading:** generation **Streaming** status per image; grid skeleton.
- **Error:** provider/safety errors explained (safety rejection → why + adjust); regen-limit surfaced (§R6).
- **RBAC:** Editor/Admin; Analyst/Viewer read.
- **AI Assistance:** **AI improves prompts** (suggested rewrites), **suggests presets**, **explains
  verification** (phash/CLIP/safety). Trust: Verified/Needs Review chips; Source Available = reference images.
  Explainability: checks run, confidence, limits (gated CLIP if provider absent → labeled).
- **Performance UX:** Instant: composer. Streaming: generation + verification. Lazy: history grid. Cached:
  recent results.
- **Mobile:** composer → results full-screen; inspector sheet.
- **Tablet/Desktop:** composer + grid + inspector.
- **Related:** AI Chat, Content/Posts, Prompt Library, Providers.

## 10. Prompt Library (Prompt Workspace)
- **Purpose:** author, version, and manage prompts (§R10.6).
- **Primary User:** Editor/Admin.
- **Entry Points:** `g p`, ⌘K, chat "save as prompt", Playground.
- **Layout (A1):** **Content**: prompt list (name, active version, variables, edited) or **version editor**
  (Markdown with variable highlighting) → **Inspector**: version metadata + **diff** vs previous + usage.
- **Information Hierarchy:** prompts → versions → editor/diff.
- **Primary Actions:** **New prompt / New version**, **Run in Playground**, **Promote to active** (guarded).
- **Secondary Actions:** duplicate, delete, compare versions, insert variables.
- **Keyboard Shortcuts:** `n` new · `⌘s` save version · `⌘↵` run in Playground · `d` diff.
- **Empty State:** "Create reusable prompts with variables. Test them safely in the Playground."
- **Loading:** editor skeleton; version list Cached.
- **Error:** validation (unclosed variable), save conflicts (version bump), inline.
- **RBAC:** Editor/Admin write; Analyst/Viewer read.
- **AI Assistance:** **AI drafts/refines prompts**, **suggests variables**, **critiques a prompt** (Generated ·
  No Sources unless grounded). Explainability: what changed & why; Trust on generated prompt text.
- **Performance UX:** Instant: list/editor shell. Streaming: AI refine. Lazy: version history. Cached: prompts.
- **Mobile:** list → editor full-screen; diff as sheet.
- **Tablet/Desktop:** list + editor + inspector.
- **Related:** AI Playground, AI Chat, Providers.

## 11. AI Playground
- **Purpose:** isolated dry-run / model comparison / cost estimate (§R10.9 — never writes memory or publishes).
- **Primary User:** Editor/Admin/Owner.
- **Entry Points:** `g` → Playground, Prompt Library "Run", ⌘K.
- **Layout:** split — left **inputs** (prompt/version, variables, model/route, params) · right **output(s)**
  (Streaming Message; compare 2–3 models side-by-side). Cost estimate before run; Inspector shows run detail.
- **Information Hierarchy:** inputs → run → outputs/compare → cost.
- **Primary Actions:** **Run (dry-run)**, **Compare**, **Save as prompt version**.
- **Secondary Actions:** change params, add model, copy output, export run.
- **Keyboard Shortcuts:** `⌘↵` run · `⌘⇧↵` run all (compare) · `⌘s` save version.
- **Empty State:** "Test prompts and compare models safely. Nothing here publishes or changes memory."
- **Loading:** Thinking → Streaming per output column.
- **Error:** per-model error isolated (one model fails, others continue); rate/limit explained.
- **RBAC:** Editor/Admin/Owner; isolation guaranteed (badge: "Isolated — no side effects").
- **AI Assistance:** the screen; plus **explain differences** between model outputs (Generated). Explainability:
  cost/latency per model, params used, confidence; Trust: isolation badge, No Sources unless grounded.
- **Performance UX:** Instant: inputs. Streaming: each output. Lazy: run history. Cached: last inputs.
- **Mobile:** stacked input→output; compare as swipeable tabs.
- **Tablet/Desktop:** split / multi-column compare.
- **Related:** Prompt Library, Providers, AI Chat.

## 12. Analytics
- **Purpose:** understand cost/quality/system/diversity; engagement clearly gated (§R10.3/§R11).
- **Primary User:** Analyst/Owner/Admin (all roles read).
- **Entry Points:** `g a`, ⌘K, metric-card drill-downs, Dashboard.
- **Layout (A1):** filter bar (time range, channel) → **reliable panels first** (Cost, Quality, System,
  Content-diversity) as Charts + Metric Cards → **Engagement** panels rendered as **Gated** cards → Inspector
  for a datapoint/period detail.
- **Information Hierarchy:** reliable metrics → cost forecast → gated engagement (clearly labeled) → export.
- **Primary Actions:** **Change range/channel**, **Export/Share** (URL-encoded state).
- **Secondary Actions:** compare periods, toggle series (legend), download CSV, drill to Jobs/Logs.
- **Keyboard Shortcuts:** `r` range · `[ ]` prev/next period · `e` export · `/` ask AI.
- **Empty State:** "No data for this range yet" per panel; Engagement = Gated empty card (D2 §15).
- **Loading:** chart skeletons (axis + shimmer); Streaming for live counters; Cached last view.
- **Error:** per-panel error + retry; provenance always shown.
- **RBAC:** read for all; export per role.
- **AI Assistance:** **AI explains changes** ("cost up 18% — driven by image regens on Channel X"), anomaly
  callouts, "ask about this chart". **Explainability is mandatory** (source · filters · algorithm version ·
  time, §R11.9); Trust: Generated summary + Source Available (links to underlying data); gated metrics never
  fabricated.
- **Performance UX:** Instant: shell + cached charts. Streaming: live counters. Lazy: deep breakdowns. Cached:
  last range.
- **Mobile:** stacked panels; horizontal-scroll charts; filters in a sheet.
- **Tablet:** 2-col panels.
- **Desktop:** grid of panels + Inspector.
- **Related:** Billing (cost), Jobs, Dashboard, Memory (style-consistency).

## 13. Telegram Bots (Channels)
- **Purpose:** manage channels and their Telegram bot connections (Channels are the primary entity; bots are the
  connection mechanism).
- **Primary User:** Owner/Admin (Editor content-only).
- **Entry Points:** `g b`, ⌘K, onboarding, Dashboard channel switcher.
- **Layout (A1):** **Content**: channel list (name, status, language, bot health, schedule) or channel **detail**
  (tabs: Overview · Schedule · Persona · Actors · Content · Memory) → **Inspector**: bot connection & rate-limit
  status, publish health.
- **Information Hierarchy:** channels → channel detail tabs → connection health.
- **Primary Actions:** **Create channel**, **Connect/rotate bot token** (write-only), **Publish/Schedule**.
- **Secondary Actions:** pause/resume channel, edit persona, bulk (respect per-bot limits §R10.7), test
  connection.
- **Keyboard Shortcuts:** `n` new channel · `p` publish · `/` ask AI · tab-nav within detail.
- **Empty State:** onboarding hero → Create first channel.
- **Loading:** shell instant; health streams; lists cached.
- **Error:** connection errors explain (bad token/kicked → permanent, guidance); 429s show back-off; ambiguous
  publish → **Needs Review** (§R7.4).
- **RBAC:** Owner/Admin manage; Editor content; Analyst/Viewer read.
- **AI Assistance:** **AI suggests schedule/persona**, **drafts posts for this channel**, **explains publish
  failures**. Trust on drafts (Generated/Verified/Needs Review); Explainability: rate-limit key, error class,
  confidence.
- **Performance UX:** Instant: list. Streaming: health + publish status. Lazy: content history. Cached: channels.
- **Mobile:** list → detail full-screen; tabs scroll; inspector sheet.
- **Tablet/Desktop:** list + detail + inspector.
- **Related:** Dashboard, Image Studio, Analytics, Jobs, Providers.

## 14. Admin Panel
- **Purpose:** governance — users, roles, sessions, config versions (§R10.4/§R10.5/§R10.8).
- **Primary User:** Owner (Admin subset).
- **Entry Points:** Platform group, ⌘K (RBAC-gated), Settings.
- **Layout (A1):** tabs — **Users & Roles** (table) · **Sessions** (revoke) · **Config Versions** (compare/
  rollback) → **Inspector**: user/session/config detail + activity + Actions.
- **Information Hierarchy:** users → roles/sessions → config history.
- **Primary Actions:** **Invite user**, **Set role**, **Revoke session**, **Rollback config** (guarded).
- **Secondary Actions:** deactivate user, compare config versions, export audit slice.
- **Keyboard Shortcuts:** `n` invite · `↵` inspect · destructive actions require confirm (no bare shortcut).
- **Empty State:** "Invite your team and assign roles."
- **Loading:** table skeleton; cached.
- **Error:** permission errors explain; optimistic role change reconciles.
- **RBAC:** Owner full; Admin limited (no user/key management, per matrix); others no access (screen hidden).
- **AI Assistance:** **AI summarizes access changes**, **flags risky permissions** ("3 owners — review?").
  Explainability + audit link; Trust: Generated advisory, Source Available (audit_log).
- **Performance UX:** Instant: shell. Lazy: config diffs. Streaming: session state. Cached: user list.
- **Mobile:** table → card rows; inspector sheet; destructive confirmations full-screen.
- **Tablet/Desktop:** table + inspector.
- **Related:** Providers, Audit, Feature Flags, User Profile, Billing.

## 15. Providers
- **Purpose:** view providers (LLM/image/embedding/Telegram), capabilities, health; rotate keys (write-only).
- **Primary User:** Owner (Admin read).
- **Entry Points:** Platform group, ⌘K, Playground/Studio "provider" links.
- **Layout (A1):** provider cards/list (name, kind, capabilities, health dot) → **Inspector**: capabilities,
  health probes, **key management (write-only, never displayed)**, usage/cost link.
- **Information Hierarchy:** providers → health/capabilities → keys/usage.
- **Primary Actions:** **Rotate key** (Owner, write-only), **Test/health check**.
- **Secondary Actions:** enable/disable, set default model routing, view usage.
- **Keyboard Shortcuts:** `↵` inspect · `t` test · key actions confirm.
- **Empty State:** "No providers configured. Console runs on deterministic fakes until you add keys" (honest,
  §R2.10).
- **Loading:** health streams; cards cached.
- **Error:** health failures shown as status dots + detail; key errors explain (never echo the key).
- **RBAC:** Owner manage keys; Admin read; others hidden.
- **AI Assistance:** **AI recommends routing/cost trade-offs**, **explains a provider outage**. Explainability:
  capability match, health source; Trust: advisory Generated, gated health if provider offline (RV-10 labeled).
- **Performance UX:** Instant: list. Streaming: health. Lazy: usage. Cached: provider list.
- **Mobile:** cards; inspector sheet.
- **Tablet/Desktop:** grid + inspector.
- **Related:** Playground, Image Studio, Analytics, Billing, Admin.

## 16. Health Dashboard
- **Purpose:** liveness/readiness at a glance; drill to failing probes (§R12.10) — no business logic (§R10-13).
- **Primary User:** Owner/Admin.
- **Entry Points:** Platform group, ⌘K, alert links, Jobs/Logs cross-links.
- **Layout:** top summary (overall health dot + uptime) → probe list (name · state · detail: PostgreSQL, Redis,
  queue, scheduler) → Inspector: probe history + linked jobs/logs.
- **Information Hierarchy:** overall → per-probe → history/links.
- **Primary Actions:** **Re-check**, **Open runbook** (Docs), **Go to Jobs/Logs**.
- **Secondary Actions:** filter by service, subscribe to alerts.
- **Keyboard Shortcuts:** `r` re-check · `↵` inspect probe.
- **Empty State:** "All systems reporting" calm green summary.
- **Loading:** probe skeleton; Streaming state updates.
- **Error:** unreachable = grey "unknown"/gated (never fake green); degraded amber; down red — grouped, not a
  red wall (D2 §12).
- **RBAC:** Owner/Admin; Analyst read; Viewer read-limited.
- **AI Assistance:** **AI triages** ("readiness red because Redis probe failing — see Jobs backlog"), suggests
  the matching runbook. Explainability: which probe/data; Trust: Generated triage + Source Available (probe/
  logs).
- **Performance UX:** Instant: summary. Streaming: probe states. Lazy: history. Cached: last snapshot.
- **Mobile:** stacked probes; inspector sheet.
- **Tablet/Desktop:** summary + probe list + inspector.
- **Related:** Jobs, Logs, Documentation (runbooks), Notifications.

## 17. Jobs Dashboard
- **Purpose:** monitor queue/tasks; requeue DLQ items as **queue intents** (§R4.11/§R10.1).
- **Primary User:** Owner/Admin.
- **Entry Points:** Platform group, ⌘K "requeue job", Health/Analytics links, alerts.
- **Layout (A1):** filter bar (status, kind, channel) → tasks table (id, kind, status §11, attempts, error) →
  Inspector: task detail (payload summary, history timeline, error) + **Requeue** action.
- **Information Hierarchy:** attention (Failed/Needs Review) → running/queued → completed.
- **Primary Actions:** **Requeue** (intent), **Retry**, **Open task**.
- **Secondary Actions:** bulk requeue (respect limits §R10.7), filter, export.
- **Keyboard Shortcuts:** `j/k` · `↵` inspect · `r` requeue (confirm) · `x` select · `#` search.
- **Empty State:** "No jobs running. Scheduled work will appear here."
- **Loading:** table skeleton; Streaming status transitions.
- **Error:** task errors classified (transient vs permanent); requeue confirmation; ambiguous → Needs Review.
- **RBAC:** Owner/Admin manage; Analyst read; Viewer read.
- **AI Assistance:** **AI explains a stuck pipeline**, groups similar failures, suggests requeue vs fix.
  Explainability: error class, stage, confidence; Trust: Generated diagnosis + Source Available (logs/task).
- **Performance UX:** Instant: shell. Streaming: statuses. Lazy: deep history. Cached: recent tasks.
- **Mobile:** card rows; inspector sheet; bulk in a sheet.
- **Tablet/Desktop:** table + inspector.
- **Related:** Health, Logs, Analytics, Telegram Bots.

## 18. Logs
- **Purpose:** structured log viewer for diagnosis (§R12.9).
- **Primary User:** Owner/Admin.
- **Entry Points:** Platform group, ⌘K, Health/Jobs "view logs" (pre-filtered).
- **Layout:** filter bar (level, service, time, `request/task_id`, `channel_id`) → virtualized log stream
  (time · level · service · message) → Inspector: full structured entry (JSON, pretty) + correlated entries.
- **Information Hierarchy:** filters → stream (newest/tailing) → entry detail.
- **Primary Actions:** **Filter**, **Tail (live)**, **Open entry**.
- **Secondary Actions:** copy entry, jump to correlated task, save filter (Power User), export slice.
- **Keyboard Shortcuts:** `f` focus filter · `t` toggle tail · `j/k` · `↵` inspect · `/` ask AI.
- **Empty State:** "No logs match. Adjust filters or widen the range."
- **Loading:** stream skeleton; **Streaming** tail; cached recent.
- **Error:** query errors explain; secrets are masked (§R12.2) — never rendered.
- **RBAC:** Owner/Admin; Analyst read subset; Viewer hidden/limited.
- **AI Assistance:** **AI analyzes errors** ("42 failures share this stack — likely bad token on Channel X"),
  clusters, links to runbook. Explainability: which entries, time window, confidence; Trust: Generated analysis
  + Source Available (entries).
- **Performance UX:** Instant: shell + filters. Streaming: live tail. Lazy: older pages (virtualized). Cached:
  last query.
- **Mobile:** stream full-screen; filters + entry as sheets.
- **Tablet/Desktop:** stream + inspector.
- **Related:** Jobs, Health, Audit, Documentation.

## 19. Audit
- **Purpose:** formal record of who did what (`audit_log`, §R10.8) — the trustworthy history.
- **Primary User:** Owner/Admin/Analyst (read).
- **Entry Points:** Platform group, ⌘K, Admin/entity "view audit".
- **Layout:** filter bar (actor, action, entity, time) → audit table (time · actor · action · entity · before→
  after) → Inspector: full diff (before/after JSON) + linked entity.
- **Information Hierarchy:** filters → records → diff detail.
- **Primary Actions:** **Filter**, **Open record**, **Export**.
- **Secondary Actions:** jump to entity, save view, copy record.
- **Keyboard Shortcuts:** `f` filter · `j/k` · `↵` diff · `e` export.
- **Empty State:** "No audited actions for these filters."
- **Loading:** table skeleton; cached.
- **Error:** query errors explain; read-only (audit is immutable).
- **RBAC:** Owner/Admin/Analyst read (per matrix); no edits ever.
- **AI Assistance:** **AI summarizes activity** ("this week: 3 role changes, 1 key rotation"), anomaly flags.
  Explainability: which records; Trust: Generated summary, Source Available (records); the audit itself is the
  source of truth (never AI-altered).
- **Performance UX:** Instant: shell. Lazy: diffs. Cached: recent records. (No streaming — audit is settled.)
- **Mobile:** card rows; diff as sheet.
- **Tablet/Desktop:** table + inspector.
- **Related:** Admin, Logs, Providers, Feature Flags.

## 20. Feature Flags
- **Purpose:** toggle flags; view rollout seams (D2 §18 extensibility; §R10 admin).
- **Primary User:** Owner/Admin.
- **Entry Points:** Platform group, ⌘K.
- **Layout (A1):** flag list (name, state toggle, description, rollout) → Inspector: flag detail + change history
  + rollout seam (declared, not implemented → labeled).
- **Information Hierarchy:** flags → state → history/rollout.
- **Primary Actions:** **Toggle flag** (guarded), **Open detail**.
- **Secondary Actions:** search, filter by state, view history.
- **Keyboard Shortcuts:** `/` search · `↵` inspect · space toggle (confirm for impactful flags).
- **Empty State:** "No feature flags defined."
- **Loading:** list skeleton; cached.
- **Error:** toggle errors reconcile; permission errors explain.
- **RBAC:** Owner/Admin; others hidden.
- **AI Assistance:** **AI explains a flag's impact** and **what depends on it**. Explainability: dependencies,
  confidence; Trust: Generated advisory + Source Available (config/audit).
- **Performance UX:** Instant: list. Lazy: history. Cached: flags. Streaming: n/a.
- **Mobile:** list with toggles; inspector sheet.
- **Tablet/Desktop:** list + inspector.
- **Related:** Admin, Audit, Providers.

## 21. Billing
- **Purpose:** plan, usage, and cost/forecast (§R11.8 cost forecasting; §R11 cost analysis).
- **Primary User:** Owner (Analyst read).
- **Entry Points:** Account/Platform, ⌘K, Analytics cost drill.
- **Layout:** plan summary + current spend Metric Cards → usage charts (by provider/channel/model) → invoices/
  history → Inspector: line-item detail.
- **Information Hierarchy:** current cost/forecast → usage breakdown → history.
- **Primary Actions:** **Manage plan** (seam / external → labeled RV), **Export invoice**.
- **Secondary Actions:** set budget alerts, filter usage, download CSV.
- **Keyboard Shortcuts:** `r` range · `e` export.
- **Empty State:** "Usage will appear as the platform runs. Costs are estimated from api_usage/image_usage."
- **Loading:** chart/card skeletons; cached.
- **Error:** per-panel error; real billing provider = RV (labeled, no fake charges).
- **RBAC:** Owner manage; Analyst read; others limited.
- **AI Assistance:** **AI forecasts cost**, **explains spikes**, **suggests savings** (routing/regen limits).
  Explainability: source (api_usage/image_usage), algorithm version, confidence (§R11.9); Trust: Generated
  forecast clearly labeled as estimate.
- **Performance UX:** Instant: shell. Streaming: live spend. Lazy: history. Cached: last view.
- **Mobile:** stacked; charts scroll.
- **Tablet/Desktop:** cards + charts + inspector.
- **Related:** Analytics, Providers, Settings.

## 22. Notifications
- **Purpose:** the notification center + preferences (D1 §6.7).
- **Primary User:** all roles.
- **Entry Points:** topbar bell, ⌘K, deep links from toasts.
- **Layout:** grouped list by kind (Pipeline/Needs-Review, Jobs, Health/Alerts, Billing, System) → Inspector:
  notification detail + linked entity + Actions. Preferences tab (per-kind channels).
- **Information Hierarchy:** unread/attention → by kind → detail; preferences separate.
- **Primary Actions:** **Open item**, **Mark read / all read**, **Act** (e.g., Review, Requeue).
- **Secondary Actions:** mute a kind, snooze, filter, preferences.
- **Keyboard Shortcuts:** `j/k` · `↵` open · `r` mark read · `a` mark all.
- **Empty State:** "You're all caught up."
- **Loading:** list skeleton; **Streaming** new items; cached.
- **Error:** section error + retry.
- **RBAC:** everyone sees their own; role scopes which kinds exist.
- **AI Assistance:** **AI summarizes/prioritizes** ("2 need review, 1 health alert"), suggests the next action.
  Explainability: why prioritized; Trust: Generated summary + Source Available (linked entities).
- **Performance UX:** Instant: shell. Streaming: incoming. Lazy: older. Cached: recent.
- **Mobile:** full list; swipe read; preferences in Settings.
- **Tablet/Desktop:** list + inspector.
- **Related:** Dashboard, Jobs, Health, Billing, Settings.

## 23. Settings
- **Purpose:** appearance, account, security, experience preferences.
- **Primary User:** all roles (scoped).
- **Entry Points:** avatar menu, ⌘K, `⌘,`.
- **Layout (A1):** left settings nav (Appearance · Account · Security · Notifications · Experience · Advanced) →
  **Content** form panels → Inspector for contextual help/preview.
- **Information Hierarchy:** most-changed first (Appearance: **theme dark/light**, **density comfortable/
  compact**, accent) → account → security (sessions, MFA seam) → experience level (Beginner/Advanced/Power) →
  advanced.
- **Primary Actions:** **Save** (auto-save preferred), **Sign out other sessions**.
- **Secondary Actions:** reset defaults, export data, connect SSO (seam).
- **Keyboard Shortcuts:** `⌘⇧L` theme · `⌘⇧D` density · `⌘s` save.
- **Empty State:** n/a (always populated with defaults).
- **Loading:** form skeleton; cached prefs applied instantly.
- **Error:** inline per-field; security changes confirm.
- **RBAC:** personal settings for all; org/security settings Owner/Admin.
- **AI Assistance:** **AI explains each parameter** ("what does LEAD_TIME do?"), recommends settings for the
  user's goals. Explainability: doc source; Trust: Generated help + Source Available (Docs). No AI writes to
  security-critical fields.
- **Performance UX:** Instant: everything (prefs cached; theme/density apply optimistically).
- **Mobile:** settings nav as top tabs / accordion; full-width forms.
- **Tablet/Desktop:** two-pane (nav + form).
- **Related:** User Profile, Notifications, Documentation, Admin.

## 24. User Profile
- **Purpose:** identity, sessions, personal activity.
- **Primary User:** the user.
- **Entry Points:** avatar menu, ⌘K, Admin (viewing another user, RBAC).
- **Layout:** header (avatar, name, role, email) → tabs (Overview · Sessions · Activity) → Inspector for a
  session/activity item.
- **Information Hierarchy:** identity → active sessions (revoke) → recent activity feed.
- **Primary Actions:** **Edit profile**, **Revoke session**.
- **Secondary Actions:** change avatar, view activity, sign out everywhere.
- **Keyboard Shortcuts:** `e` edit · `↵` inspect.
- **Empty State:** "No recent activity."
- **Loading:** skeleton; cached.
- **Error:** inline; session revoke confirms.
- **RBAC:** self full; Owner/Admin may view others (read) per matrix; secrets never shown.
- **AI Assistance:** **AI summarizes your recent activity**; security tips. Explainability + Trust (Generated ·
  Source Available = activity/audit).
- **Performance UX:** Instant: header. Lazy: activity. Cached: profile. Streaming: session state.
- **Mobile:** stacked; tabs scroll; inspector sheet.
- **Tablet/Desktop:** header + tabs + inspector.
- **Related:** Settings, Admin, Audit, Notifications.

## 25. Documentation
- **Purpose:** in-app help & docs (mirrors `docs/`), searchable, contextual.
- **Primary User:** all roles.
- **Entry Points:** `⌘/` help, ⌘K `#`, contextual "learn more" links, runbook links from Health/Jobs.
- **Layout:** left docs tree (Architecture/API/Developer/Operations/Deployment/Security/Runbooks/Troubleshooting
  /Release/Support) → **reader** (Markdown D2 §17, 72ch) → Inspector: on-page TOC + related.
- **Information Hierarchy:** search → section → article → related.
- **Primary Actions:** **Search docs**, **Open article**.
- **Secondary Actions:** copy code, open runbook, give feedback, deep-link a heading.
- **Keyboard Shortcuts:** `/` search · `j/k` · `↵` open · `⌘/` from anywhere.
- **Empty State:** "Search the docs or pick a section."
- **Loading:** reader skeleton; cached articles.
- **Error:** missing article → suggest search + nearest matches.
- **RBAC:** public docs for all; ops runbooks may be role-scoped.
- **AI Assistance:** **AI answers from docs** ("how do I rotate a provider key?") with **Citations** to the
  exact article; **summarize** long pages. Explainability: which articles; Trust: Generated · **Source
  Available** (always cited); if unsupported → "No Sources" and defers to search.
- **Performance UX:** Instant: shell. Lazy: article body. Cached: docs tree + recent. Streaming: AI answer.
- **Mobile:** tree as sheet; reader full-screen.
- **Tablet/Desktop:** tree + reader + TOC inspector.
- **Related:** Health (runbooks), Settings, every screen (contextual help).

---

# Part C — Cross-screen transitions (summary)

- **Compose → Pipeline:** Dashboard/Chat/Channel "Compose" → streaming draft → validate chips → image →
  single Review surface → publish/schedule → later Analytics. Failure at any stage → **Needs Review**
  (Dashboard/Jobs), never silent (§R8.4/§R7.4).
- **Cite → Source:** any Citation (Chat/Docs/Analytics) opens the Knowledge/Memory Inspector at the exact chunk
  — no navigation loss (A3).
- **Alert → Triage:** Notification/Health alert → Health probe → Jobs (requeue intent) → Logs (pre-filtered) →
  Docs runbook. Fast path `⌘K`.
- **Explain-this:** a published post → Memory "explain" trace → Knowledge/Memory Cards → back, all via Inspector.
- **Everything ⌘K:** every screen and action above is reachable via the palette (A4), RBAC-filtered.

---

**STOP — D3 complete. Awaiting your approval to proceed to D4 (FULL UI SPECIFICATION: consolidated handoff +
accessibility checklist + responsive rule set + token reference), after which the non-production Preview
Artifact (style tile · UI preview · component gallery).**
