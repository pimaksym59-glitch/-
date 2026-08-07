# FS11 — Analytics (Report)

**Track:** Web Platform implementation · **Plan:** `STAGE_FS11_PLAN.md` (approved with the owner's rulings:
**D6 option A** — no System panel, an honest seam that states the frozen contract exposes no system-analytics
endpoint, with **nothing derived from unrelated endpoints**; **D9 option A** — Copy link + a client-side CSV
built only from data already in the browser, **no server export and no additional API call**; **D10 option A**
— keep explain-metrics, gated by `content.edit`, over the existing verbatim FS6 relay, provenance-only, and
forbidden from implying anomalies, forecasts, recommendations, hidden causes or engagement values the contract
does not carry — plus five additional requirements: **/dashboard is the primary protected route** and is
byte-compared after the first chart and again before acceptance · **entity-local query keys are mandatory** ·
**every increase is explained by measurement, never hypothesis** · **every chart heavier than the existing
dashboard surface stays lazy-first** · **if the 677 kB detector goes red, follow rule №33 exactly**).
**Scope executed:** T-FS11.0 … T-FS11.14, nothing beyond. **Honesty statuses:** Implemented & Verified unless
explicitly marked. **The size-limit ruling request lives in the dedicated `FS11_REPORT_SIZE_ADDENDUM.md`
(rule №33 — the plan's §6.2 prediction materialized for the seventh time).**

## 1. What FS11 delivered

`/analytics` stopped being a stub. On the frozen §Analytics & Cost group — **five READ calls and nothing
else**:

- **The analytics workspace (D3 §12):** a channel- and range-scoped RSC initial-data page → the **reliable
  panels first** — the channel snapshot as ONYX MetricCards, **Cost** (§R11.8, the contract's own
  `group_by=day|channel|model|provider` facet on real ONYX charts), **Quality** (`/analytics/quality`),
  **Trends** (`/analytics/trends`) and the **period report** (`/analytics/reports/{daily|weekly|monthly}`) —
  each with its own skeleton, its own error card with retry, its own honest empty state and its own
  provenance line.
- **Engagement rendered GATED — the screen's headline honesty surface.** §R7.3 says the Bot API does not
  report views/reactions/ER/CTR, and Appendix C leaves the MTProto adapter at **"нет"**, so the engagement
  panel renders the canonical D2 §15 Gated card naming what is unavailable and why. **A field flagged
  `gated` yields no value even when the wire carries a number** — the fixture deliberately sends
  `er: {value: 0.071, availability: 'gated'}` and the number provably never reaches the UI, the prompt or the
  CSV. A gated **series** plots nothing and is named as not plotted, because an empty line would read as
  "activity dropped to zero".
- **Provenance on every panel (§R11.9):** the endpoint that answered · the filters this console actually
  sent · when the browser received it · and the **algorithm version only if the response carries one** —
  otherwise "no algorithm version reported". Nothing about the computation is invented.
- **The range is the contract's own parameter.** `?from=&to=` are passed verbatim, live in the URL, and are
  reversible by Back; presets, `group_by` and `period` are URL state too, so the whole view is a shareable
  link. The report panel states **"range not sent"**, because that endpoint takes none.
- **Export without an endpoint (D9):** **Copy link** is the export D3 asks for, and the **CSV serialises only
  the series already loaded in the browser**, with gated series excluded *and named as excluded*. No request
  is made to export anything.
- **The datapoint Inspector** as a LAZY registry row under the unchanged FS2 `?inspect=type:id` contract — a
  **pure projection of the cache the panels already filled**. It issues **zero requests** (asserted in both a
  component test and an E2E journey), and on a cold cache it says so rather than showing a plausible number.
- **explain-metrics (the owner-approved D10 surface):** user-invoked AI over the **loaded, non-gated** values
  through the **UNCHANGED** FS6 relay; `buildMetricsPrompt` is unit-proven to contain only those values and
  the active filters, to **exclude gated metrics even when the wire smuggles a number**, and to carry an
  instruction that forbids causes, anomaly verdicts, engagement claims and forecasts.
- **Honest-absence surfaces:** anomalies · cost forecasting · recommendations and experiments (with the
  §R11.5 reason audience-split A/B is impossible) · **system health** (D6 option A — named as belonging to
  the health probes and the task monitor, with **nothing derived from `/tasks` or `/health`**) · live
  counters (there is no analytics stream, so panels are fetched and say when).
- **No RBAC PATCH** — a first since FS6. All five roles already hold `analytics.view`, matching the
  `API_SPEC` matrix row *Analytics/Cost (чтение) ✓✓✓✓✓*; `routes.ts` and `rbac.ts` were **not edited at all**.
- **T-FS11.1 (the stage's first action):** entity-local keys/paths — `shared/config/query-keys.ts` and
  `shared/lib/api/endpoints.ts` gained **comments only, zero rows** — plus the **R1c first-consumer
  measurement** of the webpack runtime chunk, recorded before any chart existed and again after.

## 2. The ten gates — executed for real (final artifact, 2026-08-03)

| # | Gate | Result |
|---|---|---|
| 1 | ESLint | ✅ clean |
| 2 | Prettier | ✅ formatted |
| 3 | `tsc --noEmit` strict | ✅ 0 errors, 0 unjustified `any` |
| 4 | Vitest | ✅ **542 passed / 86 files** (461 → 542; **+81** tests, +8 files) |
| 5 | Playwright E2E | ✅ **261 passed / 0 failed / 15 skipped** (3 viewports; 218 → 261; **15 new analytics journeys**) |
| 6 | axe | ✅ 0 violations — incl. the analytics panel grid AND a datapoint Inspector (**one REAL violation found and fixed** — §6.1) |
| 7 | dependency-cruiser | ✅ 0 violations (**497 modules, 1227 dependencies**) |
| 8 | `pnpm budget` (per-route First Load ≤ 180 kB) | ✅ **31 routes PASS · /analytics 148 kB · worst /chat 179 kB (headroom 1.0 kB)** — with three protected routes moving +1 kB (§3 I2, control-proved) |
| 9 | size-limit (detector 677 kB) | ❌ **685.08 kB — exceeded by 8.07 kB.** Threshold NOT touched (rule №33); the per-chunk analysis and evidence-based proposal are in **`FS11_REPORT_SIZE_ADDENDUM.md`** — the owner rules at acceptance |
| 10 | Storybook build · contract | ✅ builds (Vite; **54 story files — unchanged**, no new stories) · ✅ every endpoint used exists **verbatim** in `API_SPEC.md` §Analytics & Cost, plus the already-confirmed `/studio/dry-run` |

## 3. The §3.7 regression invariants — each verified

| # | Invariant | Verdict & evidence |
|---|---|---|
| **I1** | `/chat` First Load ≤ 179 kB | ✅ **179 kB — unchanged.** Zero FS11 markers across all **17** of `/chat`'s First Load chunks; the chat no-touch set is byte-untouched; `shared/config/query-keys.ts` gained zero rows |
| **I2** | `/dashboard` ≤ 167 · `/knowledge` ≤ 175 · `/studio` ≤ 164 · `/prompts` ≤ 150 · `/memory` ≤ 149 · stubs ≤ 107, all ≤ 180 | ⚠️ **Partially held — reported, not massaged.** `/prompts` **150** ✅ · `/memory` **149** ✅ · stubs **107** ✅ · all 31 routes ≤ 180 ✅ · **`/dashboard` 167 → 168**, **`/knowledge` 175 → 176**, **`/studio` 164 → 165**, shared commons **106 → 107**. **Measured cause, established by two control builds and a marker scan, never by argument** — see §3a. **Owner's ruling requested** (§7) |
| **I3** | The AI relay stays VERBATIM | ✅ `app/api/ai/stream/route.ts` and `shared/lib/ai-gateway/*` untouched; a source-level test asserts no FS11 module imports the gateway or its DTOs; explain-metrics reaches the relay only through the public `useAssistantStream` hook; the FS6 verbatim-relay unit trio re-ran green |
| **I4** | ConversationRepository / conversation slice / `persist` untouched | ✅ untouched + a source-level test asserts **zero** `entities/conversation`, `persist` and `localStorage` references across all 23 FS11 modules (FS11 owns no draft) |
| **I5** | FS5 analytics/cost keys byte-identical; the new keys cannot be matched by the FS5 invalidation; no FS11 writer | ✅ `queryKeys.analytics`/`queryKeys.cost` unchanged (asserted by value **and** by source shape); a positional key-matching test proves `['analytics', channelId]` matches **no** FS11 key and vice versa; **FS11 contains no `useMutation`, no `invalidateQueries` and no `setQueryData` at all** — the invalidate graph is empty because the contract is read-only |
| **I6** | FE-RV-7…13 gain no new adjustment points | ✅ import-level test: no FS11 module imports `ai-gateway`, `entities/{document,persona,actor,image,location,prompt,conversation}`. FS11 opens exactly one new register entry, **FE-RV-14** |
| **I7** | FS2–FS10 suites stay green without weakening | ✅ 542/542 unit + 261/261 E2E. **No existing spec was edited at all** this stage — a first since FS8 (the palette copy needed no change because FS11 adds no `#` group). No assertion was relaxed, re-scoped or deleted |
| **I8** | No state owned by Query and Zustand at once; nothing fabricated | ✅ six source-level locks (the AI panel writes nothing to Query · no FS11 module writes the UI store · the `analytics:<…>` assistant namespace cannot collide with a Query key · no storage is touched · the presentational panels are stateless · the CSV computes nothing) + tests proving **a gated field with a number on the wire still maps to `null` + flag**, that no anomaly/forecast/recommendation/diversity metric is rendered, and that no algorithm version is invented; dependency-cruiser 0 with **no cross-entity import** |

### 3a. The I2 deviation, measured (owner requirement #3)

Three protected routes and the shared commons moved by **1 kB**. Nothing was written about the cause until it
was measured:

1. **Marker scan.** `app-build-manifest.json` + a content probe over every First Load chunk of `/dashboard`
   (14), `/chat` (17), `/knowledge` (14) and `/studio` (14): **zero FS11 markers** in any of them.
2. **Anchor stability.** Every pre-existing chunk is **byte-identical** to the FS10 baseline — `2777` 44.01 ·
   `28efd8eb` 51.92 · `3b442ec9` 51.81 · `4003` 49.62 · `framework` 56.29 · `polyfills` 38.70 · `8581` 27.81 ·
   `3513` (visx) 11.79 · `main` 31.27. Nothing pre-existing regressed.
3. **Control build A** (FS11's only shell-commons addition — the lazy `DatapointInspector` registry row —
   removed): `/dashboard` **168**, `/knowledge` **176** (unchanged), `/studio` **164** (returns to baseline).
   So the registry row accounts for `/studio` only.
4. **Control build B** (the `/analytics` page reverted to a stub, **all other FS11 code still present** — the
   entity slice, the three features, the widgets, the fixtures, the dto mirrors, the shortcut rows and the
   Inspector row): **every protected route returns to its exact FS10 baseline** — `/dashboard` **167** ·
   `/knowledge` **175** · `/studio` **164** · `/chat` **179** · `/prompts` **150** · `/memory` **149** ·
   stubs **107** · commons **106**.

**Conclusion:** the movement appears only when the new route's *graph* exists, and no FS11 byte is on any
protected route. It is webpack's shared-graph re-partition when a 27th real route joins (the dashboard's own
page chunk shrank 12.8 → 10.1 kB while its First Load rose — the re-cut is visible in both directions), plus
the +0.12 kB runtime map. This is the FS8/FS9/FS10 mechanism, with a stronger proof than any of them.

### 3b. R1c — the first-consumer measurement (owner requirement #4)

The plan required this to be measured, not assumed. **Baseline (FS10 artifact, before any FS11 code): webpack
runtime chunk 2.58 kB gz.** After the first chart panel landed and in the final artifact: **2.70 kB gz
(+0.12)**. For comparison, FS10's first-consumer failure moved the same chunk 2.56 → 6.31 kB (+3.75) and cost
every route 3–4 kB. The visx family was already referenced by `widgets/dashboard/MetricTiles.tsx` through
`@/shared/ui/chart/lazy`, whose module scope registers all six chart chunks, so FS11 added no new chunk ids —
**as expected, but now measured**. Every chart is reached only through that frozen lazy entrypoint; the visx
chunks are byte-identical and absent from every page's First Load.

## 4. Deliverables (files)

`shared/types/dto.ts` (analytics panel/series/metric wire mirrors — **types erased at build, zero runtime
bytes**) · `shared/config/{shortcuts.ts (type-only member), shortcuts-catalog.ts (2 rows + label),
query-keys.ts (comment only)}` · `shared/lib/api/endpoints.ts` (comment only) ·
**`entities/analytics-report/{keys,paths,report-model,report-hooks,index}.ts`** (a separate slice — §5.1) ·
`shared/lib/fixtures/dataset.ts` (+COST_BY_FACET/QUALITY_PANEL/TRENDS_PANEL/REPORTS, the real `?from=&to=`
filter, all four `group_by` facets, the three periods) ·
`app/(workspace)/analytics/page.tsx` (stub replaced) ·
`widgets/analytics/{AnalyticsView,PanelFrame,MetricRow,MetricList,GatedPanel,CostPanel(lazy),
QualityPanel(lazy),TrendsPanel(lazy),ReportPanel(lazy),AnalyticsEmpty,AnalyticsHonesty,index}` ·
`features/filter-analytics/*` · `features/export-analytics/*` · `features/explain-metrics/*` ·
`widgets/inspector/DatapointInspector.tsx` (+1 lazy registry row) · tests: 6 unit + 2 component files +
`analytics.spec.ts` (15 journeys). **No new dependencies · no ONYX token or component change · no SoT/`app/`
change · `.size-limit.json` untouched (677) · `routes.ts` and `rbac.ts` untouched · no new stories (54).**

## 5. PATCH decisions made during implementation

1. **`entities/analytics-report` is a SEPARATE slice from `entities/analytics`** — a *measured* decision, not
   a taxonomic one (§6.2). Re-exporting the FS11 hooks from the FS5 barrel put a 5.23 kB chunk into
   `/dashboard`'s First Load, because a `'use client'` module reached through a barrel is bundled whole (the
   FS3 barrel lesson). Splitting the slice removed it. The new slice imports **nothing** from the FS5 slice:
   the snapshot is mapped through its own `mapMetricEntry`, so there is no cross-entity import and no
   duplicated mapping logic.
