# FS10 — size-limit Addendum (per-chunk analysis for the owner's ruling)

**Trigger.** `pnpm size` on the final FS10 artifact: **666.80 kB gzip vs the 655 kB detector — exceeded by
11.80 kB.** Per rule №33 the threshold was NOT touched during the stage; the plan (§6.2) predicted this at
approval ("the 10.68 kB headroom will most likely be exceeded again — the sixth time in a row") and fixed this
addendum as the procedure. The decision is yours, at acceptance — the FS6/FS7/FS8/FS9 precedent is followed
exactly.

**Measurement bases.** Gate truth = `size-limit` (glob `.next/static/chunks/*.js`, top-level only, per-file
gzip): **666.80 kB** (FS9 acceptance: 644.32). The tables use the same independent gzip walk as the previous
addenda (76 files; walk total **652.22 kB** vs FS9's 630.24 — the constant ~2% method offset). The glob still
excludes `chunks/app/**` page chunks, so the eager `/prompts` page code (8.93 kB) is measured by the ROUTE
budget, not here.

## 1. The delta

| | FS9 acceptance | FS10 final | Δ |
|---|---|---|---|
| size-limit aggregate | 644.32 kB | **666.80 kB** | **+22.48 kB** |
| walk (same method) | 630.24 kB | 652.22 kB | +21.98 kB |
| **lazy share of walk** | 61.0% | **62.2%** (405.82 kB lazy / 246.40 eager) | **+1.2 pp — the growth is more lazy than the baseline** |
| eager total | 245.70 kB | **246.40 kB** | **+0.70 kB** |
| worst route First Load | 178 kB (/chat) | **179 kB (/chat)** | +1 kB (§3, control-proved) |
| new real route | — | **/prompts 150 kB** | 20 kB under its ≤170 target |

## 2. Where the +22.48 kB lives

**2.1 New FS10 chunks — 23.46 kB, and every one is LAZY.** Verified against `app-build-manifest.json`: not
one appears in **any** page's First Load list (each returns `pages: []`).

| walk kB | Chunk | Contents | Loads when |
|---|---|---|---|
| 7.56 | `3913` | the lazy overlay graph — the FS8 shortcut catalogue (now +4 prompt rows and the scope label) grouped with the prompt honesty copy | `⌘/` or an overlay opens |
| 4.89 | `1449` | VersionComposer + the draft module + the Zod schema | the "New version" intent |
| 4.63 | `8313` | TestPromptPanel + `buildPromptRun` | "Run test" |
| 2.65 | `7987` | PromptDetail + the version chain + honesty surfaces | a type is selected |
| 1.99 | `6705` | PromptDiff + the pure line diff | the comparison intent |
| 1.74 | `885` | catalogue leaf (shared with the lazy overlay graph) | same as `3913` |

**2.2 The sanctioned fixture chunk — +0.82 kB.** `9131` (the FS5-ruled data-fixture chunk) grew 6.78 → **7.60
kB** with the PROMPTS rows, their version chains and the `POST /prompts` handler. Local/ci only, kill-switched,
lazy — and deliberately kept INSIDE the measurement by your FS5 ruling. Recorded, not re-proposed.

**2.3 FS6/FS7/FS8/FS9 anchors — byte-stable.** framework `56.29` · shiki `28efd8eb` **51.92** (FS9: 51.92) ·
chat cluster `2777` **44.01** (44.01) · `polyfills` **38.70** (38.70) · msw worker `8581` **27.81** (27.81) ·
visx `3513` **11.79** (11.79). **Nothing pre-existing regressed.**

**2.4 Commons/eager — +0.70 kB, the smallest eager delta of any FS stage so far.** The zero-commons mechanism
held: `shared/config/query-keys.ts` and `shared/lib/api/endpoints.ts` gained **comments only**, the
`ShortcutScope` addition is **type-only** (erased at build), and the `/prompts` RBAC change is a value swap of
identical length. The only eager-reachable FS10 code is the route's own shell inside
`app/(workspace)/prompts/[[...path]]/page-*.js` (8.93 kB), which the ROUTE budget measures at 150 kB — not
this glob.

**2.5 The one chunk that looks eager but is not FS10 code.** A marker scan flags `2505` (6.82 kB, listed in all
three authenticated layouts) for the string "Prompt Library". Probing it shows `promptKeys`, `promptPaths`,
`PromptInspector`, "Version text" and "platform-wide" are all **absent**, while "Image Studio" and "Knowledge"
are present: `2505` is the FS1-era **shell layout chunk** carrying the route-registry labels. FS10 added a
permission value there, not code.

## 3. The budget defect this stage found, fixed and re-measured (the honest headline)

The first FS10 build **failed the route budget**: `/chat` **182 kB** (over the non-revisable 180), with every
route up ~3–4 kB and the shared commons 106 → 110 kB. Diagnosed from the manifest before any claim was written:

1. The First Load **chunk set was identical** for every route (same names, same two big commons, byte-for-byte).
2. The entire growth sat in **"other shared chunks"** — i.e. the **webpack runtime**, 2.56 → 6.31 kB gz, whose
   content is the chunk-id → filename map (8 554 of its 11 723 characters; 337 mapped ids).
3. Cause: `PromptDiff` imported the ONYX **CodeBlock**, and a `grep` over `src` showed FS10 would have been its
   **first and only product consumer** — making Shiki's per-grammar chunk graph reachable from the app entry
   and inflating that map for *every* route. The cost bought nothing: `language="diff"` is not in CodeBlock's
   `LANGS`, so it would have fallen back to a plain block anyway.
4. **Structural fix, never a threshold** (plan §3.1): the diff renders its own lines with the D2 §13.18
   semantics (success wash / danger wash) plus a visually-hidden "Added line:" / "Removed line:" label, so
   colour is not the only signal.
5. **Control build:** with that single import removed, every protected route returned to its exact baseline —
   `/knowledge` 175 · `/dashboard` 167 · `/studio` 164 · `/memory` 149 · stubs 107 · commons 106 kB — and the
   budget passed. The diagnosis is established by construction, not by argument.

## 4. First-Load impact (the authoritative budget)

All 31 routes ≤ 180 kB. `/prompts` enters at **150**; `/knowledge` 175, `/dashboard` 167, `/studio` 164,
`/memory` 149 and the stubs 107 are **exactly at their FS9 numbers**; `/chat` is **179** (§5 below).
**The entire 11.80 kB overage is lazy weight plus the sanctioned fixture chunk** — no user's first paint
downloads any of it.

## 5. The `/chat` 178 → 179 movement, measured rather than narrated

The plan's invariant I1 fixed `/chat` at ≤ 178. It reports **179**. Three independent measurements:

1. **Marker scan:** all **16** of `/chat`'s First Load chunks contain **zero** FS10 markers
   (`promptKeys`, `promptPaths`, `PromptInspector`, `manage-prompt`, `test-prompt`, `weekly_digest`,
   `Prompt type`, `platform-wide`, `prompts/list`).
2. **Control build:** with FS10's only byte-level addition to the shell-commons graph removed (the lazy
   `PromptInspector` registry row and its `dynamic()` call), `/chat` **still reports 179 kB**. The planned
   implementation was restored afterwards.
