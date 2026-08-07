# FS7 — Knowledge (Report)

**Track:** Web Platform implementation · **Plan:** `STAGE_FS7_PLAN.md` (approved with the §3.1 rendering
matrix, §3.2 invalidate graph and §3.3 FS6 no-touch guarantee fixed at approval; deviations §5.2 D1–D4
approved). **Scope executed:** T-FS7.0 … T-FS7.12, nothing beyond. **Honesty statuses:** Implemented &
Verified unless explicitly marked. **This report states what was delivered, the executed gate results, the
defects found and fixed, and the open FE-RV items. The size-limit ruling request lives in the dedicated
`FS7_REPORT_SIZE_ADDENDUM.md` (rule №33 procedure — the plan's §6.2 expectation materialized).**

## 1. What FS7 delivered

`/knowledge` stopped being a stub. On the frozen `API_SPEC.md` §Knowledge Base contract (the seven
`/documents` calls — nothing invented, §5.2 D1):

- **Document workspace (D3 §7):** channel-scoped RSC initial-data page (`forChannelId` discipline) →
  list pane (title · source · size · ingest StatusBadge; `j/k/↵` → Inspector; nuqs `?q=` + source facet —
  honest LIST filtering, never presented as retrieval) · LAZY reader (sanitized Markdown, 72ch; honest
  fallback for metadata-only wires) · version Timeline (§R9.10) · D2 §15 canonical empty state ·
  per-region loading/error states · D3 responsive (mobile single-pane).
- **add-source:** lazy dialog on FileUpload → `POST /documents` (multipart *(assumed)*) → `assign` to the
  active channel (§R2.6) — an honest per-file machine (in-flight = Queued — **no invented percentages**;
  Verified = upload accepted; ingestion truth is POLLED on the list per FE-ADR-9, stops at ready/failed) ·
  re-ingest `202 {task_id}` queued-truth toast (+ jobs invalidation — visible on the FS5 surfaces) ·
  guarded soft delete · assign-to-channel · "Upload new version" (PUT).
- **ask-document (§5.2 D2 — provenance-fed citations):** user-invoked Summarize / free question over the
  UNTOUCHED FS6 relay+stream machinery; the pure `buildDocumentPrompt` is unit-proven to contain ONLY the
  selected document + the question; the answer carries TrustLabel (Generated · Source Available), a
  **Citation resolving to the actual source document**, a KnowledgeCard **without** a retrieval score,
  Explainability (confidence honestly absent), wire-only cost; Stop preserves the partial; nothing
  auto-runs. Citation/KnowledgeCard render real data for the first time.
- **Inspector `document`** (lazy registry row — the panel sits in shell commons): overview + versions +
  edit-gated re-ingest/delete/assign; `?inspect=document:<id>` in every route group; chunk-level detail
  honestly absent.
- **Palette `#` — real for knowledge:** searches the active channel's loaded documents inside the lazy
  overlay (shared entity cache; fetch only on mode entry), deep-links the reader; honest copy kept for
  posts/logs/audit (their workspaces) and memory (FS8). Topbar search entry opens the palette pre-set to
  `#` (D1 §6.7).
- **RBAC PATCH:** `/knowledge` route permission `content.edit` → `content.view` (D3 §7 + §R10.5 «ро»);
  every write/AI affordance call-site-gated on `content.edit`; analyst/viewer read with honest copy, `n`
  inert.
- **Retrieval honesty surface:** the D3 "Retrieval Preview" region renders the truth (backend retrieves at
  generation time; no simulation) — a visible seam, not a silent absence.
- **Shortcuts:** knowledge scope `n` / `/` registered (cheat-sheet auto-reflects); `j/k/↵` reuse `lists`.

## 2. The ten gates — executed for real (final artifact, 2026-08-01)

| # | Gate | Result |
|---|---|---|
| 1 | ESLint | ✅ clean |
| 2 | Prettier | ✅ formatted |
| 3 | `tsc --noEmit` strict | ✅ 0 errors, 0 unjustified `any` |
| 4 | Vitest | ✅ **254 passed / 50 files** (215 → 254; +39) |
| 5 | Playwright E2E | ✅ **117 passed / 0 failed / 6 skipped** (3 viewports; 88 → 117; 10 new knowledge journeys; every journey signs in through the real form) |
| 6 | axe | ✅ 0 violations — incl. the real knowledge list AND reader on all three viewports (one real violation found and fixed — §6.3) |
| 7 | dependency-cruiser | ✅ 0 violations (**392 modules, 797 dependencies**) |
| 8 | `pnpm budget` (per-route First Load ≤ 180 kB) | ✅ **31 routes PASS · /knowledge 176 kB · worst /chat 179 kB (headroom 1.0 kB — §6.5)** |
| 9 | size-limit (detector 560 kB) | ❌ **587.74 kB — exceeded by 27.74 kB.** Threshold NOT touched (rule №33). The plan's §6.2 prediction materialized; the dedicated per-chunk analysis and the evidence-based proposal are in **`FS7_REPORT_SIZE_ADDENDUM.md`** — the owner rules at acceptance |
| 10 | Storybook build · contract | ✅ builds (Vite, 57 s; 54 story files — unchanged) · ✅ every endpoint used exists **verbatim** in `API_SPEC.md` §Knowledge Base + `/studio/dry-run`; nothing added or renamed |

The E2E run executed against a build byte-equivalent to the final measured artifact (identical inputs;
the closing `pnpm budget`/`pnpm size` rebuild reproduced identical route and size numbers).

## 3. Task execution (plan §2 → done)

| Task | Status |
|---|---|
| T-FS7.0 contract verification + baseline gate | ✅ (gate green before new code) |
| T-FS7.1 `entities/document` + registries | ✅ (paths entity-local — §5.3) |
| T-FS7.2 fixtures: DOCUMENTS/versions/content + stateful `/documents` group (poll-based countdown, no clocks) + PUT/DELETE workers + `meta` extraction | ✅ |
| T-FS7.3 RBAC PATCH + RSC page | ✅ |
| T-FS7.4 widgets/knowledge (§3.1 matrix honoured: shell eager, ALL heavy leaves lazy) | ✅ |
| T-FS7.5 add-source | ✅ |
| T-FS7.6 ask-document | ✅ |
| T-FS7.7 Inspector `document` (lazy row) | ✅ |
| T-FS7.8 palette `#` + topbar entry | ✅ |
| T-FS7.9 shortcuts + retrieval honesty | ✅ |
| T-FS7.10 unit + component tests (+39) | ✅ |
| T-FS7.11 E2E (10 journeys ×3 viewports + axe) | ✅ |
| T-FS7.12 gates + this report + addendum | ✅ → **STOP** |

## 4. Deliverables (files)

`entities/document/{model,hooks,paths,index}.ts` + `ui/VersionsTimeline.tsx` ·
`widgets/knowledge/{KnowledgeView,DocumentList,Reader(lazy),KnowledgeEmpty,RetrievalHonesty,markdown-embed,index}` ·
`features/add-source/{model/{useAddSource,useDocumentIntents},ui/AddSourceDialog(lazy),index}` ·
`features/ask-document/{model/buildDocumentPrompt,ui/AskDocumentPanel(lazy),index}` ·
`widgets/inspector/DocumentInspector.tsx` (+ LAZY registry row in Inspector.tsx) ·
`app/(workspace)/knowledge/[[...docId]]/page.tsx` (stub replaced) · palette `#` wiring + topbar entry +
ShortcutProvider prefill (additive) · registry rows (`routes` PATCH · `shortcuts` · `query-keys` · `dto`) ·
`shared/lib/api/{boot-gate.ts,apiFetch(+formData,+gate)}` (§6.2) · fixtures dataset/browser/meta extension ·
tests: 4 unit + 4 component files, `knowledge.spec.ts` (10 journeys), fixture-integrity lock extended to
`meta` · **No new dependencies. No ONYX token/value change. No SoT/`app/` change. `.size-limit.json`
untouched (560). Chat widgets/features/entities/gateways: ZERO edits (plan §3.3 held — verified by diff).**

## 5. PATCH decisions made during implementation

1. **`documentPaths` are entity-local** (`entities/document/paths.ts`), NOT in shared `endpoints.ts` — the
   shared module sits in every route's commons; knowledge-only bytes must not tax other routes (plan
   §6.3.6; the FS5 entity-local-path precedent). `endpoints.ts` carries a pointer comment.
