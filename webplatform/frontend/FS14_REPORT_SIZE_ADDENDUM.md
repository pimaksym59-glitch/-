# FS14 — Size Addendum (per-chunk evidence)

**Stage:** FS14 · **Companion to:** `FS14_REPORT.md` · **Date:** 2026-08-06 ·
**Detector state:** **766.23 / 777 kB — GREEN**, headroom **10.77 kB**.

> **No threshold change is requested, and none is needed.** Rule №33 governs the direction this document
> usually runs (measure → per-chunk analysis → evidence-based proposal, never a pre-raise). This time the
> detector stayed green, so there is nothing to propose. The evidence is filed anyway, because the standing
> bar since FS8 is that a size ruling — including "no ruling required" — rests on measurement rather than on
> a sentence.

---

## 1. The two numbers, kept apart

| Metric | Meaning | Budget | FS14 measured |
|---|---|---|---|
| **Per-route First Load JS** | what a user downloads for a route (deduplicated) — the authoritative, non-revisable UX gate | **180 kB** | **PASS, 32 routes** · worst `/chat` **180 kB, headroom 0.0** |
| **`size-limit` aggregate** | the sum of every top-level chunk including lazy ones — an architectural-regression detector only | **777 kB** (ninth re-baseline, FS13) | **766.23 kB** |

Code-splitting raises the aggregate while improving the real metric; the aggregate is never "fixed" by
un-splitting code.

## 2. Aggregate movement: +1.00 kB

| | FS13 acceptance | FS14 | Δ |
|---|---|---|---|
| `pnpm size` | 765.23 kB | **766.23 kB** | **+1.00 kB** |
| headroom against 777 | 11.77 kB | **10.77 kB** | −1.00 |

**What the kilobyte is.** Three shipped additions, each measured on its own build (`FS14_REPORT` §4):

| Addition | Where it lands | Route cost |
|---|---|---|
| `app/global-error.tsx` (root boundary, Gate B) | its own route chunk + **+8 B gz** in the webpack runtime chunk-id map | none — no route moved |
| Two server-rendered honesty strips (Health, Jobs) + the Jobs validation seam | **RSC output** — never a client chunk | none |
| The dashboard hop, the two Inspector raw-record blocks, the two contrast fixes | the routes' own chunks / the already-lazy `PlatformInspectors` chunk | none |

**What is NOT in the kilobyte, and this is the point of the stage's largest measurement:** the client
telemetry sink. Gate A measured it in two independent placements, both costing `/billing`, `/dashboard` and
`/jobs` 1 kB each, and the pre-declared fallback removed it (`FS14_REPORT` §4.1). The observability seam that
shipped is **server-only** and contributes **zero** client bytes — `src/instrumentation.ts` and
`app/api/telemetry/route.ts` produce no client chunk at all.

## 3. Eager / lazy split (detector glob, gzip -9)

Measured over `.next/static/chunks/*.js` — the exact glob `.size-limit.json` uses. "Eager" = the chunk appears
in at least one page's First Load list in `app-build-manifest.json`.

