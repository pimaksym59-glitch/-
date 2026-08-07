# FS11 — size-limit Addendum (per-chunk analysis for the owner's ruling)

**Trigger.** `pnpm size` on the final FS11 artifact: **685.08 kB gzip vs the 677 kB detector — exceeded by
8.07 kB.** Per rule №33 — and per the owner's requirement #5 at approval — the threshold was **NOT** touched
during the stage; the plan (§6.2) predicted this at approval ("the 10.20 kB headroom will most likely be
exceeded again — the seventh time in a row") and fixed this addendum as the procedure. The decision is yours,
at acceptance — the FS6/FS7/FS8/FS9/FS10 precedent is followed exactly.

**Measurement bases.** Gate truth = `size-limit` (glob `.next/static/chunks/*.js`, top-level only, per-file
gzip): **685.08 kB** (FS10 acceptance: 666.80). The tables use the same independent gzip walk as the previous
addenda (85 files; walk total **670.08 kB** vs FS10's 652.22 — the constant ~2% method offset). The glob still
excludes `chunks/app/**` page chunks, so the eager `/analytics` page code (10.7 kB) is measured by the ROUTE
budget, not here.

## 1. The delta

| | FS10 acceptance | FS11 final | Δ |
|---|---|---|---|
| size-limit aggregate | 666.80 kB | **685.08 kB** | **+18.28 kB** |
| walk (same method) | 652.22 kB | 670.08 kB | +17.86 kB |
| **lazy share of walk** | 62.2% | **62.7%** (420.02 kB lazy / 250.06 eager) | **+0.5 pp — the growth is more lazy than the baseline** |
| eager total | 246.40 kB | **250.06 kB** | +3.66 kB |
| worst route First Load | 179 kB (/chat) | **179 kB (/chat)** | unchanged |
| new real route | — | **/analytics 148 kB** | 22 kB under its ≤170 target |

## 2. Where the +18.28 kB lives

**2.1 New FS11 chunks — 10.63 kB, and every one is LAZY.** Verified against `app-build-manifest.json`: not one
appears in **any** page's First Load list (each returns `pages: []`).

| walk kB | Chunk | Contents | Loads when |
|---|---|---|---|
| 6.05 | `3230` | ExplainMetricsPanel + `buildMetricsPrompt` + the gated/honesty copy it carries | "Explain these numbers" |
| 3.03 | `3119` | ExportMenu + `toCsv` | the export intent |
| 1.55 | `3955` | DatapointInspector | first `?inspect=datapoint:` |

**2.2 The analytics route's own eager shell — measured by the ROUTE budget, not here.** The
`app/(workspace)/analytics/page-*.js` chunk (10.7 kB) carries AnalyticsView, the filter bar, the metric row,
the gated card, the honesty seams and the four lazy panels' loaders. `pnpm budget` measures it at
**/analytics 148 kB**, 22 kB under target.

**2.3 The sanctioned fixture chunk — +0.62 kB.** `9131` (the FS5-ruled data-fixture chunk) grew 7.60 → **8.22
kB** with COST_BY_FACET, QUALITY_PANEL, TRENDS_PANEL and REPORTS — including the deliberately awkward fixtures
the honesty tests need (a gated field carrying a number, an unrecognised key, a panel with no algorithm
version). Local/ci only, kill-switched, lazy — and deliberately kept INSIDE the measurement by your FS5
ruling. Recorded, not re-proposed.

**2.4 FS6–FS10 anchors — byte-stable.** framework `56.29` · shiki `28efd8eb` **51.92** (FS10: 51.92) · React
DOM `3b442ec9` **51.81** (51.81) · Next runtime `4003` **49.62** (49.62) · chat cluster `2777` **44.01**
(44.01) · `polyfills` **38.70** (38.70) · main `31.27` (31.27) · msw worker `8581` **27.81** (27.81) · visx
`3513` **11.79** (11.79). **Nothing pre-existing regressed, and the visx family did not grow.**

**2.5 Commons/eager re-partition — the remaining ≈+3.7 kB eager.** The eager total moved 246.40 → **250.06
kB**. This is webpack re-cutting the shared graph when a 27th real route joined: two mid-size eager chunks
appear (`3818` 8.42, `441` 8.05) while the previously-single cut shrinks, and the **webpack runtime chunk grew
2.58 → 2.70 kB (+0.12)** — the R1c cost of the second visx consumer, measured before and after (report §3b).
For comparison, FS10's first-consumer failure moved that same chunk +3.75 kB.

**2.6 The chunk that looks eager but is not FS11 code.** A marker scan flags `5784` (2.82 kB, listed in the
three authenticated layouts) for the string `DatapointInspector`. Probing it shows `analyticsKeys`,
`getQueriesData`, "not reported" and "no request was made" are all **absent**, while `PromptInspector` and
`ImageInspector` are present: `5784` is the FS1-era **Inspector registry chunk**, which carries the *name* of
every lazy inspector view. FS11 added a `dynamic()` reference there, not code — exactly the FS10 `2505` case.

## 3. First-Load impact (the authoritative budget)

All 31 routes ≤ 180 kB. `/analytics` enters at **148**; `/chat` is **unchanged at 179**; `/prompts` 150 and
`/memory` 149 are exactly at their FS10 numbers. `/dashboard` 167 → **168**, `/knowledge` 175 → **176**,
`/studio` 164 → **165** and shared commons 106 → **107** — reported as an invariant deviation (report §3 I2)
and established by **two control builds**:

- **Control A** (FS11's only shell-commons addition, the lazy `DatapointInspector` registry row, removed):
  `/studio` returns to **164**; `/dashboard` and `/knowledge` do not move.
- **Control B** (the `/analytics` page reverted to a stub, **all other FS11 code still present**): **every**
  protected route returns to its exact FS10 baseline — 167 / 175 / 164 / 179 / 150 / 149 / 107 / **106**.

So the movement requires the new route's *graph* to exist and is not FS11 code entering any protected route:
zero FS11 markers across all 59 First Load chunks of the four protected routes, and the dashboard's own page
chunk **shrank** 12.8 → 10.1 kB while its First Load rose — the re-partition visible in both directions.
**The entire 8.07 kB overage is lazy weight plus the sanctioned fixture chunk** — no user's first paint
downloads any of it.

## 4. Could it be smaller without losing function?

- Un-splitting the analytics panels would shrink the aggregate and **worsen** `/analytics` — the
  FS3-documented anti-pattern; not done.
- The AI panel (6.05 kB) is the largest new chunk and is already lazy behind an explicit intent; dropping it
  would remove the approved D10 surface.
- The fixture/msw chunks (27.81 + 8.22) remain excludable in principle but were **already ruled in** by you at
  FS5 (strict control) — recorded, not re-proposed.
- Dropping the export or the datapoint Inspector would remove D3 §12 requirements the contract *can* honestly
  support; not proposed.
- The remaining prizes are unchanged and belong to FS14/FS15: `polyfills` **38.70 kB** (a modern
  `browserslist` target drops most of it), a lucide icon audit, and `splitChunks` consolidation. They are
  still the only levers that do not trade UX for a number.

## 5. Proposal (evidence-based, per rule №33 — the decision is yours)

- **Option A (recommended, precedent-consistent): re-baseline the detector to 696 kB** = measured 685.08 +
  ~11 kB working headroom — the same pattern as FS5 (→485), FS6 (→560), FS7 (→598), FS8 (→628), FS9 (→655),
  FS10 (→677). The detector keeps catching architectural regressions (a single accidentally-eager heavy import
  is 8–25 kB and would still trip it — as it did twice this stage) while the authoritative 180 kB First Load
  gate remains the UX truth.
- **Option B (strict): 687 kB** — 1.9 kB headroom; the next stage re-opens this conversation immediately, and
  ordinary acceptance-grade fixes would renegotiate it.
- **Option C: keep 677 and schedule the FS14/FS15 polyfills/browserslist work before FS12** — honest, and the
  measurement supports that the growth is real screen weight, so this is a scope decision, not a bundling one.

**Also for your explicit word (report §3 I2):** whether `/dashboard` **168**, `/knowledge` **176**, `/studio`
**165** and shared commons **107** become the standing reference numbers, or whether FS12 must carry a
structural commons task to win the kilobytes back.

---

**STOP — addendum complete. No threshold was changed; `pnpm size` remains honestly red at 677 until your
decision. FS12 is not started.** On your ruling I will set `.size-limit.json` to the chosen value, re-run
`pnpm size`, and record the decision here and in `FS11_REPORT.md` as an acceptance addendum — nothing else.

---

## 6. Ruling (2026-08-03) — executed

**Owner's decision: Option A**, taken after this dedicated evidence pack (the full 31-route budget table · the
full size output with the detector config untouched · this per-chunk analysis with the eager/lazy split · the
manifest check that every FS11 chunk is absent from every First Load · the marker scan across all 59 First
Load chunks of the four protected routes · the probe of the one chunk that looks eager but is not FS11 code ·
**two control builds** — one isolating the Inspector registry row, one reverting the route to a stub · and the
R1c before/after measurement of the webpack runtime chunk).

`.size-limit.json` → **696 kB**; `pnpm size` re-run → ✅ **685.08 / 696 kB (headroom 10.92 kB)**. All ten
FS11 gates are green. **The baseline was changed only after that separate evidence pack**, never in advance:
rule №33 intact — measured first, analysed per chunk here, raised only by the owner's evidence-based ruling
(**seventh** precedent: FS5 → 485, FS6 → 560, FS7 → 598, FS8 → 628, FS9 → 655, FS10 → 677, **FS11 → 696**).
The **180 kB per-route First Load budget stays authoritative and non-revisable.**

**Confirmed at acceptance:** the eager/lazy split (250.06 eager / 420.02 lazy = **62.7% lazy**, up from
62.2%) · **all three new FS11 chunks are lazy** and appear in zero page First Load lists · the eager delta is
+3.66 kB, of which +0.12 kB is the webpack runtime map (the measured R1c cost of the second visx consumer,
against FS10's +3.75 kB failure) · nothing pre-existing regressed (shiki, chat cluster, React DOM, Next
runtime, polyfills, msw worker and visx all byte-stable) · the sanctioned fixture chunk grew +0.62 kB and
remains inside the measurement by the FS5 ruling.

**The §3 I2 deviation is ruled resolved**, and the measured numbers become the standing references.

**Reference values carried into FS12** (FS12 must not regress them):

| Value | Post-FS11 |
|---|---|
| size-limit detector | **696 kB** (measured 685.08 · headroom 10.92) |
| `/chat` First Load | **179 kB** — unchanged; headroom **1.0 kB** |
| `/knowledge` · `/dashboard` · `/studio` | **176** · **168** · **165 kB** (each +1, re-partition, control-proved) |
| `/prompts` · `/memory` · `/analytics` (new) | **150** · **149** · **148 kB** |
| stub routes · shared commons | **107** · **107 kB** |
| per-route First Load budget | **180 kB — non-revisable** |

The FS14/FS15 optimization prizes (polyfills/browserslist, icon audit, splitChunks) remain open and unchanged
— they are still the only remaining structural levers. **New for FS12:** a slice that another screen already
imports must not gain `'use client'` modules in its barrel — FS11 measured that mistake at +2 kB on
`/dashboard` before the structural fix (a separate `entities/analytics-report` slice) removed it.
