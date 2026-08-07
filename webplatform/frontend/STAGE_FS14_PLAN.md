# FS14 — Integration & Polish (Plan)

**Track:** Web Platform implementation · **SoT:** `FRONTEND_MASTER_SPEC.md` · implements the stage the frozen
roadmap fixes as **Integration & Polish** (handoff PART4 §8.2): the **D3 Part C cross-screen journeys** green
in E2E · the **observability vendor decision** that **FE-ADR-3 deferred to FS14/FS15 and which is now due** ·
**FE-RV-5** (`next/font/local` pin) closed · **CSP promotion prepared** from the report-only posture ·
the seven fixed artefacts (PART1 §4.5/§4.6 → §3.1–§3.7 below) · and **ZERO commons bytes**, which at
`/chat` **180 / 180** is a wall, not a target. Also implements D1 §7 (primary user flows) at the seam
between screens, D4 §2 (responsive rule set), §3 (a11y checklist), §10 (Design QA checklist), Stage 2 §11
(observability) and Stage 2 §14 (gates).

**This is a PLAN. No code yet.**

---

## 0. The headline findings of the contract & source verification

FS14 is the first stage whose subject is **the space between screens**, so it was verified twice: against the
frozen `API_SPEC.md`, and against the shipped source. Five findings shape everything below. Each is a
*verified fact*, not an estimate.