2. **The snapshot uses the same metric vocabulary as every panel** (`mapSnapshotEntries` → `MetricEntryVM[]`),
   so gated engagement flows through the identical §R10.3 path as any other gated metric instead of a
   bespoke branch.
3. **Neutral snapshot labels** ("Cost", "Published") rather than the wire's `cost_today`/`published_today`:
   the endpoint accepts a range, so "today" would be wrong for any window that is not today (FE-RV-14 asks
   what the backend actually does with `?from=&to=`).
4. **Queries live in the view; charts do not.** The five reads are cheap and both the export and the AI panel
   need their values, so the hooks are eager (route-scoped) and every chart-bearing panel is `dynamic()`.
5. **No polling and no "live counters"** (D8): the contract exposes no analytics stream, so panels are
   SWR-cached with an explicit fetched-at whisper. Inventing a poll would imply a freshness nobody promised —
   the FS7 "no invented progress" rule applied to time.
6. **The `[`/`]` handler reuses `shiftRange` from the feature** rather than a local copy — no duplicated
   logic (§R3.7 discipline).
7. **Panel headings are `h2`** (§6.1): the screen has one `h1` and its panels are its sections.

## 6. Defects found and fixed

1. **[REAL a11y defect, found by axe] `heading-order` across the analytics screen.** Panel titles, the gated
   card, the honesty seams, the AI panel and the datapoint Inspector all used `h3` under the page's single
   `h1` — a jump of two levels, flagged on the panel grid. *Fix:* every one of those section headings became
   `h2` (the FS2 convention: one `h1` per screen, composed blocks use `h2`). axe re-ran green on the grid and
   on a datapoint Inspector across all three viewports. This is the **second** heading-order defect in the
   project (FS7's was embedded markdown) and the first caused by the console's own composition.
2. **[REAL budget defect, found by `pnpm budget`] `/dashboard` 167 → 169 kB.** The FS11 hooks were reachable
   from the FS5 entity barrel that the dashboard imports. Diagnosed from `app-build-manifest.json` **before
   any claim was written**: chunk `625` (5.23 kB gz), carrying `useCostBy`/`useQualityPanel`/`useRangeSnapshot`,
   was listed in `/dashboard`'s First Load. *Fix:* structural (§5.1) — the FS11 modules moved into their own
   entity slice. *Control:* the chunk disappeared from the dashboard's First Load and the route dropped to
   168; control build B then returned it to exactly 167.
3. **[Process defect, mine] An E2E run was executed against a stale build.** After control build B the
   `/analytics` page source was restored but not rebuilt, so `pnpm start` served the stub artifact and 14 of
   15 journeys failed for a reason that had nothing to do with the code. *Fix:* rebuild before every E2E run
   — the same class as the recorded stale-webServer hazard, and worth adding to the habit: **a control build
   leaves a stale artifact behind**.
4. **[Test-side] Four corrections, all app-correct:** `quality_score` is legitimately served by **both** the
   quality panel and the period report, so the assertions were scoped to the region (the FS8 "scope to the
   visible region" lesson); the export toast collides with the polite announcer and the toast region (the
   recorded FS5 lesson → `.first()`); the Explainability panel is a disclosure and must be opened before its
   limits are read (the FS7 lesson); and the "nothing is fetched" assertion had to start recording **after**
   the panels settled, or it caught the page's own load.
5. **[Test-side] Two mobile skips**, matching the studio precedent: the datapoint Inspector journeys assert
   the **desktop drawer**, which is a sheet on mobile (`test.skip(project === 'mobile', 'Desktop drawer
   variant; mobile is a sheet.')`). Skipped count 13 → 15.
6. **[Toolchain]** The Windows/pnpm `next` corruption did **not** strike this stage (count stays 22), and no
   stale-webServer incident occurred — the kill-port habit was applied before every build and E2E run.

## 7. Bundle & budgets (final artifact)

- **Per-route First Load (authoritative, ≤180):** all 31 routes PASS. **`/analytics` 148 kB** — 22 kB under
  its ≤170 target, because every chart panel, the export menu, the AI panel and the inspector row are lazy.
  `/chat` **179** (unchanged), `/prompts` 150, `/memory` 149, stubs 107; `/dashboard` **168**, `/knowledge`
  **176**, `/studio` **165** and commons **107** (§3 I2 — control-proved re-partition).
- **Lazy verification, executed:** the eager/lazy split is **250.06 kB eager / 420.02 kB lazy (62.7% lazy**,
  up from 62.2%). Of the four chunks a marker scan attributes to FS11, three are lazy and appear in **zero**
  page First Load lists; the fourth (`5784`, 2.82 kB, listed in four layouts) is the **FS1-era Inspector
  registry chunk** — probed and confirmed to carry the *name* `DatapointInspector` alongside `PromptInspector`
  and `ImageInspector` but **none** of FS11's logic (`analyticsKeys`, `getQueriesData` and the view's own copy
  are all absent), exactly the FS10 `2505` case. The only eager FS11 code is the `/analytics` route's own page
  chunk (10.7 kB), which the ROUTE budget measures at 148 kB.
