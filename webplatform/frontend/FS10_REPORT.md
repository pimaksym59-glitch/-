# FS10 — Prompt Library (Report)

**Track:** Web Platform implementation · **Plan:** `STAGE_FS10_PLAN.md` (accepted with the owner's rulings:
**D6 option 1** — a MINOR, fully backward-compatible PromptCard extension; **D8** — the contract-only
"test-this-version" path, *no AI-generated drafts, no auto-save, no refine, no compare models*; **D9** — the
`/prompts` RBAC PATCH; plus two additional binding requirements: **A** a lock-test proving no Prompt Library
query key may take a `channelId`, and **B** FS8/FS9-grade evidence that Dashboard, Knowledge, Memory, Studio
and Chat are unaffected — *no cross-scope ownership*). **Scope executed:** T-FS10.0 … T-FS10.13, nothing
beyond. **Honesty statuses:** Implemented & Verified unless explicitly marked. **The size-limit ruling request
lives in the dedicated `FS10_REPORT_SIZE_ADDENDUM.md` (rule №33 — the plan's §6.2 prediction materialized for
the sixth time).**

## 1. What FS10 delivered

`/prompts` stopped being a stub. On the frozen contract's actual prompt surface — **three calls**
(`GET /prompts?type=` · `POST /prompts` · `GET /prompts/{id}/versions`) and nothing else:

- **The versioned library (D3 §10):** an RSC initial-data page → a list of prompt **types** (the identity the
  contract carries: there is no `name` column, and `?type=` is its only filter), each row an ONYX **PromptCard**
  fed with REAL data — **its first real data in the product** — showing the true version count and the date of
  the newest version, with `j/k` navigation, a shareable `?q=` list filter and the contract's **own `?type=`
  server-side facet** kept visibly distinct from it.
- **The version detail (LAZY):** the chain read from `GET /prompts/{id}/versions`, the selected version's text
  rendered **exactly as stored**, and the row's real metadata — the author **id** (never a name: `/users` is
  owner-only), plus `model` and `result` **only when the wire carries them**.
- **A real diff (LAZY):** any two versions compared by a pure, dependency-free line diff over two texts the
  contract already serves, rendered with the D2 §13.18 semantics (success wash / danger wash) and a
  visually-hidden "Added line:" / "Removed line:" label so colour is never the only signal.
- **The contract's only write:** `POST /prompts` = a **new version** (§R10.6 "Правка = новая версия"),
  confirmed and never optimistic (§R11.4 makes this an administrative act), reporting the version the **server**
  assigned — **201 truth, never 202 "queued" wording** — with unsaved work persisted as a per-type draft through
  the FS6 `persist` primitive behind **one feature-owned module** (components never touch storage).
- **test-this-version (the owner-approved D8 surface):** a user-invoked, isolated dry-run of **only** the
  selected version's text through the **UNCHANGED** FS6 relay (§R10.9 — "тест промптов … не пишет в память и не
  публикует"), carrying TrustLabel (Generated · Source available), a card citing that version row,
  Explainability with confidence honestly absent, and wire-only cost. **No AI-authored prompt text, no
  auto-save of the output, no refine, no model comparison.**
- **Inspector `prompt`** as a LAZY registry row under the unchanged FS2 `?inspect=` contract (resolved from the
  version chain, because the contract has no `GET /prompts/{id}`); the palette `#` gained a **Prompts** group
  kept structurally separate from Knowledge, Memory **and** Images — a fourth group; prompt shortcuts
  (`/`, `n`, `d`, `⌘S`-in-composer) registered in the lazy catalogue, and **`⌘↵ run in Playground`
  deliberately not registered** (that screen does not exist yet).
