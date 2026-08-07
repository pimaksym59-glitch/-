# Console — Frontend (Web Platform)

Premium, AI-first web client for the AI Telegram Automation Platform. Consumes the **frozen** backend only
through `/api/v1`. Design system: **ONYX v1.0**. Architecture: **RSC-first Next.js App Router + Feature-Sliced
Design**.

- **Source of Truth:** [`FRONTEND_MASTER_SPEC.md`](../FRONTEND_MASTER_SPEC.md) → [Stage 2 Architecture](STAGE2_ARCHITECTURE_PLAN.md) → [Stage 3 Technical Spec](STAGE3_TECHNICAL_SPEC.md) → code.
- **Design (frozen):** [`design/01–04`](../design/) + ONYX v1.0.
- **App code lives in [`../console/`](../console/).**

**Frontend implementation is complete: FS1–FS15, all fifteen stages delivered and accepted (2026-08-07).**
This is a statement about implementation and static verification — every engineering gate, every protected
route's budget, every architectural freeze. It is **not** a statement about Runtime Verification: closing
FE-RV-3/4/6/7…17 requires a Docker engine, a CI runner and a live backend, none of which has ever existed in
the environment this track was built in. `PRODUCTION_READINESS_RUNBOOK.md` is the standing, numbered procedure
for closing every one of them the day that infrastructure exists.

## Implementation status

| Stage | Scope | Status |
|---|---|---|
| **FS1** | Infrastructure scaffold | ✅ **Delivered** — [`FS1_REPORT.md`](FS1_REPORT.md) · [postmortem](FS1_POSTMORTEM.md) |
| **FS2** | Routing & Navigation | ✅ **Delivered** — [`FS2_REPORT.md`](FS2_REPORT.md) |
| **FS3** | ONYX Component Library | ✅ **Delivered** — [`FS3_REPORT.md`](FS3_REPORT.md) (plan: [`STAGE_FS3_PLAN.md`](STAGE_FS3_PLAN.md), ADRs: [`FE_ADR_DECISIONS.md`](FE_ADR_DECISIONS.md)) |
| **FS4** | Auth & RBAC | ✅ **Delivered** — [`FS4_REPORT.md`](FS4_REPORT.md) (plan: [`STAGE_FS4_PLAN.md`](STAGE_FS4_PLAN.md)) |
| **FS5** | Dashboard — first functional screen | ✅ **Delivered & accepted 2026-08-01** — [`FS5_REPORT.md`](FS5_REPORT.md) (plan: [`STAGE_FS5_PLAN.md`](STAGE_FS5_PLAN.md)) |
| **FS6** | AI Chat — the working AI surface | ✅ **Delivered & accepted 2026-08-01** — [`FS6_REPORT.md`](FS6_REPORT.md) (plan: [`STAGE_FS6_PLAN.md`](STAGE_FS6_PLAN.md); size-limit re-baselined to **560 kB** after the dedicated [`FS6_REPORT_SIZE_ADDENDUM.md`](FS6_REPORT_SIZE_ADDENDUM.md)) |
| **FS7** | Knowledge — the channel-isolated workspace | ✅ **Delivered & accepted 2026-08-01** — [`FS7_REPORT.md`](FS7_REPORT.md) (plan: [`STAGE_FS7_PLAN.md`](STAGE_FS7_PLAN.md); size-limit re-baselined to **598 kB** after the dedicated [`FS7_REPORT_SIZE_ADDENDUM.md`](FS7_REPORT_SIZE_ADDENDUM.md)) |
| **FS8** | Memory — the channel's voice, cast and published history | ✅ **Delivered & accepted 2026-08-02** — [`FS8_REPORT.md`](FS8_REPORT.md) (plan: [`STAGE_FS8_PLAN.md`](STAGE_FS8_PLAN.md); size-limit re-baselined to **628 kB** after the dedicated [`FS8_REPORT_SIZE_ADDENDUM.md`](FS8_REPORT_SIZE_ADDENDUM.md)) |
| **FS9** | Image Studio — the image-record workspace | ✅ **Delivered & accepted 2026-08-02** — [`FS9_REPORT.md`](FS9_REPORT.md) (plan: [`STAGE_FS9_PLAN.md`](STAGE_FS9_PLAN.md); size-limit re-baselined to **655 kB** after the dedicated [`FS9_REPORT_SIZE_ADDENDUM.md`](FS9_REPORT_SIZE_ADDENDUM.md) and a full evidence pack) |
| **FS10** | Prompt Library — the versioned prompt surface | ✅ **Delivered & accepted 2026-08-03** — [`FS10_REPORT.md`](FS10_REPORT.md) (plan: [`STAGE_FS10_PLAN.md`](STAGE_FS10_PLAN.md); size-limit re-baselined to **677 kB** after the dedicated [`FS10_REPORT_SIZE_ADDENDUM.md`](FS10_REPORT_SIZE_ADDENDUM.md) and a full evidence pack) |
| **FS11** | Analytics — the cost/quality/trend surface | ✅ **Delivered & accepted 2026-08-03** — [`FS11_REPORT.md`](FS11_REPORT.md) (plan: [`STAGE_FS11_PLAN.md`](STAGE_FS11_PLAN.md); size-limit re-baselined to **696 kB** after the dedicated [`FS11_REPORT_SIZE_ADDENDUM.md`](FS11_REPORT_SIZE_ADDENDUM.md) and a full evidence pack) |
| **FS12** | Platform & Admin — the governance surface (9 routes) | ✅ **Delivered & accepted 2026-08-04** — [`FS12_REPORT.md`](FS12_REPORT.md) (plan: [`STAGE_FS12_PLAN.md`](STAGE_FS12_PLAN.md); size-limit re-baselined to **756 kB** after the dedicated [`FS12_REPORT_SIZE_ADDENDUM.md`](FS12_REPORT_SIZE_ADDENDUM.md)) |
| **FS13** | Settings / Profile / Notification preferences — the account surface | ✅ **Delivered & accepted 2026-08-05** — [`FS13_REPORT.md`](FS13_REPORT.md) (plan: [`STAGE_FS13_PLAN.md`](STAGE_FS13_PLAN.md); size-limit re-baselined to **777 kB** after the dedicated [`FS13_REPORT_SIZE_ADDENDUM.md`](FS13_REPORT_SIZE_ADDENDUM.md)) |
| **FS14** | Integration & Polish — the D3 Part C cross-screen journeys | ✅ **Delivered & accepted 2026-08-06** — [`FS14_REPORT.md`](FS14_REPORT.md) (plan: [`STAGE_FS14_PLAN.md`](STAGE_FS14_PLAN.md); size-limit **unchanged at 777 kB** — measured 766.23 kB, green with no threshold action — per the dedicated [`FS14_REPORT_SIZE_ADDENDUM.md`](FS14_REPORT_SIZE_ADDENDUM.md)) |
| **FS15** | Production Readiness — the terminal implementation stage | ✅ **Delivered & accepted 2026-08-07** — [`FS15_REPORT.md`](FS15_REPORT.md) (plan: [`STAGE_FS15_PLAN.md`](STAGE_FS15_PLAN.md); size-limit **unchanged at 777 kB** — measured 766.23 kB, no threshold action, per [`FS15_REPORT_SIZE_ADDENDUM.md`](FS15_REPORT_SIZE_ADDENDUM.md); procedure: [`PRODUCTION_READINESS_RUNBOOK.md`](PRODUCTION_READINESS_RUNBOOK.md)) |