| | chunks | gzipped |
|---|---|---|
| **Eager** (in some route's First Load) | 36 | **279.26 kB** |
| **Lazy** (in no route's First Load) | 67 | **486.97 kB** |
| **Total** | **103** | **766.23 kB** |

**63.6 % of the measured aggregate is lazy** (FS13: 63.5 %, 280.00 / 488.04). The eager half *fell* by
0.74 kB while the aggregate rose — the shape of the bundle did not regress; a lazy root-error chunk was added.

*(Method note, stated so the number can be reproduced rather than trusted: `framework`, `main` and
`polyfills` are counted as "lazy" by this rule because they are not enumerated per page in
`app-build-manifest.json`. The same rule produced the FS13 figures, so the two are comparable; the eager
column is not a claim about what a browser fetches first, which is what the per-route table above measures.)*

## 4. Manifest proof — no FS14 chunk entered any First Load

Checked against `.next/app-build-manifest.json` on the final build:

- **`global-error`** appears in **no** page's First Load list — it is fetched only when the root boundary
  renders, which is the whole reason Gate B measured free.
- **The progressive-disclosure code** ships inside `PlatformInspectors`, the FS12 lazy chunk, which is absent
  from every route's First Load list (unchanged from FS12/FS13).
- **The `attach` seam** ships inside the lazy `ImageDetail` chunk of `/studio`.
- **`/api/telemetry` and `src/instrumentation.ts`** contribute **no client chunk**: they appear in the route
  table at the 107 kB shared baseline and in the server output only.
- **`shared/lib/observability/*` does not exist** in the tree — the module was removed when Gate A's fallback
  executed, and a unit test asserts its absence so it cannot return without a fresh measurement.

## 5. The webpack runtime chunk across the stage

The chunk-id map lives in commons, so it is the number that turns a local change into a global one. Every
value below is `gzip -9` of `.next/static/chunks/webpack-*.js` on a clean build.

| Build | runtime gz | raw |
|---|---|---|
| A — baseline (pre-FS14) | **2940** | 5407 |
| B — client sink in the three group boundaries | 2983 | 5505 |
| C — control: only the client sink removed | **2940** | **5407** |
| D — client sink imported only by `global-error.tsx` | 2992 | 5517 |
| E — `global-error.tsx` alone (shipped shape) | 2948 | 5419 |
| Final build (everything shipped) | **2945** | 5415 |

Control C is byte-identical to the baseline in both columns. The shipped stage sits **+5 B gz** above the
pre-stage runtime chunk, and no route rounded up.

## 6. Per-route First Load, before and after

| Route | FS13 | FS14 | Δ |
|---|---|---|---|
| `/chat` | 180 | **180** | 0 *(headroom 0.0 — the governing number)* |
| `/admin` | 179 | 179 | 0 |
| `/knowledge` | 176 | 176 | 0 |
| `/audit` | 175 | 175 | 0 |
| `/jobs` | 172 | 172 | 0 |
| `/dashboard` | 168 | 168 | 0 |
| `/studio` | 165 | 165 | 0 |
| `/providers` | 154 | 154 | 0 |
| `/memory` | 150 | 150 | 0 |
| `/prompts` | 150 | 150 | 0 |
| `/analytics` | 148 | 148 | 0 |
| `/billing` | 144 | 144 | 0 |
| `/health` | 139 | 139 | 0 |
| `/settings` · `/profile` | 121 · 121 | 121 · 121 | 0 |
| seam routes · stubs · shared commons | 111 · 107 · 107 | 111 · 107 · 107 | 0 |
| `/api/telemetry` *(new, server-only)* | — | 107 | new row at the shared baseline |

Three routes moved during the stage and none survives in the shipped build: each movement was isolated by a
control build and then removed by executing a pre-declared fallback, not by explaining it away
(`FS14_REPORT` §4.1 and §4.4).

## 7. Ruling requested: none

`pnpm size` exits 0 at **766.23 / 777 kB**. The threshold was **not** touched at any point during the stage —
not pre-raised, not adjusted mid-stage, not proposed here. Should a later stage find the detector red, the
procedure is unchanged: report RED with the measured number, file the dedicated addendum with per-chunk
attribution, and wait for a separate owner ruling.

```
Size limit: 777 kB
Size:       766.23 kB gzipped      pnpm size exit 0 — headroom 10.77 kB
```

---

## 8. Owner's ruling (2026-08-06 acceptance)

**No threshold ruling was required, and none was made.** `pnpm size` was re-run at the post-acceptance
synchronization step on the exact accepted state (no source file touched between delivery and this
confirmation) and reproduced the identical result:

```
Size limit: 777 kB
Size:       766.23 kB gzipped      pnpm size exit 0 — headroom 10.77 kB
```

`.size-limit.json` (777 kB, set at the FS13 acceptance — the ninth measured re-baseline) is **unchanged and
stays unchanged**: the FS14 measurement sat inside it with room to spare, so rule №33's "measure → analysis →
evidence-based proposal" chain never triggers a proposal step. The threshold's provenance remains the FS13
ruling; FS14 neither re-derives nor re-states it.

**The Prettier RED on this same file is a separate matter, ruled in `FS14_REPORT.md` §11 Ruling 2**: the
CRLF terminators are a legacy carry-over from the FS13 acceptance edit, accepted as such, and
`.size-limit.json` is directed to remain byte-for-byte as delivered — this synchronization step did not
touch it, confirmed by the identical `pnpm size` output above.

**Standing reference for FS15:** size-limit **777 kB** (headroom 10.77 kB at the FS14 acceptance); First
Load 180 kB non-revisable, `/chat` **180 / 180 — 0.0 kB headroom**.