- **size-limit:** **685.08 / 677 kB — RED, untouched.** Growth vs FS10 = **+18.28 kB**. Full attribution and
  the evidence-based proposal: **`FS11_REPORT_SIZE_ADDENDUM.md`**.

**Two rulings are requested at acceptance:** (a) the size-limit threshold (addendum §7); (b) the **I2
deviation** — `/dashboard` 168, `/knowledge` 176, `/studio` 165 and commons 107, measured by two control
builds to be the new route's shared-graph re-partition rather than FS11 code on those routes. The
alternatives are to accept them as the standing references, or to direct a structural commons task in FS12;
no threshold was moved either way.

## 8. Honesty & owner-condition compliance

No engagement value is rendered anywhere, and a gated field with a number on the wire is provably dropped in
the mapper, the prompt and the CSV · no zero ever substitutes for a gated metric · no anomaly flag, no
forecast, no recommendation, no experiment and **no system metric derived from unrelated endpoints** (D6
option A) · no diversity metric is synthesised — only what `/quality` and `/trends` actually carry, with
unknown keys by **raw name** · no algorithm version is invented (§R11.9); where the wire reports none the
panel says so · no simulated live counters or polling · **no server export** — the link and the CSV are pure
projections of loaded data (D9 option A) · the AI panel runs only on explicit intent, is gated on
`content.edit`, reaches the relay only through the public hook, and its prompt is unit-proven to exclude gated
values and to forbid causes, anomalies, engagement and forecasts (D10 option A) · confidence stays absent (no
wire source) · the datapoint Inspector performs no fetch and states the cold-cache truth · Analytics ≠
Dashboard ≠ Health/Jobs ≠ Billing is structural (separate route, entity slice, keys, panels; no cross-entity
import) · Analytics ≠ AI Chat: zero chat files touched · fixtures kill-switched and grep-locked · Aurora only
on the genuine AI moment.

