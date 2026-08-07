# FS11 — Analytics (Plan)

**Track:** Web Platform implementation · **SoT:** `FRONTEND_MASTER_SPEC.md` · implements **D3 §12 (Analytics)**
through Stage 2 §5 (rendering group *"Dashboard / Analytics / Billing: RSC initial data + client islands for
streaming counters and charts"*) · §7 (six state owners) · §9 (budgets) and the Stage 3 inventories (§1 route
`analytics/` · §5 route row *"read all · chart skeleton · live counters · ✓ datapoint"* · §3 features
`filter-analytics` / `export-analytics` · §4 entity `analytics` · §8 API row *"`GET /analytics` (+cost) →
MetricVM (gated flag) · `['analytics', range, ch]`"*), against **`API_SPEC.md` §Analytics & Cost** — which is
**five read calls and nothing else**:

- `GET /analytics/channels/{id}?from=&to=` → metrics; **engagement fields carry `"availability":"available|gated"`**
  (§R7.3) — *«gated без адаптера → `null`+флаг, не выдуманные»*
- `GET /analytics/reports/{daily|weekly|monthly}`
- `GET /analytics/trends`
- `GET /cost?group_by=channel|model|provider|day` (§R11.8 — *«надёжный источник»*)
- `GET /analytics/quality` (quality / similarity / regen — §R11.7)

**There is no write, no export, no forecast, no anomaly, no recommendation and no experiment endpoint in the
group**, and the RBAC matrix grants *Analytics/Cost (чтение)* to **all five roles**. Backend truth this stage
renders: **§R7.3** Bot API does not return views/ER/CTR — those metrics are unavailable without an MTProto
stats adapter, which **Appendix C leaves at the default "нет"** · **§R10.3** the panel shows only what is
available and never fabricates the rest · **§R11.1** the reliable analytics are internal (Cost / Quality /
System / diversity) and engagement is **gated** · **§R11.2** analytics never decides for the AI engine ·
**§R11.5** audience-split A/B is impossible by design · **§R11.9** every computed panel states its
source · filters · algorithm version · time. Design language: D2 §12 (data-viz rules, the fixed categorical
order, KPI cards, the **Gated** card), §13.19–13.20 (Charts / Metric cards), §15 empty states, §16 skeletons,
D3 A5–A8 (Trust + Explainability, no blocking spinners, Aurora only on genuine AI moments).
**This is a PLAN. No code yet.**

**Goal of FS11:** make the platform's **cost, quality and trend data legible and shareable — and its missing
engagement data unmistakably honest**. `/analytics` stops being a stub: a channel- and range-scoped analytics
workspace whose reliable panels (Cost by day/channel/model/provider · Quality · Trends · period Reports · the
channel snapshot) render **real served numbers on real ONYX charts**, whose **engagement panels render the
canonical Gated state** (§R10.3 — the single most load-bearing honesty surface in the product), whose every
panel states its own provenance (§R11.9), whose entire view state is a shareable URL, plus a datapoint
Inspector, and — if the owner approves §5.2 **D10** — **explain-metrics**, a user-invoked AI reading of the
**loaded, non-gated** series that is forbidden by construction from claiming causes, anomalies or engagement.
Everything the contract cannot back — anomaly detection, cost forecasting, recommendations, experiments,
audience A/B, a system-health panel, an export endpoint — is a **visible honest seam**, never simulated.
**No `app/` / Protocol / MASTER_SPEC change · no endpoint invented · no ONYX token-value change · no new
dependencies · no threshold pre-raised.**

**Entry conditions — satisfied:** FS10 accepted 2026-08-03 (size-limit re-baselined to **677 kB** after a
dedicated addendum **and** a full evidence pack; the I1 rounding deviation ruled resolved; post-FS10 standing
references **`/chat` 179** · `/knowledge` 175 · `/dashboard` 167 · `/studio` 164 · `/prompts` 150 ·
`/memory` 149 · stubs 107 · commons 106; FE-RV-13 opened). This plan is FS11's first deliverable. Frozen FS11
entry duties (handoff PART4 §8.2): Analytics per D3 §12 on the frozen `GET /analytics/*` + `GET /cost`
endpoints — **charts behind `dynamic()` per ADR-FE-1 (visx)**, engagement metrics rendered as **honestly
gated** (§R10.3/§R7.3), never fabricated; the plan must carry the **seven fixed artefacts** (PART1 §4.5/§4.6 —
§3.1–§3.7 below), **add ZERO commons bytes** (entity-local keys, the proven mechanism), plan every heavy leaf
lazy from the start, and honour **R1c** — the first-consumer check for the visx family (PART1 §4.8
requirement 51), executed as a **measurement**, not an assumption.

---

## 1. Scope

**IN:**

- **T-FS11.1 — the ZERO-commons mechanism AND the R1c first-consumer measurement (FIRST, before any feature
  code).** Two locks, both landed before a single panel exists:
  1. **Zero commons rows.** `entities/analytics/keys.ts` + `entities/analytics/paths.ts` own every FS11 key and
     path builder; `shared/config/query-keys.ts` and `shared/lib/api/endpoints.ts` gain **pointer comments
     only — zero rows** (comments are stripped at build ⇒ exactly 0 runtime bytes; the FS9/FS10 mechanism).
     Locked by a grep test that fails if any FS11 key/path builder appears in either commons module.
     **Additionally locked:** the **FS5 keys `queryKeys.analytics(channelId)` and `queryKeys.cost()` stay
     byte-identical**, and the new range-scoped keys are proved *positionally unmatchable* by the FS5
     invalidation `['analytics', channelId]` that `features/review-post` already issues — so a dashboard
     approve/reject can never silently invalidate an analytics range query, and vice versa.
  2. **The R1c first-consumer measurement.** `widgets/dashboard/MetricTiles.tsx` already imports
     `@/shared/ui/chart/lazy`, whose module scope registers `dynamic()` references to **all six** chart modules
     (LineChart/AreaChart/BarChart/Donut/Heatmap/Sparkline) — so the expectation is that the visx chunk ids are
     **already in the webpack runtime map** and FS11 is *not* a first consumer. **That expectation is worth
     nothing until it is measured** (FS10's lesson: a route's First Load can grow with its chunk set
     unchanged). T-FS11.1 therefore records the **baseline webpack runtime chunk size (gz)** and the full
     31-route table *before* any chart lands, and re-measures immediately after the first chart panel is wired.
     Any growth is diagnosed from `app-build-manifest.json` and fixed **structurally**, never by threshold.
- **Entities (T-FS11.2):** `entities/analytics` **extended, never rewritten** — `model.ts` and `hooks.ts` (FS5)
  stay **byte-identical**; the FS11 additions live in **new files inside the same slice**
  (`report-model.ts`, `report-hooks.ts`, `paths.ts`, `keys.ts`), re-exported through the slice's `index.ts`:
  wire mirrors in `dto.ts` (**types erased at build → zero runtime bytes**), VM mappers that keep the §R10.3
  discipline (**a gated field is `null` + flag — a number on the wire next to `availability: 'gated'` is still
  dropped**, exactly as `mapMetric` does today) and the FS8/FS9 unknown-key discipline (**an unrecognised
  quality/trend/report key renders by its RAW name, never dropped and never renamed**), the range-scoped
  snapshot hook, `useCostBy(groupBy, range)`, `useQuality(range)`, `useTrends(range)`,
  `useReport(period)`, and the pure `toSeries()` / `toCsv()` projections. **No mutation hook exists in this
  stage — the contract has none.**
- **Fixtures (T-FS11.3):** deterministic (no clocks — the FS7 rule) coverage of the five calls in THE one
  dataset + browser/node MSW: `?from=&to=` **honoured** on the channel snapshot (a range with no data returns
  an honest empty series, never zeros), `/cost` honouring **all four `group_by` values**,
  `/analytics/quality`, `/analytics/trends`, `/analytics/reports/{daily|weekly|monthly}`, **at least one panel
  carrying an unrecognised key** so the raw-name path is exercised, **at least one wire field carrying
  `availability: 'gated'` with a non-null value** so the drop is proved on real data, and one panel whose
  response carries **no algorithm version** so the §R11.9 honest-absence path is exercised; `empty` scenario
  honoured; kill-switch + grep locks unchanged.
- **Route + RSC page (T-FS11.4):** **no RBAC PATCH** — `/analytics` already opens on `analytics.view`, which
  all five roles hold, matching the `API_SPEC` matrix row *Analytics/Cost (чтение) ✓✓✓✓✓* (§5.2 D11 — the
  first stage since FS6 that changes no route permission). `app/(workspace)/analytics/page.tsx` replaces the
  stub with an RSC initial-data page: `cookies()` → `serverApiOrNull('/channels')`, active channel =
  `onyx-channel` cookie ?? first, then the **parallel** range-scoped snapshot + `/cost?group_by=day` fetches →
  entity mappers → `AnalyticsView` initial, carrying **`forChannelId`** (the FS5 cross-channel lesson) **and
  the resolved range**, so a channel switch or a range change can never paint another scope's numbers.
- **Analytics workspace (T-FS11.5), `widgets/analytics`:** filter bar (range presets + explicit
  `from`/`to`, the **contract-native** parameters; the existing topbar ChannelSwitcher remains the channel
  control — no second channel picker is invented) → **reliable panels first** (D3 §12 hierarchy):
  **Cost** (the §R11.8 reliable source; `group_by` segmented control = the contract's own facet; a legend that
  doubles as a series toggle, D2 §12) · **Quality** · **Trends** · **period Report** · the channel **snapshot
  metric row** → then the **Engagement** panels as the canonical **D2 §15 Gated card** (lock icon, *"Requires
  a stats adapter"*, the §R10.3 explainer) — **never a zero, never an empty chart implying no activity**.
  Every panel owns its **own** loading skeleton (D2 §16 axis + shimmer — **no blocking spinner**), its **own**
  error card with retry (**per-panel isolation, the FS5 MetricTiles precedent — one failing panel never breaks
  the page**), its **own** honest empty state (*"No data for this range yet"*), and its **provenance whisper**
  (§5.2 D8). `j/k/↵` over panels/datapoints, D3 responsive (mobile: stacked panels, horizontally scrollable
  charts, filters in a sheet — `/analytics` is a **primary mobile tab**, `MobileNav` already lists it).
- **features/filter-analytics (T-FS11.6)** — Stage 3 §3's slot realized: the range + `group_by` + period
  controls as **URL state** (nuqs), presets computing explicit `from`/`to`, the whole view restorable by paste
  and reversible by Back (§3.5). No server state of its own; it owns no cache.
- **features/export-analytics (T-FS11.7)** — Stage 3 §3's slot realized as what the contract permits
  (§5.2 D9): **Copy link** (D3 §12's *"Export/Share (URL-encoded state)"* — the URL *is* the export) and a
  **client-side CSV of the already-loaded series** (a pure derivation of served data — the FS10 `diffVersions`
  precedent), with copy stating exactly what it contains. **No export endpoint is invented; no server-side
  report is claimed.** LAZY.
- **Inspector `datapoint` (T-FS11.8):** one **LAZY** registry row under the unchanged FS2 `?inspect=type:id`
  contract — a **pure projection of the point the user already has** (series, key, value, unit, the panel's
  provenance, and whether the value is gated). **No per-datapoint endpoint exists and none is invented; the
  Inspector performs no fetch.** Shortcuts: an `analytics` scope (`r` range, `[`/`]` previous/next period,
  `e` export) added to the **lazy** `shortcuts-catalog.ts` only — **`/` is not re-registered** (Ask AI is
  already the global palette mode), and **no dead row is added**.
- **features/explain-metrics (T-FS11.9) — subject to §5.2 D10 approval.** LAZY, user-invoked
  *"Explain these numbers"* over the frozen `POST /studio/dry-run` via the **UNCHANGED** FS6 relay: a pure
  `buildMetricsPrompt` unit-proven to contain **only the loaded non-gated series and the active filters** —
  **no gated metric ever enters it, even if the wire smuggled a number** (the FS6 `buildSummaryPrompt` proof,
  re-applied), no other channel, no post text, no knowledge — and whose instruction **explicitly forbids
  causal attribution, anomaly verdicts and any statement about engagement**; output carries TrustLabel
  (Generated · Source Available), a provenance card citing the panels it read, ExplainabilityPanel
  (data used = these series + these filters; **confidence honestly absent**), wire-only cost, Stop preserves
  partial, nothing auto-runs.
- **Honest-absence surfaces (T-FS11.10):** engagement / views / ER / CTR (§R7.3 — the Gated card *is* the
  surface, and it names the MTProto adapter as the unlock) · **anomaly detection and "AI flags anomalies"**
  (no endpoint, no wire flag — §5.2 D3) · **cost forecasting** (§R11.8 is a backend capability; no endpoint
  exposes a forecast — §5.2 D4) · **recommendations and experiments** (§R11.2/§R11.5/§R11.6, and audience-split
  A/B is impossible by design — §5.2 D5) · **system health** (owned by `/health` + `/jobs`, FS12 — §5.2 D6) ·
  **per-post engagement drill-down** (the data does not exist) · **a server-side export/report download**
  (§5.2 D9) — each renders canonical honest copy naming the backend (or the later screen) as owner, the
  FS7/FS8/FS9/FS10 precedent.
- Tests (T-FS11.11/12/13) and gates + `FS11_REPORT.md` (T-FS11.14).

**OUT (full list §8):** any fabricated engagement value, anomaly flag, forecast, recommendation, algorithm
version or diversity metric · period **comparison** (two ranges side by side) · drill-through links into the
`/jobs` and `/logs` stubs · the Billing screen (§21, FS12) · tile customisation · new dependencies · threshold
changes.

**Carried from FS10 (§10):** R2 → §3.3/§6.1 keep `/chat` at **179** with **zero commons rows added**
(T-FS11.1) · R3 → the first-consumer rule is executed as a **measurement** before and after the first chart
(T-FS11.1) · R4 → FE-RV-13 unchanged (FS11 touches no prompt file) · R6 → the PromptCard MINOR is not touched ·
R7 → the Windows habits (kill port 3000 before any build/E2E; **unpiped** `pnpm build || (pnpm install --force
&& pnpm build)`) apply unchanged.

## 2. The contract reality of analytics (a first-class constraint, not a note)

D3 §12 was written against the design intent; `API_SPEC.md` §Analytics & Cost is a **frozen input** (§F2.3).
Where they disagree, **the contract wins** and the difference is a recorded deviation:

| D3 §12 promise | Contract reality | FS11 |
|---|---|---|
| filter bar: **time range + channel** | `?from=&to=` are the snapshot call's own parameters; the channel is the path segment `/analytics/channels/{id}` | range presets + explicit from/to in the URL; the **existing** topbar switcher stays the channel control (§5.2 D1) |
| **Cost** panel | `GET /cost?group_by=channel\|model\|provider\|day` — real, and §R11.8 calls it *«надёжный источник»* | the stage's strongest panel: all four facets, real series, legend-as-toggle (D2 §12) |
| **Quality** panel | `GET /analytics/quality` (§R11.7 quality/similarity/regen) — real; **shape undocumented** | renders exactly what the wire carries; **unknown keys by raw name** (§5.2 D7, D12) |
| **Trends** panel | `GET /analytics/trends` — real; **shape undocumented** | same discipline (§5.2 D7, D12) |
| period **reports** | `GET /analytics/reports/{daily\|weekly\|monthly}` — real; **shape undocumented** | a period segmented control over the three documented values only |
| **Content-diversity** panel | **no `/analytics/diversity` endpoint.** §R11.7 names diversity *analysis* as a backend capability; the contract exposes it nowhere | **no invented diversity metric.** If `/quality` or `/trends` carries diversity keys they render by raw name; otherwise it is an honest seam (§5.2 D7) |
| **System** panel | **no `/analytics/system` endpoint.** System state is `GET /health/live\|ready` (Health screen) and `GET /tasks` (Jobs screen) — both **FS12** | §5.2 **D6** — owner's choice: honest cross-link seam (recommended) or a minimal task-status roll-up from the already-consumed `/tasks` |
| **Engagement** panels rendered **Gated** | §R7.3 + the contract's own `"availability":"available\|gated"` flag; **ADR-001 default is "нет"**, so today they are gated in practice | the canonical D2 §15 **Gated card** — **the screen's headline honesty surface**; a gated field is `null` + flag even if the wire carries a number (§5.2 D2) |
| **Export / Share** | **no export endpoint exists** | the **URL is the share** (D3's own "URL-encoded state") + a client-side CSV of loaded series (§5.2 D9) |
| **compare periods** | derivable from two range requests, but doubles the surface | **OUT** of FS11 (§8) — derivable later with **no contract change** |
| **drill to Jobs / Logs** | those screens are **stubs until FS12** | no link into a stub; recorded as an FS12 seam |
| Inspector for a **datapoint / period** | **no per-datapoint endpoint** | a **pure projection** of the served point; **zero fetches** (§5.2 D8) |
| **AI explains changes** ("cost up 18% — driven by image regens") | causal attribution the data cannot support; **anomaly flags are a fabricated field** the FS6 owner condition forbids outright | **explain-metrics**: reads the loaded non-gated series, forbidden by construction from causes, anomalies and engagement (§5.2 D10) |
| **anomaly callouts** | no endpoint, no wire flag | honest seam (§5.2 D3) |
| **Explainability is mandatory** (source·filters·algorithm version·time, §R11.9) | the contract documents **no provenance envelope** | **request-provenance** (endpoint · filters · fetched-at) always; an **algorithm version only if the wire carries one**, otherwise stated as not reported (§5.2 D8) |
| RBAC: read for all; **export per role** | matrix: *Analytics/Cost (чтение)* = ✓ for **all five roles** | **no RBAC PATCH** (§5.2 D11); export/copy available to every role that can read (it exports what they already see); the AI panel gates at the call site |

**Analytics ≠ Dashboard ≠ Health/Jobs ≠ Billing — structural, the §R9.3 discipline generalized a fourth time:**

| Dimension | Dashboard (FS5) | **Analytics (FS11)** | Health/Jobs (FS12) | Billing (FS12/13) |
|---|---|---|---|---|
| Question | *"what needs me right now?"* | **"what happened over a range, and what can I trust?"** | *"is the system up?"* | *"what will it cost?"* |
| Calls | snapshot + `/cost?group_by=day` + `/tasks` + needs-review | **the five §Analytics & Cost reads, range-scoped** | `/health/*`, `/tasks` | `/cost` + plan data |
| Keys | `queryKeys.analytics(ch)` · `queryKeys.cost()` (commons, **untouched**) | **entity-local, range-scoped** (`analyticsKeys.*`) | — | — |
| Scope | today, active channel | **range + active channel** | platform | account |
| Charts | one **Sparkline** inside a tile | **the real chart surface** (Line/Area/Bar, lazy) | — | — |
| Time | implicit "today" | **explicit, in the URL** | live | billing period |

No merged "metrics" abstraction, no shared panel registry with the dashboard, **no cross-entity import**, and
**zero edits to `widgets/dashboard/*`** (§3.3). **Analytics ≠ AI Chat:** FS11 touches zero chat files, and no
analytics affordance appears inside the chat surface.

## 3. Deliverables, matrices and guarantees

### 3.1 Rendering & loading matrix (fixed at approval — every new UI module)

| Module | Server / Client | Eager / Lazy | First Load impact |
|---|---|---|---|
| `analytics/page.tsx` | **Server (RSC)** — channels + range-scoped snapshot + `/cost?group_by=day`, `forChannelId` + range carried | eager (route entry) | defines `/analytics`; RSC ships no client JS |
| `AnalyticsView` (shell, filter host, panel grid, keyboard) | Client (Query island, nuqs) | eager — the route shell island | **YES — /analytics only** (target ≤170 kB); imports nothing heavy statically |
| `AnalyticsFilters` (range presets, from/to, `group_by`, period) | Client | eager (part of the shell) | **YES — /analytics only** |
| `MetricRow` (snapshot KPI cards, ONYX MetricCard) | Client | eager (part of the shell) | **YES — /analytics only** |
| `GatedPanel` (D2 §15 Gated card + §R10.3 explainer) · `AnalyticsHonesty` (anomaly/forecast/recommendation/experiment/system/export seams) · `AnalyticsEmpty` | Client (static markup) | eager (bytes) | YES — /analytics only, byte-level |
| `CostPanel` · `QualityPanel` · `TrendsPanel` · `ReportPanel` (each = frame + its chart) | Client | **LAZY** — `dynamic()` per panel | **NO** |
| **ONYX charts** (`@/shared/ui/chart/lazy` → visx) | Client | **LAZY** — the frozen FS3 entrypoint, unchanged | **NO** — but the **runtime-map** effect is measured (T-FS11.1 / R1c) |
| `ExportMenu` (+ `toCsv`) | Client | **LAZY** — `dynamic()` on the export intent | **NO** |
| `ExplainMetricsPanel` (+ streaming machinery) — *if D10 approved* | Client | **LAZY** — `dynamic()` on intent | **NO** |
| `DatapointInspector` | Client | **LAZY** registry row (FS7/FS8/FS9/FS10 precedent) | **NO** route First Load impact |
| Analytics rows in `shortcuts-catalog.ts` | isomorphic data | eager **only inside the lazy cheat-sheet chunk** (T-FS8.1 split preserved) | **NO** |
| `entities/analytics` FS11 files (`report-model`, `report-hooks`, `paths`, `keys`) | Client lib (+ mappers used by RSC) | eager **within the /analytics shell only** | YES — /analytics only; **and `/dashboard` is byte-compared** (§3.7 I2) |
| `entities/analytics/{model,hooks}.ts` (FS5) | — | — | **BYTE-IDENTICAL — not edited** |
| `shared/config/query-keys.ts` · `shared/lib/api/endpoints.ts` | isomorphic data | eager (commons) | **ZERO — no rows added** (T-FS11.1; pointer comments only, stripped at build) |
| `shared/config/routes.ts` · `rbac.ts` | isomorphic data | eager (commons) | **ZERO — not edited at all** (§5.2 D11) |
| `shared/config/shortcuts.ts` | types | eager (commons) | **ZERO** — a **type-only** `'analytics'` scope member (erased at build; the FS9/FS10 precedent) |
| `shared/types/dto.ts` | types | — | **zero runtime** (types erased) |

Rule fixed with this table: **every eager-client addition lives inside the /analytics route shell**, the only
shared-module edits are a types-only file, a type-only union member and two comments, and **every chart is
reached exclusively through the frozen lazy entrypoint**. Any deviation found at `pnpm budget` is fixed
**structurally**, never by threshold.

### 3.2 Query keys & invalidate graph (fixed at approval)

New keys, **entity-local** (T-FS11.1), all range-scoped, deliberately namespaced so they cannot be matched by
the FS5 invalidation:

```
analyticsKeys.snapshot(ch, from, to)    ['analytics','range',ch,from,to]
analyticsKeys.costBy(groupBy, from, to) ['cost','group',groupBy,from,to]
analyticsKeys.quality(from, to)         ['analytics','quality',from,to]
analyticsKeys.trends(from, to)          ['analytics','trends',from,to]
analyticsKeys.report(period)            ['analytics','report',period]
```

**Untouched (FS5, commons):** `queryKeys.analytics(ch) = ['analytics', ch]` · `queryKeys.cost() =
['cost','by-day']`.

**Invalidate graph (writer → keys): EMPTY — FS11 introduces no mutation at all.** The `/analytics` group is
read-only in the frozen contract, so the stage ships **zero** `invalidateQueries` calls and **zero**
`setQueryData` calls. Non-invalidation flows, fixed explicitly:

- **A range or `group_by` change is a NEW KEY, never an invalidation** — the previous range stays cached
  (D3 §12 *"Cached: last range"*) and Back returns to it instantly.
- **A channel switch re-scopes every channel-keyed analytics query** through `forChannelId`-guarded
  `initialData` (the FS5 cross-channel defect precedent: server seeds apply **only** to the channel and range
  the server fetched for).
- **`features/review-post` (FS5) still invalidates `['analytics', channelId]`** — proved **positionally
  unable** to match `['analytics','range',…]`, `['analytics','quality',…]`, `['analytics','trends',…]` or
  `['analytics','report',…]` (position 1 is a literal, not the channel id). Lock-tested both ways, so neither
  surface can silently refetch or stale the other.
- **explain-metrics performs ZERO Query writes** — the streamed answer lives in the transient Zustand owner
  (the FS6/FS7/FS8/FS9/FS10 rule).
- FS5–FS10 key shapes are **untouched**, and **no FS11 module invalidates** `['documents',…]`,
  `['personas',…]`, `['actors',…]`, `['prompts',…]`, `['images',…]`, `['locations',…]`, `['posts',…]` or
  `['jobs',…]`.
- **No polling anywhere.** D3 §12 mentions "live counters"; the contract exposes **no analytics stream and no
  push**, and inventing a poll would imply a freshness the backend never promised. Panels are SWR-cached
  (`staleTime` 60 s, the Stage 3 §8 analytics row) with an explicit **Refresh** affordance and a
  *fetched-at* whisper — honest freshness, not simulated liveness (§5.2 D8).

### 3.3 FS5 / FS6 / FS7 / FS8 / FS9 / FS10 no-touch guarantee (protects /chat 179 · /knowledge 175 · /dashboard 167 · /studio 164 · /prompts 150 · /memory 149)

**Guaranteed ZERO edits** — dashboard surface (**the sharpest one this stage**, because it consumes the entity
FS11 extends): `app/(workspace)/dashboard/page.tsx` · `widgets/dashboard/*` (incl. `MetricTiles.tsx`,
`DashboardSummary.tsx`, `summary-prompt.ts`) · `features/review-post/*` · **`entities/analytics/model.ts` and
`entities/analytics/hooks.ts`** (the FS5 mappers, hooks and key usage — byte-identical, verified by diff).
Chat: `app/(workspace)/chat/*` · `widgets/chat/*` · `features/{send-message,insert-to-channel}/*` ·
`entities/conversation/*` (incl. THE ConversationRepository) · `shared/lib/{stream,ai-gateway,persist}/*` ·
`app/api/ai/stream/route.ts` · `shared/config/models.ts`. Knowledge: `app/(workspace)/knowledge/*` ·
`widgets/knowledge/*` · `features/{add-source,ask-document}/*` · `entities/document/*`. Memory:
`app/(workspace)/memory/*` · `widgets/memory/*` · `features/{edit-persona,explain-style}/*` ·
`entities/{persona,actor}/*`. Studio: `app/(workspace)/studio/*` · `widgets/studio/*` ·
`features/{regenerate-image,upload-references,explain-verification}/*` · `entities/{image,location}/*`.
Prompts: `app/(workspace)/prompts/*` · `widgets/prompts/*` · `features/{manage-prompt,test-prompt}/*` ·
`entities/prompt/*` · `shared/ui/ai/prompt-card/*`. The FS6 stream/relay machinery is **consumed as-is**
(explain-metrics calls `useAssistantStream` exactly as ask-document / explain-style / explain-verification /
test-prompt do) — never modified. **`shared/ui/chart/*` is consumed through its existing `lazy.tsx`
entrypoint and is NOT edited** (if a chart needs a prop the frozen component lacks, that is a D4 §13 question
brought to the owner **before** any code — the FS10 PromptCard precedent — never a silent component change).

**Shared files edited, and why each cannot grow a protected route:**

| File | Edit | Why safe |
|---|---|---|
| `shared/config/query-keys.ts` · `shared/lib/api/endpoints.ts` | **pointer comments only — ZERO rows** | comments are stripped at build; runtime delta exactly 0 bytes (T-FS11.1) |
| `shared/config/shortcuts.ts` | **type-only** `'analytics'` scope member | erased at build — zero runtime bytes (FS9/FS10 precedent) |
| `shared/config/shortcuts-catalog.ts` | analytics rows + scope label | lives only in the lazy cheat-sheet chunk (T-FS8.1 split preserved and lock-tested) |
| `shared/types/dto.ts` | +analytics report/trend/quality/cost-group wire mirrors | **types erased at build — zero runtime bytes** |
| `entities/analytics/index.ts` | +re-exports of the new FS11 modules | **the one file on the dashboard's import path that FS11 touches.** It adds re-export lines only; `model.ts`/`hooks.ts` are byte-identical. **Backstop:** `/dashboard` is byte-compared pre/post (§6.3.6); if it moves 1 kB, the structural fix is to stop re-exporting the FS11 modules from the slice barrel and let `widgets/analytics` own that projection layer instead — decided by the manifest, not by argument |
| `widgets/inspector/Inspector.tsx` | +1 **LAZY** registry row (`datapoint`) | `dynamic()` — no static weight in shell commons (four times proven, FS7–FS10) |
| `shared/lib/fixtures/{dataset,browser,meta}` | analytics/cost coverage | fixture env only; kill-switched, grep-locked, lazy |

**Not edited at all:** `shared/config/routes.ts` and `shared/config/rbac.ts` (§5.2 D11) — a first since FS6.

**Backstop:** §6.3 byte-compares `/chat` (179), `/knowledge` (175), `/dashboard` (167), `/studio` (164),
`/prompts` (150), `/memory` (149) and the stubs (107) pre/post. Any regression is fixed **structurally inside
FS11's own surface** — deeper lazy splitting of the panel grid, moving the FS11 projection layer out of the
entity barrel, or a `dynamic()` boundary around a chart — and if no structural fix holds the number, the stage
**STOPS and reports** (the FS7 precedent). **180 kB is non-revisable.**

### 3.4 State-ownership matrix (fixed at approval)

Stage 2 §7 / D4 §7 owners applied to every piece of FS11 state. **Hard rule: no state is owned by TanStack
Query and Zustand at the same time.**

| State | Owner | Persistence | Invalidation source | Server / Client | Cache lifetime | Replacement seam |
|---|---|---|---|---|---|---|
| **Channel snapshot (range-scoped)** | **TanStack Query** — `analyticsKeys.snapshot(ch,from,to)` | none | **none — no writer exists** | RSC seeds via `serverApiOrNull` with **`forChannelId` + range** | `staleTime 60s` (Stage 3 §8) | `entities/analytics/{report-hooks,paths,keys,report-model}.ts` (FE-RV-14) |
| **Cost series** | **TanStack Query** — `analyticsKeys.costBy(groupBy,from,to)` | none | none | RSC seeds the `day` facet only | `staleTime 60s` | same |
| **Quality / Trends / Report** | **TanStack Query** — the three keys above | none | none | client (LAZY panels) | `staleTime 60s` | same |
| **Range (`from`/`to`), `group_by`, `period`, active panel** | **URL (nuqs)** — the shareable view state (D4 §7) | URL is the persistence | user navigation only | client | n/a | §3.5 grammar |
| **Inspector target** | **URL (nuqs)** — `?inspect=datapoint:<id>` (unchanged FS2 contract) | URL | user navigation only | client | n/a | `shared/hooks/useInspector` |
| **Legend/series toggles, expanded panel, focused row** | component `useState` — **ephemeral, never global, never URL** (they do not change what the data *is*) | none | user input | client | dies with the panel | `widgets/analytics` |
| **Active channel** | **the existing FS2/FS5 cookie-backed ui-store** — consumed, never written by FS11 | cookie | the topbar switcher | client | session | `widgets/topbar/ChannelSwitcher` (untouched) |
| **explain-metrics result** *(if D10 approved)* | **transient Zustand** — the FS6 assistant store, keyed `analytics:<ch>:<from>:<to>` | none — never persisted, never reconciled into Query | `reset()`/unmount; a new run replaces the slice | client | until unmount | `shared/lib/stream/assistant.ts` (consumed UNCHANGED — §3.7 I3) |

**The no-double-ownership rule, made checkable (T-FS11.11):**
1. `features/explain-metrics` contains **zero** `queryClient` writes (`setQueryData`/`invalidateQueries`) —
   source-level test over the slice (the FS6/FS8/FS9/FS10 rule).
2. The assistant key namespace used here (`analytics:<…>`) never appears in a Query key — asserted in the same
   test.
3. **No FS11 module imports `useUiStore`** for analytics data (the global store keeps owning only
   theme/density/sidebar/active-channel/palette/toasts) — grep-lock test.
4. **FS11 owns no draft and touches no storage:** no FS11 module imports `shared/lib/persist` (analytics has
   no unsaved user work) — grep-lock test.
5. `MetricRow`, `GatedPanel`, `AnalyticsHonesty`, `toSeries` and `toCsv` are **pure/stateless** functions of
   their inputs — asserted by test, `toCsv` additionally by a table of series/expected-output pairs.

### 3.5 Navigation contract (URL is the state; every transition is reversible)

Stage 3's route is the flat `/analytics`; FS11 fixes its query grammar. **Every transition is expressible as a
URL, restorable by paste, and reversible by the browser Back button.**

| URL | Meaning | Rendering |
|---|---|---|
| `/analytics` | default range (the last 30 days, resolved to explicit `from`/`to` on first paint and written to the URL with `history: 'replace'` so the shared link is unambiguous) | RSC shell + panels |
| **`/analytics?from=<ISO>&to=<ISO>`** | the contract-native range — passed verbatim to `GET /analytics/channels/{id}?from=&to=` | all panels re-keyed; **nuqs `history: 'push'`** — a range change is a real state change and Back must reverse it (**the FS8 `?scope=` defect precedent, applied preventively**) |
| **`/analytics?group_by=day\|channel\|model\|provider`** | the **contract-native** cost facet | Cost panel re-keyed; `history: 'push'` (same reasoning) |
| `/analytics?period=daily\|weekly\|monthly` | the **contract-native** report period | Report panel re-keyed; `history: 'push'` |
| `/analytics?panel=<id>` | a panel expanded/focused (deep-linkable per D3 A4) | `history: 'replace'` — a view affordance, not a data change |
| `/analytics?inspect=datapoint:<seriesId>.<pointKey>` | datapoint Inspector overlay | drawer (desktop) / sheet (mobile); **no navigation, no fetch**; Esc or Back closes |
| `/dashboard` · `/knowledge?inspect=document:<id>` · `/memory?inspect=persona:<id>` · `/studio?inspect=image:<id>` · `/prompts?inspect=prompt:<id>` | **unchanged FS5–FS10 contracts** — listed only to show the shared grammar | FS5–FS10 views |

**Grammar rules (unchanged since FS2, restated so FS11 cannot drift):** `?inspect=<type>:<id>` works in every
route group and never navigates; `?inspect` writes with `history: 'push'` (Back closes the inspector); pure
view affordances write with `history: 'replace'`; **anything that changes which data is fetched writes with
`history: 'push'`**.

**Cross-surface transitions:**

| From → To | Trigger | URL effect | Reversible by |
|---|---|---|---|
| anywhere → Analytics | `g a` chord · sidebar · mobile tab · palette `@analytics` | `push /analytics` | Back |
| Dashboard metric card → Analytics | the existing MetricCard "drill" affordance **is not wired in FS11** (it would need a per-metric deep link; recorded as an FS14 polish item, not faked) | — | — |
| panel → datapoint | click/`↵` on a point | `push ?inspect=datapoint:<…>` | Back / Esc |
| range preset → custom | preset button / date inputs | `push ?from=&to=` | Back returns to the previous range |
| Analytics → Chat/Knowledge/Memory/Studio/Prompts | **no direct link in FS11** — the palette is the shared entry point | — | — |

**Invariant (asserted in E2E):** for each of `/analytics`, `?from=&to=`, `?group_by=`, `?period=`,
`?inspect=datapoint:<…>` — a full page reload reproduces the same visible state, and Back returns to the exact
previous state. **Additionally:** switching the active channel **re-scopes the channel-keyed panels and leaves
the range untouched** (D1 §6.6 *"switching preserves the current screen where meaningful — e.g. stay on
Analytics, swap channel"*), and the cost-by-day series, which the contract does not scope by channel, is
**not** silently relabelled as channel data.

### 3.6 Bundle ownership (per-chunk architecture)

| Chunk | Imported by (the ONLY importer) | First loaded when | Could it reach commons? | Proof it does not |
|---|---|---|---|---|
| `analytics-shell` (AnalyticsView + Filters + MetricRow + GatedPanel + Honesty + Empty + FS11 entity hooks) | `app/(workspace)/analytics/page.tsx` (route entry) | `/analytics` is opened | **It IS route-eager — by design, route-scoped** | it appears in the `/analytics` First Load list of `app-build-manifest.json` and **in no other page's list** |
| `analytics-cost` (CostPanel + its chart binding) | `AnalyticsView` via `dynamic()` | the Cost panel mounts | only if someone static-imports it | grep: no static import outside the `dynamic()` call; absent from every page's First Load list |
| `analytics-quality` · `analytics-trends` · `analytics-report` | `AnalyticsView` via `dynamic()` | the respective panel mounts | same | same manifest + grep proof |
| **visx chart chunks (`3513` 11.79 kB + `600` + `2783`, byte-stable since FS5)** | the frozen **lazy** entrypoint `@/shared/ui/chart/lazy`, already referenced by `widgets/dashboard/MetricTiles.tsx` | the first chart renders | **the R1c case: a new consumer of an already-referenced heavy module.** The expectation is that all six chart chunk ids are *already* in the webpack runtime map (FS5 registered them), so FS11 adds **no new ids** — but new visx sub-packages (`@visx/axis`, `@visx/grid`) enter a chunk for the first time | **measured, not assumed** (T-FS11.1): runtime-chunk size and the full route table recorded **before** and **after** the first chart; the chunks must stay **absent from every page's First Load list**; if a route moves, the manifest and a **control build** decide the cause before a word is written, and the fix is structural |
| `analytics-export` (ExportMenu + `toCsv`) | `AnalyticsView` via `dynamic()` | the export intent | same | manifest + grep proof |
| `explain-metrics` (panel + `buildMetricsPrompt`) *(if D10 approved)* | `AnalyticsView` via `dynamic()` | the user presses "Explain these numbers" | same | manifest + grep proof; the streaming machinery it uses is the **already-existing** FS6 chunk, not a new copy |
| `datapoint-inspector` | `widgets/inspector/Inspector.tsx` via `dynamic()` (registry row) | the first `?inspect=datapoint:` target | **highest risk** — `InspectorPanel` sits in shell commons, so a static import taxes EVERY route | the FS7–FS10 precedent: the row is `dynamic()`; verified by the manifest check + the `/chat` byte-compare |
| analytics rows in `shortcut-catalog` | `widgets/shortcut-cheatsheet/*` **only** (a lazy overlay) | `⌘/` is first opened | it must not return to commons | the FS8 lock test re-runs: the catalogue appears in exactly one chunk, absent from every First Load list |

**Ownership rules fixed by this table:** (1) exactly one importer per lazy chunk; (2) **every chart is reached
only through the frozen `chart/lazy` entrypoint** — no panel imports a chart module directly, so the family
keeps a single entry point (the FS10 Shiki lesson inverted); (3) any module a route shell and a shell-commons
widget both need lives in the **entity** layer (the FS7 `paths` / FS9 `keys` precedent); (4) **no new chunk and
no new row may be introduced into `shared/config`, `shared/lib/api` or `widgets/app-shell`** — those are
commons, and their growth is measured against `/chat`'s **1.0 kB** headroom with **no cheap lever left**.

### 3.7 Regression invariants (checkable, not intentions)

| # | Invariant | Proof (executed at T-FS11.14, recorded in FS11_REPORT) |
|---|---|---|
| **I1** | **`/chat` First Load ≤ 179 kB** (the post-FS10 standing reference; 180 non-revisable). FS11 adds **zero commons rows** (T-FS11.1) | `pnpm budget` route table + `.next/route-budget.json`, byte-compared against the FS10 baseline (179); if it moves, `app-build-manifest.json` forensics — and a **control build** where the movement is contested — decide the cause **before** any claim is written (the FS8/FS9/FS10 lesson: the manifest is the arbiter, never a plausible story) |
| **I2** | **`/dashboard` ≤ 167 kB — the sharpest invariant of this stage**, because FS11 extends the entity the dashboard imports; and `/knowledge` ≤ 175 · `/studio` ≤ 164 · `/prompts` ≤ 150 · `/memory` ≤ 149 · stubs ≤ 107, all routes ≤ 180 | full 31-route table comparison (the `/analytics` stub is replaced, so the stub count drops 23 → 22); **plus a targeted check that no FS11 marker appears in any `/dashboard` First Load chunk**, and `entities/analytics/{model,hooks}.ts` byte-identical by diff |
| **I3** | **The AI relay stays VERBATIM.** `app/api/ai/stream/route.ts` and `shared/lib/ai-gateway/*` byte-identical; explain-metrics adds no frame type, no cadence, no post-processing | `git diff --stat` over those paths = empty; the FS6 verbatim-relay unit trio re-runs green untouched |
| **I4** | **ConversationRepository, the conversation slice and `shared/lib/persist` byte-identical**; no FS11 module imports `entities/conversation` or `persist` | empty diff + grep over `widgets/analytics`, `features/{filter-analytics,export-analytics,explain-metrics}` |
| **I5** | **The FS5 analytics/cost keys are byte-identical and CANNOT be matched by the new range keys (both directions), and FS11 issues no invalidation at all** | diff over `shared/config/query-keys.ts` (comments only); a positional key-matching unit test (`['analytics', ch]` vs `['analytics','range',…]`); a grep proving zero `invalidateQueries`/`setQueryData` in every FS11 slice |
| **I6** | **FE-RV-7…13 gain NO new adjustment points.** FS11 opens exactly one new register entry (**FE-RV-14**) | the FE-RV register diff; grep: no FS11 file references `ai-gateway`, dry-run DTOs, `documentPaths`, `personaPaths`, `actorPaths`, `imagePaths`, `locationPaths` or `promptPaths` (explain-metrics reaches the relay only through the public `useAssistantStream` hook) |
| **I7** | **FS2–FS10 suites stay green without weakening.** The only legal edits to existing specs are ones FS11 makes factually necessary (e.g. a stub-route assertion that must stop naming `/analytics` a stub) | `git diff` over `tests/` shows additions plus at most those lines; full `pnpm test` + `pnpm e2e` green |
| **I8** | **No state owned by Query and Zustand at once; nothing fabricated.** No engagement value, no zero standing in for a gated metric, no anomaly flag, no forecast, no recommendation, no invented algorithm version, no invented diversity metric, no simulated live counter, no export endpoint | the five §3.4 locks; component tests asserting the absence of each fabricated element; a mapper test proving a **gated field with a number on the wire still maps to `null` + flag**; dependency-cruiser 0 (incl. **no cross-entity import** between `analytics`, `channel`, `job`, `post`, `document`, `persona`, `actor`, `image`, `location`, `prompt`) |

**Escalation rule:** if any invariant cannot be held while delivering the approved scope, the stage **STOPS and
reports** — the plan is not silently renegotiated, and an invariant is never re-worded to make the stage look
clean (the FS7/FS8/FS9/FS10 precedent).

### 3.8 File-level deliverables (maps to Stage 3 §1/§3–§5)

`src/shared/config/{shortcuts.ts (type-only member), shortcuts-catalog.ts (analytics rows), query-keys.ts
(comment only)}` · `src/shared/lib/api/endpoints.ts` (comment only) · `src/shared/types/dto.ts` (analytics
report/trend/quality/cost-group wire mirrors) ·
`src/entities/analytics/{report-model,report-hooks,paths,keys}.ts` + `index.ts` (re-exports only;
**`model.ts` and `hooks.ts` untouched**) ·
`src/shared/lib/fixtures/{dataset,browser,meta}.ts` (+range-honouring snapshot, all four `group_by` facets,
quality/trends/reports, one unrecognised key, one gated-with-a-number field, one response without an algorithm
version) ·
`src/app/(workspace)/analytics/page.tsx` (stub replaced) ·
`src/widgets/analytics/{AnalyticsView,AnalyticsFilters,MetricRow,CostPanel(lazy),QualityPanel(lazy),
TrendsPanel(lazy),ReportPanel(lazy),GatedPanel,AnalyticsEmpty,AnalyticsHonesty,PanelFrame,index}` ·
`src/features/filter-analytics/{index, model/useAnalyticsRange.ts, ui/RangeControls.tsx}` ·
`src/features/export-analytics/{index, model/toCsv.ts, ui/ExportMenu(lazy).tsx}` ·
`src/features/explain-metrics/{index, model/{buildMetricsPrompt,useExplainMetrics}.ts,
ui/ExplainMetricsPanel(lazy).tsx}` *(only if §5.2 D10 is approved)* ·
`src/widgets/inspector/DatapointInspector.tsx` (+1 lazy registry row) · `tests/{unit,component,e2e}/*`
additions · `FS11_REPORT.md` (+ `FS11_REPORT_SIZE_ADDENDUM.md` if §6.2 triggers). **Other route stubs
untouched · no new endpoints · no new dependencies · `.size-limit.json` untouched (677) · `routes.ts` and
`rbac.ts` untouched · story count unchanged at 54 (the ONYX chart/metric-card stories already exist).**

## 4. Task sequence (each with a completion criterion)

| Task | Produces | Done when |
|---|---|---|
| **T-FS11.0** Contract & gate prep | endpoint-by-endpoint verification against `API_SPEC.md` (§Analytics & Cost — five reads, verbatim; dry-run already confirmed at FS6); the RBAC matrix row re-read (all five roles read analytics ⇒ **no route/permission edit**); *(assumed)* wire shapes written into `dto.ts` comments; no dependency intake; no threshold change; **baseline `pnpm budget` recorded** (/chat 179 · /knowledge 175 · /dashboard 167 · /studio 164 · /prompts 150 · /memory 149 · stubs 107 · commons 106) and `pnpm size` (666.80/677) | `pnpm gate` baseline green before new code; §5.2 deviations approved with this plan |
| **T-FS11.1** **Zero-commons lock + R1c first-consumer measurement (first)** | `entities/analytics/{paths,keys}.ts`; `query-keys.ts` + `endpoints.ts` gain pointer comments and **no rows**; grep-lock test incl. the FS5-key byte-identity and the positional non-collision assertions; **recorded baseline of the webpack runtime chunk (gz)** | the lock test fails if an FS11 key/path builder appears in commons, if an FS5 key changes, or if the new namespaces could be matched by the FS5 invalidation; the runtime-chunk baseline is written down before any chart exists |
| **T-FS11.2** `entities/analytics` (extended) | new wire mirrors · VM mappers (**gated ⇒ `null` + flag even with a number on the wire**; **unknown keys by raw name**; **no algorithm version produced unless the wire carries one**) · range-scoped hooks · pure `toSeries`/`toCsv` | mapper + projection unit tests green; `model.ts`/`hooks.ts` byte-identical by diff |
| **T-FS11.3** Fixtures | range-honouring snapshot; all four `group_by` facets; quality/trends/reports; one unrecognised key; one gated-with-a-number field; one response with no algorithm version; `empty` scenario; **no clocks** | fixture/real drift is a type error (same wire mirrors); kill-switch + grep locks green |
| **T-FS11.4** RSC page | `analytics/page.tsx` replaces the stub; channels + snapshot + cost fetched in parallel with **`forChannelId` + range**; the resolved default range written to the URL once | `/analytics?from=&to=` renders on a paste; a channel switch re-scopes channel-keyed panels and preserves the range; a server-side failure yields an honest per-panel error, never an empty-looking success |
| **T-FS11.5** `widgets/analytics` | AnalyticsView (panel grid, `j/k/↵`, per-panel skeleton/error/empty) · **first chart wired** → **immediately re-measure the runtime chunk and the full route table (R1c)** · Cost/Quality/Trends/Report panels LAZY · MetricRow · **GatedPanel** · AnalyticsEmpty · AnalyticsHonesty | the stub is REPLACED; all states render; 12px whispers use `secondary` (the five-precedent tertiary rule, pre-empted); **every chart arrives through `chart/lazy`**; the R1c re-measurement is recorded whatever it shows |
| **T-FS11.6** `features/filter-analytics` | range presets + explicit from/to + `group_by` + `period` as URL state with the §3.5 push/replace policy | every control is a URL; Back reverses each data-changing control; a pasted URL reproduces the view |
| **T-FS11.7** `features/export-analytics` | Copy link + client-side CSV of the loaded series (LAZY) | the CSV contains exactly the loaded, non-gated series and says so; **no endpoint is called**; gated series are excluded and named as excluded |
| **T-FS11.8** Inspector `datapoint` + shortcuts | one LAZY registry row (pure projection, **zero fetches**); analytics rows (`r`, `[`, `]`, `e`) in the lazy catalogue | FS2 `?inspect=` contract unchanged; cheat-sheet auto-reflects; **no dead shortcut is registered**; the Inspector issues no network request (asserted) |
| **T-FS11.9** `features/explain-metrics` *(if D10 approved)* | pure `buildMetricsPrompt` + LAZY panel over the UNCHANGED relay; Trust · provenance · Explainability (confidence absent) · wire cost · Stop | prompt-builder unit proof: contains **only** the loaded non-gated series + the active filters, **excludes gated metrics even when the wire smuggles a number**, and carries the explicit no-causes/no-anomalies/no-engagement instruction; no auto-run |
| **T-FS11.10** Honest-absence surfaces | engagement (Gated card) · anomalies · forecast · recommendations/experiments · system health · per-post engagement · server-side export — canonical copy naming the backend (or the later screen) as owner | copy states the truth without promising a date; **no fake control and no zero substitutes for a gated value** anywhere |
| **T-FS11.11** Unit tests | mappers (gated-with-a-number · unknown keys by raw name · absent algorithm version) · `toSeries`/`toCsv` tables · fixtures contract · the five §3.4 ownership locks · the T-FS11.1 commons + key-collision locks · `buildMetricsPrompt` proof (D10) | `pnpm test` green |
| **T-FS11.12** Component tests | AnalyticsView per role/state · **per-panel error isolation** (fail ONLY quality ⇒ cost/trends still render — the FS5 proof re-applied) · GatedPanel (no number, no zero, correct explainer) · filters ⇄ URL · MetricRow · ExportMenu (gated excluded) · DatapointInspector (no fetch) · ExplainMetricsPanel (no-auto-run/Trust/no-confidence) (D10) | FS2–FS10 suites untouched-green |
| **T-FS11.13** E2E + axe | `analytics.spec.ts`: deterministic panels from fixtures · **the Gated engagement card renders with no number** · range change → URL → Back reverses · `group_by` facet switches the cost series · period report · datapoint Inspector deep link · **channel switch re-scopes and preserves the range** · copy-link/CSV honesty · empty scenario · **analyst and viewer both read the full screen** (the RBAC matrix's own claim) · explain-metrics anchored on the wire-cost done marker (D10) · **axe on the panel grid AND an expanded panel, 3 viewports** | full `pnpm e2e` green (3 projects); real-form sign-in; the four recorded Playwright pitfalls honoured (substring `getByLabel`; done-marker anchoring; role+level headings; `.first()` vs `display:none` panes) |
| **T-FS11.14** Gates + report | `pnpm format` → `gate` → **`budget` (all ≤180; /analytics new; /chat + /dashboard + /knowledge + /studio + /prompts + /memory + stubs byte-compared)** → `e2e` → **`size` (measure vs 677; if over → STOP + dedicated per-chunk addendum, rule №33 — never pre-raise)** → `build-storybook`; `FS11_REPORT.md` (three statuses; FE-RV register incl. FE-RV-14; the §3.7 invariants each proved mechanically; the R1c before/after measurement recorded) | gates green or honestly FE-RV/STOP-flagged; **STOP** |

Order is strict: 0→1→…→14. T-FS11.1 precedes every feature task so both the commons decision and the
first-consumer baseline are locked before any FS11 code can drift.

## 5. Gates, contract truth & honesty

### 5.1 Engineering gates

The ten Stage 2 §14 gates run exactly as in FS7–FS10 (fast block → budget → e2e → size → storybook). Windows
discipline (PART4 §3.1/§3.1b): **kill port 3000 before any build/E2E**, and treat any
`Cannot find module …next…` / `./impl` failure as the known pnpm corruption (**22 occurrences**; recover with
`pnpm install --force`, and keep the recovery chain **UNPIPED** — a pipeline's exit status is the last
command's). Contract gate: every endpoint used exists **verbatim** in `API_SPEC.md`.

### 5.2 Contract truth & deviations (decided by approving this plan)

- **D1 — the range is contract-native; the channel control already exists.** `?from=&to=` are the snapshot
  call's own parameters and are passed verbatim; the channel is the path segment, driven by the **existing**
  topbar ChannelSwitcher (FS5). FS11 invents **no second channel picker** and **no range parameter the contract
  does not accept** (`/cost`, `/quality`, `/trends`, `/reports` take the documented parameters only; where the
  contract documents none, FS11 sends none and says the panel is not range-filtered — see D12).
- **D2 — engagement is GATED, and that is the screen's headline.** §R7.3 states Bot API returns no
  views/ER/CTR; `DATABASE_SPEC` marks `analytics_snapshots.views/ctr/er` NULLABLE for exactly that reason;
  Appendix C's MTProto decision defaults to **"нет"**. The contract's `availability` flag is therefore
  load-bearing: **a field flagged `gated` renders the D2 §15 Gated card even if the wire carries a number**
  (the existing `mapMetric` behaviour, extended to every new panel and unit-proven). **No zeros, no empty chart
  implying "no engagement", no "—" that could read as "none".**
- **D3 — there is no anomaly endpoint and no anomaly flag.** D3 §12's "anomaly callouts" and D3 §4's "AI flags
  anomalies" have no wire field; the FS6 owner condition already forbids self-generated anomaly flags. FS11
  ships **no anomaly surface** — an honest seam instead.
- **D4 — there is no forecast endpoint.** §R11.8 makes cost forecasting a backend capability, and the contract
  exposes only historical `/cost`. FS11 renders served history and **no projection, no trend line labelled as a
  forecast**. Honest seam; the Billing screen (FS12/FS13) inherits the question.
- **D5 — there are no recommendations and no experiments.** §R11.2 (analytics does not decide),
  §R11.5 (audience-split A/B is **impossible** — one channel broadcasts one post), §R11.6 (experiments are
  temporal/cross-channel and stored separately) — and the contract exposes none of it. Honest seam that states
  *why* A/B is impossible, which is real product knowledge, not an apology.
- **D6 — the "System" panel has no analytics endpoint; the owner picks.** System state lives at
  `GET /health/live|ready` (the Health screen) and `GET /tasks` (the Jobs screen), **both FS12**.
  **Option 1 (recommended): no System panel in FS11** — an honest seam naming Health and Jobs as the owners,
  keeping this stage's scope exactly the §Analytics & Cost group.
  **Option 2:** a minimal **task-status roll-up** derived from `GET /tasks?channel_id=` (already consumed by
  FS5, so no new endpoint), labelled precisely as *task pipeline status*, never as "system health".
  Neither option fabricates anything; option 2 costs scope and bytes on a screen whose budget is already the
  concern (§6.1).
- **D7 — "Content-diversity" is rendered only if the wire carries it.** No `/analytics/diversity` endpoint
  exists. `/analytics/quality` and `/analytics/trends` may or may not carry diversity keys; FS11 renders
  **exactly what arrives, unknown keys by raw name** (the FS8 `style_features` / FS9 similarity-report
  discipline) and **claims no diversity metric of its own**. If nothing arrives, the panel says so.
- **D8 — provenance (§R11.9) is request-provenance unless the wire carries more.** The contract documents no
  provenance envelope. Every panel therefore states **which endpoint answered it, which filters were applied,
  and when it was fetched** — facts the console owns — and shows an **algorithm version only if the response
  carries one**, otherwise stating plainly that the backend does not report one. **Nothing about the
  computation is invented.** For the same reason there is **no simulated live counter**: D3 §12's "Streaming:
  live counters" has no transport in the contract, so FS11 ships SWR + an explicit Refresh + a fetched-at
  whisper rather than a poll that would imply a freshness nobody promised (the FS7 "no invented progress" rule
  applied to time).
- **D9 — export is the URL plus a client-side CSV.** There is no export endpoint. D3 §12's own wording is
  *"Export/Share (URL-encoded state)"* — so **Copy link is the export**, and the CSV is a pure derivation of
  data the user already has (the FS10 `diffVersions` precedent), stating exactly which series it contains and
  **excluding gated series by construction**. No server-side report, no "download report" affordance. If the
  owner prefers, the CSV is dropped and only Copy link ships.
- **D10 — the AI affordance: read the numbers, never explain the cause.** D3 §12 asks the AI to explain
  *changes* ("cost up 18% — driven by image regens on Channel X"). That is causal attribution the served data
  cannot support, and it neighbours the anomaly claims D3 forbids. The contract-native alternative is the FS6
  pattern: **explain-metrics** — a user-invoked, isolated dry-run over the **loaded non-gated series and the
  active filters only**, unit-proven, whose instruction **explicitly forbids causal claims, anomaly verdicts
  and any engagement statement**, with Trust + Explainability + wire-only cost and no auto-run.
  **RBAC sub-decision (recommended):** gate the AI panel on **`content.edit`** — consistent with every prior AI
  affordance (FS6–FS10) and with the fact that a dry-run spends real model budget; analyst/viewer then see the
  honest "editor action" copy while still reading every panel. **Alternative:** gate it on `analytics.view`, so
  the analyst — this screen's primary user — may run it. **If the owner prefers no AI on this screen at all,**
  T-FS11.9 is dropped and the surface becomes an honest seam; the rest of the plan is unaffected.
- **D11 — NO RBAC PATCH, deliberately.** `API_SPEC`'s matrix grants *Analytics/Cost (чтение)* to all five
  roles, and `shared/config/rbac.ts` already gives every role `analytics.view`, which `routes.ts` already
  requires. FS11 therefore **edits neither file** — the first stage since FS6 with no route-permission change.
  Write-shaped affordances are gated at the call site; the backend remains the boundary, and a live 403 renders
  the permission state, never a crash (recorded in FE-RV-14).
- **D12 — *(assumed)* analytics wire shapes** (field casing; whether `?from=&to=` is honoured and what an
  out-of-data range returns; the `/analytics/quality`, `/analytics/trends` and `/analytics/reports/{period}`
  response shapes; whether those three accept range parameters at all; the `/cost` response shape per
  `group_by` value and whether `channel|model|provider` are scoped to the active channel or platform-wide;
  whether `availability` appears per field, per panel or only on engagement; whether any response carries an
  algorithm version or computed-at timestamp (§R11.9); pagination) → registered as **FE-RV-14** (§5.3) with
  single adjustment points. Fixtures are typed by the same mirrors, so a live correction is a mapper-level
  change.
- FE-RV-3…13 otherwise unchanged. Nothing unexecuted is reported as a pass.

### 5.3 FE-RV impact

**Opens FE-RV-14 — live analytics round-trip:** analytics/cost wire casing and fields · **whether
`GET /analytics/channels/{id}` honours `?from=&to=` and what it returns for a range with no data** (the single
fact that decides whether the range is server-side or a client-side window) · the shapes of
`/analytics/quality`, `/analytics/trends` and `/analytics/reports/{daily|weekly|monthly}`, and whether they
accept a range at all · the `/cost` response shape for each `group_by` value and **whether the
channel/model/provider facets are channel-scoped or platform-wide** (which decides whether the cost panel
belongs inside the channel scope or beside it) · **whether `availability` is per-field, per-panel or
engagement-only**, and whether any engagement field ever arrives `available` (i.e. whether an MTProto adapter
was introduced — ADR-001) · whether any response carries an **algorithm version / computed-at** (§R11.9) ·
pagination and result caps · whether analyst/viewer really may read every panel (D11). **Single adjustment
points:** `entities/analytics/{report-model,report-hooks,paths,keys}.ts`. FE-RV-9…13 unchanged (I6). FE-RV-6
(Chromatic) unchanged — no new story files.

## 6. Budget strategy (First Load 180 kB · size-limit 677 kB)

### 6.1 Per-route First Load (authoritative, non-revisable)

- **/analytics (new):** target **≤ 170 kB**, expectation ~150–165 (the `/studio` 164 and `/prompts` 150
  precedents) — the shell ships the filter bar, the KPI row, the Gated cards and the honesty surfaces only;
  **every chart, every panel, the export menu, the AI panel and the inspector row are lazy** (§3.1). No
  markdown, no virtualizer, no Shiki. **If the shell exceeds the target, the fix is structural** — the KPI row
  and each panel become individually lazy below the fold — never a threshold.
- **/dashboard (167) — the stage's sharpest number**, because FS11 extends the entity the dashboard imports.
  Expectation: unchanged at 167 with `model.ts`/`hooks.ts` byte-identical and the new modules tree-shaken out
  of the dashboard graph. Measured before/after; **if it moves, the manifest decides the cause and the
  structural fix is to take the FS11 projection layer out of the entity barrel** (§3.3).
- **/chat (179, the standing reference, 1.0 kB headroom, no cheap lever left):** FS11 touches no chat file
  (§3.3) and adds **zero commons rows** (T-FS11.1). Expectation: unchanged at 179. **Any movement is diagnosed
  from `app-build-manifest.json`, and a contested one is proved with a control build, before a single word is
  written about its cause** (the FS8/FS9/FS10 lesson).
- **/knowledge (175) · /studio (164) · /prompts (150) · /memory (149) · stubs (107):** must not regress.
  **The R1c watch applies to all of them**: the first chart panel is a new consumer of an already-referenced
  heavy family, so the runtime chunk is measured before and after (T-FS11.1/T-FS11.5) exactly as FS10's
  post-mortem requires.
- `pnpm budget` proves all 31 routes ≤ 180 and `.next/route-budget.json` records both numbers per route.

### 6.2 size-limit aggregate (detector 677 kB; measured 666.80 — headroom 10.20 kB)

Honest expectation: FS11 adds real weight — the FS11 entity modules (~3–4 kB), the analytics shell + filter bar
+ KPI row + gated/honesty surfaces (~6–9), four lazy panels (~6–9), the export module (~2–3), the AI panel
(~3–4 if D10 is approved), the datapoint inspector (~2), fixtures growth (~3–4), **plus whatever new visx
sub-packages (`@visx/axis`, `@visx/grid`) actually weigh in a lazy chunk — measured, not guessed**.
**The 10.20 kB headroom will most likely be exceeded again** — the seventh time in a row. Per rule №33 the plan
does **NOT** touch the threshold: implement → run `pnpm size` → if over, **STOP** and deliver a dedicated
per-chunk addendum (`FS11_REPORT_SIZE_ADDENDUM.md`, the FS6–FS10 template: growth attribution, eager/lazy
split, First-Load impact, byte-stability of pre-existing chunks, options) for the owner's ruling at acceptance.
Expect the **evidence-pack bar** (raw gate output, per-chunk tables, manifest proofs, and a control build for
any contested movement). `.size-limit.json` stays **677** throughout the stage. The only remaining structural
levers (polyfills/browserslist, icon audit, splitChunks) are FS14/FS15 items and are **not** pulled forward by
this plan.

### 6.3 Lazy-loading & commons verification checklist (executed at T-FS11.14, recorded in the report)

1. `.next/app-build-manifest.json`: **no FS11 chunk** (panels, charts, export, AI panel, inspector row) appears
   in ANY page's First Load list.
2. Cost/Quality/Trends/Report panels, ExportMenu, ExplainMetricsPanel load via `dynamic()` on mount/intent only.
3. The datapoint inspector row rides the lazy Inspector surface; no inspector code in any route First Load.
4. **The visx chart chunks are absent from every page's First Load list**, and the **webpack runtime chunk is
   compared against the T-FS11.1 baseline** (the R1c measurement, before/after the first chart) — if it grew,
   the cause is established from the manifest and fixed structurally.
5. `shortcuts-catalog.ts` still appears **only** in the cheat-sheet chunk (the FS8 lock re-run); the handler
   side carries no catalogue data and no new runtime member.
6. **`shared/config/query-keys.ts` and `shared/lib/api/endpoints.ts` gain zero rows** (grep + diff);
   `routes.ts`/`rbac.ts` show an empty diff; and `/chat`, `/dashboard`, `/knowledge`, `/studio`, `/prompts`,
   `/memory` and the stubs are byte-compared pre/post (179 / 167 / 175 / 164 / 150 / 149 / 107).
7. No analytics slice statically imported into shared commons; fixtures remain dynamic-import-only from outside
   their slice (grep locks extended); dependency-cruiser 0, incl. **no cross-entity import**.
8. Aggregate per-chunk table produced from the size run (addendum-ready if §6.2 triggers).

## 7. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | **size-limit 677 likely blocks again** (10.20 kB headroom vs a whole new screen plus chart weight) | §6.2: measure → STOP → dedicated addendum + evidence pack → owner ruling; never pre-raise; never un-split code to game the detector |
| R2 | **`/dashboard` (167) is one import away** — FS11 extends the entity the dashboard consumes | `model.ts`/`hooks.ts` byte-identical; new code in new files; §3.7 I2 byte-compare + a marker scan of the dashboard's First Load chunks; structural fix = take the FS11 layer out of the entity barrel |
| R3 | **`/chat` headroom is 1.0 kB and no cheap lever remains** | T-FS11.1 makes the commons delta **zero by construction**; §6.3.6 byte-compare; manifest forensics + a control build before any causal claim; structural fix or STOP |
| R4 | **R1c — the first real chart surface could tax every route through the webpack runtime map**, even though the family is already referenced | measured before/after at T-FS11.1/T-FS11.5, not assumed; every chart behind the single frozen lazy entrypoint; structural fix only |
| R5 | **Gated engagement may read as "the screen is broken"** to a reviewer | the Gated card is the D2 §15 canonical four-part state naming the MTProto adapter as the unlock; it is placed where the data would be, on every viewport (the FS9 lesson), and the reliable panels come **first** (D3 §12 hierarchy) |
| R6 | **FE-RV-14's biggest unknowns** — whether the range is honoured server-side, and whether the cost facets are channel-scoped | both paths are mapped behind one adjustment point; if the range is client-side, the panels window the served series and say so — no fabricated filtering |
| R7 | **The AI panel could drift toward causal or anomaly claims** | D10 forbids both by construction: `buildMetricsPrompt` is pure and unit-proven, gated metrics cannot enter it even when the wire carries a number, and the instruction names the forbidden claim classes (the FS9 explain-verification precedent) |
| R8 | **A "live counters" expectation** (D3 §12) could invite a fabricated poll | D8: no transport exists → SWR + explicit Refresh + fetched-at whisper; inventing progress/freshness is the same class of defect as an invented upload percentage (FS7) |
| R9 | **Chart a11y** — datapoints must be keyboard-focusable and status must never be colour-only (D2 §12/§17); charts are the least-tested ONYX surface (built FS3, first real data now) | axe on the panel grid and an expanded panel across 3 viewports; keyboard journey over datapoints in E2E; the tertiary-contrast rule pre-empted at write time (the five-precedent rule) |
| R10 | **Scope creep into FS12/FS13** (Health, Jobs, Logs, Billing, Admin) | §8 is explicit; D6 keeps System out by default; no drill-through into stub screens |
| R11 | **Date handling without `date-fns`** (still declared-but-not-installed) — range maths and formatting must not drift or add a dependency | `Intl` + the existing `shared/lib/format` only; ranges are ISO date strings computed by a pure, unit-tested helper; fixtures stay clock-free (the FS7 determinism rule) |
| R12 | Windows hazards (22 `next` corruptions; stale Playwright webServer) | PART4 §3.1/§3.1b habits: kill port 3000 first; **unpiped** auto-recovery build; re-verify suspicious numbers on a clean `.next` |

## 8. Not in FS11 (explicit)

No fabricated engagement value and **no zero standing in for a gated metric** (§5.2 D2) · no anomaly detection
or anomaly flag (D3) · no cost forecast or projected trend line (D4) · no recommendations, experiments or
audience-split A/B (D5) · **no system-health panel** unless the owner picks D6 option 2 · no invented
content-diversity metric (D7) · no invented algorithm version and **no simulated live counters/polling** (D8) ·
no server-side export or "download report" (D9) · **no AI-authored causal explanation, anomaly verdict or
engagement claim** (D10) · no period comparison (two ranges side by side) · no drill-through into the `/jobs`,
`/logs` or `/health` stubs · no Billing screen · no dashboard tile customisation or metric-card drill wiring ·
no prompt/knowledge/memory/studio/chat/dashboard edits at all (§3.3) · no backend change, `app/`/Protocol/SoT
change · no ONYX **token-value** change and **no ONYX component change** (any needed chart prop is a D4 §13
question for the owner first) · no new dependencies (`date-fns` stays deferred) · no threshold changes
(677/180 stand) · no new ADR · no new story files · no README/handoff updates during the stage · no
commits/pushes/tags unless instructed.

---

**STOP — FS11 plan complete. Awaiting your approval, including the §5.2 deviations D1–D12** — the range and the
cost facet are the contract's own parameters and the channel control already exists (D1) · **engagement is
gated and that is the screen's headline; a gated field is null + flag even when the wire carries a number**
(D2) · **no anomaly surface** (D3) · **no forecast** (D4) · **no recommendations/experiments; audience A/B is
impossible by design** (D5) · **the System panel: option 1 no panel + honest seam (recommended) or option 2 a
task-status roll-up from `/tasks`** — your call (D6) · content-diversity only if the wire carries it, unknown
keys by raw name (D7) · **provenance is request-provenance; an algorithm version only if the wire carries one;
no simulated live counters** (D8) · **export = the URL + a client-side CSV, no endpoint invented** (D9) ·
**the AI affordance is explain-metrics with causes, anomalies and engagement forbidden by construction — and
its RBAC gate is `content.edit` (recommended) or `analytics.view`; it may also be dropped entirely** (D10) ·
**no RBAC PATCH at all — a first since FS6** (D11) · *(assumed)* wire shapes → **FE-RV-14** (D12) — **plus the
§1/T-FS11.1 first action: the zero-commons lock AND the R1c first-consumer measurement of the webpack runtime
chunk, and the §6.2 expectation that the 677 kB detector will again need the rule-№33 measure-then-decide
procedure at acceptance.** On approval I implement §4 in order, run all ten gates for real, write
`FS11_REPORT.md`, and stop for acceptance. FS12 will not be started.
