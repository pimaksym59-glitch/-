# FS13 — size-limit addendum (rule №33)

**Gate:** `pnpm size` · **Threshold at delivery:** **756 kB, UNCHANGED** · **Measured:** **765.23 kB
gzipped** (exceeded by **9.23 kB**) · **Date:** 2026-08-05.

This document exists because the detector went red and the threshold was **not** touched. Per rule №33 and
the owner's standing instruction, FS13 stops here: measurement, per-chunk attribution, proof that the UX
budget is unaffected — and then a **separate** owner decision. **No value is proposed as settled.**

---

## 1. What the detector measures, and what it does not

`.size-limit.json` sums **`.next/static/chunks/*.js`, gzipped** — every top-level chunk, eager and lazy
alike. It is an architectural-regression detector, not the UX budget (PART2 §5.3). The authoritative UX
budget is per-route First Load JS ≤ 180 kB, and it **PASSES**: 31 routes, worst `/chat` at 180.

The two numbers move in opposite directions by design. FS13 pushes almost everything behind `dynamic()`,
which *raises* the aggregate while *keeping* every route inside its budget.

---

## 2. The growth, attributed

| | gz |
|---|---|
| FS12 acceptance | 744.70 kB |
| **FS13 measured** | **765.23 kB** |
| **Delta** | **+20.53 kB** |

**Where it went — the FS13 chunk family, measured chunk by chunk:**

| Chunk | gz | Kind |
|---|---|---|
| `465.66a502370534e943.js` — `ActivityPanel` + `explain-activity` (list, AI panel, prompt) | **10.85 kB** | **LAZY** |
| `776.fa9b8dc50a383861.js` — `SecondaryPanels` (Account · Security · Notifications · Experience · Advanced) | **5.69 kB** | **LAZY** |
| `app/(account)/settings/[[...section]]/page` | 4.34 kB | eager (its own route only) |
| `app/(account)/profile/page` | 3.06 kB | eager (its own route only) |
| **FS13 subtotal** | **23.94 kB** | |

The subtotal (23.94 kB) exceeds the net delta (+20.53 kB) by **3.41 kB**. That difference is redistribution
in the shared graph — pre-existing chunks changing size as webpack re-partitions around two new routes. It is
**not attributed chunk-by-chunk here**, and it is recorded as unattributed rather than explained with a
plausible story.

**Two observations worth the owner's attention:**

1. **68.7% of FS13's own weight is in the two lazy chunks**, and both are absent from every First Load
   (§4). What the user downloads for Settings is 121 kB, for Profile 121 kB — from a 107 kB stub baseline.
2. **The five settings panels are ONE chunk, and the activity list plus its AI panel are ONE chunk.** That was
   a deliberate structural choice, not an accident: five and two separate `dynamic()` boundaries would have
   added seven entries to the global webpack runtime chunk-id map that lives in commons, which is precisely
   what rounded two protected routes up at FS12. The two boundaries FS13 does have cost **+48 B gz** in that
   map (2894 → 2942).

---

## 3. Eager vs lazy

| | gz | share |
|---|---|---|
| Eager (reachable from some page's First Load manifest) | 280.00 kB | 36.5% |
| **Lazy (never in any First Load)** | **488.04 kB** | **63.5%** |

*(Measured across all built chunks — a wider set than the detector's glob; the ratio is what matters. FS12
measured 47.1% / 52.9% on the same basis.)*

---

## 4. Manifest proof — every FS13 chunk is where it should be

```
page-bcaf1a3b8dee6c3a.js  (settings)  -> First Load of: ['/(account)/settings/[[...section]]/page']
page-1010b7ec628ed557.js  (profile)   -> First Load of: ['/(account)/profile/page']
465.66a502370534e943.js   (activity + explain-activity) -> in any First Load?  NO
776.fa9b8dc50a383861.js   (five settings panels)        -> in any First Load?  NO
```

Neither route chunk appears in any other route's First Load, and neither lazy leaf appears in **any** route's
First Load.

---

## 5. The UX budget is intact — and that is the number that governs

```
[budget] 31 routes parsed · budget 180 kB per route
[budget] worst route: /chat/[[...id]] at 180 kB (headroom 0.0 kB)
[budget] PASS — every route is within budget.
```

`/chat` **180** · `/admin` 179 · `/knowledge` 176 · `/audit` **175** · `/providers` **154** · `/jobs` 172 ·
`/dashboard` 168 · `/studio` 165 · `/memory` **150** · `/prompts` 150 · `/analytics` 148 · `/billing` 144 ·
`/health` 139 · `/settings` **121** · `/profile` **121** · seams 111 · stubs 107 · shared commons **107**.

**`/chat` and `/memory` — the two primary protected routes — are byte-stable across all four builds of this
stage.** Two routes moved by 1 kB (`/audit` 174 → 175, `/providers` 153 → 154); the cause is isolated by
**control build C** and reported in `FS13_REPORT.md` §4, not here. In short: it is the D5-B toast-mute read
side, which FSD requires to live in commons because a provider cannot import a feature — and build D proves
the cost is inherent to consulting a preference at the emitter rather than an artefact of the module shape.

---

## 6. What was NOT done to make the number smaller

- No threshold was raised, pre-raised or discussed in the config. `.size-limit.json` is **byte-identical**.
- No code was un-split to flatter the aggregate (the FS3 anti-pattern).
- No chunk was excluded from the glob. The local/ci-only MSW worker chunk is still counted, per the owner's
  standing decision to keep strict control over a smaller number.
- The D5-B mechanism was **not** removed to buy back 2 kB. It was measured, the deviation was reported, and
  the owner ruled on it mid-stage.

**What WAS done, structurally, before this document was written** (all measured, none threshold-based): the
five settings panels consolidated into one lazy chunk and the activity family into another (seven runtime-map
entries avoided); the static honesty blocks rendered by the **RSC pages**, so they leave the client bundle
entirely; and the `⌘,` row and the two new Radix primitives each admitted only after a before/after
measurement said they were free.

---

**No decision is assumed.** The stage stops here for the owner's separate ruling on the detector, exactly as
at FS7 through FS12.

---

## 7. Owner's ruling (2026-08-05) — accepted under rule №33

**size-limit = 777 kB.** Raised only after the measurement, exactly as rule №33 requires.

```
Size limit: 777 kB
Size:       765.23 kB gzipped     pnpm size exit 0 — headroom 11.77 kB
```

**Derivation, so the number is reproducible rather than negotiated:** 765.23 measured + 11.30 kB — the exact
headroom granted at the FS12 ruling (756 − 744.70) — rounded up to the next whole kB. `.size-limit.json`
changed on one line; nothing else in the repository moved for this ruling.

This is the **ninth** measured re-baseline, and the procedure was identical every time: implement, run the
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
| FS12 | 744.70 | 756 |
| **FS13** | **765.23** | **777** |

**The 180 kB per-route First Load budget was not revisited and did not change.** It remains the
authoritative, non-revisable UX gate. `/chat` sits at **180 / 180 with 0.0 kB of headroom** — the number that
governs FS14 regardless of where this detector stands.

**The I2 deviation was accepted separately and exactly as measured** (`FS13_REPORT.md` §4 and §9). Nothing in
§5 of this document was re-worded at acceptance.
