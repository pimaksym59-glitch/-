# FS5 — Dashboard (Plan)

**Track:** Web Platform implementation · **SoT:** `FRONTEND_MASTER_SPEC.md` · implements **D3 §4 (Dashboard
— "what's happening and what needs me?")** through Stage 2 §5 (RSC initial data + client islands) and the
Stage 3 §4 entity inventory, against the frozen contract **`API_SPEC.md`**: Channels · Posts
(`?status=needs_review`, `approve|reject → 202`) · Scheduler/Tasks · Analytics & Cost (**engagement gated:
`null` + availability flag, never invented — §R10.3**). **This is a PLAN. No code yet.**

**Goal of FS5:** the **first functional screen**. The Dashboard stub becomes the real daily driver: metric
tiles (Cost today · Published today · Scheduled · Needs Review), the upcoming-schedule timeline, the
Needs-Review queue with real approve/reject intents, the recent-activity feed, a **real channel switcher**
(closing the FS2 shell placeholder), Inspector opening real entities — skeleton-first, per-card error
isolation, gated data honest, RBAC-reflected. Frozen inputs consumed as-is; **no `app/` / Protocol /
MASTER_SPEC change; no endpoint invented**.

**Entry conditions — satisfied:** FS4 accepted (2026-07-30); this plan is FS5's first deliverable and
includes the **size-limit re-baseline proposal** (§5.1, FS4_REPORT §7 R3).

---

## 1. Scope

