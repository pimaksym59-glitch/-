# FS8 — size-limit Addendum (per-chunk analysis for the owner's ruling)

**Trigger.** `pnpm size` on the final FS8 artifact: **617.59 kB gzip vs the 598 kB detector — exceeded by
19.59 kB.** Per rule №33 the threshold was NOT touched during the stage; the plan (§6.2) predicted this at
approval ("the 10.26 kB headroom will most likely be exceeded again") and fixed this addendum as the
procedure. The decision is yours, at acceptance — the FS6/FS7 precedent is followed exactly.

**Measurement bases.** Gate truth = `size-limit` (glob `.next/static/chunks/*.js`, top-level only, per-file
gzip): **617.59 kB** (FS7 acceptance: 587.74). The tables use the same independent gzip walk as the FS6/FS7
addenda (walk total **604.10 kB** vs FS7's 574.93 — the constant ~2% method offset). The glob still excludes
`chunks/app/**` page chunks, so the eager `/memory` page code is measured by the ROUTE budget, not here.

## 1. The delta

| | FS7 acceptance | FS8 final | Δ |
|---|---|---|---|
| size-limit aggregate | 587.74 kB | **617.59 kB** | **+29.85 kB** |
| walk (same files) | 574.93 kB | 604.10 kB | +29.17 kB |
| **lazy share of walk** | 58.7% | **60.2%** (363.85 kB lazy / 240.25 eager) | **+1.5 pp — the growth is more lazy than the baseline** |
| worst route First Load | 179 kB (/chat) | **179 kB (/chat)** | unchanged |
| new real route | — | **/memory 148 kB** | 28 kB under its ≤176 target |

## 2. Where the +29.85 kB lives

**2.1 New FS8 chunks — 21.8 kB (73% of the growth), and every one is LAZY.** Verified against
`app-build-manifest.json`: **not one appears in any page's First Load list.**

| walk kB | Chunk | Contents | Loads when |
|---|---|---|---|
| 7.30 + 2.03 | `5274`, `2893` | EditPersonaDialog + form + PATCH/archive mutations | the `e` shortcut or the Edit button |
| 4.81 | `9426` | ExplainStylePanel + `buildPersonaPrompt` (shared with the persona inspector's lazy graph) | "Explain this persona's voice" |
| 2.57 | `5725` | PersonaInspector | first `?inspect=persona:` |
| 2.03 | `1767` | PersonaDetail + StyleFeatureList | a persona is selected |
| 1.77 | `5679` | PublishedMemoryList (content memory) | the "Published posts" group opens |
| 1.42 + 1.06 | `7624`, `4184` | ActorDetail + ActorInspector | an actor is selected / inspected |
| 4.89 + 1.60 | `3913`, `885` | **the shortcut catalogue moved OUT of commons by T-FS8.1** | the `⌘/` cheat-sheet opens |

The catalogue chunks are a *relocation*, not new weight: those bytes previously sat in the shell commons
(and therefore inside `/chat`'s First Load). Moving them raised the aggregate slightly while **lowering the
number that matters** — the offload measured `/chat` 179 → 178 and `/knowledge` 176 → 175 before any
feature code landed.

**2.2 FS6/FS7 anchors — byte-stable.** chat cluster `2777` **44.01 kB** (FS7: 44.01) · msw worker `8581`
**27.81** (27.81) · shiki `28efd8eb` **51.92** (51.92) · framework/polyfills/main and the visx set all
identical. Nothing pre-existing regressed.

**2.3 Commons/eager re-partition — ≈8 kB (the remainder).** The eager total moved 237.69 → 240.25 kB
(+2.56) while the lazy total moved 337.24 → 363.85 (+26.6). The eager delta is webpack boilerplate on a
finer cut plus the eager-reachable memory-shell code on the `/memory` route itself (measured by the ROUTE
budget at 148 kB, not here).

**On `/chat` specifically, verified against `app-build-manifest.json` at acceptance:** T-FS8.1 really did
move the route **179 → 178** before any feature code landed; **no FS8 string is present in any of `/chat`'s
16 First Load chunks** (the single `published` hit is the FS1 status vocabulary, and `/chat`'s graph does
not import `query-keys` at all); the route returned to **179 solely through webpack's shared-graph
re-partition and the resulting change in Next's rounding** (middle-layer chunks re-cut
`6214/8243/1084` → `614/938/1811`, +0.05 kB; `webpack` runtime +0.16 kB); and the **union walk-gzip
actually DECREASED**, 175.10 → 174.74 kB. No FS8 byte landed on the route (report §3 I1).

## 3. First-Load impact (the authoritative budget)

None. All 31 routes ≤ 180 kB; `/chat` unchanged at 179; `/knowledge` **improved** to 175; `/dashboard` 167;
the new `/memory` enters at **148**. **The entire 19.59 kB overage is lazy weight plus a relocation that
improved two real routes** — no user's first paint downloads any of it.

## 4. Could it be smaller without losing function?

- Un-splitting the memory lazy chunks would shrink the aggregate and **worsen** `/memory` — the
  FS3-documented anti-pattern; not done.
- Re-merging the shortcut catalogue would shrink the aggregate by ~6.5 kB and **put a kilobyte back on
  `/chat`**, undoing the stage's first deliverable; not proposed.
- The fixture/msw chunk (27.81) remains excludable in principle but was **already ruled in** by you at FS5
  (strict control) — recorded, not re-proposed.
- The real remaining prizes are unchanged and belong to FS14/FS15: `polyfills` **38.70 kB** (a modern
  `browserslist` target drops most of it), a lucide icon audit, and `splitChunks` consolidation. These are
  the only levers left that do not trade UX for a number.

## 5. Proposal (evidence-based, per rule №33 — the decision is yours)

- **Option A (recommended, precedent-consistent): re-baseline the detector to 628 kB** = measured 617.59 +
  ~10 kB working headroom — the same pattern as FS5 (→485), FS6 (→560), FS7 (→598). The detector keeps
  catching architectural regressions while the authoritative 180 kB First Load gate remains the UX truth.
- **Option B (strict): 620 kB** — 2.4 kB headroom; the next stage re-opens this conversation immediately.
- **Option C: keep 598 and schedule a commons/polyfill optimization task before FS9** — honest, and FS8
  shows the growth is real screen weight, so the only meaningful lever is the FS14/FS15 polyfills work
  pulled forward. That is a scope decision, not a bundling one.

Also worth your explicit word (report §3 I1): whether **`/chat` = 179 kB remains the standing reference**
after T-FS8.1 briefly reached 178 — i.e. whether future stages must merely *not regress* it, or must win
that kilobyte back.

---

## 6. Ruling (2026-08-02) — executed

**Owner's decision: Option A**, taken after a dedicated evidence pack (full budget table · full size
output · this per-chunk analysis · a manifest-level forensic of the `/chat` movement · a content-marker
proof of chunk laziness · mtime/import proofs for the no-touch set).

`.size-limit.json` → **628 kB**; `pnpm size` re-run → ✅ **617.59 / 628 kB (headroom 10.41 kB)**. All ten
FS8 gates are green. Rule №33 intact — measured first, analysed per chunk here, raised only by the owner's
evidence-based ruling (**fourth** precedent: FS5 → 485, FS6 → 560, FS7 → 598, FS8 → 628). The **180 kB
per-route First Load budget stays authoritative and non-revisable**, and **`/chat` = 179 kB remains the
standing reference number**: FS9 must not regress it, and is not required to win back the kilobyte that
webpack's re-partition reclaimed.

**Confirmed at acceptance:** no Memory lazy chunk appears in any First Load (0 of 11 FS8-code-carrying
chunks are listed in `app-build-manifest.json`'s page entries); the `/chat` return to 179 is **webpack
shared-graph re-partition + Next's rounding**, not FS8 code (no FS8 string in any of the route's 16 First
Load chunks; union walk-gzip fell 175.10 → 174.74 kB). The FS14/FS15 optimization prizes
(polyfills/browserslist, icon audit, splitChunks) remain open and unchanged — they are now the only
remaining levers, since the T-FS8.1 commons offload has been spent.