FS1 delivered the engineering skeleton: Next.js/TS/App Router/FSD, ONYX tokens + Dark/Light themes, the
7-provider tree, typed API client + SSE infra, the app shell, **all 25 routes as ONYX stubs**, middleware +
session seam, and the test/lint/CI harness.

FS2 made it **navigable**: sidebar rail with persistence, topbar (channel-switcher shell, breadcrumbs, avatar
menu), the full command palette (`>` `@` `#` `/`), the keyboard system with `g`-chords and a registry-generated
`⌘/` cheat-sheet, per-route RBAC with a 403 permission state, the `?inspect=` Inspector contract, route
skeleton/error/not-found states, and responsive navigation (tablet rail, mobile tab bar + sheet).
FS3 delivered the full ONYX component library; FS4 made authentication real; **FS5 delivered the first
functional screen** (the Dashboard on real contract data end-to-end, per-card error isolation, honest Gated
engagement, real ChannelSwitcher, Inspector `post`/`job` views). **FS6 delivered the working AI surface**:
`/chat` with streamed assistant turns over the frozen `POST /studio/dry-run` via a **verbatim** BFF SSE
relay (no simulated token cadence), a Stop that cancels the upstream request and preserves partial output,
**local-first conversations behind ONE ConversationRepository** (single swap point for a future backend
API; browser-local truth stated in the UI), message actions incl. **Insert to channel** (real 201 draft +
optional 202 generation intent — the first chat→pipeline bridge), the palette **`/` Ask AI** made real, and
the dashboard's **"What changed today?"** card — strictly user-invoked, gated metrics provably excluded from
the prompt, Trust + Explainability + wire cost. Live-AI reconciliation = **FE-RV-9**.