3. **Chunk arithmetic:** `/chat`'s own page chunk is **13.5 kB in both** the pre-FS10 baseline and the final
   build, and the two large commons are byte-identical.

The cause is webpack's shared-graph re-partition plus Next's rounding — the mechanism your FS8 evidence pack
established and FS9 re-confirmed in the other direction. **Reported as a deviation, not re-worded** (plan
§3.7): I1 is *partially held*, and the ruling is yours.

## 6. Could it be smaller without losing function?

- Un-splitting the prompt lazy chunks would shrink the aggregate and **worsen** `/prompts` — the
  FS3-documented anti-pattern; not done.
- The Shiki lever was already taken this stage — and it went the *other* way: removing the new consumer
  **reduced** every route's First Load by ~3–4 kB versus the first build. There is no second such lever here.
- The fixture/msw chunks (27.81 + 7.60) remain excludable in principle but were **already ruled in** by you at
  FS5 (strict control) — recorded, not re-proposed.
- Dropping the diff or the version chain would remove the only real comparison the product has; not proposed.
- The remaining prizes are unchanged and belong to FS14/FS15: `polyfills` **38.70 kB** (a modern
  `browserslist` target drops most of it), a lucide icon audit, and `splitChunks` consolidation.

## 7. Proposal (evidence-based, per rule №33 — the decision is yours)

