# FS9 — size-limit Addendum (per-chunk analysis for the owner's ruling)

**Trigger.** `pnpm size` on the final FS9 artifact: **644.32 kB gzip vs the 628 kB detector — exceeded by
16.32 kB.** Per rule №33 the threshold was NOT touched during the stage; the plan (§6.2) predicted this at
approval ("the 10.41 kB headroom will most likely be exceeded again") and fixed this addendum as the
procedure. The decision is yours, at acceptance — the FS6/FS7/FS8 precedent is followed exactly.

**Measurement bases.** Gate truth = `size-limit` (glob `.next/static/chunks/*.js`, top-level only, per-file
gzip): **644.32 kB** (FS8 acceptance: 617.59). The tables use the same independent gzip walk as the previous
addenda (70 files; walk total **630.24 kB** vs FS8's 604.10 — the constant ~2% method offset). The glob still
excludes `chunks/app/**` page chunks, so the eager `/studio` page code (14.8 kB route) is measured by the
ROUTE budget, not here.

## 1. The delta

| | FS8 acceptance | FS9 final | Δ |
|---|---|---|---|
| size-limit aggregate | 617.59 kB | **644.32 kB** | **+26.73 kB** |
| walk (same method) | 604.10 kB | 630.24 kB | +26.14 kB |
| **lazy share of walk** | 60.2% | **61.0%** (384.54 kB lazy / 245.70 eager) | **+0.8 pp — the growth is more lazy than the baseline** |
| worst route First Load | 179 kB (/chat) | **178 kB (/chat)** | **−1 kB (improved)** |
| new real route | — | **/studio 164 kB** | 12 kB under its ≤176 target |

## 2. Where the +26.73 kB lives

**2.1 New FS9 chunks — 17.80 kB (≈67% of the growth), and every one is LAZY.** Verified against
`app-build-manifest.json`: not one appears in any page's First Load list except the studio route's own eager
shell (which is route-scoped by design, plan §3.6).

| walk kB | Chunk | Contents | Loads when |
|---|---|---|---|
| 6.36 | `7842` | ImageDetail + SimilarityReport + GenerationHistory (+ the inspector's shared graph) | a record is selected |
| 4.26 | `9876` | ExplainVerificationPanel + `buildImagePrompt` | "Explain the checks" |
| 3.93 | `2918` | ReferencesPanel + UploadReferencesDialog + the multipart transport | `?panel=references` / the upload intent |
| 1.89 | `9052` | ImageInspector | first `?inspect=image:` |
| 1.36 | `3915` | references leaf (shared with the lazy overlay graph) | same |

**2.2 The sanctioned fixture chunk — ≈3 kB.** `9131` (the FS5-ruled data-fixture chunk) grew to **6.78 kB**
with IMAGES, IMAGE_HISTORY, IMAGE_SIMILARITY, LOCATIONS, the regeneration countdown and the reference-upload
handler. Local/ci only, kill-switched, lazy — and deliberately kept INSIDE the measurement by your FS5 ruling
(strict control over a smaller number). Recorded, not re-proposed.

**2.3 FS6/FS7/FS8 anchors — byte-stable.** shiki `28efd8eb` **51.92 kB** (FS8: 51.92) · chat cluster `2777`
**44.01** (44.01) · msw worker `8581` **27.81** (27.81) · `polyfills` **38.70** (38.70) · visx `3513` **11.79**
(11.79) · framework/main identical. **Nothing pre-existing regressed.**

**2.4 Commons/eager re-partition — ≈6 kB (the remainder).** The eager total moved 240.25 → **245.70 kB**
(+5.45) while the lazy total moved 363.85 → **384.54** (+20.7). The eager delta is webpack boilerplate on a
finer cut plus the eager-reachable studio shell code, which the ROUTE budget measures at 164 kB — not here.

**2.5 On the rounding movements, measured rather than narrated.** `/chat` fell 179 → **178**, `/memory` rose
148 → **149**, and the 25 stub routes rose 106 → **107** — with **zero FS9 markers** in any of those routes'
First Load chunks. A **control build**, with FS9's only byte-level addition to the memory graph removed
(`actorPaths.references` inlined into its feature instead), still reported **/memory 149 kB**, and the memory
page chunk itself SHRANK 11.8 → 8.43 kB. The cause is webpack's shared-graph re-partition plus Next's
rounding — the mechanism your FS8 evidence pack established. The planned implementation was restored after
the control.

## 3. First-Load impact (the authoritative budget)

All 31 routes ≤ 180 kB. `/studio` enters at **164**; `/chat` **improved** to 178; `/knowledge` 175 and
`/dashboard` 167 are unchanged; `/memory` 149 and the stubs 107 moved by the rounding described in §2.5.
**The entire 16.32 kB overage is lazy weight plus the sanctioned fixture chunk** — no user's first paint
downloads any of it.

## 4. Could it be smaller without losing function?

- Un-splitting the studio lazy chunks would shrink the aggregate and **worsen** `/studio` — the
  FS3-documented anti-pattern; not done.
- The fixture/msw chunks (27.81 + 6.78) remain excludable in principle but were **already ruled in** by you
  at FS5 (strict control) — recorded, not re-proposed.
- Dropping the similarity report or the attempt history would remove the only REAL verification data the
  product has; not proposed.
- The remaining prizes are unchanged and belong to FS14/FS15: `polyfills` **38.70 kB** (a modern
  `browserslist` target drops most of it), a lucide icon audit, and `splitChunks` consolidation. They are
  still the only levers that do not trade UX for a number.

## 5. Proposal (evidence-based, per rule №33 — the decision is yours)

- **Option A (recommended, precedent-consistent): re-baseline the detector to 655 kB** = measured 644.32 +
  ~10 kB working headroom — the same pattern as FS5 (→485), FS6 (→560), FS7 (→598), FS8 (→628). The detector
  keeps catching architectural regressions (a single accidentally-eager heavy import is 8–25 kB and would
  still trip it) while the authoritative 180 kB First Load gate remains the UX truth.
- **Option B (strict): 647 kB** — 2.7 kB headroom; the next stage re-opens this conversation immediately, and
  ordinary acceptance-grade fixes would renegotiate it.
- **Option C: keep 628 and schedule the FS14/FS15 polyfills/browserslist work before FS10** — honest, and the
  measurement supports that the growth is real screen weight, so this is a scope decision, not a bundling one.

**Also for your explicit word (report §3 I2 / §7):** the per-route reference numbers after this stage's
re-partition — `/chat` **178**, `/memory` **149**, stubs **107** — i.e. whether these become the standing
references, or whether FS10 must carry a structural commons task to win the kilobytes back.

---

**STOP — addendum complete. No threshold was changed; `pnpm size` remains honestly red at 628 until your
decision. FS10 is not started.** On your ruling I will set `.size-limit.json` to the chosen value, re-run
`pnpm size`, and record the decision here and in `FS9_REPORT.md` as an acceptance addendum — nothing else.

---

## 6. Ruling (2026-08-02) — executed

**Owner's decision: Option A**, taken after a dedicated evidence pack (full 31-route budget table · full
size output + the untouched detector config · this per-chunk analysis with the eager/lazy split · a
three-way proof of the `/memory` movement · a manifest check of every FS9 lazy chunk · the no-touch mtime and
import scan).

`.size-limit.json` → **655 kB**; `pnpm size` re-run → ✅ **644.32 / 655 kB (headroom 10.68 kB)**. All ten
FS9 gates are green. Rule №33 intact — measured first, analysed per chunk here, raised only by the owner's
evidence-based ruling (**fifth** precedent: FS5 → 485, FS6 → 560, FS7 → 598, FS8 → 628, FS9 → 655). The
**180 kB per-route First Load budget stays authoritative and non-revisable.**

**Confirmed at acceptance:** the eager/lazy split (245.70 eager / 384.54 lazy = **61.0% lazy**, up from
60.2%) · **all seven FS9-carrying chunks in the glob are lazy** and appear in **zero** page First Load lists,
the only FS9 code any manifest lists being the `/studio` route's own eager shell · the `/memory` 148 → 149
and stub 106 → 107 movements are **webpack shared-graph re-partition plus Next's rounding**, established by
three independent measurements (page chunk shrank 11.8 → 8.43 kB while First Load rose; a control build
without FS9's only memory-graph byte still reported 149; 0 FS9 markers across all 23 `/memory` First Load
chunks) · the no-touch set is intact by mtime and by import scan.

**Post-FS9 standing reference numbers** (FS10 must not regress them): `/chat` **178** · `/knowledge` **175**
· `/dashboard` **167** · `/studio` **164** · `/memory` **149** · stub routes **107**. The FS14/FS15
optimization prizes (polyfills/browserslist, icon audit, splitChunks) remain open and unchanged — they are
still the only remaining structural levers.
