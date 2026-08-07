# FS7 — size-limit Addendum (per-chunk analysis for the owner's ruling)

**Trigger.** `pnpm size` on the final FS7 artifact: **587.74 kB gzip vs the 560 kB detector — exceeded by
27.74 kB.** Per rule №33 the threshold was NOT touched during the stage; the plan (§6.2) predicted this
outcome at approval (9.7 kB headroom vs a whole new lazy surface) and fixed this addendum as the procedure.
The decision below is yours, at acceptance — the FS6 precedent (`FS6_REPORT_SIZE_ADDENDUM.md`) is followed
exactly.

**Measurement bases.** Gate truth = `size-limit` (glob `.next/static/chunks/*.js`, top-level only, per-file
gzip): **587.74 kB** (FS6 acceptance: 550.33). The tables below use the same independent gzip walk the FS6
addendum used (same files; walk total **574.93 kB** vs FS6's 538.4 — the constant ~2% method offset;
attribution percentages are the walk's). The glob still EXCLUDES `chunks/app/**` page chunks — the eager
knowledge page code (`/knowledge` page chunk, 8.29 kB route) is measured by the ROUTE budget, not here.

## 1. The delta

| | FS6 acceptance | FS7 final | Δ |
|---|---|---|---|
| size-limit aggregate | 550.33 kB | **587.74 kB** | **+37.41 kB** |
| walk (same files) | 538.4 kB | 574.93 kB | +36.5 kB |
| lazy share of walk | ~59% | **337.2 kB = 58.7%** | ratio unchanged |
| worst route First Load | 178 kB (/chat) | **179 kB (/chat)** | +1 kB (§3) |

## 2. Where the +37 kB lives

**2.1 New FS7 LAZY chunks — 22.7 kB (≈62% of the growth), never in any First Load:**

| walk kB | Chunk | Contents | Loads when |
|---|---|---|---|
| 6.25 | `6752` | Reader cluster (reader + versions timeline + doc intents wiring) | a document is opened |
| 5.23 | `2970` | AddSourceDialog + FileUpload (first-in-bundle since FS3) + upload transport | "Add source" intent |
| 4.21 | `3488` | DocumentInspector (lazy registry row) | first `?inspect=document:` |
| 3.51 | `1205` | AskDocumentPanel + prompt builder | "Ask about this document" intent |
| 3.75 | `9131` | **the FS5-sanctioned data-fixture chunk** — dataset grew from 2.0 kB (FS6) by the documents dataset + deterministic ingest state + body-meta extraction | fixture env only; **deliberately kept inside the measurement (the owner's FS5 ruling — strict control)** |

**2.2 FS6 anchors — byte-stable (nothing pre-existing regressed):** chat cluster `2777` **44.01 kB (FS6:
44.0)** · msw worker `8581` **27.81 (FS6: 27.8)** · shiki 51.92 · framework/polyfills/main identical sizes
· visx set identical. The FS6-accepted heavy surface did not move.

**2.3 Commons/eager re-partition — ≈14–16 kB (the remainder):** webpack re-cut the shared graph when the
26th real route landed (the same phenomenon the FS6 addendum documented): the two big eager commons now
carry 101.4 kB (vs ≈104 as one pair before) with a new 16.45 kB eager commons piece (`6582`) splitting
Query/nuqs/store/Radix reuse for three real screens, plus per-chunk webpack boilerplate on the finer cut,
plus the FS7 byte-level sanctioned additions (topbar `#` entry, ShortcutProvider prefill, registry rows,
boot-gate ≈1 kB combined). **The proof this re-partition is UX-neutral is the route table: all 31 routes
≤179 kB, stubs stayed at 106.**

## 3. First-Load impact (the authoritative budget)

None beyond the disclosed +1 kB on /chat (report §6.5): 178→179 (gate green, 180 non-revisable; zero chat
files edited — §3.3 verified; cause = the sanctioned commons additions + re-partition rounding).
`/knowledge` enters at 176. Every other route unchanged or within budget. **The entire 27.74 kB overage is
lazy weight + fixture chunk + commons re-cut — no user's first paint downloads it.**

## 4. Could it be smaller without losing function?

- Un-splitting the knowledge lazy chunks would SHRINK the aggregate (fewer webpack headers) while
  WORSENING real UX (/knowledge First Load) — the FS3-documented anti-pattern; not done.
- The fixture chunk (+1.75) is excludable in principle, but that option was **already rejected by your FS5
  ruling** (strict control) — recorded, not re-proposed.
- Dropping the topbar `#` entry / registry rows buys <1 kB against D1 §6.7 — not proposed.
- The real prizes (polyfills 38.7, browserslist target, icon audit, splitChunks tuning) remain the
  FS14/FS15 items listed in the FS6 addendum — unchanged.

## 5. Proposal (evidence-based, per rule №33 — the decision is yours)

- **Option A (recommended, precedent-consistent): re-baseline the detector to 598 kB** = measured 587.74 +
  ~10 kB working headroom — exactly the FS5 (475.37→485) and FS6 (550.33→560) pattern. The detector keeps
  catching architectural regressions (>10 kB) while the authoritative 180 kB First Load gate remains the
  UX truth.
- **Option B (strict): 590 kB** — 2.3 kB headroom; every next stage will re-open this conversation.
- **Option C: keep 560 and direct FS8 to a commons-optimization task first** — honest, but the 27.74 kB
  is predominantly the priced-in cost of a REAL third screen (lazy) + the sanctioned fixture chunk;
  un-splitting is the only quick lever and it damages real UX.

Also for your ruling (report §6.5): whether **179 kB becomes the /chat reference number**, or FS8's plan
must include a commons split to win the kilobyte back.

---

## 6. Ruling (2026-08-01) — executed

**Owner's decision: Option A.** `.size-limit.json` → **598 kB**; `pnpm size` re-run → ✅ **587.74 / 598 kB
(headroom 10.26 kB)**. All ten FS7 gates are green. Rule №33 intact — the threshold was measured first,
analysed per chunk here, and raised only by the owner's evidence-based ruling (third precedent: FS5 → 485,
FS6 → 560, FS7 → 598). The **180 kB per-route First Load budget stays authoritative and non-revisable**;
**`/chat` = 179 kB is the accepted reference number**, and FS8 must plan zero commons additions or an
explicit commons split (FS7_REPORT §10 R2). The FS14/FS15 optimization prizes (polyfills/browserslist,
icon audit, splitChunks tuning) remain open and unchanged.