- **Honest-absence surfaces:** activation/"Promote to active" (no endpoint, no `is_active` column) · deletion
  and renaming (no calls) · variables (no field, no documented templating — §R5.3 names the backend
  prompt-builder as the assembler) · per-channel prompts (no `channel_id`) · author identity · model
  comparison (the Playground's `POST /studio/compare`, a later screen).
- **RBAC PATCH:** `/prompts` opens on `content.view`; the one write and the AI panel gate on `content.edit`.
- **T-FS10.1 zero-commons mechanism (the stage's first action):** entity-local `paths.ts` + `keys.ts`;
  `shared/config/query-keys.ts` and `shared/lib/api/endpoints.ts` gained **comments only — zero rows**.

## 2. The ten gates — executed for real (final artifact, 2026-08-03)

| # | Gate | Result |
|---|---|---|
| 1 | ESLint | ✅ clean |
| 2 | Prettier | ✅ formatted |
| 3 | `tsc --noEmit` strict | ✅ 0 errors, 0 unjustified `any` |
| 4 | Vitest | ✅ **461 passed / 78 files** (366 → 461; **+95** tests, +11 files) |
| 5 | Playwright E2E | ✅ **218 passed / 0 failed / 13 skipped** (3 viewports; 179 → 218; **14 new prompt journeys**) |
| 6 | axe | ✅ 0 violations — incl. the library AND a version detail on all three viewports (**one REAL violation found and fixed** — §6.2) |
| 7 | dependency-cruiser | ✅ 0 violations (**469 modules, 1124 dependencies**) |
| 8 | `pnpm budget` (per-route First Load ≤ 180 kB) | ✅ **31 routes PASS · /prompts 150 kB · /chat 179 · /knowledge 175 · /dashboard 167 · /studio 164 · /memory 149 · stubs 107** (a REAL budget failure was found mid-stage and fixed structurally — §6.1) |
| 9 | size-limit (detector 655 kB) | ❌ **666.80 kB — exceeded by 11.80 kB.** Threshold NOT touched (rule №33); the per-chunk analysis and evidence-based proposal are in **`FS10_REPORT_SIZE_ADDENDUM.md`** — the owner rules at acceptance |
| 10 | Storybook build · contract | ✅ builds (Vite; **54 story files — unchanged**, the PromptCard story gained a state, no new file) · ✅ every endpoint used exists **verbatim** in `API_SPEC.md` §Prompts, plus the already-confirmed `/studio/dry-run` |

## 3. The §3.7 regression invariants — each verified

| # | Invariant | Verdict & evidence |
|---|---|---|
| **I1** | `/chat` First Load ≤ 178 kB | ⚠️ **Partially held — reported, not massaged. `/chat` = 179 kB (+1).** Established by three independent measurements, never by argument: **zero** FS10 markers across all **16** of `/chat`'s First Load chunks · a **control build** with FS10's only byte-level addition to that graph removed (the lazy `PromptInspector` registry row) **still reports 179** · `/chat`'s own page chunk is **13.5 kB in both** builds and the two large commons are byte-identical. Cause: webpack shared-graph re-partition + Next's rounding — the FS8/FS9-established mechanism. **Owner's ruling requested** (§7) |
| **I2** | `/knowledge` ≤ 175 · `/dashboard` ≤ 167 · `/studio` ≤ 164 · `/memory` ≤ 149 · stubs ≤ 107, all ≤ 180 | ✅ **every one exactly at its FS9 number**, and the shared commons back at **106 kB**. Held only because the §6.1 defect was fixed structurally rather than tolerated |
| **I3** | The AI relay stays VERBATIM | ✅ `app/api/ai/stream/route.ts` (mtime 2026-08-01 00:57) and `shared/lib/ai-gateway/*` untouched; a source-level test asserts no FS10 module imports the gateway, the relay route or its DTOs; test-prompt reaches the relay only through the public `useAssistantStream` hook; the FS6 verbatim-relay unit trio re-ran green |
| **I4** | ConversationRepository / conversation slice untouched | ✅ untouched (mtime 2026-08-01 01:28) + a source-level test asserts **zero** `entities/conversation` imports across all FS10 slices, and that only the draft module touches `persist` |
| **I5** | Knowledge / memory / image key shapes unchanged; no FS10 writer invalidates a foreign key | ✅ the ONE writer (`useCreatePromptVersion`) references `promptKeys` only — asserted by test that it contains no `queryKeys.*`, no `imageKeys`/`locationKeys`, no `documentPaths`/`personaPaths`/`actorPaths`/`imagePaths`. FS5–FS9 journeys re-ran green |
| **I6** | FE-RV-9…12 gain no new adjustment points | ✅ import-level test: no FS10 module imports `ai-gateway`, `entities/document`, `entities/persona`, `entities/actor`, `entities/image` or `entities/location`. FS10 opens exactly one new register entry, **FE-RV-13** |
| **I7** | FS2–FS9 suites stay green without weakening | ✅ 461/461 unit + 218/218 E2E. **One** existing spec line changed — `navigation.spec.ts`'s palette empty-state copy, which now names Prompts because the group is real (the FS8/FS9 precedent for a factually necessary update). No assertion was relaxed, re-scoped or deleted |
| **I8** | No state owned by Query and Zustand at once; nothing fabricated | ✅ six source-level locks (test-prompt writes nothing to Query · no FS10 slice imports `useUiStore` · the `prompt:<id>` assistant namespace cannot collide with a Query key · the draft module is the only storage toucher and never reads the cache · the pure renderers are stateless) + component/E2E tests proving **no Active/Draft badge, no variables count, no delete/promote control and no author name** is ever rendered; dependency-cruiser 0 with no cross-entity import |

## 4. The owner's two additional requirements — each proved

**A — the Prompt Library is CHANNEL-FREE, structurally** (`tests/unit/prompts-commons.test.ts`, 8 assertions):
no prompt key builder **accepts** a channel id (proved by function *arity*, not just by call) · no prompt path
is channel-scoped or contains `channel` at all · the fetchers take no channel argument · the whole
`entities/prompt` slice contains **no channel vocabulary** (comment-stripped grep) · and the commons registries
gained zero prompt rows. The consequence is verified end-to-end by an E2E journey: **switching the active
channel on `/prompts` leaves the rendered row set byte-identical and the URL unchanged.**

**B — no cross-scope ownership** (`tests/unit/prompts-ownership.test.ts`, 15 assertions, both directions):

| Proof | Result |
|---|---|
| No FS10 module imports any Dashboard / Chat / Knowledge / Memory / Studio slice (17 protected slices enumerated) | ✅ |
| No Dashboard / Chat / Knowledge / Memory / Studio module imports `entities/prompt`, `features/manage-prompt`, `features/test-prompt` or `widgets/prompts` | ✅ |
| No FS10 module reads the active channel, its cookie, `forChannelId` or `entities/channel` | ✅ |
| The RSC page fetches `/prompts` only — **no `/channels` round-trip** (unlike every other workspace screen) | ✅ |
| No prompt query key can participate in a channel switch (no key carries a channel dimension) | ✅ |
| The palette's Prompts group is channel-free while its three neighbours remain channel-scoped | ✅ |
| Protected surfaces byte-untouched by mtime (latest 2026-08-02 16:52, before FS10 began ~21:30) | ✅ |
| Their First Load numbers are **identical** to the pre-FS10 baseline (175 / 167 / 164 / 149 / 107) | ✅ |

## 5. PATCH decisions made during implementation

1. **The diff renders its own lines instead of the ONYX CodeBlock** — a *measured* decision, not a preference
   (§6.1). CodeBlock reaches Shiki; FS10 would have been its first product consumer, which cost every route
   ~3–4 kB of webpack runtime and broke the budget. A prompt is prose, not code, and `language="diff"` is not
   even in CodeBlock's language list. The D2 §13.18 diff semantics are preserved with the frozen status tokens.
2. **PromptCard's meta line uses `secondary`, not `tertiary`** — the fifth application of the small-text rule
   (§6.2). A usage fix; **no token value changed**.
3. **The provenance card's `source` is the row id, not a sentence** (§6.3): that slot is `ml-auto shrink-0`, so
   a long string squeezes the `truncate` title to zero width. Fixed at the call site — the ONYX component is
   untouched (the FS7/FS9 rule).
4. **`ShortcutScope` gained a type-only `'prompts'` member** (erased at build ⇒ zero commons bytes; the FS9
   `'studio'` precedent); the rows and label ship inside the lazy cheat-sheet chunk.
5. **The version reader is a plain `<pre>`**, not a highlighter and not variable-highlighted: the contract
   documents no templating, so nothing here asserts one.
6. **`⌘S` is scoped to the composer**, and the generic `detail-save`/`detail-edit` catalogue rows stay
   **inactive** — they would claim behaviour other screens do not have.
7. **The detail pane reads the chain from `GET /prompts/{id}/versions`** with the loaded list as an instant
   fallback, so if the live wire returns only the newest row per type the pane already reads the authoritative
   source (FE-RV-13).

## 6. Defects found and fixed

1. **[REAL budget/architecture defect, found by `pnpm budget`] `/chat` at 182 kB — over the non-revisable
   180.** Every route was up ~3–4 kB and the shared commons had grown 106 → 110 kB. Diagnosed from
   `app-build-manifest.json` **before any claim was written**: the First Load chunk *set* was unchanged for
   every route, and the entire growth sat in the **webpack runtime's chunk-id map** (2.56 → 6.31 kB gz). Root
   cause: `PromptDiff` imported the ONYX CodeBlock, and FS10 was its **first and only product consumer**,
   making Shiki's per-grammar chunk graph reachable app-wide. *Fix:* structural (§5.1) — never a threshold.
   *Control:* with the import removed, every protected route returned to its exact baseline and the budget
   passed. The cost had bought nothing: the requested `diff` language is not in CodeBlock's list.
2. **[REAL a11y defect, found by axe] PromptCard's meta line: 3.78:1 on dark** (12px `text.tertiary` on
   `surface.raised`), serious, WCAG 1.4.3, on the library list. The card had been data-starved since FS3, so no
   rendered axe scan had ever covered it. *Fix:* the sanctioned usage change to `secondary`; token values
   untouched. This is the **fifth** instance of the tertiary trap (FS1, FS2, FS5, FS6 pre-emptive, now FS10) —
   the D4 §12/§13 candidate "define decorative" stands.
3. **[REAL layout defect, found by E2E] The provenance card's title rendered at zero width** at 1280px: the
   card's `ml-auto shrink-0` source slot took the row, squeezing the `truncate` title out of existence — the
   citation was invisible exactly where provenance matters. *Fix:* a short `source` at the call site (§5.3).
4. **[Test-side] Four corrections, all app-correct:** the "Saved as v4" toast collides with the polite
   announcer (the recorded FS5 lesson → assert the toast exactly); the channel switcher's accessible name is
   "Switch channel" (the FS5 dashboard spec was the reference); `innerText` vs `toHaveText` normalise
   whitespace differently (→ compare the rendered row set); and one streaming test needed an explicit timeout
   under full-suite parallel load (assertions unchanged).
5. **[Existing-spec update, I7-legal]** `navigation.spec.ts`'s palette empty-state copy now names Prompts
   because the group is real. Nothing was weakened.
6. **[Toolchain] The Windows/pnpm `next` corruption struck three times** (occurrences **#20, #21, #22**), each
   auto-recovered by `pnpm install --force`. One of my own recovery chains failed to fire because the build was
   piped into `tail` — the documented habit is `pnpm build || (pnpm install --force && pnpm build)` **unpiped**,
   since a pipeline's exit status is the last command's. Recorded so it is not re-learned. No stale-webServer
   incident (the kill-port habit was applied before every build and E2E run).

## 7. Bundle & budgets (final artifact)

- **Per-route First Load (authoritative, ≤180):** all 31 routes PASS. **`/prompts` 150 kB** — 20 kB under its
  ≤170 target, because the detail pane, the diff, the composer, the AI panel and the inspector row are all
  lazy. `/knowledge` 175, `/dashboard` 167, `/studio` 164, `/memory` 149 and the stubs 107 are **exactly** at
  their FS9 numbers; `/chat` is **179** (§3 I1).
- **Lazy verification, executed:** `app-build-manifest.json` proves **no FS10 chunk appears in any page's First
  Load list** (each returns `pages: []`); the only eager FS10 code is the `/prompts` route's own page chunk
  (8.93 kB), which the ROUTE budget measures. The shortcut catalogue is still confined to the lazy overlay
  chunks. The chunk flagged by a naive marker scan (`2505`, in all three layouts) is the FS1-era **shell
  layout** chunk carrying route-registry labels — probed and confirmed to contain no FS10 code.
- **size-limit:** **666.80 / 655 kB — RED, untouched.** Growth vs FS9 = **+22.48 kB**; the lazy share rose from
  61.0% to **62.2%** and the **eager total moved just +0.70 kB** — the smallest eager delta of any FS stage so
  far. Full attribution and the evidence-based proposal: **`FS10_REPORT_SIZE_ADDENDUM.md`**.

**Two rulings are requested at acceptance:** (a) the size-limit threshold (addendum §7); (b) the **I1
deviation** — `/chat` at 179, measured to be re-partition + rounding rather than FS10 code (control build
above). The alternatives are to accept 179 as the standing reference again, or to direct a structural commons
task in FS11; no threshold was moved either way.

## 8. Honesty & owner-condition compliance

No activation state was invented — **no Active/Draft badge exists anywhere** (the ONYX card renders none when
the source has no such field) · no variables count, no variable highlighting, no "insert variable" · no delete,
rename or promote control, because no such call exists · the author is shown as the **raw id**, never a
fabricated name, and the owner-only `/users` group is never called · an unrecognised `prompt_type` renders by
its **raw value** · `model`/`result` appear only when the wire carries them · the write is **201 truth**, never
202 "queued" wording, and reports the **server-assigned** version · the diff is a derivation of two served
texts, never a backend claim · **D8 held exactly as approved**: the AI runs one isolated dry-run of one
version's text on explicit intent, its prompt is unit-proven to contain nothing else, and its output has **no
save path** · prompts are stated as **platform-wide**, and that is structural, not copy · Prompts ≠ Knowledge ≠
Memory ≠ Images (separate routes, entities, keys, cards and palette groups; no cross-entity import) · Prompts ≠
AI Chat: zero chat files touched · fixtures kill-switched and grep-locked · Aurora only on the genuine AI
moment.

## 9. FE-RV register impact

**Opens FE-RV-13 — live prompt round-trip** (owner-acceptance pending): prompt wire casing/fields · **whether
`GET /prompts` returns every version row or only the newest per type** (the single fact that decides whether
the list or the versions call owns the chain — both are already wired) · whether `?type=` accepts the eight
`prompt_type` values verbatim and how an unknown value behaves · the **`POST /prompts` accepted body**
(`{type, text}` *(assumed)*), its 201 payload and **who assigns `version`** · the `/versions` shape and
ordering · the semantics of the `model` and `result` columns · whether the backend exposes **any** notion of an
active/selected version (today it does not — if that changes, the §5.2 D2 seam becomes a real surface) ·
pagination · whether analyst/viewer may read prompts at all (D9). **Single adjustment points:**
`entities/prompt/{model,paths,keys}.ts` and the `useCreatePromptVersion` request body. FE-RV-3…12 unchanged
(I6 verified). FE-RV-6 (Chromatic) unchanged — no new story files.

## 10. Risks entering FS11

| # | Risk | Mitigation |
|---|---|---|
| R1 | **size-limit red pending the addendum ruling** | rule at acceptance; the per-route UX gate is green and binding |
| R2 | **`/chat` headroom is 1.0 kB again** (179/180) and no cheap lever remains — the Shiki lever was spent *this* stage, in the other direction | FS11 must add zero commons rows (entity-local keys remain the mechanism); diagnose every movement from the manifest and prove a contested one with a control build |
| R3 | **A first product consumer of a heavy shared module can tax every route through the webpack runtime map**, not through a route chunk — a failure mode no previous stage had seen | recorded here as the general rule: before consuming a `shared/ui` heavy module for the first time, check whether it is currently unreferenced, and measure the runtime chunk before/after |
| R4 | **FE-RV-13 assumptions**, above all whether the list returns all rows or only the newest per type | both sources are wired; the grouping selector and mapper are the single adjustment points |
| R5 | **A three-call contract may read as a thin screen** to a reviewer | every gap is a visible, explained seam; the value delivered (real version history, a real diff, the only write) is all real data |
| R6 | The PromptCard MINOR extension is now part of ONYX's public API | documented in the component, exercised by a story state and by the library tests; any future caller may pass `active={null}` / omit `variablesCount` without fabricating |
| R7 | Windows hazards (22 `next` corruptions; stale webServer) | documented habits held; the unpiped recovery form is now recorded (§6.6) |

## 11. STOP (at delivery — superseded by §12)

**FS10 is complete: 9 of 10 gates green, executed for real; the tenth (size-limit) is honestly red at
666.80/655 with the threshold untouched and the dedicated addendum filed for your ruling (rule №33).** Seven of
the eight §3.7 invariants were verified mechanically; the eighth (I1) is reported with a **control-build
measurement** of its cause rather than an explanation. The owner's two additional requirements (**A**
channel-free lock, **B** no cross-scope ownership) are proved by 23 dedicated source-level assertions plus an
E2E journey and a byte-level baseline comparison. Awaiting your acceptance — including the size decision and
the I1 ruling. README, the handoff kit, commits, tags and FS11 remain untouched until your separate word.

---

## 12. Acceptance addendum (2026-08-03) — owner's ruling executed

**FS10 ACCEPTED.** Acceptance followed the dedicated **evidence pack** filed with the stage: the full 31-route
`pnpm budget` table, the full `pnpm size` output with the detector config untouched, the addendum's per-chunk
attribution and eager/lazy split, the manifest check that every FS10 chunk is absent from every page's First
Load, the marker scan across all 16 of `/chat`'s First Load chunks, the **two control builds** (one proving the
Shiki/CodeBlock cause of the route-budget failure, one proving the `/chat` +1 kB is not FS10 code), and the
mtime + import scan for the no-touch set.

