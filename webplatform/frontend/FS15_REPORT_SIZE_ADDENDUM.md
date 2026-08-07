# FS15 — Size Addendum (per-chunk evidence)

**Stage:** FS15 · **Companion to:** `FS15_REPORT.md` · **Date:** 2026-08-07 ·
**Detector state:** **766.23 / 777 kB — GREEN**, headroom **10.77 kB**, byte-for-byte unchanged from FS14.

> **No threshold change is requested, and none is needed.** Rule №33 governs measure → per-chunk analysis →
> evidence-based proposal, never a pre-raise. FS15 shipped **zero `src/` production modules** (`FS15_REPORT.md`
> §1, §6), so there is no growth to analyze in the first place — this is the simplest case the rule covers, and
> it is filed as its own document anyway, per the same standing bar since FS8 that a size ruling — including
> "no ruling required" — rests on measurement rather than on a sentence.

---

## 1. The two numbers, kept apart

| Metric | Meaning | Budget | FS15 measured |
|---|---|---|---|
| **Per-route First Load JS** | what a user downloads for a route (deduplicated) — the authoritative, non-revisable UX gate | **180 kB** | **PASS, 32 routes** · worst `/chat` **180 kB, headroom 0.0** — unchanged from FS14 |
| **`size-limit` aggregate** | the sum of every top-level chunk including lazy ones — an architectural-regression detector only | **777 kB** (ninth re-baseline, FS13; unchanged since) | **766.23 kB** — unchanged from FS14 |

## 2. Aggregate movement: 0.00 kB

| | FS14 acceptance | FS15 | Δ |
|---|---|---|---|
| `pnpm size` | 766.23 kB | **766.23 kB** | **0.00 kB** |
| headroom against 777 | 10.77 kB | **10.77 kB** | 0 |

**Why zero, exactly:** FS15's entire deliverable set is root-level Docker Compose config, a CI workflow edit, two
standalone Node scripts under `console/scripts/` (run against build *output*, never imported by `src/`), one
new unit test, and documentation. None of the eight files listed in `FS15_REPORT.md` §6 lives under
`webplatform/console/src/`, and `size-limit`'s glob (`.next/static/chunks/*.js`, the exact detector target) only
ever reflects what `next build` compiles from `src/`. A build with no source change cannot move this number —
`pnpm size`'s repeated, identical output is the proof, not an assumption resting on the file list alone.

## 3. Eager / lazy split, per-route table, manifest proof, webpack runtime chunk

**All four unchanged from `FS14_REPORT_SIZE_ADDENDUM.md` §3–§6**, reproduced here only as pointers rather than
restated in full, since restating byte-identical tables would imply a re-measurement found something new when
it did not:

- Eager/lazy split: **279.26 kB eager / 486.97 kB lazy / 766.23 kB total**, 63.6% lazy — unchanged.
- Per-route First Load: every row in `FS14_REPORT_SIZE_ADDENDUM.md` §6 — unchanged, confirmed by a direct
  `diff` of `.next/route-budget.json` against the pre-FS15 baseline (`FS15_REPORT.md` §4.1): **empty**.
- Manifest proof: no FS15 chunk exists to check for First-Load presence, because FS15 created no chunk.
- Webpack runtime chunk: not re-measured in isolation this stage, because the per-route table diff already
  proves the stronger claim (the full derived artifact is byte-identical, which subsumes "the runtime chunk
  didn't move").

## 4. Ruling requested: none

`pnpm size` exits 0 at **766.23 / 777 kB**, identical to the number FS14 left. The threshold was not touched at
any point during FS15 — not pre-raised, not adjusted, not proposed here.

```
Size limit: 777 kB
Size:       766.23 kB gzipped      pnpm size exit 0 — headroom 10.77 kB
```

---

## 5. Owner's ruling (2026-08-07 post-acceptance synchronization)

**No threshold ruling was required, and none was made.** `pnpm size` was re-run at the post-acceptance
synchronization step on the exact accepted state (no source file touched between FS15's delivery and this
confirmation) and reproduced the identical result:

```
Size limit: 777 kB
Size:       766.23 kB gzipped      pnpm size exit 0 — headroom 10.77 kB
```

`.size-limit.json` (777 kB, set at the FS13 acceptance — the ninth measured re-baseline, reaffirmed unchanged
at FS14) **is unchanged and stays unchanged** — confirmed by `git diff` before and after this synchronization
step returning nothing for that file. Rule №33's "measure → analysis → evidence-based proposal" chain never
triggers a proposal step, because FS15 measured no growth to analyze. The threshold's provenance remains the
FS13 ruling; FS15, like FS14 before it, neither re-derives nor re-states it.

**The Prettier RED on this same file is a separate, already-settled matter** (`FS12_REPORT.md`, reaffirmed at
`FS14_REPORT.md` §11 Ruling 2 and restated at `FS15_REPORT.md` §11): the CRLF terminators are a legacy
carry-over from the FS13 acceptance edit, `.size-limit.json` is directed to remain byte-for-byte as delivered,
and this synchronization step did not touch it — confirmed by the identical `pnpm size` output above and by
`git diff` showing no change to the file.

**Standing reference, now closing the frontend implementation track:** size-limit **777 kB** (headroom
10.77 kB, unchanged since the FS14 acceptance); First Load 180 kB non-revisable, `/chat` **180 / 180 — 0.0 kB
headroom**. Both numbers are now the **terminal** reference for the implementation track (FS1–FS15, all
accepted) — any future frontend work (a new stage, a live-infrastructure fix informed by
`PRODUCTION_READINESS_RUNBOOK.md`) inherits them as a starting baseline, not as a number this document
re-opens.