2. **`apiFetch` gained an additive `formData` option** (multipart §R9.4) — the single upload-transport seam
   (FE-RV-10); JSON behaviour untouched.
3. **Upload phases map honestly to the frozen FileUpload contract:** in-flight = *Queued* (fetch exposes no
   upload-progress events — showing 0% would be false precision), accepted = *Verified* (upload truth),
   ingestion truth lives on the polled list. No ONYX component change.
4. **DocumentInspector is a LAZY registry row** — `InspectorPanel` sits in shell commons; a static import
   would tax every route's First Load (§3.1/§3.3). The FS5/FS6 views stay static (their weight is the
   FS6-accepted baseline).
5. **ShortcutProvider `openPaletteWith(value)`** — additive context field for the D1 §6.7 topbar search
   entry; provider tree/order and responsibilities unchanged.
6. **Embedded document headings are demoted (h1→h4, cap h6)** in the reader via the pure
   `demoteMarkdownHeadings` (widget-level; fenced code preserved) — found by the axe gate (§6.3); the ONYX
   Markdown contract is untouched.

## 6. Defects found and fixed (all reproduced → fixed → re-gated)

1. **[Latent FS5-era race, surfaced by FS7] First fetch vs MSW-worker activation on hard navigation.**
   *Symptom:* every knowledge E2E journey failed — `/knowledge` stuck on "Couldn't load your channels";
   dashboard journeys had never tripped it because they always reach the screen via client-side navigation
   (worker already active). *Root cause:* `FixtureBoot` started the worker in a `useEffect` (bottom-up —
   AFTER child queries fire); on a hard `goto` the shell's `['channels']` fetch could beat the worker,
   404, and stick (4xx skips retry). *Fix (fixture-env only):* `shared/lib/api/boot-gate.ts` — a
   RESOLVED-by-default transport gate awaited by `apiFetch`; `FixtureBoot` arms it SYNCHRONOUSLY on first
   client render with the worker-start promise (failure opens the gate — no dead-lock). Production path:
   one settled-promise microtask, no behaviour change. Unit-covered by the suite; proven by the E2E matrix.