## 9. FE-RV register impact

**Opens FE-RV-14 — live analytics round-trip** (owner-acceptance pending): analytics/cost wire casing and
fields · **whether `GET /analytics/channels/{id}` honours `?from=&to=` and what it returns for a range with no
data** (the single fact that decides whether the range is server-side or a client-side window — and whether
the wire's `cost_today`/`published_today` naming survives a ranged call) · the shapes of `/analytics/quality`,
`/analytics/trends` and `/analytics/reports/{period}`, and whether those three accept a range at all · the
`/cost` response shape per `group_by` value and **whether the channel/model/provider facets are channel-scoped
or platform-wide** · **whether `availability` is per-field, per-panel or engagement-only**, and whether an
engagement field ever arrives `available` (i.e. whether ADR-001's MTProto adapter was introduced) · whether
any response carries an **algorithm version or computed-at** (§R11.9) · pagination and result caps · whether
analyst/viewer may really read every panel. **Single adjustment points:**
`entities/analytics-report/{report-model,report-hooks,paths,keys}.ts`. FE-RV-9…13 unchanged (I6). FE-RV-6
(Chromatic) unchanged — no new story files.

## 10. Risks entering FS12

| # | Risk | Mitigation |
|---|---|---|
| R1 | **size-limit red pending the addendum ruling** | rule at acceptance; the per-route UX gate is green and binding |
| R2 | **`/chat` headroom is still 1.0 kB** (179/180) and no cheap lever remains | FS12 must add zero commons rows; entity-local keys remain the mechanism; the budget gate is the backstop |
| R3 | **Rounding/re-partition now moves protected routes on every stage** — FS11 is the fourth in a row | the two-control-build method used here is the standard: prove the cause before writing it |
| R4 | **A barrel that re-exports `'use client'` modules taxes every consumer of that slice** — the defect this stage hit | recorded as a rule: when a slice is imported by another screen, new client modules go in their own slice, and the route is byte-compared immediately |
| R5 | **FE-RV-14's biggest unknown** — whether the range is honoured server-side and whether the cost facets are channel-scoped | both paths are mapped behind one adjustment point; if the range is client-side the panels window the served series and say so |
| R6 | **A screen with no engagement data may read as incomplete** to a reviewer | the Gated card names what is missing, why, and what unlocks it, and sits where the data would be, on every viewport |
| R7 | Windows hazards (22 `next` corruptions; stale webServer; **now also stale control-build artifacts**) | documented habits held; §6.3 adds the rebuild-after-control rule |

## 11. STOP (at delivery — superseded by §12)

**FS11 is complete: 9 of 10 gates green, executed for real; the tenth (size-limit) is honestly red at
685.08/677 with the threshold untouched and the dedicated addendum filed for your ruling (rule №33).** Seven
of the eight §3.7 invariants were verified mechanically; the eighth (I2) is reported with **two control-build
measurements** of its cause rather than an explanation. The owner's five additional requirements were each
honoured: `/dashboard` was byte-compared after the first chart (where it caught a real 2 kB regression) and
again on the final artifact · entity-local keys held with **zero** commons rows · every movement is explained
by measurement · every chart is lazy behind the frozen entrypoint · and the detector was left untouched.
Awaiting your acceptance — including the size decision and the I2 ruling. README, the handoff kit, commits,
tags and FS12 remain untouched until your separate word.

---

## 12. Acceptance addendum (2026-08-03) — owner's rulings executed

**FS11 ACCEPTED.** Acceptance followed the evidence filed with the stage: the full 31-route `pnpm budget`
table, the full `pnpm size` output with the detector config untouched, the addendum's per-chunk attribution
and eager/lazy split, the manifest check that every FS11 chunk is absent from every page's First Load, the
marker scan across all 59 First Load chunks of the four protected routes, the probe of the one chunk a naive
scan flags as eager, the **two control builds** (one isolating the Inspector registry row, one reverting the
route to a stub), and the R1c before/after measurement of the webpack runtime chunk.

**Ruling 1 — size-limit: Option A, the detector is re-baselined to 696 kB.** Executed:
`.size-limit.json` → `696 KB`; `pnpm size` re-run → ✅ **685.08 / 696 kB (headroom 10.92 kB)**.
**All ten gates are now green.** Rule №33 unchanged and followed exactly (measure → dedicated per-chunk
addendum → owner's evidence-based ruling; the threshold was never pre-raised). This is the **seventh**
measured re-baseline (FS5 → 485, FS6 → 560, FS7 → 598, FS8 → 628, FS9 → 655, FS10 → 677, **FS11 → 696**). The
**180 kB per-route First Load budget remains the authoritative, non-revisable UX gate.**

**Ruling 2 — the §3 I2 deviation is ruled resolved, and the measured numbers become the standing
references.** The owner accepted the movement as **the new route's webpack shared-graph re-partition, not
FS11 code entering any protected route**, established by two control builds plus a zero-marker scan.

**Post-FS11 standing reference numbers** (FS12 must not regress them):

| Surface | First Load | Note |
|---|---|---|
| `/chat` | **179 kB** | unchanged from FS10; headroom **1.0 kB** — still the tightest constraint |
| `/knowledge` | **176 kB** | was 175 (re-partition, control-proved) |
| `/dashboard` | **168 kB** | was 167 (re-partition, control-proved) |
| `/studio` | **165 kB** | was 164 (re-partition, control-proved) |
| `/prompts` | **150 kB** | unchanged from FS10 |
| `/memory` | **149 kB** | unchanged from FS10 |
| `/analytics` | **148 kB** | **new this stage** |
| stub routes | **107 kB** | unchanged from FS10 |
| shared commons | **107 kB** | was 106 (re-partition, control-proved) |
| size-limit detector | **696 kB** (measured 685.08) | seventh measured re-baseline |

**Facts confirmed at acceptance (each machine-verified, not asserted):**

1. **Zero-commons held:** `shared/config/query-keys.ts` and `shared/lib/api/endpoints.ts` gained **comments
   only**; the `ShortcutScope` member is type-only; `routes.ts` and `rbac.ts` were not edited at all.
2. **Every FS11-carrying chunk in the glob is lazy** and appears in zero page First Load lists; the chunk a
   naive marker scan flags as eager (`5784`) is the FS1-era Inspector registry chunk, probed and confirmed to
   contain no FS11 logic.
3. **R1c discharged by measurement:** the webpack runtime chunk moved 2.58 → 2.70 kB (+0.12), against FS10's
   +3.75 kB first-consumer failure; the visx family is byte-identical and absent from every First Load.
4. **The I2 movement is re-partition:** with the `/analytics` page reverted to a stub and all other FS11 code
   present, every protected route returned to its exact FS10 baseline (167 / 175 / 164 / 179 / 150 / 149 /
   107 / 106).
5. **Nothing pre-existing regressed:** shiki, the chat cluster, React DOM, the Next runtime, polyfills, the
   msw worker and visx are all byte-stable.

**FE-RV-14 is opened and owner-accepted as Runtime Verification, not a defect.** FS12 (Platform & Admin)
awaits a separate explicit GO.