**IN:** an **environment data seam** generalizing FS4's proven pattern (§2 T-FS5.1): one deterministic,
DTO-typed fixture dataset serves BOTH the server (RSC initial fetch) and the browser (MSW worker — the FS1
`workerDirectory` finally used) in **local/ci only**, under the same triple kill-switch discipline; real
deployments hit `/api/v1` — registered as **FE-RV-8** (live data round-trip) · four **entity slices** per
Stage 3 §4: `channel` (list/get, `ChannelVM` with the token ref DROPPED), `analytics` (`MetricVM`
available/**gated**, `useAnalytics`/`useCost`), `job` (Tasks subset, Status vocabulary), `post`
(needs-review subset + history line) · one **feature slice** `review-post` (approve/reject — queue intents,
`202 {task_id}`, confirmed-not-optimistic per Stage 3 §8, invalidating posts+jobs) · the **Dashboard screen**
(D3 §4): greeting + **Compose** (navigates to `/chat` — the pipeline itself is FS6), tiles grid with
**per-card error isolation**, schedule Timeline, Needs-Review queue (`j/k/↵` per D3, opens the Inspector),
ActivityFeed from recent tasks *(assumed mapping — the contract has no dedicated activity endpoint)*,
channel-scoped via the active-channel store, D2 §15 onboarding empty state ("Create your first channel"
hero), RBAC variants (Editor content tiles · Analyst metrics read-only · Viewer read-only), responsive per
D3 (mobile stacked + KPI row scroll; sticky Compose) · **real ChannelSwitcher** (FS2 R6/R8 closed: real
channels, cookie-persisted active channel, RBAC-aware) · **Inspector entity views** for `post` and `job`
(`?inspect=post:id|job:id` — the FS2 URL contract renders its first real content) · tests incl. a dashboard
E2E journey on the deterministic fixtures · gates + `FS5_REPORT.md`.

**OUT:** the **"What changed today?" AI summary card** — a genuine AI moment that needs the FS6 streaming
wiring; the Dashboard ships an **honest seam** (TrustLabel/Explainability-ready card stating it arrives with
Chat) rather than a faked summary — completing D3 §4's AI-assistance row is FS6's entry duty · tile
customization (D3 secondary — FS13/FS14 personalization) · the Analytics/Jobs screens themselves (FS11/FS12
— dashboard tiles only **link** there) · schedule editing (FS12 scope; the timeline is read-only here) ·
compose/pipeline logic, chat, streaming (FS6) · palette `#`/`/` seams (FS6/FS7) · no `app/` / Protocol /
SoT / ONYX-token-value change · no new dependencies (charts = installed visx per ADR-FE-1; dates via the
existing `shared/lib/format` — `date-fns` stays deferred).

**Carried from FS4 (§7):** R3 size-limit re-baseline → §5.1; R2 fixture/real drift discipline → the FS5
data fixtures are DTO-typed against the same mirrors the real client uses (§6 R2); R8 switcher placeholder →
closed by T-FS5.7.

## 2. Task sequence (each with a completion criterion)

| Task | Produces | Done when |
|---|---|---|
| **T-FS5.0** Gate prep | size-limit config raised to the §5.1 approved ceiling; no dependency intake (none needed) | `pnpm size` runs against the new detector ceiling; budget gate untouched (per-route 180 kB stands) |
| **T-FS5.1** Environment data seam + FE-RV-8 | `shared/lib/api` server-fetch path (absolute base via `INTERNAL_API_BASE_URL`) with a **fixture branch** for local/ci; ONE deterministic dataset module (channels/posts/tasks/analytics/cost — DTO-typed, **engagement gated per §R10.3: `null` + flag**); browser MSW worker started in local/ci only; kill-switch = the FS4 triple pattern (env refusal · module-scope throw · grep/unit lock) | the SAME dataset feeds RSC fetches, the browser worker and Vitest MSW; staging/production builds cannot contain the fixture (unit-tested); **FE-RV-8** registered |
| **T-FS5.2** `entities/channel` | `model/api/hooks` per Stage 3 §4: `useChannels`/`useChannel`, `ChannelVM` (bot token ref dropped — §F7.4), status via the vocabulary | typed against `GET /channels` mirrors; MSW-tested; secrets provably absent from the VM |
| **T-FS5.3** `entities/analytics` | `useAnalytics(channel, range)` + `useCost(groupBy)`; `MetricVM {value, availability}` — **gated renders the Gated state, never zeros** | gated fixtures produce the D2 §15 gated empty-state copy in tiles; unit-tested mapping incl. `availability:"gated"` |
| **T-FS5.4** `entities/job` | `useJobs(filters)` on `GET /tasks` mirrors; `JobVM` (Status vocabulary, attempts, error class) | list + statuses render via `StatusBadge` registry only; MSW-tested |
| **T-FS5.5** `entities/post` | `useNeedsReview(channel)` on `GET /channels/{id}/posts?status=needs_review`; minimal `PostVM` (+history line for the Inspector) | MSW-tested; VM carries trust/status per vocabulary |
| **T-FS5.6** `features/review-post` | `useApprove`/`useReject` → `POST /posts/{id}/approve|reject` (**202 intent** — confirmed mutation with pending state, NOT optimistic per Stage 3 §8); invalidates `posts` + `jobs`; announcer + toast outcomes | 202 semantics honest in the UI ("queued for approval") ; RBAC: the feature is not offered to analyst/viewer (`can()`); MSW-tested incl. failure |
| **T-FS5.7** Channel switcher — real | `widgets/topbar/ChannelSwitcher` consumes `entities/channel`; active channel → existing ui-store + cookie; honest empty state links to Channels; `⌘.` behaviour unchanged | switching re-scopes dashboard queries (`['…', channelId]` keys per Stage 2 §4); FS2 E2E for the switcher upgraded, not deleted |
| **T-FS5.8** Dashboard screen | `(workspace)/dashboard` replaces its stub: RSC shell + initial data → hydrated Query islands; 4 MetricCards (+Sparkline where the data supports it) with **per-card `ErrorState scope="section"`** (one failing metric never breaks the page — D3); schedule `Timeline`; Needs-Review list (`j/k/↵`, review actions, Inspector open); `ActivityFeed` (lazy — D3 performance row); Compose button; AI-summary **honest seam card**; D2 §15 onboarding empty state when no channels; RBAC render variants; responsive per D3 | the stub is REPLACED (not filled); loading = shaped skeletons (`ChartSkeleton`/list) — no spinner; heavy chart modules stay `dynamic()`; keyboard row nav works with the shortcut registry untouched |
| **T-FS5.9** Inspector entity views | `?inspect=post:<id>` → post review view (content, history Timeline, verification badges, review actions); `?inspect=job:<id>` → job detail (status, attempts, error, timing); registered in the Inspector's view registry (shell panel; the `@inspector` parallel slot decision of FS2 §5.10 unchanged) | deep-links render real entity data; `esc`/focus behaviour identical to FS2; RBAC-safe (viewer read-only) |
| **T-FS5.10** Tests | unit: VM mappers (incl. gated + secret-dropping), fixture kill-switch locks; component: tiles per state (loading/gated/error/value), queue + review flow, switcher; integration (MSW): dashboard data composition per role; **E2E**: sign-in → dashboard shows deterministic metrics → gated tile shows the honest state → `j/k/↵` opens the post Inspector → approve queues (202 toast) → channel switch re-scopes → analyst/viewer read-only → empty-state journey (fixture channel-less account *(new fixture role dataset)*) + axe on the real dashboard, 3 viewports | `pnpm test` + full `pnpm e2e` green; FS2/FS4 journeys stay green |
| **T-FS5.11** Gates + report | all ten gates (budget: dashboard becomes the heaviest real route — measured, ≤180 kB); size-limit measured and the detector **tightened back** to measured+≈2% (§5.1 procedure); `FS5_REPORT.md`; README + FE-RV register updated | gates green or honestly FE-RV-flagged; report with the three statuses; **STOP** |

## 3. Deliverables (file-level, maps to Stage 3 §1/§4)

`src/entities/{channel,analytics,job,post}/{index.ts, model.ts, api.ts, hooks.ts}` ·
`src/features/review-post/{index.ts, model/*.ts, ui/*.tsx}` · `src/shared/lib/api/server-fetch.ts` +
`src/shared/lib/fixtures/{dataset.ts, guard.ts}` (kill-switched) + MSW worker bootstrap (local/ci) ·
`src/app/(workspace)/dashboard/page.tsx` (+ co-located dashboard widgets under `src/widgets/dashboard/*`) ·
`src/widgets/topbar/ChannelSwitcher.tsx` (real data) · `src/widgets/inspector/*` (view registry + post/job
views) · `tests/{unit,component,e2e}/*` additions · `.size-limit.json` (re-baselined). **Other route stubs
untouched; no new endpoints; no new dependencies.**

## 4. Definition of Done (FS5)

- The Dashboard answers D3 §4's question with REAL contract data end-to-end: tiles, schedule, needs-review
  queue with working 202 review intents, activity, channel scoping — skeleton-first, `j/k/↵` keyboardable,
  responsive, axe-clean.
- **One failing metric never breaks the page** (per-card error isolation — proven by a test that fails one
  fixture endpoint).
- **Gated engagement renders the honest Gated state** (§R10.3) — proven against a gated fixture; zeros are
  never shown for gated data.
- The channel switcher is real; switching re-scopes every dashboard query (channel-scoped keys).
- The Inspector renders its first real entity views via the FS2 URL contract, unchanged.
- The AI-summary card is an **honest seam** (labelled, no fake AI output); tile customization is visibly
  deferred, not silently dropped.
- All five roles reflected (editor tiles / analyst read-only metrics / viewer read-only) — E2E per role.
- All ten gates green; dashboard route ≤ 180 kB First Load; size-limit re-baselined per §5.1 and tightened
  to the measured value in the report; FE-RV-8 honest.

## 5. Gates, environment & honesty

### 5.1 size-limit re-baseline (owner approval requested WITH this plan — FS4_REPORT §7 R3)

The detector (NOT the UX budget) sits at 343.18/345 kB. FS5 legitimately grows the **aggregate** (lazy visx
chart chunk + four entity slices + dashboard widgets enter the build for the first time) while the per-route
UX budget stays hard at 180 kB. **Proposal:** raise the detector ceiling to **430 kB** for the stage;
at T-FS5.11 the measured aggregate is recorded and the ceiling is **tightened back to measured + ≈2%** in
the same change (the FS1 §3.6 detector philosophy: catch regressions, never authorize waste). If the
measured value approaches 430, that is a STOP-and-report, not a pass.

### 5.2 Honesty

All ten Stage 2 §14 gates run as in FS4 (fast block → `pnpm budget` → e2e → storybook; §3.1 recovery habit).
**FE-RV-8 — live `/api/v1` data round-trip:** dashboards run on contract-typed deterministic fixtures in
this environment; wire-truth against the live backend (field casing per group, availability flags, real 202
task follow-ups) is registered as FE-RV-8 with `entities/*/api.ts` mappers as the single adjustment points.
FE-RV-3…7 unchanged. Nothing unexecuted is reported as a pass.

## 6. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | **Dashboard route budget** — the first data-heavy route (charts, four entities) | charts/feed `dynamic()`/lazy per D3's own performance row; `pnpm budget` is the gate; tiles render without charts if the chunk hasn't landed (skeleton) |
| R2 | **Fixture/real drift** now covers data, not just auth | ONE dataset module typed by the SAME DTO mirrors the real client uses; mappers unit-tested; FE-RV-8 is the reconciliation point |
| R3 | **RSC initial fetch + client Query duplication** (hydration mismatch / double fetch) | initial data handed to Query via `initialData` per key; SWR revalidates; pattern documented once in `entities/channel` and repeated |
| R4 | *(assumed)* mappings — activity-from-tasks, "Cost today"/"Published today" derivations from the contract's analytics/cost/posts groups | each *(assumed)* is marked in `api.ts`, tested against fixtures, listed in the report for FE-RV-8 |
| R5 | Scope creep into FS6 (Compose/AI) and FS11 (Analytics screens) | Compose only navigates; the AI card is a labelled seam; tiles link out — nothing renders analytics-screen surfaces |
| R6 | The 202 intent UX could be mistaken for completion | review actions show "queued" + job linkage, never instant success (§R10.1 semantics); toast copy states the queue truth |
| R7 | Aggregate ceiling misjudged (§5.1) | measured at the gate; tightened in the report; approach-to-ceiling = STOP and report |

## 7. Not in FS5 (explicit)

No AI generation/streaming (FS6 — incl. the "What changed today?" summary) · no Analytics/Jobs/Channels
screens beyond links (FS11/FS12) · no schedule editing (FS12) · no tile customization (FS13/FS14) · no
Chromatic work (FE-RV-6 unchanged — token still welcome) · no `app/` / Protocol / SoT / token-value change ·
no new dependencies · no commits/pushes unless instructed.

---

**STOP — FS5 plan complete. Awaiting your approval to implement FS5 (Dashboard), including the §5.1
size-limit re-baseline decision.** On approval I implement §2 in order, run the gates (§5), write
`FS5_REPORT.md`, and stop for acceptance. FS6 will not be started.