**Size-limit decision: Option A — the detector is re-baselined to 677 kB.** Executed:
`.size-limit.json` → `677 KB`; `pnpm size` re-run → ✅ **666.80 / 677 kB (headroom 10.20 kB)**.
**All ten gates are now green.** Rule №33 unchanged and followed exactly (measure → dedicated per-chunk
addendum → owner's evidence-based ruling; the threshold was never pre-raised). This is the **sixth** measured
re-baseline (FS5 → 485, FS6 → 560, FS7 → 598, FS8 → 628, FS9 → 655, **FS10 → 677**). The **180 kB per-route
First Load budget remains the authoritative, non-revisable UX gate.**

**The §3 I1 deviation is ruled resolved:** the owner accepted `/chat` **179 kB** as measured — **webpack
shared-graph re-partition plus Next's rounding, not FS10 code entering any First Load**, established by three
independent measurements (zero FS10 markers across the route's 16 First Load chunks · a control build with
FS10's only shell-commons addition removed still reporting 179 · the route's own page chunk byte-stable at
13.5 kB in both builds).

**Post-FS10 standing reference numbers** (FS11 must not regress them):

| Surface | First Load | Note |
|---|---|---|
| `/chat` | **179 kB** | the standing reference again (was 178 after the FS9 re-partition); headroom **1.0 kB** |
| `/knowledge` | **175 kB** | unchanged from FS9 |
| `/dashboard` | **167 kB** | unchanged from FS9 |
| `/studio` | **164 kB** | unchanged from FS9 |
| `/prompts` | **150 kB** | **new this stage** |
| `/memory` | **149 kB** | unchanged from FS9 |
| stub routes | **107 kB** | unchanged from FS9 |
| shared commons | **106 kB** | unchanged from FS9 |
| size-limit detector | **677 kB** (measured 666.80) | sixth measured re-baseline |

**Facts confirmed at acceptance (each machine-verified, not asserted):**

1. **Zero-commons held:** `shared/config/query-keys.ts` and `shared/lib/api/endpoints.ts` gained **comments
   only**; the `ShortcutScope` member is type-only; the eager total moved **+0.70 kB**, the smallest eager delta
   of any FS stage.
2. **Every FS10-carrying chunk is lazy** and appears in **zero** page First Load lists; the only eager FS10
   code is the `/prompts` route's own page chunk (8.93 kB), measured by the ROUTE budget at 150 kB.
3. **Requirement A verified:** no prompt key, path or fetcher can accept a `channelId` (proved by function
   arity and by a comment-stripped grep over the whole slice), and an E2E journey proves a channel switch
   leaves the rendered row set byte-identical.
4. **Requirement B verified in both directions:** no FS10 module imports any Dashboard / Chat / Knowledge /
   Memory / Studio slice, and none of those imports the prompt surface; the RSC page makes no `/channels`
   round-trip; every protected route's First Load is identical to the pre-FS10 baseline.
5. **No-touch confirmed:** every protected file's mtime predates the stage (latest 2026-08-02 16:52 vs FS10
   starting ~21:30), with zero FS10 imports across the protected slices.

**FE-RV-13 is opened and owner-accepted as Runtime Verification, not a defect.** FS11 (Analytics) awaits a
separate explicit GO.