2. **[Environment/process] Interrupted-build corruption + stale-server rebuild.** The laptop power-loss
   left `.next`/`next` corrupted (recovered by the documented `install --force` habit — occurrences #12,
   #13). Separately, a **Playwright `webServer` survived its run** (Windows does not kill the child), the
   next chain rebuilt `.next` under it, and `reuseExistingServer` re-attached to the stale server —
   in-memory manifest vs on-disk hashed chunks mismatched → zero hydration → 108 phantom failures (native
   form submits). *Fix:* kill port 3000 before any build/E2E; **the §3.1 safe order now explicitly covers
   Playwright's own webServer** (recorded for PART4).
3. **[Real a11y defect] `heading-order` axe violation on the reader** (all three viewports): a document
   whose body starts with `# Title` rendered a SECOND h1 inside the content (h1 → h4 "Versions" jump; also
   violating the one-h1 rule). *Fix:* §5.6 demotion; unit-tested (`markdown-embed.test.ts`); axe re-ran
   green. *Test lesson recorded:* the demoted content heading shares its accessible name with the reader
   chrome — heading selectors near embedded markdown need **role + level** (the FS2 convention; one spec
   selector fixed).
4. **[jsdom gap] multipart upload hangs in tests:** jsdom `Blob`/`File` lack `stream()/arrayBuffer()/text()`
   — undici's fetch stalls serializing FormData, and `Request.clone()` stalls reading. *Fix:* guarded
   Blob polyfills in `vitest.setup.ts` (FS5 `matchMedia` precedent); fixture meta-extraction reads the
   body DIRECTLY (documents paths never passthrough) and duck-types the parsed File (undici File ≠ jsdom
   File). Two new sharp edges recorded.
5. **[Budget movement — honest disclosure] /chat First Load 178 → 179 kB** (headroom 2.0 → 1.0 kB; the
   gate is green, 180 non-revisable). The §3.1-sanctioned byte-level commons additions (topbar `#` entry,
   ShortcutProvider prefill, additive registry rows) plus webpack commons re-partition moved Next's
   rounded number by 1 kB despite zero chat-file edits (§3.3 held) and the §5.1 structural offload of
   document paths. Remaining options (un-splitting registries, stripping the sanctioned topbar entry)
   would trade architecture for <1 kB; deferred to the owner: accept 179 as the new reference, or direct a
   deeper commons split in FS8's plan. E2E/mobile test scoping fixes (2 selectors) accompanied the D3
   single-pane truth.
6. Minor test-side fixes during T-FS7.10/11: toast+announcer double-match (`findAllByText` — FS5 lesson),
   `getByRole` substring collision with the "Open …" affordance (`^`-anchored names), Explainability
   disclosure expanded before asserting, mobile `.first()` landing on display-none list badges (scoped to
   the reader `article`).

## 7. Bundle & budgets (final artifact)

- **Per-route First Load (authoritative, ≤180):** all 31 routes PASS. `/knowledge` **176 kB** (target ≤165
  missed by 11 kB — the shell carries the list pane + entity hooks eagerly; every §3.1 lazy commitment
  held: reader/markdown, add-source, ask-panel, document inspector, palette are outside First Load —
  `.next/route-budget.json` records both numbers per route). `/chat` **179 kB** (§6.5). Dashboard 167 kB.
- **size-limit (detector):** **587.74 / 560 kB — RED, untouched.** Growth vs FS6's 550.33 = **+37.4 kB**,
  of which every First-Load-relevant number stayed within budget and ~2/3 is new LAZY knowledge surface +
  the sanctioned fixture/msw chunk growth. Full per-chunk attribution, eager/lazy split, FS6 anchors
  (chat cluster byte-stable at 44.0 kB) and the evidence-based proposal: **`FS7_REPORT_SIZE_ADDENDUM.md`**.
  Per rule №33 the decision is the owner's, at acceptance.

## 8. Honesty & owner-condition compliance

Retrieval/chunks/scores nowhere simulated (visible honest seams; KnowledgeCard `score` provably unused) ·
no invented AI fields; confidence absent; citations are user-provenance, never model claims (unit +
component + E2E locked) · AI runs only on explicit intent (no-auto-run tested) · verbatim relay and the
whole FS6 AI machinery consumed with ZERO edits (§3.3) · 202 = "queued" wording everywhere · upload shows
no invented progress · gated-data discipline untouched · fixtures kill-switched (grep lock extended to
`meta.ts`) · tone rule pre-empted (12px whispers = `secondary`) · Aurora only on genuine AI moments.

## 9. FE-RV register impact

**Opens FE-RV-10 — live knowledge round-trip** (owner-acceptance pending): document wire casing/fields ·
whether `GET /documents/{id}` carries text (honest fallback covers metadata-only) · upload transport
(multipart *(assumed)*) + 201 body · ingest status vocabulary (*(assumed)* §R4.11-like) · versions shape ·
assign semantics · reindex follow-up · list `?channel_id=` filtering. **Single adjustment points:**
`entities/document/model.ts` + `paths.ts` + the add-source transport. FE-RV-3…9 unchanged.

## 10. Risks entering FS8

| # | Risk | Mitigation |
|---|---|---|
| R1 | **size-limit red pending the addendum ruling** — regressions can hide inside the overage until a threshold binds | rule at acceptance; per-route budget (UX gate) is green and binding |
| R2 | **/chat headroom is 1.0 kB** — ANY commons movement flips the gate | FS8 must plan ZERO commons additions (or a commons split); the reference question in §6.5 is for the owner |
| R3 | FE-RV-10 assumptions | single adjustment points; the first live session closes most of FE-RV-7/8/9/10 together |
| R4 | Poll-based ingest truth on live infra may behave differently (long ingests, 429s) | polling caps at the entity hook; wire truth decides; FE-RV-10 |
| R5 | The stale-webServer hazard will strike again on this workstation | kill-port habit recorded (§6.2); CI (FE-RV-4) remains the authoritative environment |
| R6 | Knowledge honest seams awaiting backend work: retrieval preview/chunks/scores; chat citations still data-starved by design | future backend MINOR (optional), never faked meanwhile |

## 11. STOP

**FS7 is complete: 9 of 10 gates green, executed for real; the tenth (size-limit) is honestly red at
587.74/560 with the threshold untouched and the dedicated addendum filed for your ruling (rule №33).**
Awaiting your acceptance — including the size decision and the §6.5 /chat-reference question. README, the
handoff kit, commits, tags and FS8 remain untouched until your separate word.

---

## 12. Acceptance addendum (2026-08-01) — owner's ruling executed

**FS7 ACCEPTED.** The owner reviewed the evidence pack (full `pnpm budget` route table · full `pnpm size`
output · the addendum's eager/lazy split and per-chunk attribution · the machine proof that no FS7 chunk
appears in any page's First Load manifest · the two-way no-touch proof for the FS6 surface) and confirmed:
route budget verified · `/knowledge` 176 kB · `/chat` 179 kB · FS6 files unchanged · eager/lazy separation
confirmed · the aggregate growth explained per chunk.

**Size-limit decision: Option A — the detector is re-baselined to 598 kB.** Executed:
`.size-limit.json` → `598 KB`; `pnpm size` re-run → ✅ **587.74 / 598 kB (headroom 10.26 kB)**.
**All ten gates are now green.** Rule №33 is unchanged and was followed exactly (measure → dedicated
per-chunk addendum → owner's evidence-based ruling; the threshold was never pre-raised). This is the third
such re-baseline (FS5 → 485, FS6 → 560, FS7 → 598), each earned by measurement. The **180 kB per-route
First Load budget remains the authoritative, non-revisable UX gate** — untouched.

**`/chat` reference number: 179 kB** is accepted as the new reference (headroom 1.0 kB). Consequence
carried into FS8 (§10 R2): the next stage must plan **zero commons additions**, or include a commons split
as an explicit task in its plan.

### 12.1 Correction to §6.2 (honesty rule — a report statement was wrong)

§6.2 recorded the Windows/pnpm `next`-package corruption as "occurrences #12, #13" (two events). A
post-acceptance audit of every FS7 build log found **five distinct occurrences** — each one auto-recovered
by the documented `pnpm build || (pnpm install --force && pnpm build)` habit, which is precisely why they
were nearly invisible in the transcript:

| # | Build attempt | Log |
|---|---|---|
| 12 | post-power-loss rebuild | `besitu9i3` |
| 13 | budget + E2E chain (first) | `b8o06ym4b` |
| 14 | clean rebuild + budget + E2E | `bvbz5vqwf` |
| 15 | rebuild before the knowledge-spec run | `fs7-build.log` |
| 16 | final budget measurement | `fs7-budget-final.log` |

**Corrected project total: 16 occurrences** (11 across FS1–FS5 · 0 in FS6 · **5 in FS7**). The pattern is
now unambiguous: the hazard is *frequent* on this workstation and the auto-recovery habit is what keeps it
from being a delivery blocker. Recorded in PART4 §3.1. No other statement in this report changed; the
gate results in §2 stand as measured (they were produced on successfully recovered builds).
