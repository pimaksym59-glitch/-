# FS12 — size-limit addendum (rule №33)

**Gate:** `pnpm size` · **Threshold at delivery:** **696 kB, UNCHANGED** · **Measured:** **744.7 kB
gzipped** (exceeded by **48.7 kB**) · **Date:** 2026-08-04 · **Ruled 2026-08-04: 756 kB** (§6).

> §§1–5 are the evidence pack exactly as filed, before any decision. §6 records the owner's ruling.

This document exists because the detector went red and the threshold was **not** touched. Per rule №33 and
the owner's approval requirement 5, FS12 stops here: measurement, per-chunk attribution, proof that the UX
budget is unaffected — and then a **separate** owner decision. No value is proposed as settled.

---

## 1. What the detector measures, and what it does not

`.size-limit.json` sums **`.next/static/chunks/*.js`, gzipped** — every top-level chunk, eager and lazy
alike. It is an architectural-regression detector, not the UX budget (PART2 §5.3). The authoritative UX
budget is per-route First Load JS ≤ 180 kB, and it **PASSES**: 31 routes, worst `/chat` at 180.

The two numbers move in opposite directions by design. FS12 adds nine routes and deliberately pushes almost
everything behind `dynamic()`; that *raises* the aggregate while *keeping* every route inside its budget.

---

## 2. The growth, attributed

| | gz |
|---|---|
| FS11 acceptance | 685.08 kB |
| **FS12 measured** | **744.70 kB** |
| **Delta** | **+59.62 kB** |

**Where it went — the `(platform)` chunk family, measured chunk by chunk:**

| Chunk | gz |
|---|---|
| `app/(platform)/audit/page` | 9.77 kB |
| `app/(platform)/jobs/page` | 9.37 kB |
| `app/(platform)/admin/page` | 8.95 kB |
| `app/(platform)/billing/page` | 5.18 kB |
| `app/(platform)/providers/page` | 4.84 kB |
| `app/(platform)/health/page` | 2.20 kB |
| `app/(platform)/{error,loading,not-found,layout}` + `billing/loading` | 7.58 kB |
| `app/(platform)/{logs,flags,notifications}/page` (the three seams) | 0.60 kB |
| **`(platform)` subtotal** | **48.51 kB** |

The remaining ~11 kB is the FS12 lazy leaf family that webpack names numerically rather than by route — the
shared `PlatformInspector` chunk (six views), the platform dialogs (`CreateUserDialog`, `RotateKeyDialog`,
`QueueIntentActions`), `RecordDiff`, `CostBreakdown`, `SessionsPanel`, `ConfigVersionsPanel` and
`ExplainJobPanel`.

**Two observations worth the owner's attention:**

1. **The three honest seams cost 0.60 kB in total.** Three of the nine routes are essentially free, because
   they are Server Components with no state, no query and no interactivity.
2. **The growth is proportional to the stage, not to waste.** FS12 is the widest stage by route count — nine
   routes against FS11's one — and the per-route average (~5.4 kB) is *below* FS11's single `/analytics`
   page chunk (11.96 kB) and FS10's `/prompts` (9.98 kB).

---

## 3. Eager vs lazy

| | gz | share |
|---|---|---|
| Eager (reachable from some page's First Load manifest) | 410.85 kB | 47.1% |
| **Lazy (never in any First Load)** | **460.86 kB** | **52.9%** |

*(Measured across all 150 built chunks, i.e. a wider set than the detector's glob; the ratio is what matters.)*

Every FS12 leaf listed in §2's second paragraph is lazy and appears in **no** page's First Load list —
verified against `app-build-manifest.json`.

---

## 4. The UX budget is intact — and that is the number that governs

```
[budget] 31 routes parsed · budget 180 kB per route
[budget] worst route: /chat/[[...id]] at 180 kB (headroom 0.0 kB)
[budget] PASS — every route is within budget.
```

`/chat` **180** · `/admin` **179** · `/knowledge` 176 · `/audit` **174** · `/jobs` **172** · `/dashboard` 168 ·
`/studio` 165 · `/providers` **153** · `/memory` **150** · `/prompts` 150 · `/analytics` 148 ·
`/billing` **144** · `/health` **139** · seams **111** · stubs 107 · shared commons **107**.

Two protected routes moved by 1 kB (`/chat` 179 → 180, `/memory` 149 → 150). Both movements are explained by
**measurement with two control builds**, not hypothesis — the full table and its reading are in
`FS12_REPORT.md` §6. In short: `/chat`'s +1 is the nine new routes growing the webpack runtime chunk-id map
(a control reverting the routes to stubs returns it to 179 and the runtime chunk to 2789 B gz);
`/memory`'s +1 survives that control and is the single lazy Inspector-registry reference (+28 B gz in
commons) tipping a route that sits on the rounding boundary.

**`/chat` now has 0.0 kB of headroom.** That is the operative constraint for FS13, independent of whatever
is decided about this detector.

---

## 5. What was NOT done to make the number smaller

- No threshold was raised, pre-raised or discussed in the config. `.size-limit.json` is byte-identical.
- No code was un-split to flatter the aggregate (the FS3 anti-pattern).
- No chunk was excluded from the glob. The local/ci-only MSW worker chunk is still counted, per the owner's
  standing decision to keep strict control over a smaller number.

**What WAS done, structurally, before this document was written** (all measured, none threshold-based): the
DataTable first-consumer decision reversed on evidence; the mutation hook moved into the lazy intents chunk;
the platform dialogs made `dynamic()`; the six Inspector views consolidated into one lazy chunk; the Jobs
honesty block moved from the client view to the RSC page. Those changes took `/jobs` from 183 → 172 kB and
`/admin` from 181 → 179 kB, and they are the reason the route budget passes at all.

---

**No decision is assumed.** The stage stops here for the owner's separate ruling on the detector, exactly as
at FS7 through FS11.

---

## 6. Owner's ruling (2026-08-04) — Option A

**size-limit = 756 kB.** Raised only after the measurement, exactly as rule №33 requires.

```
Size limit: 756 kB
Size:       744.7 kB gzipped     pnpm size exit 0 — headroom 11.30 kB
```

**Derivation, so the number is reproducible rather than negotiated:** 744.70 measured + 10.92 kB — the exact
headroom granted at the FS11 ruling — rounded up to the next whole kB. `.size-limit.json` changed on one
line; nothing else in the repository moved for this ruling.

This is the **eighth** measured re-baseline, and the procedure was identical every time: implement, run the
gate, report RED with the threshold untouched, file a per-chunk addendum, wait for a separate decision.

| Stage | Measured | Ruled |
|---|---|---|
| FS5 | 475.37 | 485 |
| FS6 | 550.33 | 560 |
| FS7 | 587.74 | 598 |
| FS8 | 617.59 | 628 |
| FS9 | 644.32 | 655 |
| FS10 | 666.80 | 677 |
| FS11 | 685.08 | 696 |
| **FS12** | **744.70** | **756** |

**The 180 kB per-route First Load budget was not revisited and did not change.** It remains the
authoritative, non-revisable UX gate. `/chat` sits at **180 / 180 with 0.0 kB of headroom** — the number that
governs FS13 regardless of where this detector stands.