**FS7 delivered the Knowledge workspace** (D3 §7) on the frozen `/documents` contract (§R9.3): a
channel-scoped document list (ingest status, `j/k/↵`, shareable `?q=` list filtering), a lazy reader with
sanitized Markdown and version history, **add-source** with an honest upload state machine (no invented
progress — ingest truth is polled per FE-ADR-9), re-ingest as a **202 queued** intent, guarded soft delete
and channel assignment, the Inspector `document` view, the palette **`#`** made real for knowledge (plus
the topbar search entry), and **ask-document** — user-invoked AI over ONE document whose prompt is
unit-proven to contain only that document, so **Citation and KnowledgeCard finally render real provenance**
(Source Available; no retrieval score exists on the wire, so none is shown). Retrieval preview, chunk
inspection and scores are **honestly absent** — the contract carries no retrieval endpoint and this console
never simulates one. `/knowledge` opens on `content.view` (analyst/viewer read; every write/AI affordance
is `content.edit`-gated). Live-knowledge reconciliation = **FE-RV-10**.

**FS8 delivered the Memory Explorer** (D3 §8) on the contract's real memory surface — `/personas`,
`/actors` and published posts (§R9.1 levels): entries **grouped by kind** (Persona · Actors · Published
posts), **Style Memory** (§R9.12) rendered as derived *parameters, never stored texts* with unknown
backend keys surfaced honestly, guarded persona editing + archive honouring the **§R4.2 optimistic lock**
(a stale version renders an honest conflict, never a silent overwrite), the Inspector `persona`/`actor`
views, the palette **`#` Memory group kept structurally separate from Knowledge** (§R9.3 — "не смешивать"),
and **explain-style**: user-invoked AI over ONE persona record whose prompt is unit-proven to contain only
that record, so **MemoryCard finally renders real provenance**. There is **no `/memory` endpoint** in the
frozen contract, so the influence **trace**, **Global scope**, **pin/exclude** and the raw `memory` rows
are visible honest seams — and **no influence claims** are ever generated. `/memory` opens on
`content.view`. FS8 also shipped the **commons offload** (the keyboard registry split by concern), which
measurably moved `/chat` 179 → 178 and `/knowledge` 176 → 175 before any feature code. Live-memory
reconciliation = **FE-RV-11**.

