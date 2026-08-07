# FS12 — Platform & Admin (Plan)

**Track:** Web Platform implementation · **SoT:** `FRONTEND_MASTER_SPEC.md` · implements the **Platform & Admin
surface** (D1 §5.2/§5.3 — **nine screens**: D3 §14 Admin · §15 Providers · §16 Health · §17 Jobs · §18 Logs ·
§19 Audit · §20 Feature Flags · §21 Billing · §22 Notifications) through Stage 2 §5 (rendering group *"Admin /
Providers / Jobs / Logs / Audit / Flags / Notifications: RSC lists (dynamic) + client interactions"*), §7 (six
state owners), §8 (**SEC-6 secrets are write-only**), §9 (budgets), and the Stage 3 inventories (§1 route group
`(platform)/{admin,providers,health,jobs,logs,audit,flags,billing,notifications}` · §5 routing rows · §3
features `requeue-job` / `manage-users` / `rotate-key` / `toggle-flag` / `rollback-config` /
`manage-notifications` · §4 entities `user` / `provider` / `audit` / `flag` / `notification` / `health` / `log`
/ `billing` / `session` · §8 API rows, **five of which Stage 3 itself marked *(assumed)***).

**This is a PLAN. No code yet.**

**The headline finding of the contract check.** Stage 3 §8 marked the providers, logs, flags, notifications and
billing rows *(assumed)* — "finalized against the contract in FS-Infrastructure". FS12 is where that
finalization happens, and **the frozen `API_SPEC.md` refutes five of them outright**. There is **no
`/providers` endpoint**, **no logs endpoint**, **no feature-flag endpoint**, **no notifications endpoint**, and
**no plan/invoice/forecast endpoint** anywhere in `/api/v1` — nor a `feature_flags`, `notifications`,
`sessions` or `providers` table in the frozen 25 (§R4.10). This is the FS9 precedent at nine-screen scale
(D4 §4's assumed `POST /images` did not exist either), and it is decided the same way: **what the contract
backs is built for real; what it cannot back becomes a visible, specific honest seam — never a simulation, and
never a fixture that implies data the wire does not carry.**

**Goal of FS12:** give the platform its **governance surface** — who did what, what is running, what is
failing, what it costs, and what is unavailable — on **exactly the calls the contract carries**, with the
project's first **secret-writing** surface proved write-only by mechanism (§R10.4/§R12.2/SEC-6). Five routes
stop being stubs with real data (`/admin`, `/jobs`, `/audit`, `/health`, `/providers`), one more if the owner
rules D9 Option A (`/billing`), and three (`/logs`, `/flags`, `/notifications`) become honest, specific
absence surfaces that state the fact, the reason and what a future backend MINOR would need — the FS8 rule
("when the contract has no endpoint, the screen is still deliverable") applied to its hardest case.
**No `app/` / Protocol / MASTER_SPEC change · no endpoint invented · no ONYX token-value change · no new
dependency · no threshold pre-raised.**

**Entry conditions — satisfied.** FS11 accepted 2026-08-03 (size-limit re-baselined to **696 kB** after a
dedicated addendum **and** a full evidence pack; the I2 re-partition deviation ruled resolved; post-FS11
standing references **`/chat` 179** · `/knowledge` 176 · `/dashboard` 168 · `/studio` 165 · `/prompts` 150 ·
`/memory` 149 · `/analytics` 148 · stubs 107 · shared commons 107; FE-RV-14 opened). This plan is FS12's first
deliverable. Frozen FS12 entry duties (handoff PART4 §8.2): the platform surfaces per D3, **RBAC-correct
(403 renders a permission state, never a crash)**, **secrets write-only in the UI**, the **seven fixed
artefacts** (PART1 §4.5/§4.6 → §3.1–§3.7 below), **ZERO commons bytes**, every heavy leaf lazy from the start,
and — because FS12 is the widest stage by route count and extends slices other screens already import —
**R1c** (first-consumer measurement) and **R1f** (the barrel lesson) both apply directly and are executed as
**tasks**, not assertions.

---

## 1. Scope

**IN:**

- **T-FS12.1 — the ZERO-commons lock, the R1c first-consumer DECISION GATE, and the protected-route baseline
  (FIRST, before any feature code).** Three locks, all landed before a single platform screen exists:
  1. **Zero commons rows.** Every FS12 key and path builder is **entity-local**
     (`entities/<slice>/{keys,paths}.ts` — the FS9/FS10/FS11 mechanism). `shared/config/query-keys.ts` and
     `shared/lib/api/endpoints.ts` gain **pointer comments only — zero rows** (comments are stripped at build
     ⇒ exactly 0 runtime bytes). Locked by a grep test that fails if any FS12 builder appears in either
     commons module. **One deliberate exception that costs nothing:** the FS1 row `queryKeys.health()` already
     exists in commons and is currently **unused** (verified: zero importers) — the health probe query
     **reuses it as-is**, byte-identical, so the readiness surface adds zero rows rather than duplicating a
     key that is already paid for.
  2. **The R1c first-consumer DECISION GATE for `shared/ui/data-table`.** Verified at plan time:
     **`@/shared/ui/data-table` has ZERO product consumers today** — TanStack **Table** is in no bundle at
     all, and four FS12 screens (Admin users, Jobs, Audit, and the Billing breakdown) are its natural first
     consumers. This is **exactly the FS10 failure mode** (becoming CodeBlock's first consumer put Shiki's
     grammar graph into the webpack runtime's chunk-id map and cost **every** route 3–4 kB with each route's
     chunk *set* unchanged). T-FS12.1 therefore: records the **baseline webpack runtime chunk size (gz)** and
     the full 31-route table; wires **one** DataTable behind its frozen `lazy.tsx` entrypoint; re-measures.
     **Pre-declared outcome rule** — no argument, no hypothesis: if the runtime chunk and every protected
     route are unmoved, DataTable is adopted for all four tables; **if any protected route moves, DataTable is
     abandoned for FS12** and the tables are built from ONYX primitives with the already-proven pattern
     (`DocumentList` FS7 / `PromptTypeList` FS10 / `ImageGrid` FS9: semantic markup, `j/k/↵`, sticky header,
     `tnum` numerics per D2 §13.5), which costs zero new dependency weight. **The fallback is not a
     degradation** — it is the same interaction contract without the runtime-map tax.
  3. **The protected-route baseline.** `pnpm budget` + `app-build-manifest.json` captured **before any FS12
     code**, so every later movement is a byte comparison rather than a recollection (FS11 requirement 52).
- **Entities (T-FS12.2) — seven new slices, each channel-free by construction unless the contract says
  otherwise.** `entities/platform-user` (`GET|POST /users`, `PATCH /users/{id}`) · `entities/config-version`
  (`GET /config-versions`) · `entities/audit` (`GET /audit-log?entity=&actor=`) · `entities/job-queue` (the
  **admin projection** of `GET /tasks` + `GET /tasks/{id}` — a **separate slice** from FS5's `entities/job`,
  see §3.6) · `entities/probe` (`GET /health/live` · `GET /health/ready`) · `entities/api-key`
  (`GET|PUT /api-keys` — **write-only**) · `entities/cost-report` (`GET /cost?group_by=`, **only if the owner
  rules D9 Option A**). Each owns `model.ts` (wire mirrors in `dto.ts` — **types erased at build ⇒ zero
  runtime bytes**), `keys.ts`, `paths.ts`, `hooks.ts`, `index.ts`. **Deliberately NOT created:
  `entities/flag`, `entities/log`, `entities/notification`, `entities/provider`, `entities/session`** —
  Stage 3 §4 planned them, and the frozen contract models nothing for them. **An empty entity would be the
  lie**; their absence is the honest outcome, and a test asserts they do not exist.
- **Fixtures (T-FS12.3):** deterministic (no clocks — the FS7 rule) coverage of the six real groups in THE one
  dataset + browser/node MSW — users incl. all five roles, config-version rows **carrying `snapshot` payloads**
  so the client diff is exercised, audit rows with real `before`/`after` jsonb (incl. one **unknown-key** and
  one **null-before** create record), admin-scope tasks in the **contract's own `task_status` vocabulary**
  (`pending`/`succeeded`/`deferred`/`cancelled`/`dead` — see D14), an `api-keys` GET that returns **slots with
  no values** and a PUT that returns `204` and **stores nothing**, and a readiness payload with a **degraded**
  and an **unknown** dependency. Plus the **negative locks** (a first for this project): a test asserts the
  fixture resolver answers **404 for every path FS12 does not have** — `/providers`, `/logs`, `/flags`,
  `/notifications`, `/sessions`, `/billing/*`, `/audit-log/export` — so a future contributor cannot quietly
  invent one. **No log line, no flag row, no notification record and no invoice exists anywhere in the
  fixtures**, unit-proven (the FS9 "no placeholder art, fixtures included" rule applied to platform data).
- **RBAC reconciliation (T-FS12.4)** — the D11 package: the FS1 seed currently grants `admin` both
  `admin.users.manage` and `admin.providers.manage`, which **contradicts the frozen matrix** (*Users/Roles,
  API keys, Security — owner ✓, admin –*) and D3 §14 (*"Admin limited (no user/key management, per matrix)"*).
  FS12 corrects the mirror and re-scopes two routes. Full detail and blast radius in §5.2 D11.
- **`/admin` (T-FS12.5–T-FS12.7):** RSC page + `widgets/admin` with the D3 §14 tabs — **Users & Roles** (the
  table; role change is a **confirmed** governance mutation, never optimistic) · **Sessions** (a guarded
  per-user *revoke all sessions* action + the honest seam for the inventory the contract cannot list, D6) ·
  **Config Versions** (the history list + a **pure client-side diff of two served `snapshot` payloads** — the
  FS10 `diffVersions` precedent, D2 §13.18 add/remove semantics with screen-reader labels — and the guarded
  `POST /config-versions/{id}/rollback`). `features/manage-users` (create + set-role + revoke-sessions) and
  `features/rollback-config` own the writes; every one is RBAC-gated at the call site and confirmed.
- **`/jobs` (T-FS12.8):** RSC page + `widgets/jobs` — the contract's own `?status=&type=&channel_id=` filters
  living in the URL (Back-reversible), the task table (attention first: Failed / Needs Review / Dead, per D3
  §17's hierarchy), the LAZY **`task` Inspector row** carrying the intents, and `features/requeue-job`
  (`cancel` · `run` · `requeue`) as **confirmed 202 queue intents with queued-truth wording** (§R10.1 — the
  FS5/FS7/FS9 pattern). **No bulk actions in FS12** (D3 lists them; §R10.7 requires per-bot limit awareness the
  UI cannot verify — an explicit seam, §8).
- **`/audit` (T-FS12.9):** RSC page + `widgets/audit` — the record list with the contract's own `?entity=`
  and `?actor=` facets in the URL, a LAZY record view rendering the **real before→after diff** of the two
  jsonb payloads (unknown keys by **raw name**, the FS8/FS9/FS11 discipline; a `null` before = an honest
  "created" state, never an invented empty object), and `features/export-audit` — **Copy link + a client-side
  CSV of already-loaded records** (the FS11 precedent; **no export endpoint exists and none is called**).
  Read-only by construction: the slice contains **no mutation hook at all**, lock-tested.
- **`/health` (T-FS12.10):** RSC page + `widgets/health` — the overall summary and the probe list built
  **only from what `GET /health/ready` actually names**, using the D2 §12 calm dot system
  (green/amber/red/**grey = unknown**, tokens only — **no new §11 status is registered**), a **Re-check**
  action that is a plain refetch (not a fabricated "probe run"), and honest seams for probe **history**,
  alert subscription and uptime — none of which the contract carries. **Unreachable is grey "unknown", never
  green** (D3 §16's own rule).
- **`/providers` (T-FS12.11) — the SEC-6 marquee.** With no `/providers` endpoint (D2), the screen is what the
  contract does back: the **API-key slot inventory** from `GET /api-keys` (**names/presence only — values are
  never returned and never requested**), **write-only rotation** through `PUT /api-keys` in
  `features/rotate-key`, and **provider readiness reflected from `/health/ready` only where that payload names
  a provider** (§R12.10 makes providers part of readiness; if the wire does not name them, the panel renders
  an honest absence rather than a derived guess — the FS11 "nothing derived from unrelated endpoints" rule).
  Capabilities, enable/disable, default-model routing, per-provider usage and "test connection" have **no
  calls** → honest seams. D3 §15's own empty state (*"Console runs on deterministic fakes until you add
  keys"*, §R2.10) is used verbatim because it is already the truth.
- **`/billing` (T-FS12.12) — pending the owner's D9 ruling.** Option A: the **platform-wide cost view** on the
  contract's own `GET /cost?group_by=channel|model|provider|day` (§R11.8 — *"надёжный источник"*) in its own
  slice with its own keys, plus honest seams for plan, invoices, budget alerts and forecast. **No AI
  forecast** (FS11's ruling stands: the data carries none).
- **The three honesty screens (T-FS12.13):** `/logs`, `/flags`, `/notifications`. Each states, in the D2 §15
  empty-state structure, **the specific fact** (what the backend has: a `logs`/`errors` table §R12.9; nothing
  for flags; nothing for notifications), **why the console shows nothing** (no read call in the frozen
  contract), and **what would change it** (an optional future backend MINOR — RV, never a prerequisite,
  §F2.4). No simulated tail, no local-only toggle pretending to be platform config, no fabricated unread
  count. The topbar bell keeps its existing FS2 behaviour, untouched.
- **Inspector rows (T-FS12.14), all LAZY:** `user` · `config` · `audit` · `probe` · `key` · `task`. The
  existing `job` row stays **byte-identical** (§3.3) — `task` is the admin projection, the
  `analytics`/`analytics-report` precedent applied to the Inspector registry (§3.5).
- **Palette, shortcuts, navigation (T-FS12.15):** a palette **`#` Platform group** kept structurally separate
  from Knowledge, Memory, Images and Prompts (**five** distinct `#` groups now); `ShortcutScope` gains
  **type-only** members (erased at build ⇒ zero commons bytes — the FS9/FS10 mechanism) with the rows and
  labels shipping inside the lazy cheat-sheet chunk; the D3 shortcuts each screen declares (`j/k/↵`, `f`
  focus filter, `r` re-check / requeue-with-confirm, `n` create user, `e` export).
- **AI (T-FS12.16) — exactly ONE surface: `features/explain-job`.** User-invoked, over **ONE loaded task
  record** (type · status · attempts · `run_at` · `last_error`), through the **UNCHANGED** FS6 relay, with
  `buildJobPrompt` unit-proven to carry only that record and to **forbid** root-cause claims beyond the
  record's own fields, invented log lines, recommendations to run destructive actions, and any statement about
  data the record does not contain. Trust + Explainability per D3 A6/A7, **confidence honestly absent**, wire
  cost only. Every other AI row D3 asks for on these screens is a seam (D12).
- **Tests + gates + report (T-FS12.17–T-FS12.18):** unit / component / E2E×3 viewports / axe / the ten gates /
  the budget verification of §6.3 / `FS12_REPORT.md` → **STOP**.

**OUT (explicit):** everything in §8.

---

## 2. The contract reality of Platform & Admin (a first-class constraint, not a note)

`API_SPEC.md` is frozen and wins over D3 wherever they disagree. This is the full audit, screen by screen —
**the source of every deviation in §5.2**:

| D3 screen | What the frozen contract carries | Verdict |
|---|---|---|
| **§14 Admin** | `GET\|POST /users` · `PATCH /users/{id}` (role) · `POST /auth/sessions/revoke {user_id}` · `GET /config-versions` · `POST /config-versions/{id}/rollback` · `GET /audit-log` | **REAL** — minus the session inventory (D6), invitations, deactivation and a config-diff endpoint (D7) |
| **§15 Providers** | **nothing named `/providers`.** `GET\|PUT /api-keys` (write-only) · `GET /health/ready` (covers *«БД/Redis/провайдеры»*) | **PARTLY REAL** — keys + readiness only (D2) |
| **§16 Health** | `GET /health/live` · `GET /health/ready` (no auth) | **REAL, thin** — no probe history, no uptime (D3) |
| **§17 Jobs** | `GET /tasks?status=&type=&channel_id=` · `GET /tasks/{id}` · `POST /tasks/{id}/{cancel,run,requeue}` | **REAL** — the richest platform surface |
| **§18 Logs** | **nothing.** The `logs`/`errors` tables exist (§R4.10, §R12.9) but no read call | **HONEST SEAM** (D3) |
| **§19 Audit** | `GET /audit-log?entity=&actor=` | **REAL** — filters are `entity`/`actor` only; no export call (D8) |
| **§20 Feature Flags** | **nothing** — no endpoint and **no table** among the frozen 25 | **HONEST SEAM** (D4) |
| **§21 Billing** | `GET /cost?group_by=` only — no plan, invoice, budget or forecast call | **D9 ruling required** |
| **§22 Notifications** | **nothing** — no endpoint, no table | **HONEST SEAM** (D5) |

Backend truth this stage renders: **§R10.4** secrets are write-only fields, never displayed · **§R10.5** RBAC
is enforced in `services`, the UI only reflects it · **§R10.8** `audit_log` + `config_versions` are what make
audit and rollback possible at all · **§R10.1** every manual operation goes through the same queue (a
platform action is a **202 intent**, never a second execution path) · **§R8.3/§R8.11** the task lifecycle and
`dead` = DLQ (which is why `deferred` ≠ `cancelled` ≠ `dead` may not be collapsed into "Failed", D14) ·
**§R12.2** secrets are masked in logs and absent from the panel · **§R12.10** liveness ≠ readiness, on
separate endpoints. Design language: D2 §12 (health dot system, tables), §13.5 (Tables), §13.10 (Dialogs —
destructive variants separated and confirmed), §13.18 (diff semantics), §15 (empty states), §16 (skeletons),
§18 (extensibility — *"New status: register in §11 first"*), D3 A1–A8.

---

## 3. Deliverables, matrices and guarantees

### 3.1 Rendering & loading matrix (fixed at approval — every new UI module)

| Module | Layer | S/C | Eager/Lazy | Touches First Load? |
|---|---|---|---|---|
| `app/(platform)/admin/page.tsx` | app | **S** | eager | route only (RSC seed: users + config versions) |
| `widgets/admin/AdminView` (shell + tabs + users table) | widget | C | eager (route) | `/admin` only |
| `widgets/admin/{SessionsPanel,ConfigVersionsPanel,ConfigDiff}` | widget | C | **LAZY** | no |
| `app/(platform)/jobs/page.tsx` | app | **S** | eager | route only (RSC seed: filtered task list) |
| `widgets/jobs/JobsView` (shell + filter bar + table) | widget | C | eager (route) | `/jobs` only |
| `widgets/jobs/TaskDetail` | widget | C | **LAZY** | no |
| `app/(platform)/audit/page.tsx` | app | **S** | eager | route only (RSC seed: first page) |
| `widgets/audit/AuditView` (shell + facets + list) | widget | C | eager (route) | `/audit` only |
| `widgets/audit/{RecordDiff,ExportMenu}` | widget | C | **LAZY** | no |
| `app/(platform)/health/page.tsx` | app | **S** | eager | route only (RSC seed: readiness) |
| `widgets/health/HealthView` (summary + probe list) | widget | C | eager (route) | `/health` only |
| `app/(platform)/providers/page.tsx` | app | **S** | eager | route only (RSC seed: key slots) |
| `widgets/providers/ProvidersView` (slot list + seams) | widget | C | eager (route) | `/providers` only |
| `features/rotate-key/RotateKeyDialog` | feature | C | **LAZY** | no |
| `app/(platform)/billing/page.tsx` + `widgets/billing/*` (D9-A) | app/widget | S/C | shell eager, **charts LAZY** via `chart/lazy` | `/billing` only |
| `widgets/{logs,flags,notifications}/*Honesty` | widget | **S** | eager (route) | the three seam routes only |
| `features/{manage-users,rollback-config,requeue-job,export-audit}` UI | feature | C | **LAZY** (dialogs/panels) | no |
| `features/explain-job/ExplainJobPanel` | feature | C | **LAZY** | no |
| `widgets/inspector/{User,Config,Audit,Probe,Key,Task}Inspector` | widget | C | **LAZY** (`dynamic()`) | **no** — the panel is shell commons; a static import would tax EVERY route (FS7 rule) |
| `entities/*` models + mappers + pure helpers | entity | S-safe | imported by their route | route only |
| `entities/*` hooks (`'use client'`) | entity | C | imported by their route's client tree | route only |

**Rule restated:** no FS12 module is imported by any pre-existing screen. Every heavy leaf is lazy **from the
first commit**, not retrofitted after a red gate (the FS6 lesson).

### 3.2 Query keys & invalidate graph (fixed at approval)

**Roots (all entity-local; commons gains zero rows).** `platformUserKeys` → `['platform-users', …]` ·
`configVersionKeys` → `['config-versions', …]` · `auditKeys` → `['audit', …]` · `queueKeys` →
`['queue', …]` · `probeKeys` → reuses **`queryKeys.health()`** = `['health']` (the existing, unused FS1 row) ·
`apiKeyKeys` → `['api-keys']` · `costReportKeys` → `['cost-report', …]` (D9-A).

**The `['jobs']` collision — found at plan time and designed out.** Three shipped features already invalidate
the **bare prefix** `['jobs']` (`review-post`, `insert-to-channel`, `add-source/useDocumentIntents`). A prefix
invalidation matches **any** key beginning with that segment, so the FS11 "positionally unmatchable" technique
would **not** protect an FS12 key rooted at `'jobs'`. The admin queue therefore uses a **distinct root
`['queue', …]`**, and the coupling is made **explicit and one-directional** instead of accidental:

| Writer | Invalidates | Deliberately does NOT invalidate |
|---|---|---|
| `manage-users` · create | `platformUserKeys.list()` | audit (no read-your-write guarantee is claimed), config versions |
| `manage-users` · set role | `platformUserKeys.list()` + `platformUserKeys.detail(id)` | anything channel-scoped |
| `manage-users` · revoke sessions | **nothing** — there is no session query to refresh (D6) | — |
| `rollback-config` | `configVersionKeys.list()` | users, audit |
| `requeue-job` (cancel/run/requeue) | `queueKeys.list(filters)` + `queueKeys.detail(id)` **and the FS5 prefix `['jobs']`** — a cancelled `publish` must refresh the dashboard timeline honestly | posts, analytics, anything channel-scoped beyond `['jobs']` |
| `rotate-key` | `apiKeyKeys.list()` (slots only — **never a value**) | health/readiness (a rotation does not prove a provider works) |
| `export-audit` · `explain-job` · every read screen | **nothing** — they are pure projections of loaded data | everything |

**Locked by test:** (a) no FS12 key starts with `'jobs'`, `'analytics'`, `'cost'`, `'posts'`, `'documents'`,
`'personas'`, `'actors'`, `'images'` or `'prompts'`; (b) the three existing `['jobs']` prefix invalidations
**cannot match** any `queueKeys` output; (c) `queryKeys.health()` is byte-identical to its FS1 form; (d) no
FS12 read slice contains `useMutation`, `invalidateQueries` or `setQueryData` (`audit`, `probe`,
`cost-report`, `config-version` reads).

### 3.3 FS5–FS11 no-touch guarantee (protects `/chat` 179 · `/knowledge` 176 · `/dashboard` 168 · `/studio` 165 · `/prompts` 150 · `/memory` 149 · `/analytics` 148)

**Not touched, file by file** (proved at acceptance by mtime + content grep + First-Load manifest, the FS7–FS11
method): all of `widgets/{dashboard,chat,knowledge,memory,studio,prompts,analytics}/**` ·
`features/{review-post,send-message,insert-to-channel,add-source,ask-document,edit-persona,explain-style,`
`regenerate-image,upload-references,explain-verification,manage-prompt,test-prompt,filter-analytics,`
`export-analytics,explain-metrics}/**` · `entities/{channel,analytics,analytics-report,post,conversation,`
`document,persona,actor,image,location,prompt,session}/**` · **`entities/job/**` (see below)** ·
`widgets/inspector/{Post,Job,Conversation,Document,Persona,Actor,Image,Prompt,Datapoint}Inspector.tsx` ·
`shared/ui/**` · `styles/tokens.css` · `shared/lib/{ai-gateway,auth-gateway,persist,stream}/**` ·
`app/api/**` · `app/(workspace)/**` · `middleware.ts` · the seven-provider tree.

**`entities/job` is the sharpest edge in this stage and is deliberately frozen.** FS5's `JobInspector` is a
**static** import inside `widgets/inspector/Inspector.tsx`, which sits in **shell commons** — therefore
`entities/job`'s model **and** its `'use client'` hooks are **already in every route's First Load**. Two
consequences, both binding: (1) reusing its read hooks costs **zero** new bytes, and (2) **adding anything to
its barrel would add commons bytes to all 31 routes** — the FS11 R1f lesson (a `'use client'` module reached
through a barrel is bundled whole) in its most expensive possible form. FS12 therefore puts the entire admin
queue projection in a **separate `entities/job-queue` slice that imports nothing from `entities/job`**, exactly
as `entities/analytics-report` relates to `entities/analytics`.

**Files FS12 DOES edit, with the reason each cannot move a protected route's budget:**

| File | Edit | Why it is safe |
|---|---|---|
| `shared/config/routes.ts` | two `permission` values (D11) | a string swap; no row added; measured in T-FS12.4 |
| `shared/config/rbac.ts` | remove 2 entries from `admin` (D11) | strictly **removes** bytes |
| `shared/config/shortcuts.ts` | **type-only** scope members | erased at build ⇒ 0 runtime bytes (FS9/FS10 precedent) |
| `shared/config/shortcuts-catalog.ts` | new rows | ships **only** inside the lazy cheat-sheet chunk (T-FS8.1 lock) |
| `widgets/inspector/Inspector.tsx` | six `dynamic()` registrations + registry rows | commons, so **measured explicitly** in T-FS12.14; each row is a lazy reference, the FS7–FS11 pattern (six rows precedent-priced at ~1 row each) |
| `widgets/command-palette/*` | a `#` Platform group | commons, measured; the FS7–FS11 precedent |
| `shared/lib/fixtures/dataset.ts` + `browser.ts` | additive groups | fixture chunk only (never in a First Load; local/ci only, triple kill-switch intact) |
| `shared/types/dto.ts` | new wire mirrors | **types are erased at build** ⇒ 0 runtime bytes |

Existing fixture rows are **byte-identical**: FS12 adds **new** task rows (new ids, contract-vocabulary
statuses) rather than editing FS5's, so the dashboard timeline and every FS5 assertion keep their exact
inputs.

### 3.4 State-ownership matrix (fixed at approval)

| State | Owner | Persistence | Invalidated by | S/C | Lifetime | Replacement seam |
|---|---|---|---|---|---|---|
| Users · config versions · audit records · tasks · key slots · probes · cost rows | **TanStack Query** | memory | §3.2 writers only | C (RSC-seeded) | 30 s lists / 60 s detail | the entity `hooks.ts` |
| Jobs filters (`status`/`type`/`channel_id`), audit facets (`entity`/`actor`), admin tab, billing `group_by`, `?inspect=` | **URL (nuqs)** | the URL | — | C | the URL | §3.5 |
| Dialog open/closed, confirm state, table sort, row focus for `j/k` | component `useState` | none | — | C | unmount | — |
| **A secret being typed (rotate-key)** | **component `useState` only, cleared on submit/close** | **NEVER persisted** | — | C | keystroke → request body → gone | D13 — no draft, no store, no cache, no log |
| The `explain-job` stream | the FS6 transient assistant store | none | reconcile on done | C | the turn | unchanged FS6 seam |
| Role / session | the FS4 read-only session store | cookie | `/auth/me` | S+C | session | unchanged |

**The hard rule holds:** nothing is owned by Query **and** Zustand. FS12 adds **no** Zustand state and **no**
draft storage — and, uniquely, one state kind that may not be persisted **anywhere** (the secret). Enforced by
source-level tests, not review.

### 3.5 Navigation contract (URL is the state; every transition is reversible)

| Transition | URL | History |
|---|---|---|
| Admin tab | `/admin?tab=users\|sessions\|config` | **push** (a tab is a place) |
| Compare two config versions | `/admin?tab=config&a=<id>&b=<id>` | **push** |
| Jobs filter (status/type/channel) | `/jobs?status=&type=&channel_id=` | **push** (data-changing — the FS11 rule) |
| Audit facet | `/audit?entity=&actor=` | **push** |
| Billing facet | `/billing?group_by=` | **push** |
| Open any detail | `?inspect=<type>:<id>` appended | **push**; `esc` / Back closes and restores focus |
| Sort a table, expand a row, open a dialog | not in the URL | — (ephemeral by design) |

Every platform view is a **shareable link that Back reverses**, restored on paste and re-checked against the
viewer's RBAC (D1 §6.8). The Inspector types FS12 registers are `user` · `config` · `audit` · `probe` · `key` ·
`task`. **`task` coexists with FS5's `job` deliberately:** the same resource, two projections — the read-only
dashboard view (`job`, byte-identical, cross-linked from `/dashboard`) and the admin view with intents
(`task`, from `/jobs`). This is the `analytics`/`analytics-report` precedent, and it is what keeps a commons
file byte-frozen instead of growing an RBAC branch inside it.

### 3.6 Bundle ownership (per-chunk architecture)

| New chunk | Single importer | First-load trigger | Could it reach commons? | Mechanical proof |
|---|---|---|---|---|
| `admin-view` | `/admin` page | route entry | no — no other route imports `widgets/admin` | manifest: absent from all 30 other routes |
| `admin-config-diff`, `admin-sessions` | `AdminView` | tab open | no | `dynamic()` boundary |
| `jobs-view`, `task-detail` | `/jobs` page | route entry / row open | no | manifest |
| `audit-view`, `audit-diff`, `audit-export` | `/audit` page | route entry / record open / export | no | manifest |
| `health-view`, `providers-view`, `rotate-key` | their routes | route entry / dialog | no | manifest |
| `billing-view` (+ the frozen `chart/lazy` chunks) | `/billing` page | route entry | **charts already exist** (FS11 is their second consumer; FS12 is the third) | R1c measurement recorded again |
| six inspector rows | `Inspector.tsx` (lazy refs) | first `?inspect=<type>` | **the references live in commons** | measured in T-FS12.14 against the pre-stage baseline |
| `entities/job-queue`, `platform-user`, `config-version`, `audit`, `probe`, `api-key`, `cost-report` | their route trees only | route entry | no — **entity-local keys/paths; no barrel of an already-imported slice is extended** | grep lock + manifest |
| `data-table` (TanStack Table) | **decided by T-FS12.1, not assumed** | first table render | **this is the open question** | the R1c before/after runtime-chunk measurement, with the pre-declared fallback |

### 3.7 Regression invariants (checkable, not intentions)

- **I1 — `/chat` First Load stays 179 kB.** The **primary protected route**; byte-compared **twice** (after
  T-FS12.1's DataTable decision, and again before acceptance) per FS11 requirement 52.
- **I2 — `/dashboard` 168 · `/knowledge` 176 · `/studio` 165 · `/prompts` 150 · `/memory` 149 ·
  `/analytics` 148 unchanged.** `/dashboard` is the **co-primary** protected route (the `entities/job` barrel
  exposure) and is checked at the same two moments. A ±1 kB movement is **reported as a deviation with a
  control build**, never re-worded (FS9 rule 44).
- **I3 — shared commons stays 107 kB;** `shared/config/query-keys.ts` and `shared/lib/api/endpoints.ts` gain
  **zero rows**.
- **I4 — every one of the nine platform routes stays ≤ 180 kB** (baseline 107 as stubs). Reported per route.
- **I5 — ONYX untouched:** `styles/tokens.css` and every `shared/ui` component contract byte-identical.
  **No ONYX MINOR is requested** (unlike FS10) — and no new D2 §11 status is registered unless the owner rules
  D14 Option A.
- **I6 — no FS5–FS11 surface file modified** except the eight files listed in §3.3, each with its measured
  justification.
- **I7 — previous suites stay green without weakening.** One class of existing-spec update is **declared in
  advance as I7-legal**: the D11 RBAC correction makes `admin` lose two permissions, so existing RBAC unit
  expectations and any E2E asserting an admin-visible affordance are updated to the corrected matrix — a
  factual necessity, not a weakened assertion.
- **I8 — no new dependency · no ADR · no token change · no threshold pre-raised · no `app/` change.**

### 3.8 File-level deliverables (maps to Stage 3 §1/§3–§5)

```
app/(platform)/{admin,jobs,audit,health,providers,billing}/page.tsx     ← real RSC pages
app/(platform)/{logs,flags,notifications}/page.tsx                       ← honest seam pages
widgets/{admin,jobs,audit,health,providers,billing,logs,flags,notifications}/
features/{manage-users,rollback-config,requeue-job,export-audit,rotate-key,explain-job}/
entities/{platform-user,config-version,audit,job-queue,probe,api-key,cost-report}/
widgets/inspector/{User,Config,Audit,Probe,Key,Task}Inspector.tsx        ← LAZY rows
tests/unit/{platform-commons,platform-mappers,platform-fixtures,secret-writeonly,
            job-prompt,platform-ownership,audit-diff,platform-rbac}.test.ts
tests/component/{AdminView,JobsView,AuditView,HealthView,ProvidersView,
                 RotateKeyDialog,ExplainJobPanel,PlatformHonesty}.test.tsx
tests/e2e/platform.spec.ts
```

---

## 4. Task sequence (each with a completion criterion)

| # | Task | Done when |
|---|---|---|
| T-FS12.1 | Zero-commons lock · **R1c DataTable decision gate** · protected-route baseline | grep lock green; runtime-chunk before/after recorded; the DataTable adopt/abandon decision is **written down with its numbers** |
| T-FS12.2 | Seven entity slices (models, mappers, entity-local keys/paths, hooks) | `tsc` clean; mappers unit-proven incl. unknown-key and gated/null discipline |
| T-FS12.3 | Fixtures for the six real groups + the **negative locks** | the whole group resolves; a test proves `/providers`, `/logs`, `/flags`, `/notifications`, `/sessions` and any export path **404** |
| T-FS12.4 | RBAC reconciliation (D11) + route registry | matrix matches `API_SPEC`; every affected existing test updated (I7-legal); `/chat` + `/dashboard` re-measured |
| T-FS12.5 | `/admin` RSC page + `AdminView` + Users & Roles tab | five roles render correctly; owner-only affordances hidden for admin; permission state, never a crash |
| T-FS12.6 | `features/manage-users` (create · set role · revoke sessions) | confirmed mutations; 201/204 truth wording; RBAC-gated at the call site; MSW-tested |
| T-FS12.7 | Config Versions tab + `rollback-config` + the pure snapshot diff | diff is a pure function over two served payloads, table-tested; rollback is guarded and confirmed |
| T-FS12.8 | `/jobs` + `JobsView` + `features/requeue-job` + `task` Inspector row | the contract's filters live in the URL and Back reverses; the three intents report **queued truth** |
| T-FS12.9 | `/audit` + `AuditView` + before→after diff + client-side CSV | unknown keys render by raw name; a `null` before reads as "created"; the CSV calls no endpoint |
| T-FS12.10 | `/health` + `HealthView` | probes render **only** what readiness names; unreachable = grey unknown; re-check is an honest refetch |
| T-FS12.11 | `/providers` + `features/rotate-key` (**SEC-6**) | **the secret lock test passes** (D13); slot inventory renders no value; seams stated on every viewport |
| T-FS12.12 | `/billing` (D9 Option A, if ruled) | cost renders from `/cost` in its own slice; plan/invoice/forecast are seams; **no AI forecast** |
| T-FS12.13 | `/logs` · `/flags` · `/notifications` honesty screens | each states fact · reason · what would change it, on **every** viewport (the FS9 rule) |
| T-FS12.14 | Six LAZY Inspector rows + palette `#` Platform group + shortcuts | manifest proves every row is absent from all First Loads; commons delta measured |
| T-FS12.15 | `features/explain-job` | `buildJobPrompt` byte-exact unit proof; no auto-run; Trust + Explainability; wire cost only |
| T-FS12.16 | Full test suite (unit · component · E2E ×3 viewports · axe) | all green; axe **0** on every new screen incl. a table and a diff |
| T-FS12.17 | Ten gates + §6.3 budget verification | executed for real; every number recorded |
| T-FS12.18 | `FS12_REPORT.md` (+ a size addendum **only if** the detector goes red) | written → **STOP for acceptance** |

---

## 5. Gates, contract truth & honesty

### 5.1 Engineering gates

All ten, executed for real (Stage 2 §14): ESLint · Prettier · `tsc --noEmit` strict (0 errors, 0 unjustified
`any`) · Vitest · Playwright ×3 viewports · **axe 0** · dependency-cruiser 0 · Storybook build · contract
(every endpoint used exists **verbatim** in `API_SPEC.md`) · `pnpm budget` (31 routes ≤ 180 kB) ·
`pnpm size`. **A gate that ends RED is reported RED with the threshold untouched** (rule №33).

### 5.2 Contract truth & deviations (decided by approving this plan)

- **D1 — Scope is nine routes, not seven.** The handoff's shorthand "D3 §14–§20" undercounts: **D1 §5.3**
  (the sitemap) and the shipped route registry both put **Billing (§21)** and **Notifications (§22)** in the
  **Platform & Admin** surface. D1 outranks the handoff, so FS12 covers all nine. **Sub-ruling requested:**
  the roadmap also lists "Notifications" under FS13. Proposed split — **FS12 owns the `/notifications`
  *screen*** (an honest seam, since nothing backs it), **FS13 owns notification *preferences*** as a Settings
  section (D3 §23 already lists them there).
- **D2 — There is no `/providers` endpoint.** Stage 3 §8's *(assumed via services)* row is refuted by the
  frozen contract (the FS9 `POST /images` precedent). The screen is rebuilt on what exists: the **API-key slot
  inventory** (`GET /api-keys`, values never returned), **write-only rotation** (`PUT /api-keys`), and
  provider readiness **only where `/health/ready` names a provider** (§R12.10). Capabilities, enable/disable,
  model routing, per-provider usage and "test connection" are **honest seams**.
- **D3 — There is no logs endpoint.** The `logs`/`errors` tables exist (§R4.10/§R12.9) and the contract
  exposes no read. `/logs` therefore renders a specific honest absence — **no tail, no stream, no fixture log
  line anywhere** (unit-proven).
- **D4 — There is no feature-flag endpoint and no `feature_flags` table.** D3 §20's own rollout seam is
  already labelled *"declared, not implemented"*. `/flags` is an honest seam: **no toggle that writes
  nowhere**, no local flag store impersonating platform config.
- **D5 — There is no notifications endpoint and no table.** `/notifications` is an honest seam; the topbar
  bell keeps its FS2 behaviour; **no fabricated unread count, no invented record**. (D1 §6.7's *"toasts for
  the immediate, centre for the record"* — the record needs storage the contract does not have.)
- **D6 — Sessions cannot be listed.** `POST /auth/sessions/revoke {user_id}` exists; there is **no session
  inventory endpoint and no `sessions` table**. D3 §14's Sessions tab becomes a guarded, confirmed
  **"revoke all sessions for this user"** action plus an honest seam where the device/last-seen list would be.
  No invented session rows.
- **D7 — Admin's writes are exactly three.** `POST /users` is a **create**, not an invitation (no invite or
  email flow exists) — the UI says *Create user*, never *Invite*. `PATCH /users/{id}` is documented as the
  **role** change; the `users` table has a `status` column but no documented write, so **deactivate is a seam
  until FE-RV-15 answers**. There is no `GET /users/{id}`, no delete, and **no config-diff endpoint** — the
  comparison is a **pure client-side diff of two served `snapshot` payloads**, rendered only if the list
  actually carries them (else an honest absence). Contrary to D3 §14's *"optimistic role change reconciles"*,
  a role change is **confirmed, never optimistic**: it is a governance mutation (§R10.5/§R11.4 discipline),
  and the FS10 rule that a governed artifact is never changed speculatively applies.
- **D8 — Audit filters are `entity` and `actor` only.** D3 §19 asks for a time filter; the contract documents
  none, so **no time parameter is sent**; any date narrowing is honest **client-side filtering of the loaded
  page and is labelled as such** (the FS7 "list filtering, never sold as retrieval" precedent). Export is a
  **client-side CSV** (FS11 precedent) — no export endpoint exists and none is called.
- **D9 — Billing: owner ruling required.** The only reliable source is `GET /cost?group_by=` (§R11.8), which
  FS11 already consumes for `/analytics`.
  **Option A (recommended):** `/billing` becomes the **platform-wide cost view** — its own slice, its own
  keys, no channel dimension — with plan, invoices, budget alerts and forecast as honest seams, and **no AI
  forecast** (FS11's ruling). The `Analytics ≠ Billing` invariant (PART2 §8.13) is kept **structurally**: two
  slices, provably non-colliding key namespaces, no cross-entity import.
  **Option B:** `/billing` is a pure honest seam that points at `/analytics`.
  *Recommendation: A — it uses only the contract's own call and gives the screen real content; the cost is one
  more entity slice and one more route to keep under budget.*
- **D10 — Jobs RBAC follows the contract, not D3.** `API_SPEC` scopes the whole **Scheduler & Tasks** group to
  *owner/admin*; D3 §17 grants Analyst and Viewer read. **The contract wins** → `/jobs` moves to
  `platform.manage` (owner + admin) and every intent gates on the same. Analyst/Viewer see the route hidden,
  and a direct URL renders the **permission state, never a crash** (SEC-7).
- **D11 — The FS1 RBAC seed over-grants `admin`; FS12 corrects the mirror.** The frozen matrix gives
  *Users/Roles, API keys, Security* to **owner only**, and D3 §14 says so explicitly. Package:
  (a) remove `admin.users.manage` and `admin.providers.manage` from `RBAC_MATRIX.admin`;
  (b) `/jobs` `platform.view` → `platform.manage` (D10);
  (c) `/providers` `platform.view` → `platform.manage` (D3 §15: *"Owner manage keys; Admin read; others
  hidden"*), with key **rotation** gated on `admin.providers.manage` (owner only) at the call site.
  Unchanged: `/admin` `platform.manage` (with the **Users & Roles tab itself** gated on
  `admin.users.manage`, so an admin sees a permission state inside a screen they may otherwise use) ·
  `/audit` `platform.view` (matrix: owner/admin/**analyst** ✓ — exactly right) · `/health`, `/logs`,
  `/billing` `platform.view` · `/flags` `platform.manage` · `/notifications` `workspace.view`.
  *Two acknowledged deltas from D3, both stated rather than silently absorbed:* D3 §16 gives Viewer
  "read-limited" health and D3 §17 gives Viewer read on Jobs; the platform group keeps Viewer out for
  coherence with the matrix. This is a **UI-reflection correction only** — the backend has always been the
  boundary.
- **D12 — One AI surface, not five.** D3 asks for AI triage (Health), error clustering (Logs), access-change
  summaries (Admin), flag-impact explanation (Flags) and cost forecasting (Billing). Logs and Flags have **no
  data**; Health triage and Billing forecasting would be **causal claims and forecasts**, which the owner
  already ruled out at FS11. FS12 therefore ships **`explain-job` only** — user-invoked, single-record,
  provenance-only, forbidden by construction from inventing causes, logs, or recommendations to run
  destructive actions. *Alternative offered for the owner's ruling:* **explain-audit** (a purely descriptive
  summary of a loaded, filtered audit slice — *"this week: 3 role changes, 1 key rotation"*), which is equally
  defensible; if the owner prefers it, it replaces `explain-job` one-for-one — **not in addition**.
- **D13 — Secrets are write-only, and FS12 proves it by mechanism (SEC-6 / §R10.4 / §R12.2).** This is the
  project's first secret-writing surface, so the standard matches FS10's requirement-A/B bar: the value lives
  **only** in component state and the request body; the field is never pre-filled, never read back, cleared on
  submit and on close; **no draft, no store, no cache, no toast, no log, no correlation payload and no fixture
  ever contains it**; the response is `204` and the fixture stores nothing; the VM has **no field capable of
  holding a value**. Locked by a source-level grep test (the FS4/FS5 kill-switch precedent) that fails if the
  key value is assigned to anything outside the request body.
- **D14 — Task statuses: the contract carries eight, ONYX registers twelve, and three do not map.**
  `task_status` = `pending · running · succeeded · failed · deferred · needs_review · cancelled · dead`
  (§R4.11). D2 §11's vocabulary has exact equivalents for five (`pending`→**Queued** *"accepted, awaiting
  run"*, `running`→**Running**, `succeeded`→**Completed** *"finished OK"*, `failed`→**Failed**,
  `needs_review`→**Needs Review**) and **none** for `deferred`, `cancelled`, `dead` — and collapsing them into
  "Failed" would be dishonest on the exact screen where the difference decides the action (**requeue applies
  to `dead`**, §R8.11).
  **Option A:** register three new statuses in D2 §11 (**an ONYX MINOR under D4 §12/§13, owner approval
  required in advance** — the FS10 PromptCard precedent). Additive, every call site untouched — but
  `shared/types/status.ts` is **commons**, so it spends part of `/chat`'s **1.0 kB** headroom.
  **Option B (recommended):** **zero commons bytes** — map the five exact equivalents in the entity mapper and
  render `deferred` / `cancelled` / `dead` as **honest raw labels** with a neutral chip, which is precisely
  the `parseStatus` unknown-status discipline shipped since FS5.
  *Recommendation: B for FS12 (the headroom is 1.0 kB and the vocabulary change is not needed to be honest);
  A remains available as a later, separately-measured ONYX MINOR.*
  **Related observation, deliberately NOT fixed here:** FS5's `selectUpcomingPublish` filters
  `rawStatus === 'queued'`, a word the contract's `task_status` does not contain — an existing **FE-RV-8**
  question about the live wire, not an FS12 defect. Touching it would break the no-touch guarantee; it is
  recorded, not changed.
- **D15 — *(assumed)* wire shapes → FE-RV-15** (§5.3).

### 5.3 FE-RV impact

**FE-RV-15 opens — "live platform & admin round-trip"** (one item, per the register's burn-down discipline),
covering: users wire casing and whether `PATCH /users/{id}` accepts anything besides `role` (the `status`
column exists — D7) · whether `POST /users` is a create or an invitation and what it returns · the
`POST /auth/sessions/revoke` response and whether any session inventory ever appears · whether
`GET /config-versions` carries the `snapshot` payload (**the single fact that decides whether the client diff
is possible at all**) and the rollback response · the `audit-log` shape, its pagination, and whether it
accepts any filter beyond `entity`/`actor` · the `tasks` wire vocabulary end-to-end (**pending vs queued** —
shared with FE-RV-8) and the 202 payloads of `cancel`/`run`/`requeue` · **what `GET /api-keys` returns when
values are withheld** (slot names? providers? presence flags?) and the accepted `PUT` body · **the
`/health/ready` payload shape — above all whether it enumerates providers by name**, the single switch that
turns the Providers health panel from a seam into real data · whether `/cost` facets are platform-wide or
channel-scoped when called without a channel (shared with FE-RV-14).
**Single adjustment points:** `entities/{platform-user,config-version,audit,job-queue,probe,api-key,
cost-report}/{model,paths,keys}.ts` and the `manage-users` / `rotate-key` request bodies.
**No FE-RV is opened for logs, flags or notifications** — those are not unverified assumptions, they are
**verified absences** in a frozen contract, and would be optional future backend MINOR work (§F2.4).

---

## 6. Budget strategy (First Load 180 kB · size-limit 696 kB)

### 6.1 Per-route First Load (authoritative, non-revisable)

`/chat` = **179 / 180** (headroom **1.0 kB**) is the primary protected route; `/dashboard` = 168 is
co-primary because of the `entities/job` commons exposure. FS12 adds **zero commons rows** by construction
(§3.2) and every commons *file* it touches is listed with its justification (§3.3) and **measured**, not
argued. The nine platform routes start at the 107 kB stub baseline and each is reported individually (I4).
The two protected routes are byte-compared **twice** (FS11 requirement 52): immediately after T-FS12.1's
DataTable decision — the stage's first risky artefact — and again before acceptance.

### 6.2 size-limit aggregate (detector 696 kB; measured 685.08 — headroom 10.92 kB)

FS12 is the widest stage by route count, so the detector is **expected to go red**. Rule №33 is followed
exactly: **the threshold is not pre-raised**, not now and not mid-stage. The gate is reported RED with its
measured number, a dedicated `FS12_REPORT_SIZE_ADDENDUM.md` is filed with per-chunk attribution, the
eager/lazy split, and a manifest proof that every new lazy chunk is absent from every First Load — and the
owner rules separately, after the evidence pack.

### 6.3 Lazy-loading & commons verification checklist (executed at T-FS12.17, recorded in the report)

1. `pnpm budget` — all 31 routes, before/after table vs the T-FS12.1 baseline.
2. `app-build-manifest.json` — every FS12 chunk proved **absent** from every route's First Load list.
3. The **webpack runtime chunk** gz size before/after (the R1c record, whichever DataTable decision was made).
4. Zero-marker scan across every First Load chunk of `/chat` and `/dashboard`.
5. mtime + import scan proving the §3.3 no-touch set is untouched.
6. Commons delta attributed **per file** for the eight edited commons files.
7. Any contested movement settled with a **control build** before a single word is written about its cause —
   both forms available (remove the addition; revert the route to a stub).

---

## 7. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | **DataTable's first consumer taxes every route** (the FS10 failure mode, TanStack Table is in no bundle today) | T-FS12.1 is a **measured decision gate with a pre-declared fallback**, executed before any screen exists |
| R2 | **Nine routes in one stage** is the widest surface yet; eager shells accumulate | every heavy leaf lazy from the first commit; per-route reporting (I4); three of the nine are seam screens with near-zero weight |
| R3 | **`entities/job` is already in shell commons** — any barrel growth taxes all 31 routes | the separate `entities/job-queue` slice; `entities/job` in the frozen no-touch set; lock-tested |
| R4 | The **`['jobs']` prefix invalidation** already shipped in three features would sweep a naïvely-rooted key | the distinct `['queue', …]` root + an explicit, one-directional invalidate contract (§3.2), lock-tested |
| R5 | **The RBAC correction (D11) changes what `admin` can see** and will move existing expectations | declared I7-legal in advance; every affected test updated as a factual necessity, none weakened |
| R6 | **A secret could leak through an ordinary convenience** (a draft, a toast, a correlation payload, a fixture echo) | D13's mechanism + a source-level grep lock; the VM has no field able to hold a value |
| R7 | **Five screens are dominated by absence** and a reviewer may read the stage as incomplete | each seam states fact · reason · what would change it, on **every** viewport (the FS9 mobile lesson); the negative fixture locks make the absence provable, not rhetorical |
| R8 | **FE-RV-15 is the largest FE-RV yet** — `/health/ready` and `GET /api-keys` shapes decide two whole panels | single adjustment points named per item; both panels already degrade to honest absence when the wire is silent |
| R9 | Rounding volatility has moved a protected route ±1 kB in **four consecutive stages**, and FS12 adds nine routes | diagnose from the manifest; prove any contested movement with a control build before writing a cause |
| R10 | `/analytics` and `/billing` both read `/cost` (if D9-A) — an invariant-13 hazard | separate slices, separate keys, no cross-entity import, dependency-cruiser proves it; lock-tested in both directions |

---

## 8. Not in FS12 (explicit)

Settings · Profile · Docs (FS13/later) · notification **preferences** (FS13, D1 sub-ruling) · Channels
(D3 §13) · AI Playground (§11) · Chat History (§6) · Documentation (§25) — all remain honest stubs.
**No bulk job actions** (§R10.7 needs per-bot limit awareness the UI cannot verify) · **no log tail, no flag
toggle, no notification record, no invoice, no plan management, no budget alerts, no probe history, no uptime,
no provider capability matrix, no "test connection", no session inventory, no user deactivation, no cost
forecast, no anomaly or recommendation of any kind** — every one of these is a **visible honest seam**,
because the frozen contract carries no call for it. **No backend change is requested or implied**, no ONYX
token value changes, no ADR is created, no dependency is added, and no threshold is pre-raised.

---

**STOP — FS12 plan complete. No code has been written.** Awaiting the owner's approval of this plan, and
explicit rulings on **D9** (Billing: Option A or B), **D12** (`explain-job` or `explain-audit`), **D14**
(task statuses: Option A — an ONYX MINOR — or Option B — zero-commons mapping plus honest raw labels), and
the **D1 sub-ruling** on the FS12/FS13 split of Notifications. Implementation begins only after that approval.