1. **The pipeline journey (D3 Part C #1 / D1 §7.2) is only partly expressible — and the missing parts are
   contract facts, not unbuilt UI.** The contract carries `POST /channels/{id}/posts` (201),
   `POST /posts/{id}/{generate|validate|regenerate|approve|reject|schedule|publish}` (202/200) and
   `GET /posts/{id}/history`. But it carries **no read for a validation result** — there is no
   `GET /posts/{id}/validation`, and the post resource exposes `{id, channel_id, status, title,
   body_preview, created_at}` only — so D1 §7.2's *"quality gates shown as pass/fail chips"* has **no wire to
   render**. And there is **no call that links a post to its image**: images are listed as
   `GET /channels/{id}/images` and read as `GET /images/{id}`; there is no `GET /posts/{id}/images` and no
   post reference on the image resource. So Part C's *"single Review surface: text + image + why"* **cannot be
   assembled honestly** — on top of FS9's finding that no media URL exists at all.
2. **The observability "seam" FE-ADR-3 assumed already exists does not.** Grepping the whole of `src/` for
   `web-vitals`, `sink`, `observability`, `Sentry` and `reportWebVitals` returns **nothing**.
   `src/instrumentation.ts` (Stage 3 §1) was never created; there is **no `app/global-error.tsx`**; and
   `createQueryClient()` installs **no `QueryCache` error handler**. What does exist is the correlation id
   (`X-Request-Id`, `shared/lib/api/correlation-id.ts`) and the per-group `error.tsx` boundaries. So the
   vendor decision is not "pick a vendor for an existing pipe" — **the pipe is one small module that does not
   exist yet**, and where it is allowed to live decides whether it costs commons bytes (R1i).
3. **The report-only CSP currently reports NOWHERE.** `next.config.ts` sends
   `Content-Security-Policy-Report-Only` with ten directives and **no `report-uri` and no `report-to`**. So
   "prepare the promotion **from the report-only data**" has no data to read, and cannot acquire any in this
   environment (no deployment, no browser fleet). FS14 therefore prepares the promotion the only honest way:
   a **source-derived directive audit**, the nonce-vs-`unsafe-inline` decision written down with its cost, a
   report sink **only if the D6 ruling allows one**, and enforcement itself left to real infrastructure as a
   registered runtime item. A promoted CSP that was never observed in a browser would be a fabricated gate.
4. **FE-RV-5 cannot be closed by editing code alone.** `public/fonts/` contains **only `README.md`** — the
   `.woff2` binaries do not exist in the repo, and `fonts.ts` uses `next/font/google` (build-time
   self-hosting). Closing FE-RV-5 requires *obtaining two binaries*, which is a decision (a cache copy, a new
   devDependency, or leaving the item open), not an implementation detail. §5.2 D7 puts it to the owner with
   a pre-declared fallback, because **an FE-RV reported closed without the binaries in the tree would be a
   fabricated close.**
5. **The remaining stubs have no stage.** `/channels`, `/playground` and `/docs` still render `PageStub`, and
   the frozen roadmap has exactly two stages left: FS14 (Integration & Polish) and FS15 (Production
   Readiness). The contract *does* carry calls for two of them (`GET /channels` …, `POST /studio/dry-run` +
   `POST /studio/compare`), so they are **not** verified absences like `/logs` — they are unbuilt screens.
   Building them is screen work, not integration work, and would be scope creep at FS14 (owner requirement
   28). §5.2 D9 states this plainly and asks for the ruling rather than deciding it here.

**Goal of FS14:** make the fifteen shipped screens behave as **one product** — every Part C journey that the
frozen contract can back proved end-to-end in E2E across three viewports, every journey it cannot back ending
at a named seam instead of a dead end — and close the three engineering duties the roadmap attached to this
stage (observability decision, font pin, CSP promotion package), plus the progressive-disclosure rollout FS13
promised in shipped copy. **No `app/` / Protocol / MASTER_SPEC change · no endpoint invented · no ONYX
token-value change · no new dependency (unless D7 Option B is ruled) · no threshold pre-raised · and the
governing constraint — ZERO commons bytes, with the one candidate that cannot avoid them declared, measured
and fallback-guarded in advance.**

**Entry conditions — satisfied.** FS13 accepted 2026-08-05 (size-limit re-baselined to **777 kB** after a
dedicated addendum; **the I2 deviation on `/audit` 174→175 and `/providers` 153→154 accepted exactly as
measured, its wording frozen — this plan cites it and does not restate it**; FE-RV-16 opened). Post-FS13
standing references: **`/chat` 180 / 180 — ZERO headroom** · `/admin` 179 · `/knowledge` 176 · `/audit` 175 ·
`/jobs` 172 · `/dashboard` 168 · `/studio` 165 · `/providers` 154 · `/memory` 150 · `/prompts` 150 ·
`/analytics` 148 · `/billing` 144 · `/health` 139 · `/settings` 121 · `/profile` 121 · seams 111 · stubs 107 ·
shared commons 107. Gate floor to hold: ESLint/Prettier clean · tsc 0 errors · **Vitest 784 / 101 files** ·
**Playwright 356 / 0 failed / 16 skipped** · axe 0 · dependency-cruiser 0 (606 modules, 1574 deps) ·
Storybook 54 stories · contract ✅ · `pnpm budget` 31 routes ≤ 180 · `pnpm size` 765.23 / 777.
This plan is FS14's first deliverable.

---

## 1. Scope

**IN:**

- **T-FS14.1 — the ZERO-commons lock, the protected-route baseline, and THREE pre-declared decision gates
  (FIRST, before any other FS14 code).** Nothing in FS14 is more important, because `/chat` has **0.0 kB** of
  headroom and one commons byte fails `pnpm budget`:
  1. **The R1i consumer trace, executed as a task and written down before anything is built.** FS13's lesson
     (PART1 rule 66) is that a zero-commons promise is only as good as the map of where the *consumer* of new
     state lives. FS14 has exactly one candidate for new cross-cutting state — the **observability sink** —
     and its consumers are an error boundary (`app/`), the Query error handler (`shared/providers` /
     `shared/lib/query`) and `apiFetch` (`shared/lib/api`). **All three are commons.** Therefore the plan does
     **not** claim "zero commons edits" for D6 Option A: it claims *zero commons edits for everything except a
     module whose byte cost is measured before it ships, against three pre-declared fallbacks* (§5.2 D6).
  2. **The protected-route baseline.** `pnpm budget` + `app-build-manifest.json` + the webpack runtime chunk
     gz size captured **before any FS14 code**, so every later movement is a byte comparison, not a
     recollection (rule 52). `/chat` is the **primary** protected route, `/memory` the **co-primary**;
     `/audit` (175) and `/providers` (154) join the watch list because FS13 moved them.
  3. **Gate A — the observability sink placement.** Three shapes are costed and the cheapest that satisfies
     Stage 2 §11 is measured: (i) **server-only** — a BFF route handler plus `instrumentation.ts`, **zero
     client bytes by construction**; (ii) **client sink, lazy** — a no-op stub in commons with the real
     reporter dynamically imported at idle; (iii) **client sink, eager**. **Pre-declared outcome rule:** if
     any protected route moves at all, shape (iii) is abandoned; if shape (ii) also moves a route, the stage
     ships shape (i) and records the client-side gap honestly. No argument, no hypothesis — the build decides.
  4. **Gate B — `app/global-error.tsx`.** Stage 2 §11 names a root error boundary the console does not have.
     It is a route-level file, so Next should emit it as its own chunk — *should* is not a measurement. Added,
     measured, and **dropped if any protected route moves**, with the absence recorded.
  5. **Gate C — the font pin (FE-RV-5).** Executed per the D7 ruling; the swap is CSS/binary only and must
     move **no** JS byte. If it moves one, it is reverted and reported.
  6. **The first-consumer scan (R1c), again.** `shared/ui/data-table` and `shared/ui/code-block` still have
     **zero product consumers** (FS12 refused DataTable on measurement; FS13's re-scan confirmed the only
     apparent consumer is a comment). FS14 needs neither. The scan is re-run and recorded; if any FS14 module
     would become the first consumer of an unreferenced heavy `shared/ui` module, the runtime chunk is
     measured before/after with the standing fallback (build it from ONYX primitives).
- **T-FS14.2 — the Part C journey audit (measurement, not prose).** For each of the five Part C journeys:
  every step mapped to (a) the contract call that backs it, (b) the shipped surface that renders it, (c) the
  cross-link that carries the user from one screen to the next, or (d) the named seam where the chain honestly
  ends. The output is the **journey matrix** in §2 turned into a checked inventory plus a **gap list**: the
  precise set of missing cross-links. **No screen is built to fill a gap** — a gap is either a route-local
  link between shipped screens, or a seam.
- **T-FS14.3 — cross-link integration, route-local only.** The gaps T-FS14.2 finds are closed with **static
  markup inside the widget that owns the screen** — the FS12 seam-links precedent (`platform-seams` already
  links to `/jobs` and `/health`, and that fix also cured a real a11y defect). Hard rules, fixed at approval:
  no new import of a feature or entity into a shipped widget · no new mutation anywhere · no new query · no
  Inspector registry row · no palette group · every edited route byte-compared against the T-FS14.1 baseline
  · any link that would require a client component where the page is server-rendered is rendered by the
  **RSC page** (rule 60). The edited-file list is fixed at T-FS14.2 from the candidate set in §3.3 and
  reported file by file.
- **T-FS14.4…T-FS14.8 — the five journeys, as E2E specs across three viewports** (`tests/e2e/journeys.spec.ts`,
  one file so the journey inventory has one home):
  - **J1 Compose → Pipeline** (D3 Part C #1, D1 §7.2), over the calls that exist: Dashboard **Compose** →
    `/chat` streamed turn (FS6, verbatim relay) → **Insert to channel** (`POST /channels/{id}/posts` 201 +
    the optional `POST /posts/{id}/generate` 202) → the queued intent visible as a **task** (`/jobs`, FS12)
    and the item visible in **Needs Review** (Dashboard, FS5) → **approve/reject** as a 202 queue intent
    (FS5) → the published record readable in **Memory** content level (FS8) and the cost/quality effect in
    **Analytics** (FS11). The steps the contract cannot back — validation chips, the post's image, the single
    review surface, publish/schedule — are asserted as **named seams**, not skipped (D1/D9).
  - **J2 Cite → Source**: an `ask-document` Citation opens `?inspect=document:<id>` without navigating away;
    Back/`esc` restore focus and the underlying screen. *"At the exact chunk"* is impossible — there is no
    chunk resource (FS7 D1) — so the journey resolves to the **document**, and the retrieval-honesty surface
    states why (D2).
  - **J3 Alert → Triage**: `/health` readiness → a failing probe → `/jobs` filtered to the task → the task's
    **own recorded error** → the requeue **intent** (202) → `/audit` showing the trail. The journey's
    Notification start, its Logs step and its Docs runbook end at the shipped seams (D4).
  - **J4 Explain-this**: a published post in Memory → the persona that shapes the channel's voice →
    `explain-style` (user-invoked, unchanged FS6 relay) → the MemoryCard's **provenance** → Back. **No
    influence, attribution or causation claim is made or asserted for** — FS8 established there is no trace
    (D5).
  - **J5 Everything ⌘K**: every navigable route reachable from the palette, **RBAC-filtered**, proved
    **registry-driven** (iterating `ROUTE_LIST`, so a future route cannot silently escape the assertion)
    rather than by a hand-written list of names.
- **T-FS14.9 — observability, exactly as the D6 ruling directs**, and no further. Whatever the shape, three
  properties are fixed at approval: **PII/secret-scrubbed by construction** (no message body, no e-mail, no
  key, no query string, no record content — an allowlist of fields, never a denylist), **correlation-id
  aligned** with `X-Request-Id` so a client event can be matched to the backend's structured logs (§R12.9,
  read-side only, no backend change), and **off by default in local/ci** behind the existing public env
  contract. No vendor SDK is installed under Option A or C.
- **T-FS14.10 — FE-RV-5 per the D7 ruling.** Either the binaries land in `public/fonts/` and `fonts.ts`
  switches to `next/font/local` (with the no-FOUC duty re-proved against the initial HTML document, the FS13
  assertion re-used), or the item **stays open and is reported open** with the reason. There is no third
  outcome in which it is described as closed.
- **T-FS14.11 — the CSP promotion package.** A source-derived audit of every directive against what the app
  actually does today (`next/font` self-hosted CSS · Tailwind v4 + CSS Modules · React 19's inline bootstrap ·
  the SSE relay's same-origin `connect-src` · `img-src 'self' data: blob:` and what FE-RV-12 would change ·
  `frame-ancestors 'none'` · `object-src 'none'`), the **nonce-vs-`unsafe-inline` decision written down with
  its rendering cost**, the enforced header **authored but not enabled**, and the report sink wired only if
  D6 allows it. Enforcement is a runtime item (§5.3).
- **T-FS14.12 — the progressive-disclosure rollout FS13 promised** (D3 A2; FS13_REPORT §8 names it FS14 work
  and the shipped Settings copy tells the user so). Experience level is owned by
  `features/change-settings/model/preferences.ts` and read through `useAccountPreferences`; a **widget may
  import a feature**, so every consumer is route-local and **no commons byte is required** — verified against
  the barrel, which exports **model modules only** (no UI), so the FS11 barrel hazard does not apply. Applied
  to the screens named in D10, each measured, with a **per-screen drop rule**: a screen whose First Load moves
  does not get the disclosure, and its absence is recorded. `/chat`'s eager shell is excluded **by
  construction**, not by care.
- **T-FS14.13 — the D4 polish pass, as gates rather than opinions.** Three checks the project has never
  executed: **200% zoom**, **320px reflow** and **`prefers-reduced-motion`** (D4 §3 lists all three; axe tests
  none of them). Plus a repo-wide **status-vocabulary audit** (D2 §11 — every rendered state is a registered
  status or an explicit raw label, the FS12 rule), an **empty/loading/error state audit** per shipped screen
  (D2 §15/§16, D4 §10), and a **`text.tertiary` usage audit** (five usage precedents). Any defect is fixed
  **where it is caused** — in the content or the call site, never in a token value and never in the shell
  (FS7/FS9/FS10/FS12 precedent).
- **T-FS14.14 — the ten gates, the §6.3 budget verification, `FS14_REPORT.md` → STOP.**

**OUT (explicit):** everything in §8.

---

## 2. The Part C journey matrix (a first-class constraint, not a note)

`API_SPEC.md` is frozen and wins over D1/D3 wherever they disagree. This is the audit that produces every
deviation in §5.2. "Shipped" = the surface exists today and is E2E-covered by its own stage's spec.

| Part C step (D3 Part C / D1 §7) | What the frozen contract carries | What is shipped | FS14 verdict |
|---|---|---|---|
| **J1** Compose from Dashboard/Chat | — (client navigation) | Dashboard Compose → `/chat` (FS5/FS6) | **REAL** |
| **J1** streaming draft | `POST /studio/dry-run` (§R10.9) via the verbatim relay | `/chat` streamed turn (FS6) | **REAL** |
| **J1** validate chips | `POST /posts/{id}/validate` → 202, **no result read**, no gate fields on the post | — | **SEAM** (D1) |
| **J1** image step | `generate_image` is a pipeline stage; **no post↔image link**, **no media URL** (FS9 D2) | `/studio` records (FS9) | **SEAM** (D1) |
| **J1** single Review surface (text + image + why) | cannot be assembled: no validation read, no image link | Needs-Review queue + the `post` Inspector (FS5) | **PARTIAL — named** (D1) |
| **J1** approve / reject | `POST /posts/{id}/{approve\|reject}` → 202 | `features/review-post` (FS5) | **REAL** |
| **J1** publish / schedule | `POST /posts/{id}/{publish\|schedule}` → 202 **exist** | **nothing** — the screen that owns them (D3 §13 Channels) is a stub | **RULING REQUESTED** (D1) |
| **J1** failure → Needs Review | task rows + post status | Dashboard queue (FS5), `/jobs` (FS12) | **REAL** |
| **J1** later in Analytics | `GET /analytics/*`, `GET /cost` | `/analytics` (FS11) | **REAL** |
| **J2** Citation → source | no chunk resource, no retrieval call (FS7 D1) | `ask-document` Citation → `?inspect=document:` | **REAL to the DOCUMENT** (D2) |
| **J2** citations inside Chat | the relay carries no citation fields; fabricating them is forbidden (FS6) | — (deferred at FS7 for the `/chat` budget, backlog R9) | **SEAM, not reopened** (D3) |
| **J3** Notification → alert | **no notifications endpoint, no table** (FS12) | `/notifications` verified absence | **SEAM start** (D4) |
| **J3** Health probe | `GET /health/{live\|ready}` | `/health` (FS12) | **REAL** |
| **J3** Jobs requeue intent | `POST /tasks/{id}/{cancel\|run\|requeue}` → 202 | `/jobs` (FS12) | **REAL** |
| **J3** Logs, pre-filtered | **no logs endpoint** (FS12) | `/logs` verified absence | **SEAM** (D4) |
| **J3** Docs runbook | **no docs endpoint** | `/docs` stub | **SEAM** (D4/D9) |
| **J4** published post → memory trace | **no trace, no influence resource** (FS8 D1/D3) | `explain-style` over ONE persona | **HONEST ANALOGUE** (D5) |
| **J5** everything via ⌘K, RBAC-filtered | — (client) | palette: `@` goto · `#` five groups · `/` Ask AI · commands | **REAL — proved registry-driven** |

Backend truth this stage renders: **§R10.1** — the panel is a client of the same endpoints and a queued
mutation is `202 {task_id}`, so every cross-screen hand-off states *queued*, never *done*. **§R8.4/§R7.4** — a
failed gate routes an item to Needs Review rather than failing silently, which is precisely what J1 asserts.
**§R10.3** — nothing gated is rendered as a value anywhere along a journey. **§R10.5** — RBAC is enforced
server-side; a journey that crosses a permission boundary must land on a permission state, never a crash, and
J3/J5 assert exactly that. Design language: D3 A1–A8 (the frameworks the journeys traverse), D4 §2
(responsive), §3 (a11y), §8 (error recovery), §9 (notification strategy), §10 (design QA), D2 §11 (status
vocabulary), §15/§16 (empty/loading/error).

---

## 3. Deliverables, matrices and guarantees

### 3.1 Rendering & loading matrix (fixed at approval — every new or changed module)

| Module | Layer | S/C | Eager/Lazy | Touches First Load? |
|---|---|---|---|---|
| `tests/e2e/journeys.spec.ts` (five journeys ×3 viewports) | tests | — | — | **no — not shipped code** |
| `app/api/telemetry/route.ts` *(D6 Option A/C only)* | app (BFF) | **S** | route handler | **no — server only, zero client bytes** |
| `src/instrumentation.ts` *(D6 Option A/C only)* | app | **S** | server runtime | **no** |
| `shared/lib/observability/sink.ts` *(D6 Option A only)* | shared | C | **commons — the ONE measured candidate** | **YES → Gate A** |
| `shared/lib/observability/report.ts` (the real reporter) *(D6 Option A only)* | shared | C | **LAZY** — dynamically imported at idle by the stub | no |
| `app/global-error.tsx` *(Gate B)* | app | C | own route chunk (to be proved) | **measured → Gate B** |
| `shared/config/fonts.ts` (`google` → `local`) *(D7)* | shared config | S | build-time | **no JS** — CSS/binary only |
| `public/fonts/*.woff2` *(D7)* | static | — | — | no |
| `next.config.ts` (enforced CSP authored, report sink) *(D8)* | config | — | headers | **no JS** |
| Cross-link markup inside shipped widgets/RSC pages *(T-FS14.3)* | widget/app | **S where possible** | eager, route-local | **that route only — byte-compared** |
| Progressive-disclosure reads (`useAccountPreferences`) *(D10)* | widget | C | with the surface that reveals detail — **lazy where the surface is lazy** | that route only |

**Three rules restated, all learned by measurement:** (a) **static markup belongs in the RSC page**, not in a
`'use client'` widget (rule 60) — every cross-link that can be server-rendered is; (b) **every `dynamic()`
anywhere adds an entry to the global webpack runtime chunk-id map, which lives in commons** (rule 61) — FS14
adds **at most one** new `dynamic()` (the lazy reporter under D6 Option A) and it is inside Gate A's
measurement; (c) **a `useMutation` hook never enters an eager view** (R1g) — FS14 adds **no mutation at all**
under D1 Option A, and under Option B exactly one, in a lazy component, never in the static `PostInspector`
(which sits in shell commons and would tax all 31 routes).

### 3.2 Query keys & invalidate graph (fixed at approval)

**FS14 declares no new query key, no new endpoint path and no new fetcher** — the second stage in a row
(FS13 was the first). There is no FS14 resource: a journey is a path across surfaces that already own their
data, and observability writes to a first-party BFF route that is **not** an `/api/v1` endpoint and therefore
never enters `shared/lib/api/endpoints.ts`.

| Read | Key | Owner | Added by FS14 |
|---|---|---|---|
| every read a journey traverses | the shipped keys of `entities/{post,job,job-queue,document,persona,audit,analytics-report,probe,…}` | their FS5–FS13 slices — **frozen** | nothing |

**Invalidate graph.**

| Writer | Invalidates | Deliberately does NOT invalidate |
|---|---|---|
| *(none — FS14 ships no mutation under D1 Option A)* | — | everything |
| *(D1 Option B only)* publish / schedule intent | `['posts']` + `['jobs']` — **exactly what `review-post` already invalidates**, reusing its declared coupling rather than inventing a second one | analytics (the effect is a later worker outcome, not a client fact) |
| observability sink | **nothing** — telemetry is not application state and never enters the Query cache | everything |

**Locked by test:** (a) no FS14 module declares a query key, a path builder or an `apiFetch` call;
(b) **FS14 contains no `useMutation`, no `invalidateQueries` and no `setQueryData`** (the FS11/FS13 lock,
re-applied) — unless D1 Option B is ruled, in which case exactly one confirmed mutation exists with the
invalidation above; (c) the sink module contains no reference to `queryClient`, `useUiStore`, storage or any
record content — an allowlist assertion, not a denylist; (d) every entity and feature slice a journey
traverses is byte-identical to its shipped form.

### 3.3 FS1–FS13 no-touch guarantee (protects `/chat` **180/180** · `/memory` 150 · `/knowledge` 176 · `/dashboard` 168 · `/studio` 165 · `/prompts` 150 · `/analytics` 148 · `/admin` 179 · `/audit` 175 · `/jobs` 172 · `/providers` 154 · `/billing` 144 · `/health` 139 · `/settings` 121 · `/profile` 121 · seams 111)

**Not touched, file by file** (proved at acceptance by mtime + content grep + First-Load manifest — the
FS7–FS13 method): all of `features/**` (**all 24 shipped slices**) · all of `entities/**` (**all 20 shipped
slices**) · `widgets/inspector/**` (**no new registry row**) · `widgets/command-palette/**` (**no new group**)
· `widgets/{app-shell,sidebar,topbar,mobile-nav,shortcut-cheatsheet}/**` · `shared/ui/**` ·
`styles/tokens.css` · `shared/config/{query-keys.ts,endpoints.ts,rbac.ts,routes.ts,route-access.ts,shell.ts,
theme.ts,shortcuts.ts,shortcuts-catalog.ts,models.ts,auth.ts,env.ts,server-env.ts}` ·
`shared/lib/{api,ai-gateway,auth-gateway,stream,persist,rbac,format,store,fixtures,notifications,query}/**` ·
`shared/providers/**` and the seven-provider tree and its order · `app/layout.tsx` · `app/providers.tsx` ·
`app/api/{auth,ai,config}/**` · `middleware.ts`.

**`app/layout.tsx` and `shared/config/theme.ts` stay frozen for the same reason as at FS13:** they apply theme
and density server-side from the cookie with no FOUC. D7 changes **which loader `fonts.ts` calls**, never
where the read happens, and the FS13 initial-document assertion is re-run to prove the duty survived.

**Files FS14 MAY edit, with the reason each cannot move a protected route's budget:**

| File | Edit | Why it is safe |
|---|---|---|
| `next.config.ts` | enforced CSP authored (not enabled) + a report sink if D6 allows | headers only — **zero JS bytes** |
| `shared/config/fonts.ts` | `next/font/google` → `next/font/local` (D7) | build-time font loading; CSS/binary, no JS module graph change — and Gate C measures it anyway |
| `public/fonts/*` | two `.woff2` binaries (D7) | static assets, never in a JS chunk |
| `shared/lib/observability/*` **(new)** | the sink, **only under D6 Option A** | **commons — Gate A**, with three pre-declared fallbacks |
| `app/api/telemetry/route.ts`, `src/instrumentation.ts` **(new)** | server sink (D6 A/C) | server-only; a route handler ships no client JS |
| `app/global-error.tsx` **(new)** | root error boundary (Gate B) | route-level file, measured; dropped if any protected route moves |
| **Candidate** cross-link sites (fixed at T-FS14.2, each reported): `widgets/health/*`, `widgets/jobs/*`, `widgets/audit/*`, `widgets/dashboard/*`, `widgets/memory/*`, `widgets/platform-seams/*`, and the RSC pages of those routes | static markup + `next/link` only | route-local; no new import of a feature/entity; byte-compared per route against the T-FS14.1 baseline |
| **Candidate** progressive-disclosure sites (fixed at T-FS14.12, each reported) | one `useAccountPreferences` read per surface | the barrel exports **model only**; route-local; per-screen drop rule |
| `tests/**` | the journey spec + the polish assertions | never shipped |

Every fixture stays **byte-identical**: FS14 adds **no fixture row at all**, so no rendered order can shift
(the FS13 lesson that additive-by-id is insufficient when **order** is an input). If a journey needs a state
the dataset does not already produce, the journey is **re-scoped to the state that exists** — never the
dataset re-cut.

### 3.4 State-ownership matrix (fixed at approval)

| State | Owner | Persistence | Invalidated by | S/C | Lifetime | Replacement seam |
|---|---|---|---|---|---|---|
| Everything a journey reads (posts, tasks, documents, personas, audit, probes, metrics) | **TanStack Query**, via the shipped slices | memory | their own writers (unchanged) | C | per resource | unchanged |
| Journey position (which screen, which target) | **the URL** (`nuqs` / route) | the URL | — | C | the URL | §3.5 |
| Experience level (progressive disclosure) | `features/change-settings` preferences module | localStorage (+ `useSyncExternalStore`) | — | C | per browser | the ONE preferences module (FE-RV-16) |
| Theme, density, sidebar, active channel | the FS1 cookie mechanism / the Zustand UI store | cookie | — | S+C | per browser | unchanged `shared/config/theme.ts` |
| Telemetry events (D6) | **nobody — fire-and-forget** | none (client); the server sink writes structured output | — | C→S | the event | the sink module, one swap point |
| Streaming turns a journey triggers | the FS6 transient assistant store | none | reconcile on done | C | the turn | unchanged FS6 seam |

**The hard rule holds: nothing is owned by TanStack Query *and* Zustand.** Telemetry deliberately has **no**
owner in the six-kind model — it is not application state, it never re-renders anything, and a test asserts
it cannot read or write any store, cache or storage. Progressive disclosure adds **no** new state: it *reads*
the preference FS13 already owns. Enforced by source-level tests, not review.

### 3.5 Navigation contract (URL is the state; every transition is reversible)

| Transition | URL | History |
|---|---|---|
| Any journey hop between screens | the destination route's own URL (unchanged from its stage) | **push** — a screen is a place |
| Compose → Chat (`J1`) | `/chat?q=…` consumed once, then `/chat/<id>` | `replace` for the created conversation (the FS6 rule: the `?q=` clear must not race `router.replace`) |
| Open any record along a journey | `?inspect=<type>:<id>` on the current route — **existing registered types only** | **push**; `esc` / Back closes and restores focus |
| Filter Jobs to a task (`J3`) | the FS12 `?status=&type=&channel_id=` params | **push** (data-changing), per FS11's rule |
| Progressive-disclosure level | **not in the URL** — it is a preference, not a shareable view (D4 §7) | — |
| A journey step the contract cannot back | **no URL** — a seam is content on the screen the user is already on | — |

Every journey step is a **shareable link that Back reverses**, restored on paste and re-checked against the
viewer's RBAC (D1 §6.8) — and J5 asserts exactly that for a role that may not enter. **FS14 registers no new
Inspector type and no new palette group**, at zero commons cost (the FS13 D9 decision, re-applied for the
same measured reason).

### 3.6 Bundle ownership (per-chunk architecture)

| New chunk | Single importer | First-load trigger | Could it reach commons? | Mechanical proof |
|---|---|---|---|---|
| `observability-report` *(D6 Option A)* | the commons stub, via `dynamic()`/`import()` at idle | never on first load — idle only | **the stub can; the reporter must not** | Gate A: manifest absence from all 31 routes + runtime-chunk gz before/after |
| `global-error` *(Gate B)* | Next's root error boundary | only on a root error | to be **measured**, not assumed | Gate B: 31-route table before/after |
| *(none)* journey chunks | — | — | — | **not created** — a journey is a test, not a module |
| *(none)* Inspector row / palette group | — | — | **would be commons** | **not created** (FS13 D9 precedent) |
| *(none)* new dependency | — | — | — | **not added** (unless D7 Option B) |
| server-only sink (`app/api/telemetry`, `instrumentation.ts`) *(D6 A/C)* | Next server runtime | — | **no — never in a client graph** | route-handler output carries no client chunk |

### 3.7 Regression invariants (checkable, not intentions)

- **I1 — `/chat` First Load stays 180 kB and `pnpm budget` PASSES (31 routes ≤ 180).** `/chat` is the
  **primary protected route** with **0.0 kB of headroom**: this is the stage's pass/fail condition, not a
  target. Byte-compared **twice** (immediately after Gate A — the stage's first and only commons-touching
  artefact — and again before acceptance), per rule 52.
- **I2 — `/memory` 150 · `/dashboard` 168 · `/knowledge` 176 · `/studio` 165 · `/prompts` 150 ·
  `/analytics` 148 · `/admin` 179 · `/audit` 175 · `/jobs` 172 · `/providers` 154 · `/billing` 144 ·
  `/health` 139 · `/settings` 121 · `/profile` 121 · seams 111 · stubs 107 unchanged.** `/memory` is
  **co-primary** (it has moved on ±28 B of commons in three stages); `/audit` and `/providers` are on the
  watch list because they moved at FS13. A ±1 kB movement is **reported as a deviation with a control build**
  and, where the question is "could it be cheaper", with a **shape variant** (the FS13 control-C + build-D
  method) — never re-worded (rule 44).
- **I3 — shared commons stays 107 kB, and `query-keys.ts` / `endpoints.ts` are not opened at all** (zero rows
  *and* zero edits). The single permitted exception is Gate A's sink under D6 Option A, whose byte cost is
  measured and reported **before** it ships and which the pre-declared fallbacks remove if it moves a route.
- **I4 — every route's First Load is reported, and no route regresses.** The three stub routes stay 107.
- **I5 — ONYX untouched:** `styles/tokens.css` and every `shared/ui` component contract byte-identical. **No
  ONYX MINOR is requested** and **no new D2 §11 status is registered.** Any contrast or a11y defect the polish
  pass finds is fixed by **token usage or call-site content**, never by a token value and never in the shell.
- **I6 — no FS1–FS13 surface file modified** except the declared set in §3.3, each with its measured
  justification and each named in the report.
- **I7 — previous suites stay green without weakening.** Floors: Vitest **784 / 101 files**, Playwright
  **356 passed / 0 failed / 16 skipped**, axe **0**, dependency-cruiser **0**. One class of existing-spec
  change is declared **I7-legal in advance**: if the polish pass (T-FS14.13) fixes a real defect, the spec
  that covered the old behaviour is updated to the corrected behaviour — **strengthened, never loosened**,
  and the strengthening is shown in the report.
- **I8 — no new dependency (unless D7 Option B is ruled) · no ADR created · no token change · no threshold
  pre-raised · no `app/` change · no backend endpoint invented · no fixture row added.**

### 3.8 File-level deliverables (maps to Stage 3 §1/§9)

```
tests/e2e/journeys.spec.ts                    ← the five D3 Part C journeys ×3 viewports
tests/unit/{observability-scrub,csp-directives,journey-registry}.test.ts
tests/component/{GlobalError,ProgressiveDisclosure}.test.tsx
src/instrumentation.ts                        ← server sink bootstrap        (D6 A/C only)
src/app/api/telemetry/route.ts                ← first-party BFF sink         (D6 A/C only)
src/shared/lib/observability/{sink.ts,report.ts,index.ts}  ← Gate A          (D6 A only)
src/app/global-error.tsx                      ← root error boundary          (Gate B)
src/shared/config/fonts.ts                    ← next/font/local              (D7 A/B)
public/fonts/*.woff2                          ← the pinned binaries          (D7 A/B)
next.config.ts                                ← enforced CSP authored + report sink
(route-local cross-links and disclosure reads: exact file list fixed at T-FS14.2 / T-FS14.12)
```

---

## 4. Task sequence (each with a completion criterion)

| # | Task | Done when |
|---|---|---|
| T-FS14.1 | Zero-commons lock · R1i consumer trace · protected-route baseline · **Gates A, B, C** · R1c re-scan | the 31-route table, `app-build-manifest.json` and runtime-chunk gz recorded **before any FS14 code**; each gate's ship/abandon decision **written down with its numbers**; the consumer of every new piece of state traced to its layer in writing |
| T-FS14.2 | The Part C journey audit → the checked matrix + the **gap list** | every step of every journey resolved to contract call · shipped surface · cross-link · or seam; the exact edited-file list for T-FS14.3 fixed and justified route by route |
| T-FS14.3 | Cross-link integration (route-local static markup only) | each edited route byte-compared against the baseline; no feature/entity import added; no mutation, query, Inspector row or palette group added; every link keyboard-reachable and named |
| T-FS14.4 | **J1 Compose → Pipeline** E2E ×3 viewports | the chain runs on the real fixtures through the real relay; every 202 states *queued*; the four unbackable steps assert **named seams**, not silence |
| T-FS14.5 | **J2 Cite → Source** E2E | Citation → `?inspect=document:` without navigation; Back/`esc` restore focus; the "exact chunk" absence is asserted where a chunk view would be |
| T-FS14.6 | **J3 Alert → Triage** E2E | health probe → filtered Jobs → the task's own recorded error → requeue intent (202) → audit trail; the Logs/Docs/Notifications seams assert fact · reason · remedy |
| T-FS14.7 | **J4 Explain-this** E2E | published post → persona → `explain-style` provenance → Back; a unit assertion re-proves **no influence/attribution claim** is producible |
| T-FS14.8 | **J5 Everything ⌘K** E2E + registry-driven proof | the assertion iterates `ROUTE_LIST` (a future route cannot escape it); RBAC filtering proved for a role that may not enter, landing on a permission state |
| T-FS14.9 | Observability per the D6 ruling | scrubbing proved by an **allowlist** unit test (no body, e-mail, key, query string or record content can reach the sink); correlation-id alignment proved; off by default in local/ci; Gate A's numbers reported either way |
| T-FS14.10 | FE-RV-5 per the D7 ruling | either the binaries are in the tree, `fonts.ts` uses `next/font/local`, the no-FOUC assertion passes and the item is **closed**; or the item is reported **still open** with the reason — no third description |
| T-FS14.11 | The CSP promotion package | every directive justified from source; the nonce-vs-`unsafe-inline` decision written with its cost; the enforced header authored and **not enabled**; the runtime item registered |
| T-FS14.12 | Progressive-disclosure rollout (D10) | each screen measured; a moved route means the screen is dropped and recorded; a component test proves a real behavioural difference per level on every screen that ships it |
| T-FS14.13 | The D4 polish pass | 200% zoom · 320px reflow · reduced-motion executed as tests; status-vocabulary, state and `text.tertiary` audits recorded; every defect fixed where it is caused |
| T-FS14.14 | Ten gates + §6.3 budget verification + `FS14_REPORT.md` | executed for real; every number recorded → **STOP for acceptance** |

---

## 5. Gates, contract truth & honesty

### 5.1 Engineering gates

All ten, executed for real (Stage 2 §14): ESLint · Prettier · `tsc --noEmit` strict (0 errors, 0 unjustified
`any`) · Vitest · Playwright ×3 viewports · **axe 0** · dependency-cruiser 0 · Storybook build · contract
(**FS14 introduces no endpoint; every call a journey traverses already exists verbatim in `API_SPEC.md`, and
the telemetry route is first-party, not `/api/v1`**) · `pnpm budget` (31 routes ≤ 180 kB) · `pnpm size`.
**A gate that ends RED is reported RED with the threshold untouched** (rule №33). The three new checks of
T-FS14.13 (zoom, reflow, reduced-motion) are added **inside** the existing Playwright gate — no eleventh gate
is invented.

### 5.2 Contract truth & deviations (decided by approving this plan)

- **D1 — The pipeline journey is delivered over the calls that exist, and its four unbackable steps are named
  seams. OWNER RULING REQUESTED on publish/schedule.** Verified: `POST /posts/{id}/validate` exists but
  **nothing reads a validation result**; there is **no post↔image link and no media URL**; so *"validate
  chips"* and *"a single Review surface with text + image"* are not buildable honestly at any budget.
  `publish` and `schedule` **do** exist as calls, but the screen that owns them (D3 §13 Channels) is a stub.
  **Option A (recommended):** FS14 wires **no pipeline mutation**; J1 runs Compose → draft → insert (201) →
  generate (202) → task → Needs Review → approve/reject (202) → Memory/Analytics, and the publish/schedule
  step is a **named seam** pointing at the screen that will own it. Rationale: FS14's charter is integration,
  not screens; a publish affordance on a surface that provably cannot show what is being published (no
  image, no gate results) is the §R10.3 honesty rule violated on an **action** rather than on data; and it
  keeps FS14 at **zero mutations**.
  **Option B:** one new lazy feature (`publish-post`) adds confirmed `publish`/`schedule` intents to the
  shipped Needs-Review surface, reusing `review-post`'s declared invalidation. Cost: one mutation, one lazy
  chunk on `/dashboard` (168 — 12 kB of headroom), and it **must not** touch the `post` Inspector, which is a
  **static import in shell commons** and would drag TanStack's mutation machinery into all 31 routes (R1g).
  *Recommendation: A.*
- **D2 — "At the exact chunk" is impossible; Cite → Source resolves to the record.** FS7 established that the
  contract exposes no retrieval, chunk or score endpoint, and that citations are **user provenance**. J2
  therefore asserts the document (and, in J4, the persona record). The retrieval-honesty surface FS7 shipped
  is where the absence is stated; FS14 adds no new claim there.
- **D3 — Chat gains no in-thread citations, and this is a decision, not an omission.** D3 Part C names
  citations "in Chat"; the FS6 relay carries no citation field and fabricating one is forbidden by the
  standing owner condition. Re-opening the knowledge-attach seam (backlog R9) would also add weight to the
  one route with **0.0 kB** of headroom. J2's chat leg is therefore the palette `/` hand-off and
  insert-to-channel — both real — and the seam stays visible.
- **D4 — Alert → Triage starts at Health and ends at a seam.** `/notifications`, `/logs` and the Docs runbook
  have no contract call (FS12's verified absences; `/docs` is an unbuilt screen with no docs endpoint). J3
  therefore runs the real middle of the journey — probe → task → its **own recorded error** → requeue intent
  → audit — and asserts the seams at both ends. **No log line, notification or runbook is simulated**, on any
  viewport.
- **D5 — Explain-this uses the honest analogue and makes no attribution claim.** FS8 established there is no
  influence trace and that an attribution claim would be fabrication. J4 asserts provenance only, and a unit
  assertion re-proves the prompt cannot produce an influence, attribution or causation claim.
- **D6 — Observability vendor: OWNER RULING REQUESTED (FE-ADR-3 comes due here).** Verified state: **no sink,
  no `instrumentation.ts`, no `global-error.tsx`, no Query error handler, no web-vitals** — only the
  correlation id and the per-group error boundaries. The budget makes one option structurally impossible and
  the R1i lesson makes one placement decisive.
  **Option A (recommended): the vendor-agnostic seam, no vendor.** A tiny commons stub (a no-op by default)
  behind which the real reporter is **dynamically imported at idle**, feeding a **first-party BFF route**
  (`POST /api/telemetry`) that writes structured, correlation-id-aligned, PII-scrubbed output server-side;
  web-vitals and error-boundary/Query errors are its only producers; the vendor binding becomes an
  environment decision at deploy time. Cost: **the stub is commons** — Gate A measures it, and the
  pre-declared fallbacks (lazy-only → server-only) execute without debate.
  **Option B: bind a vendor SDK now (e.g. Sentry).** This adds a **new runtime dependency** (breaking the
  FS5–FS13 record of adding none), and a client SDK initialised in the app shell is commons weight at a route
  that has **0.0 kB** — it fails `pnpm budget` by construction unless it is fully deferred, at which point it
  is Option A with a vendor lock. It also requires a written ADR, which is the owner's to author.
  **Option C: defer to FS15.** FE-ADR-3 permits it ("FS14/FS15"). FS14 would then ship **only** the
  server-side sink and the `global-error.tsx` boundary — zero client bytes — and the vendor question moves to
  the production-readiness stage where staging telemetry exists to judge it.
  *Recommendation: A, with the explicit acceptance that its stub is the stage's one commons candidate and is
  gated on measurement. If the owner prefers zero commons risk, C is the clean fallback and I will report the
  client-side gap rather than disguise it.*
- **D7 — FE-RV-5 (font pin): DECISION GATE with a pre-declared outcome.** `public/fonts/` holds only a
  README; the binaries are not in the tree, so the item cannot be closed by editing `fonts.ts`.
  **Option A:** copy the two subsetted `.woff2` files Next produces for `next/font/google` out of the build
  output into `public/fonts/` and switch to `next/font/local` — no dependency, fully offline builds
  afterwards. **Option B:** add `@fontsource`-style packages as **devDependencies**, copy the binaries into
  `public/fonts/`, and keep zero runtime dependencies — this is a *declare + install + import-check* decision
  under owner requirement 24. **Option C:** leave FE-RV-5 **open**, recorded with the reason.
  *Recommendation: A, falling back to C.* Under every option the rule is the same: **the item is described as
  closed only if the binaries are in the tree and the build uses them**, and Gate C proves the swap moved no
  JS byte and no route.
- **D8 — CSP promotion is prepared, not performed, and the reason is measured.** The report-only header has
  **no `report-uri`/`report-to`**, so no report data exists or can exist here. FS14 delivers: a directive-by-
  directive audit derived from source; the **nonce-vs-`unsafe-inline` decision** written down with its cost
  (a nonce forces dynamic rendering on routes that are currently static — a real trade-off, not a toggle);
  the enforced header **authored in `next.config.ts` but not enabled**; and a report sink **only if D6
  yields one** (otherwise the promotion package states that reporting is unwired and why). Enforcing a CSP
  that has never been observed in a browser would be exactly the "fabricated green gate" this project
  forbids.
- **D9 — `/channels`, `/playground` and `/docs` are NOT built at FS14, and the roadmap has no stage for them.
  OWNER RULING REQUESTED.** They are **unbuilt screens, not verified absences** — the contract carries
  `GET/POST /channels`, `GET|PUT /channels/{id}/settings`, `PUT /channels/{id}/bot-token`,
  `POST /studio/dry-run` and `POST /studio/compare`; only Documentation has no endpoint. Building any of them
  is screen work of FS5–FS13 size and would exceed this stage's scope (requirement 28). *Recommendation:
  accept that they remain honest stubs through FS14; if the owner wants them, that is a separate stage with
  its own GO and its own plan — never an FS14 side-effect.* Note the coupling: D1 Option A's publish/schedule
  seam is the same finding seen from the journey side.
- **D10 — Progressive disclosure ships where it is CONSUMED, screen by screen, on measurement.** FS13's rule
  (a control that changes nothing is a fabricated capability) applies to the rollout too: a screen gets the
  disclosure only if Advanced/Power **reveal something factual it already has** — candidates, in priority
  order: `/jobs` (raw task payload, attempt history), `/audit` (raw jsonb before/after), `/analytics` (the
  §R11.9 provenance line and raw metric keys), `/studio` (raw generation parameters and similarity keys),
  `/knowledge` (raw ingest status and version metadata). Each is measured; a screen whose First Load moves is
  **dropped and recorded**; `/chat` is excluded **by construction**. The copy on `/settings` is updated to
  name exactly the screens that respond — the FS13 rule that the copy must be factual about *today*.
- **D11 — No new dependency.** FS5–FS13 added none; FS14 adds none, unless D7 Option B is ruled — in which
  case it is a **devDependency** whose output is two static files, with zero runtime graph impact.
- **D12 — The three unexercised D4 §3 checks become tests, and defects are fixed where they are caused.**
  200% zoom, 320px reflow and `prefers-reduced-motion` have never been executed in this project. If a shipped
  screen fails one, the fix is in that screen's content or call site — **never** a token value (FS1/FS2/FS5/
  FS10 precedent), **never** the shared shell (FS7/FS9/FS12 precedent), and never a relaxed assertion.
- **D13 — `app/global-error.tsx` is a measured gate, not a promise** (Gate B). Stage 2 §11 names a root error
  boundary the console lacks. It ships if no protected route moves; otherwise it is abandoned and its absence
  is recorded with its number.
- **D14 — FS14 adds no fixture data at all.** The journeys run on the shipped dataset; if a journey needs a
  state the dataset does not produce, the journey is re-scoped to what exists. This is the FS13 ordering
  lesson taken to its conclusion: the safest fixture edit is none.
- **D15 — *(assumed)* runtime behaviour → FE-RV-17** (§5.3).

### 5.3 FE-RV impact

**FE-RV-5 closes** if D7 Option A or B is ruled and the binaries land in the tree; otherwise it is reported
**still open**, with the reason, and no wording softens that.

**FE-RV-17 opens — "CSP enforcement and client telemetry on real infrastructure"** (one item, per the
register's burn-down discipline): whether the enforced CSP survives a real browser behind Caddy (above all
whether Next's inline bootstrap needs `'unsafe-inline'` or a nonce, and what the nonce costs in rendering
mode) · whether `report-to`/`report-uri` reaches the first-party sink through the proxy · whether the
telemetry route survives the deployment's routing and rate limits · what `img-src` must become the day
FE-RV-12 answers that a media URL exists · whether web-vitals collected in the field match the §F8.1 targets
(the Lighthouse comparison itself remains FS15 work).
**Single adjustment points:** `next.config.ts` (the header), `src/shared/lib/observability/*` and
`src/app/api/telemetry/route.ts`.

**No FE-RV is opened for the Part C steps the contract cannot back** — validation-result reads, a post↔image
link, chunk-level citations, log entries, notification delivery or an influence trace. Those are **verified
absences** in a frozen contract (or, for `/channels`, `/playground`, `/docs`, **unbuilt screens with an
existing contract** — which is a scope question for the owner, not an unverified assumption). An FE-RV records
an assumption awaiting a wire; neither of these is that.

---

## 6. Budget strategy (First Load 180 kB · size-limit 777 kB)

### 6.1 Per-route First Load (authoritative, non-revisable)

**`/chat` = 180 / 180 — headroom 0.0 kB**, the tightest constraint in the project and FS14's pass/fail
condition. The stage is designed so that **most of its output is not shipped code at all** — five journeys are
E2E specs, the CSP package is headers and a document, the font pin is CSS and binaries, and the server sink
carries no client bytes. That leaves exactly **two** commons-touching candidates, and both are gates with
pre-declared fallbacks rather than intentions: the observability stub (Gate A, D6) and `global-error.tsx`
(Gate B, D13). `/memory` = 150 is **co-primary** (it has moved on ±28 B of commons three times); `/audit` 175
and `/providers` 154 are watched because FS13 moved them. Both primaries are byte-compared **twice** (rule
52): immediately after Gate A — the stage's first risky artefact — and again before acceptance. The proven
levers are already designed into §3.1/§3.6 rather than held in reserve: no mutation in an eager view (R1g),
at most one new `dynamic()` (R1h), static markup in the RSC page (rule 60), and one lazy chunk per family
(rule 61). **If a gate moves a protected route, the fallback executes; the threshold does not.**

### 6.2 size-limit aggregate (detector 777 kB; measured 765.23 — headroom 11.77 kB)

FS14 adds no dependency, no screen and no heavy module, so the detector is **expected** to stay green — and
that expectation is not a plan. Rule №33 is followed exactly either way: the threshold is **not** pre-raised,
not now and not mid-stage; if the gate goes red it is reported RED with its measured number, a dedicated
`FS14_REPORT_SIZE_ADDENDUM.md` is filed with per-chunk attribution, the eager/lazy split and a manifest proof
that every new lazy chunk is absent from every First Load, and the owner rules separately after the evidence
pack. The derivation the last nine rulings used (**measured + the headroom granted at the previous ruling,
rounded up**) is stated for reference only — proposing a value is the owner's act, not this plan's.

### 6.3 Lazy-loading & commons verification checklist (executed at T-FS14.14, recorded in the report)

1. `pnpm budget` — all 31 routes, before/after table vs the T-FS14.1 baseline.
2. `app-build-manifest.json` — every FS14 chunk proved **absent** from every route's First Load list.
3. The **webpack runtime chunk** gz size before/after, once per gate (A, B, C), with each decision recorded
   whichever way it went.
4. Zero-marker scan across every First Load chunk of `/chat` and `/memory`, plus `/audit` and `/providers`.
5. mtime + import scan proving the §3.3 no-touch set is untouched — with `query-keys.ts`, `endpoints.ts`,
   `routes.ts`, `shortcuts.ts`, `Inspector.tsx`, the command palette, `app/layout.tsx`, `app/providers.tsx`
   and `shared/config/theme.ts` called out explicitly, because this stage claims **zero edits** to all nine.
6. Commons delta attributed **per file** for the (at most) one edited commons module.
7. Any contested movement settled with a **control build** before a single word is written about its cause —
   both forms available (remove the addition; revert the change) — plus a **shape variant** if the question
   is "could it be cheaper" (the FS13 C+D method), and the artifact **rebuilt afterwards** (the FS11 stale-
   artifact lesson).
8. The **no-FOUC proof** re-run after the font swap: the initial HTML document carries the theme and density
   attributes before any client JS executes.

---

## 7. Risks

| # | Risk | Mitigation |
|---|---|---|
| **R1** | **`/chat` has 0.0 kB of headroom** — one commons byte fails `pnpm budget`, and there is no slack to absorb a rounding tip | the stage touches commons **at most twice**, both as measured gates with pre-declared fallbacks; no key, path, entity, Inspector row, palette group or dependency is added |
| **R1i** | **FSD placement can force a commons byte no plan can design away** (the accepted FS13 finding) — and FS14's observability sink is *exactly* that shape: its consumers are an error boundary, the Query client and `apiFetch`, all commons | traced in writing **before** any code (T-FS14.1); the plan therefore does **not** promise zero commons for D6 Option A, and the fallback ladder (lazy → server-only) is declared in advance rather than discovered at a red gate |
| **R2** | **Cross-screen E2E is the most brittle shape there is** — a journey spans five screens, so one strict-mode collision or one changed first row breaks it, and the suite already carries 356 passing tests | journeys assert **role + accessible name scoped to the visible region** (the FS7 mobile lesson), anchor on stable copy rather than order, and add **zero fixture rows** so no existing spec's inputs shift (the FS13 ordering lesson) |
| **R3** | **A journey can pass for the wrong reason** — a step that silently does nothing still "navigates" | every hop asserts a **fact from the wire** (a 202's queued wording, a task id, a record's own field), never merely a URL change; the D5-B technique of proving the negative *and then* the positive is re-used where a seam is asserted |
| **R4** | **The observability sink could leak PII** — the one new outbound path in the project | scrubbing is an **allowlist** (a fixed set of fields), never a denylist; a unit test asserts no body, e-mail, key, query string or record content can reach it; the sink is off by default in local/ci; **no secret can be present at all**, since none exists client-side (SEC-6) |
| **R5** | **A CSP promoted from no data can break production silently** | the enforced header is **authored and left disabled**; the nonce decision is documented with its cost; enforcement is FE-RV-17, and the report says so in the same words |
| **R6** | **FE-RV-5 may not be closable here** — the binaries are not in the tree and obtaining them is a decision, not a keystroke | D7's three options with a pre-declared fallback; under Option C the item is reported **open**, which is the honest outcome and not a stage failure |
| **R7** | **Rounding volatility has moved a protected route in six consecutive stages**, and at FS12 it consumed the last of `/chat`'s headroom | diagnose from `app-build-manifest.json`; prove any contested movement with a control build **before** writing a cause; report a missed invariant, never re-word it (rule 44) |
| **R8** | **Zoom/reflow/reduced-motion have never been tested** — the first run may find real defects across many shipped screens at once | they are run **early** (T-FS14.13 begins as soon as the journeys are green, not at the gate), and each defect is fixed where it is caused; if the volume exceeds the stage, the remainder is **reported as found**, with numbers, rather than quietly narrowed |
| **R9** | **Progressive disclosure could become a decoration** — a level that reveals nothing on a screen is the FS13 fabricated-control defect repeated five times | a screen ships the disclosure only if it reveals something factual it already has, proved by a component test per screen; screens that cannot are **dropped and named** |
| **R10** | **Windows hazards**: the `next` corruption (27 occurrences) and the surviving Playwright `webServer` (108 phantom failures once) — and FS14 runs the **largest E2E matrix in the project** | the unpiped `pnpm build \|\| (pnpm install --force && pnpm build)` habit; kill port 3000 before every build/E2E; rebuild after every control build; reproduce a corruption signature rather than infer it from an exit code (the FS13 lesson) |
| **R11** | **A cross-link edit could quietly import a feature into a shipped widget** and tax that route | the T-FS14.3 rule is static markup + `next/link` only, enforced by reviewing the diff of every edited file and by byte-comparing every edited route; dependency-cruiser remains the boundary gate |
| **R12** | **The stage could drift into building a screen** — J1 wants a Review surface, J3 wants Logs, D9 names three stubs | scope is fixed by §8 and by the D1/D9 rulings; **no screen is built at FS14 without a separate GO**, and a gap is a seam, not a silent expansion |

---

## 8. Not in FS14 (explicit)

`/channels` (D3 §13) · `/playground` (§11) · `/docs` (§25) — they remain honest stubs, and D9 puts that to the
owner rather than deciding it. `/logs`, `/flags`, `/notifications` (FS12's verified absences) are **not
reopened**. **No publish/schedule mutation** unless D1 Option B is ruled · **no validation-result UI, no
post↔image link, no image preview, no chunk-level citation, no in-thread chat citation, no memory influence
trace, no log line, no notification delivery, no runbook content** — every one of these is a **visible honest
seam**, because the frozen contract carries no call for it. **No vendor SDK** unless D6 Option B is ruled ·
**no enforced CSP** (authored, not enabled) · **no Chromatic upload** (FE-RV-6 stays credential-blocked) ·
**no Docker or CI execution** (FE-RV-3/FE-RV-4 are FS15) · **no Lighthouse run** (FS15) · **no new screen, no
new entity, no new query key, no new endpoint path, no new Inspector row, no new palette group, no new fixture
row, no new dependency** (unless D7 Option B), **no ADR created**, **no ONYX token value changed**, **no
threshold pre-raised**, and **`app/` is not touched**.

---

**STOP — FS14 plan complete. No code has been written.** Awaiting the owner's approval of this plan, and
explicit rulings on:

1. **D6 — the observability vendor** (FE-ADR-3 comes due): **Option A** vendor-agnostic seam with a measured
   commons stub *(recommended)* · **Option B** bind a vendor SDK now · **Option C** defer to FS15 and ship
   server-side only. *Recording the decision as an ADR is the owner's act; this plan creates none.*
2. **D1 — publish/schedule**: **Option A** integration-only, the step is a named seam *(recommended)* ·
   **Option B** one lazy confirmed intent on the shipped Needs-Review surface.
3. **D7 — FE-RV-5**: **Option A** copy the built binaries and switch to `next/font/local` *(recommended)* ·
   **Option B** a devDependency source for the binaries · **Option C** leave the item open and report it open.
4. **D9 — the three remaining stubs** (`/channels`, `/playground`, `/docs`): confirmation that they stay
   stubs through FS14 and that any of them becoming real is a **separate stage with its own GO**.
5. Confirmation of **D10** (progressive disclosure ships per screen, on measurement, dropped where it would
   reveal nothing or move a route) and **D13** (`global-error.tsx` as a measured gate with an abandon
   fallback).

Implementation begins only after that approval.