- **Option A (recommended, precedent-consistent): re-baseline the detector to 677 kB** = measured 666.80 +
  ~10 kB working headroom — the same pattern as FS5 (→485), FS6 (→560), FS7 (→598), FS8 (→628), FS9 (→655).
  The detector keeps catching architectural regressions (a single accidentally-eager heavy import is 8–25 kB
  and would still trip it) while the authoritative 180 kB First Load gate remains the UX truth.
- **Option B (strict): 669 kB** — 2.2 kB headroom; the next stage re-opens this conversation immediately, and
  ordinary acceptance-grade fixes would renegotiate it.
- **Option C: keep 655 and schedule the FS14/FS15 polyfills/browserslist work before FS11** — honest, and the
  measurement supports that the growth is real screen weight, so this is a scope decision, not a bundling one.

**Also for your explicit word (report §3 I1):** whether **`/chat` = 179 kB** becomes the standing reference
again (it was 179 from FS7 through FS8 and 178 after the FS9 re-partition), or whether FS11 must carry a
structural commons task to win the kilobyte back.

---

**STOP — addendum complete. No threshold was changed; `pnpm size` remains honestly red at 655 until your
decision. FS11 is not started.** On your ruling I will set `.size-limit.json` to the chosen value, re-run
`pnpm size`, and record the decision here and in `FS10_REPORT.md` as an acceptance addendum — nothing else.

---

## 8. Ruling (2026-08-03) — executed

**Owner's decision: Option A**, taken after a dedicated evidence pack (the full 31-route budget table · the
full size output with the detector config untouched · this per-chunk analysis with the eager/lazy split · the
manifest check that every FS10 chunk is absent from every First Load · the marker scan across all 16 `/chat`
First Load chunks · **two control builds** — one establishing the Shiki/CodeBlock cause of the route-budget
failure, one establishing that the `/chat` +1 kB is not FS10 code · the no-touch mtime and import scan).

`.size-limit.json` → **677 kB**; `pnpm size` re-run → ✅ **666.80 / 677 kB (headroom 10.20 kB)**. All ten
FS10 gates are green. **The baseline was changed only after that separate evidence pack**, never in advance:
rule №33 intact — measured first, analysed per chunk here, raised only by the owner's evidence-based ruling
(**sixth** precedent: FS5 → 485, FS6 → 560, FS7 → 598, FS8 → 628, FS9 → 655, **FS10 → 677**). The **180 kB
per-route First Load budget stays authoritative and non-revisable.**

**Confirmed at acceptance:** the eager/lazy split (246.40 eager / 405.82 lazy = **62.2% lazy**, up from
61.0%) · the **eager total moved just +0.70 kB**, the smallest eager delta of any FS stage, because the
zero-commons mechanism held (comments only in both commons registries, a type-only scope member) · **all six
FS10-carrying chunks in the glob are lazy** and appear in zero page First Load lists · the chunk a naive
marker scan flags as eager (`2505`) is the FS1-era shell layout chunk carrying route-registry labels, probed
and confirmed to contain no FS10 code · nothing pre-existing regressed (shiki, chat cluster, msw worker,
polyfills, visx all byte-stable) · the `/chat` 178 → 179 movement is **re-partition + rounding**, control-proved.

**Reference values carried into FS11** (FS11 must not regress them):

| Value | Post-FS10 |
|---|---|
| size-limit detector | **677 kB** (measured 666.80 · headroom 10.20) |
| `/chat` First Load | **179 kB** — the standing reference again; headroom **1.0 kB** |
| `/knowledge` · `/dashboard` · `/studio` | **175** · **167** · **164 kB** |
| `/prompts` (new) · `/memory` | **150** · **149 kB** |
| stub routes · shared commons | **107** · **106 kB** |
| per-route First Load budget | **180 kB — non-revisable** |

The FS14/FS15 optimization prizes (polyfills/browserslist, icon audit, splitChunks) remain open and unchanged
— they are still the only remaining structural levers. **New for FS11:** the Shiki lever was spent *this*
stage in the opposite direction — removing a first consumer of a heavy `shared/ui` module reduced every
route's First Load, so before any stage consumes such a module for the first time it must check whether the
module is currently unreferenced and measure the webpack runtime chunk before/after.