**FS9 delivered the Image Studio** (D3 §9) on the contract's real image surface (§R6): a channel-scoped
**record grid** whose ONYX **ImageResult** cards finally carry real data — verification chips derived from
the wire only (Verified / Needs Review from the record's status, uniqueness from a stored phash) — plus a
lazy record detail with prompt + negative disclosure, generation parameters, the resolved scene, the
**§R6.5 attempt history** and the **§R6.4 similarity report** (phash ≠ scene metadata ≠ CLIP, grouped by
mechanism, unknown report keys rendered by raw name — the first REAL verification data in the product),
regeneration as a **202 queued** intent with honest polling, a guarded soft delete, the Inspector `image`
view, the palette **`#` Images group kept separate from Knowledge and Memory**, and **explain-verification**:
user-invoked AI over ONE image record + its report whose prompt is unit-proven to contain only that record
and to forbid safety, identity-match and uniqueness claims. FS9 also wired the stage's entry duty — the
**actor reference upload** (`POST /actors/{id}/references`, §R6.1 identity conditioning) over the FS7
multipart seam with no invented progress. The frozen contract carries **no image-create call, no media URL
and no post-update that could attach an image**, so free-form generation, the picture itself, attach/accept
and a safety verdict are **visible honest seams** — no placeholder art, no fabricated chip, anywhere
(fixtures included). `/studio` opens on `content.view`. Live-image reconciliation = **FE-RV-12**.

**FS10 delivered the Prompt Library** (D3 §10) on the contract's **three** prompt calls
(`GET /prompts?type=` · `POST /prompts` · `GET /prompts/{id}/versions`) — and it is the project's **first
platform-wide surface**: the `prompts` record carries **no `channel_id`**, so the library is the same for every
channel and switching the active channel provably changes nothing (locked by a channel-free key test and an
E2E journey). It ships a list of prompt **types** (the identity the contract carries — there is no `name`
column) whose ONYX **PromptCard** rows finally hold real data, a lazy version detail reading the chain from
the contract's own `/versions` call, a **real diff** between any two versions computed client-side over two
served texts and rendered with the D2 §13.18 add/remove semantics (plus screen-reader labels, so colour is
never the only signal), the contract's **only** write — `POST /prompts` = a new version (§R10.6 "an edit *is*
a new version"), confirmed, reporting the **server-assigned** version with **201 truth, never 202 wording**,
and backed by a per-type unsaved draft — the Inspector `prompt` view, a palette **`#` Prompts group kept
separate from Knowledge, Memory and Images**, and **test-this-version**: a user-invoked, isolated dry-run of
exactly that version's text through the unchanged FS6 relay (§R10.9), with **no AI-authored prompt text, no
auto-save, no refine and no model comparison**. Because the contract has **no promote call, no `is_active`
column, no variables field, no delete and no update**, activation, variables, deletion, author names and model
comparison are **visible honest seams** — no Active/Draft badge and no variables count is rendered anywhere.
`/prompts` opens on `content.view`. Live-prompt reconciliation = **FE-RV-13**.

**FS11 delivered Analytics** (D3 §12) on the frozen §Analytics & Cost group — **five READ calls and nothing
else**: the channel- and range-scoped snapshot, **Cost** (§R11.8, the contract's own
`group_by=day|channel|model|provider` facet on real ONYX charts), **Quality**, **Trends** and the **period
report**, each with its own skeleton, its own error card, its own honest empty state and its own **provenance
line** (§R11.9 — endpoint · filters actually sent · fetched-at · an algorithm version **only if the wire
carries one**). Its headline is the honesty surface the whole screen exists for: **engagement renders GATED**
(§R7.3 — the Bot API reports no views/reactions/ER/CTR and ADR-001 leaves MTProto at *not introduced*), and a
field flagged `gated` yields **no value even when the wire carries a number** — proven in the mapper, the AI
prompt and the CSV. `?from=&to=`, `?group_by=` and `?period=` are the contract's own parameters living in the
URL, so the whole view is a shareable link that Back reverses. Export is **Copy link + a client-side CSV of
already-loaded series** with gated series excluded *and named* — there is no export endpoint and none is
called. The **datapoint Inspector** is a pure projection of the cache the panels filled and issues **zero
requests**; on a cold cache it says so. **explain-metrics** runs only on request (`content.edit`), through the
unchanged FS6 relay, over the loaded **non-gated** values, and its prompt is unit-proven to forbid causes,
anomaly verdicts, forecasts and engagement claims. Anomalies, cost forecasting, recommendations, experiments
(§R11.5 — an audience split is impossible), **system health** (owned by the health probes and the task
monitor, with nothing derived from unrelated endpoints) and live counters are **visible honest seams**.
`/analytics` needed **no RBAC PATCH** — all five roles already read it. Live-analytics reconciliation =
**FE-RV-14**.

**FS12 delivered Platform & Admin** (D1 §5.3's nine-screen governance surface) — and it is the stage where
the contract said *no* most often. Six routes read it for real: **`/admin`** (users, roles, a guarded
per-user session revoke, config-version history with a **real client-side diff of two served snapshots** and
a guarded rollback), **`/jobs`** (the Task Monitor on the contract's own `?status=&type=&channel_id=` filters,
attention-first, with **cancel / run / requeue as confirmed 202 queue intents**), **`/audit`** (the immutable
record with a real before→after diff and a client-side CSV), **`/health`** (liveness ≠ readiness, probes
rendered **only** as readiness names them, unknown staying grey and never green), **`/providers`** (the
project's **first secret-writing surface** — slot presence, write-only rotation, and provider health only
where readiness names a provider) and **`/billing`** (the platform-wide cost view on `GET /cost?group_by=`).
Three routes carry **no contract call at all** and say so precisely — `/logs`, `/flags` and
`/notifications` each state the fact, the reason and what a future backend MINOR would need, on every
viewport, with **no fixture log line, flag row, notification or invoice anywhere** (negative-lock tested).
Secrets are write-only by *mechanism*: the key value exists only as a request body, the VM has no field able
to hold one, and 18 assertions plus an E2E journey prove it. The RBAC mirror was reconciled with the frozen
matrix (`admin` lost user and key management; `/jobs` and `/providers` moved to `platform.manage`), so an
admin on Admin now sees a **permission state inside the screen** rather than an affordance the server would
refuse. One AI surface only — **explain-job**, single-record, forbidden from inventing log lines, causes,
retry predictions or destructive advice. Live-platform reconciliation = **FE-RV-15**.

**FS13 delivered the account surface** (D3 §23 Settings · §24 User Profile · the preferences half of §22) —
and its headline is a contract finding: D4 §4 marked Settings' API *(assumed)* as "user prefs", and the frozen
`/api/v1` carries **no preferences resource at all**, nor any self-service account write, password change, MFA
call, avatar upload, session inventory or notification delivery. So Settings is **real but browser-local**, and
every panel says so: theme and density keep the FS1 cookies that the root layout applies during SSR (no FOUC,
proved in E2E against the *initial HTML document*); the experience level and the notification choices live in
local storage behind **one** module. **Appearance · Experience · Notifications · Advanced-reset are genuinely
functional**; Account and Security are read-only identity plus named absences. Experience Level shipped only
because FS13 made it **consumed** — Beginner hides advanced detail, Advanced reveals cookie names and the raw
stored payload, Power adds the keyboard path — since a control that changed nothing would be a fabricated
capability. Notification preferences govern the console's own toasts in this browser, with **`danger`
unmutable by construction** (refused three independent times) because a critical outcome may never rest on a
suppressible channel. `/profile` renders identity and, on its Activity tab, the stage's one real read —
`GET /audit-log?actor=`, **actor-scoped or absent**, never widening to the platform-wide log — with the roles
the frozen matrix excludes meeting a permission state *inside* the screen. One AI surface only —
**explain-activity**, over loaded records, forbidden from security advice, completeness claims, intent, risk
or anomaly. **FS13 created no entity slice and declared no query key, endpoint path or fetcher of its own** (a
first): identity is FS4's session, activity is FS12's audit slice, and neither barrel was opened.
Live-account reconciliation = **FE-RV-16**. The remaining 7 routes still render honest stubs.

**FS14 delivered Integration & Polish** — the first stage whose subject is the space *between* screens
rather than a screen itself. Five **D3 Part C** journeys are proved end to end in `tests/e2e/journeys.spec.ts`
(×3 viewports): **J1 Compose → Pipeline** (Dashboard → streamed `/chat` turn → 201 draft + 202 generate
intent → the Jobs queue → 202 approve → Analytics, with the three steps the frozen contract cannot back —
a per-post validation report, an attach-to-post call, any media URL — stated as **named seams**, never
skipped), **J2 Cite → Source** (a citation opens its document in the Inspector without navigating away; "the
exact chunk" stays a refused simulation, per FS7), **J3 Alert → Triage** (Health → Jobs → a task's own
recorded error → a **202** requeue intent → Audit, with Logs and the runbook step named as absences), **J4
Explain-this** (a persona's `explain-style` provenance card, with **no influence-trace claim** ever produced),
and **J5 Everything ⌘K** (every navigable route reachable from the palette, proved **registry-driven** by
iterating `ROUTE_LIST` rather than a hand-written list, and RBAC-filtered). Three route-local cross-links
close the gaps the journey audit found (Dashboard → Jobs, Health → Jobs/Audit, Jobs → Dashboard/Chat/Audit),
each measured and shaped to cost **zero** commons bytes. The observability seam Stage 2 §11 specified and
FE-ADR-3 deferred here **shipped server-only**: `src/instrumentation.ts` + the first-party `/api/telemetry`
route, both allowlist-scrubbed to an error name and digest, correlation-id aligned with the backend's
structured logs (§R12.9) — **a client-side sink was built and measured, cost three protected routes 1 kB each
in two independent placements, and was refused by its own pre-declared fallback**; the owner ruled at
acceptance that it **stays server-only** and no client caller is to be added. `app/global-error.tsx` (Stage
2 §11's root boundary) shipped on a +8 B gz measurement that moved no route. **FE-RV-5 closed**: the two
self-hosted font binaries are committed under `public/fonts/` and `fonts.ts` uses `next/font/local` — no
network at build time, no route moved. The CSP promotion package is authored (every directive justified from
source, the nonce-vs-`unsafe-inline` cost written down) and **deliberately left disabled**, because the
report-only header has always reported nowhere (no `report-uri`/`report-to`) — enforcement is **FE-RV-17**.
Progressive disclosure (D3 A2) rolled out to `/jobs` and `/audit`, where Advanced/Power reveal a raw record
the screen already holds at zero extra cost, and was **refused** on `/analytics`, `/studio` and `/knowledge`,
where a tier would reveal nothing new (the FS13 rule that a control which changes nothing is a fabricated
capability). The stage also ran the three D4 §3 checks this project had never executed — 320px reflow across
15 screens, 200% zoom, `prefers-reduced-motion` — and, in doing so, found and fixed a real contrast defect
(the avatar menu's role label and the palette placeholder at `text.tertiary`, 3.6:1 in dark — the sixth usage
fix, tokens untouched) that five prior axe passes had missed because no scan had ever opened those two
overlays. `pnpm size` measured **766.23 / 777 kB — green**, and **no threshold action was needed**; the one
gate that ended RED was **Prettier on `.size-limit.json`**, a pre-existing CRLF carry-over from the FS13
acceptance edit, accepted at acceptance as a legacy carry-over per the FS12 precedent and left byte-for-byte
untouched. Details in [`FS14_REPORT.md`](FS14_REPORT.md) + [`FS14_REPORT_SIZE_ADDENDUM.md`](FS14_REPORT_SIZE_ADDENDUM.md).

**FS15 delivered Production Readiness — the roadmap's terminal frontend stage, and the first whose subject is
infrastructure rather than a screen.** It shipped **zero `src/` production modules**: a frontend-local Docker
Compose overlay (`webplatform/docker-compose.console.yml`) wiring the FS1 Dockerfile into the deployment
topology FE-ADR-11 decided, **without touching the root `docker-compose.yml` or `docker/Caddyfile`** — the
shared-Caddy route is one deliberately deferred step, documented rather than guessed at; a real, source-verified
CI gap fixed (`ci.yml`'s E2E step ran only one of the three shipped Playwright projects; it now runs all three,
verified locally at 400/0/17 — the exact floor every stage has reported since FS14); a one-off secrets-in-bundle
scan (`check-no-secrets.mjs`) that found and correctly triaged a real false positive inside Next's own vendored
WASM dependency, not this project's code; one cross-cutting test (`gated-fields-audit.test.ts`) proving §R10.3's
three-part rule — no view value, no AI-prompt leak, no export leak — across every gated surface this project has
ever shipped, in one place; and a **local-only** Lighthouse pass (`lighthouse-local.mjs`), explicitly and
repeatedly labelled a workstation measurement, never staging or production evidence (perf 0.49–0.68, **a11y 1.0
on every route measured**, consistent with the project's zero-axe-violations record). **This environment has no
Docker engine, no CI runner and no live backend** (`docker`/`gh`/`act` all verified absent) — so FE-RV-3, FE-RV-4
and FE-RV-17 were **not** closed; each now has an exact, numbered procedure in the new
[`PRODUCTION_READINESS_RUNBOOK.md`](PRODUCTION_READINESS_RUNBOOK.md), including the one session that closes
FE-RV-7…16 together. `pnpm size` measured **766.23 / 777 kB — unchanged**, re-confirmed at acceptance with the
threshold untouched. Details in [`FS15_REPORT.md`](FS15_REPORT.md) +
[`FS15_REPORT_SIZE_ADDENDUM.md`](FS15_REPORT_SIZE_ADDENDUM.md).

## Quick start (in `../console/`)

```bash
corepack enable pnpm
pnpm install
pnpm dev          # http://localhost:3000
```

**Sign-in is REAL (FS4):** the login form speaks the frozen contract (`POST /auth/login`, cookie session,
`GET /auth/me`). In **local/ci** the deterministic fixture gateway serves five demo accounts —
`owner|admin|editor|analyst|viewer@console.local`, password `console-demo` (public test data; a triple
kill-switch makes any auth stand-in impossible in staging/production builds). The FS1/FS2 mock seam is
deleted and grep-tested absent.

## Engineering gates (Stage 2 §14 / §F6)

```bash
pnpm gate          # lint + format:check + typecheck + boundaries + test
pnpm budget        # production build + machine-checked per-route First Load (≤180 KB)
pnpm size          # total-JS regression detector
pnpm e2e           # Playwright full matrix + axe a11y
pnpm build-storybook   # visual-regression baseline (see FE-RV-6)
```

**FS15 gate result (nine green, one accepted carry-over, at acceptance — the final gate state of the
implementation track):** ESLint ✅ · Prettier ❌ **on one pre-existing file, `.size-limit.json`** (CRLF
terminators written by the FS13 acceptance edit, never opened by FS14 or FS15 — accepted as a legacy
carry-over per the FS12 precedent, reaffirmed at FS14 and again at FS15; every FS15 file is formatted) ·
`tsc` strict ✅ (0 errors, 0 unjustified `any`) · dependency-cruiser ✅ (0 violations, **609 modules / 1578
dependencies** — byte-identical to FS14, since FS15 added no `src/` module) · Vitest ✅ (**800 tests / 103
files** — the FS14 floor of 794/102 plus one new cross-cutting test, `gated-fields-audit.test.ts`) ·
Playwright ✅ (**400 E2E**, 0 failed, 17 skipped, 3 viewports — unchanged from FS14; the CI workflow that runs
this matrix was itself fixed at FS15, see below) · axe ✅ (0 violations, unchanged) · Storybook ✅ (**54
stories, unchanged**) · contract ✅ (FS15 declares **no new `/api/v1` path** and touches no wire type) ·
`pnpm budget` ✅ (**32 routes**; worst **/chat 180 KB / 180** — headroom **0.0 kB**, byte-for-byte identical
to the pre-FS15 baseline — proven by a manifest diff, not assumed) · size ✅ **766.23 / 777 KB** (re-confirmed
at the FS15 acceptance sync; **no threshold action requested or taken** — per the owner's ruling in
[`FS15_REPORT.md`](FS15_REPORT.md) §11 and [`FS15_REPORT_SIZE_ADDENDUM.md`](FS15_REPORT_SIZE_ADDENDUM.md) §5;
rule №33 intact — thresholds are never pre-raised; the 180 kB First Load budget stays the authoritative,
non-revisable UX gate). **FS15 also fixed a real, source-verified CI gap**: `ci.yml`'s E2E step ran only one of
the three shipped Playwright projects (`desktop-dark`); it now runs all three, matching what every stage since
FS1 has actually certified on a workstation.

> **`/chat` sits at 180 / 180 — zero headroom.** It held through FS14 with the observability sink's client
> half measured and refused rather than paid for, and held again through FS15 unconditionally — FS15 shipped
> no `src/` module, so there was nothing that could have moved it. This is now the **terminal** state of the
> tightest constraint in the project: implementation is complete, and any future frontend work inherits this
> number as a starting baseline.

> **The FS13 I2 deviation, accepted exactly as measured.** `/audit` 174 → **175** and `/providers` 153 →
> **154** moved. Four clean builds plus **control build C** (only the D5-B toast-mute read side removed)
> isolate the cause, and **build D** shows the cost is inherent to consulting a preference at the toast
> emitter rather than an artefact of module shape — FSD forbids a provider importing a feature, so that read
> side must live in commons. `/chat` and `/memory` stayed byte-stable and `pnpm budget` passed. The owner
> accepted it as reported and directed that it not be re-worded. See [`FS13_REPORT.md`](FS13_REPORT.md) §4.

> **Two budget lessons worth carrying.** **(FS10 §6.1)** a route's First Load can grow with its chunk *set*
> unchanged — the first FS10 build failed at `/chat` 182 kB because the stage became the **first product
> consumer** of a heavy `shared/ui` module (CodeBlock → Shiki) and inflated the **webpack runtime's chunk-id
> map**. **(FS11 §6.2)** a slice another screen already imports must not gain `'use client'` modules in its
> barrel: re-exporting the FS11 hooks from the FS5 analytics slice put a 5.23 kB chunk into `/dashboard`'s
> First Load (+2 kB), fixed structurally by a separate `entities/analytics-report` slice. **(FS12 §4.1)** a
> mutation hook called from an eager view drags TanStack Query's mutation machinery and Next's `dynamic()`
> runtime into that route — moving it into the lazy component took `/jobs` from 183 to 172 kB. All three were
> diagnosed from `app-build-manifest.json` and proved by control builds — never by argument.
>
> **(FS12 T-FS12.1)** the first-consumer check finally *refused* a component: `shared/ui/data-table` had zero
> product consumers, and a probe consumer moved the webpack runtime chunk +58 B, rounding `/memory` up. The
> pre-declared structural fallback ran immediately — DataTable is not used, and the tables are ONYX-primitive
> lists with the same interaction contract.

> **(FS14) a pre-declared fallback is what makes a refusal cheap.** The observability sink was built, then
> measured in two independent placements — the three route-group boundaries, and `global-error.tsx` alone —
> and cost `/billing`, `/dashboard` and `/jobs` 1 kB each in *both* shapes; control build C (sink removed,
> server half kept) returned a byte-identical runtime chunk. Because the fallback ladder was written into the
> plan before any code, the answer was a ten-minute measurement rather than a debate: ship server-only. The
> owner's acceptance ruling confirmed the shape and closed the question — `/api/telemetry` stays without a
> client caller until a later stage judges the trade differently. **FS15 did not reopen this** — production
> readiness was explicitly scoped to exclude new frontend functionality, and the ruling stands untouched.

**Runtime Verification, unchanged in scope by FS15's acceptance — see [`PRODUCTION_READINESS_RUNBOOK.md`](PRODUCTION_READINESS_RUNBOOK.md)
for the exact, numbered procedure for every item below.** Runtime-pending: Docker (**FE-RV-3**), CI run (**FE-RV-4**), Chromatic
baseline upload (**FE-RV-6**, needs a project token), **CSP enforcement and client telemetry on real
infrastructure (FE-RV-17** — opened at FS14: whether the enforced policy survives a real browser behind
Caddy, above all whether Next's inline bootstrap needs `'unsafe-inline'` or a nonce and what a nonce costs in
rendering mode; whether `report-to`/`report-uri` reaches the first-party sink through the proxy and what
scrubbing a CSP report body would require; whether `/api/telemetry` survives the deployment's routing and
rate limits; what `img-src` must become the day FE-RV-12 says a media URL exists; whether client web-vitals
can be mounted at all without editing the frozen provider tree**)**, **live auth round-trip (FE-RV-7)**, **live `/api/v1`
data round-trip (FE-RV-8)**, **live AI round-trip (FE-RV-9)**, **live knowledge round-trip (FE-RV-10)**,
**live memory round-trip (FE-RV-11** — persona/actor wire shape, the `style_features` jsonb structure,
PATCH body + real `version`/409 semantics, archive response, published-post ordering**)**, **live image
round-trip (FE-RV-12** — image wire shape, whether ANY media URL exists (the single switch that turns
previews on, plus the SEC-5 `img-src` decision it implies), the §R6.4 similarity-report shape, the §R6.5
history shape, the regenerate 202 body and the `IMAGE_MAX_REGEN`-exhausted response, the multipart
reference transport and whether actors expose a reference count**)**, **live prompt round-trip (FE-RV-13** —
prompt wire casing, **whether `GET /prompts` returns every version row or only the newest per type**, `?type=`
behaviour for an unknown value, the `POST /prompts` accepted body and 201 payload, who assigns `version`, the
`/versions` shape and ordering, the semantics of the `model`/`result` columns, whether the backend exposes any
notion of an active version, pagination, and whether analyst/viewer may read prompts at all**)**, **live
analytics round-trip (FE-RV-14** — analytics/cost wire casing, **whether `GET /analytics/channels/{id}`
honours `?from=&to=` and what it returns for a range with no data**, the shapes of `/analytics/quality`,
`/analytics/trends` and `/analytics/reports/{period}` and whether they accept a range at all, the `/cost`
shape per `group_by` value and whether the channel/model/provider facets are channel-scoped or platform-wide,
whether `availability` is per-field or engagement-only and whether an engagement field ever arrives
`available` (i.e. whether ADR-001's MTProto adapter was introduced), whether any response carries an
algorithm version or computed-at (§R11.9), and pagination**)**, **live platform & admin round-trip
(FE-RV-15** — users/config-version/audit/tasks/api-keys/health wire shapes; above all **whether
`GET /config-versions` carries the `snapshot` payload** (the fact that decides whether the client diff is
possible at all), **what `GET /api-keys` returns when values are withheld**, and **whether `/health/ready`
enumerates providers by name** (the switch that turns the Providers health panel from a seam into real data);
plus whether `PATCH /users/{id}` accepts anything besides `role`, the 202 payloads of
`cancel`/`run`/`requeue`, and the `pending`-vs-`queued` task vocabulary shared with FE-RV-8**)**, and **live
account round-trip (FE-RV-16** — above all **whether `GET /auth/me` carries a stable user `id`**, the single
fact that decides whether a personal activity feed is possible at all; plus whether it carries anything beyond
`{user, role}`, **whether `mfa_enabled` is a real wire field or an FS4 assumption** (today it is
indistinguishable from absent, so no MFA state is rendered), whether `GET /audit-log?actor=` accepts the
caller's own id and how it paginates, and whether a preferences resource ever appears**)**. Details in
[`FS12_REPORT.md`](FS12_REPORT.md), [`FS13_REPORT.md`](FS13_REPORT.md), [`FS14_REPORT.md`](FS14_REPORT.md) and
[`FS15_REPORT.md`](FS15_REPORT.md); the single consolidated procedure for all ten live-round-trip items plus
FE-RV-3/4/17 is [`PRODUCTION_READINESS_RUNBOOK.md`](PRODUCTION_READINESS_RUNBOOK.md).

**Closed at FS14: FE-RV-5** (`next/font/local` pin) — the two self-hosted binaries are committed under
`console/public/fonts/`, closing without a live-infra session at all. **No FE-RV closed at FS15** — FE-RV-3,
FE-RV-4 and FE-RV-17 explicitly require real execution on infrastructure this environment does not have
(verified directly: `docker`, `gh` and `act` are all absent), and none was fabricated. Two `FS1_POSTMORTEM.md`
§7 checklist items became executable for the first time at FS15 and were closed for real: no secrets in the
client bundle, and gated-data honesty (now a single cross-cutting test rather than nine per-stage proofs).

**Verified absences, deliberately NOT registered as FE-RV:** logs, feature flags and notifications have no
endpoint in the frozen contract and no table behind them; nor do user preferences, account self-edit, password
change, MFA enrolment, avatar upload, session inventory, sign-in history, data export or SSO. They are not
unverified assumptions — they are facts, and the screens state them.

## Guardrails

Never modify `app/` or any backend contract. ONYX token **values** are frozen (D2). FSD layering is one-way
(`app → widgets → features → entities → shared`) and enforced in CI. TypeScript strict, 0 unjustified `any`.
Secrets are write-only; gated/mock data is honest, never fabricated.
