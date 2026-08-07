# FS9 — Image Studio (Report)

**Track:** Web Platform implementation · **Plan:** `STAGE_FS9_PLAN.md` (approved with deviations D1–D8 and
the seven fixed sections §3.1–§3.7; T-FS9.1 mandated as the stage's first action). **Scope executed:**
T-FS9.0 … T-FS9.13, nothing beyond. **Honesty statuses:** Implemented & Verified unless explicitly marked.
**The size-limit ruling request lives in the dedicated `FS9_REPORT_SIZE_ADDENDUM.md` (rule №33 — the plan's
§6.2 prediction materialized for the fifth time).**

## 1. What FS9 delivered

`/studio` stopped being a stub. On the frozen contract's actual image surface (§Images, the actor reference
upload and §Locations — §5.2 D1/D2/D3):

- **The image-record workspace (D3 §9):** channel-scoped RSC initial data (`forChannelId`) → a results grid
  of ONYX **ImageResult** cards fed with REAL records — **its first real data in the product** — carrying
  **wire-derived** verification only (Verified / Needs Review from the record's own status, uniqueness from a
  stored phash), `j/k` navigation, a shareable `?q=` list filter, contract paging, and a panel rail whose
  **References** tab is the identity-inputs surface.
- **The record detail (LAZY):** prompt + negative disclosure · generation parameters (provider, seed,
  resolution, style, camera, lighting, composition, quality score, phash) · the scene with actor and location
  resolved at the widget level · the **§R6.5 attempt history** as a Timeline (every generation the backend
  recorded, with unrecognised results shown raw) · the **§R6.4 similarity report** — phash, scene metadata and
  CLIP grouped by mechanism, with **unknown report keys rendered by their raw name** — the first REAL
  verification data this console has ever shown.
- **Write intents:** `POST /images/{id}/regenerate` → **202 queued-truth** toast naming the task (jobs
  invalidated, the FS5 surface sees the work) and the record polling honestly back to a terminal status; a
  **guarded soft delete** (`DELETE /images/{id}`) behind a confirm. Both `content.edit`-gated, never optimistic.
- **The stage's entry duty — actor references (§R6.1):** `POST /actors/{id}/references` over the FS7 multipart
  seam, with the honest upload machine (in flight = *Queued*, accepted = *Verified*, **no invented
  percentage**, nothing claimed about downstream processing) and copy stating both backend truths: references
  are identity conditioning (not text, not a seed) and actors are fictional (§R6.2).
- **explain-verification (the honest replacement for D3 §9's "AI improves prompts"):** user-invoked AI over
  ONE image record + its similarity report through the **unchanged** FS6 relay; the pure `buildImagePrompt` is
  unit-proven to contain only that record and the question, and to forbid safety, identity-match and
  uniqueness claims; the answer carries TrustLabel (Generated · Source Available), a card citing the actual
  image record, Explainability with confidence honestly absent, wire-only cost, Stop preserving partial.
- **Inspector `image`** as a LAZY registry row under the unchanged FS2 `?inspect=` contract; the palette `#`
  gained an **Images** group kept structurally separate from Knowledge and Memory; studio shortcuts (`/`,
  guarded `r`) registered in the lazy catalogue — `⌘↵ generate` and `a accept` deliberately **not** registered.
- **Honest-absence surfaces:** free-form generation (no image-create endpoint), the picture itself (no media
  URL — an object-storage key is not a URL), attach-to-post / accept (no post-update call) and a safety
  verdict (no wire field) each explain that the backend owns them.
- **RBAC PATCH:** `/studio` opens on `content.view` (analyst/viewer read); every write and AI affordance is
  `content.edit`-gated at the call site.
- **T-FS9.1 zero-commons mechanism (the stage's first action):** image and location query keys live in their
  ENTITY slices; `shared/config/query-keys.ts` gained **zero rows** (a pointer comment only), lock-tested.

## 2. The ten gates — executed for real (final artifact, 2026-08-02)

| # | Gate | Result |
|---|---|---|
| 1 | ESLint | ✅ clean |
| 2 | Prettier | ✅ formatted |
| 3 | `tsc --noEmit` strict | ✅ 0 errors, 0 unjustified `any` |
| 4 | Vitest | ✅ **366 passed / 67 files** (307 → 366; +59) |
| 5 | Playwright E2E | ✅ **179 passed / 0 failed / 10 skipped** (3 viewports; 145 → 179; 12 new studio journeys) |
| 6 | axe | ✅ 0 violations — incl. the studio grid AND record detail on all three viewports (**one REAL violation found and fixed** — §6.1) |
| 7 | dependency-cruiser | ✅ 0 violations (**448 modules, 1037 dependencies**) |
| 8 | `pnpm budget` (per-route First Load ≤ 180 kB) | ✅ **31 routes PASS · /studio 164 kB · worst /chat 178 kB (headroom 2.0 kB — improved from 179)** · /knowledge 175 · /dashboard 167 · /memory 149 (§3 I2) |
| 9 | size-limit (detector 628 kB) | ❌ **644.32 kB — exceeded by 16.32 kB.** Threshold NOT touched (rule №33); the per-chunk analysis and evidence-based proposal are in **`FS9_REPORT_SIZE_ADDENDUM.md`** — the owner rules at acceptance |
| 10 | Storybook build · contract | ✅ builds (Vite, 59 s; 54 story files — unchanged) · ✅ every endpoint used exists **verbatim** in `API_SPEC.md` (§Images, `POST /actors/{id}/references`, §Locations, plus the already-confirmed `/studio/dry-run`) |

## 3. The §3.7 regression invariants — each verified

| # | Invariant | Verdict & evidence |
|---|---|---|
| **I1** | `/chat` First Load ≤ 179 kB | ✅ **178 kB — improved by 1 kB.** Verified against `app-build-manifest.json`: **zero FS9 markers in any of `/chat`'s 26 First Load chunks**; the no-touch set's mtimes all predate the stage (latest 2026-08-02 01:47 vs FS9 starting 13:27); `shared/config/query-keys.ts` gained no rows (T-FS9.1). The chat page chunk itself moved 12.1 → 13.5 kB while its First Load FELL — a shared-graph re-partition, exactly the FS8-documented mechanism |
| **I2** | `/knowledge` ≤ 175 · `/memory` ≤ 148 · `/dashboard` ≤ 167, all routes ≤ 180 | ⚠️ **Partially held — reported, not massaged.** `/knowledge` **175** ✅ · `/dashboard` **167** ✅ · all 31 routes ≤ 180 ✅ · **`/memory` 148 → 149 (+1 kB)** and the 25 stub routes **106 → 107 (+1 kB)**. **Measured cause (control experiment, not inference):** a build with FS9's ONLY byte-level addition to the memory graph removed (`actorPaths.references`, inlined into the feature instead) still reports **/memory 149 kB**; the memory page chunk itself SHRANK 11.8 → 8.43 kB, and its First Load carries **zero FS9 markers**. The movement is webpack shared-graph re-partition plus Next's rounding — the same phenomenon the owner's FS8 evidence pack established. The planned implementation was restored after the control. **Owner's ruling requested** (§7) |
| **I3** | The AI relay stays VERBATIM | ✅ `app/api/ai/stream/route.ts` (mtime 2026-08-01 00:57) and `shared/lib/ai-gateway/*` (00:56) untouched; a source-level test asserts no FS9 module imports the gateway, the relay route or its DTOs; explain-verification reaches the relay only through the public `useAssistantStream` hook; the FS6 verbatim-relay unit trio re-ran green |
| **I4** | ConversationRepository / conversation slice untouched | ✅ untouched (mtime 2026-08-01 01:28) + a source-level test asserts **zero** `entities/conversation` imports across all FS9 slices |
| **I5** | Knowledge / memory key shapes unchanged; no FS9 writer invalidates a foreign key | ✅ locked by unit tests: no FS9 mutation references `queryKeys.documents/document/personas/persona/publishedPosts/needsReview`, `documentPaths` or `personaPaths`. The ONLY memory key FS9 touches is `actor`/`actors`, invalidated by the reference upload **by design** (§3.2). FS7/FS8 journeys re-ran green |
| **I6** | FE-RV-9 and FE-RV-10 gain no new adjustment points | ✅ import-level test: no FS9 module imports `ai-gateway`, `entities/document` or `entities/persona`. FE-RV-11's **actor line is extended by exactly one transport** (`entities/actor/paths.ts` +1 path and the upload body), recorded in **FE-RV-12** as the plan foresaw |
| **I7** | FS2–FS8 suites stay green without weakening | ✅ 366/366 unit + 179/179 E2E. **One** existing spec line changed — `navigation.spec.ts`'s palette empty-state copy, which now names Images because the group is real (the FS8 precedent for a factually necessary update). No assertion was relaxed, re-scoped or deleted |
| **I8** | No state owned by Query and Zustand at once; no invented progress | ✅ five source-level locks (explain-verification writes nothing to Query · no FS9 slice writes the UI store · the `image:<id>` assistant namespace cannot collide with a Query key · the upload machine keeps phases in component state and only invalidates · `ImageMetaList`/`StudioHonesty` are stateless) + tests proving an unknown wire status starts no polling and no percentage is ever rendered; dependency-cruiser 0 with **no cross-entity import** between `image`, `location`, `actor`, `persona` and `document` |

## 4. Deliverables (files)

`shared/types/dto.ts` (image/history/similarity/location mirrors — **types erased at build, zero runtime
bytes**) · `shared/config/{routes.ts (1 datum), shortcuts.ts (type-only member), shortcuts-catalog.ts (2 rows),
query-keys.ts (comment only)}` · `entities/image/{model,hooks,paths,keys,index}.ts` + `ui/ImageMetaList.tsx` ·
`entities/location/{model,hooks,paths,keys,index}.ts` · `entities/actor/paths.ts` (+1 path) ·
`shared/lib/fixtures/{dataset,browser,meta}.ts` (+IMAGES/IMAGE_HISTORY/IMAGE_SIMILARITY/LOCATIONS, the 202
regeneration countdown, the soft delete and the multipart reference upload) ·
`app/(workspace)/studio/[[...id]]/page.tsx` (stub replaced) ·
`widgets/studio/{StudioView,ImageGrid,ImageDetail(lazy),SimilarityReport(lazy),GenerationHistory(lazy),
ReferencesPanel(lazy),StudioEmpty,StudioHonesty,index}` · `features/regenerate-image/*` ·
`features/upload-references/*` · `features/explain-verification/*` · `widgets/inspector/ImageInspector.tsx`
(+1 lazy registry row) · `widgets/command-palette/*` (Images group) · tests: 4 unit + 3 component files +
`studio.spec.ts` (12 journeys). **No new dependencies · no ONYX token change · no SoT/`app/` change ·
`.size-limit.json` untouched (628) · no new stories (54).**

## 5. PATCH decisions made during implementation

1. **Entity-local query keys** (T-FS9.1): the FS7 `documentPaths` precedent extended one layer up, so the
   stage adds **zero commons rows**. Locked by `tests/unit/studio-commons.test.ts`.
2. **`ShortcutScope` gained a type-only `'studio'` member**: a union member is erased at build, so the
   commons pay nothing; the studio rows and their label ship inside the lazy cheat-sheet chunk (the T-FS8.1
   split is preserved and still lock-tested).
3. **The grid card is NOT interactive** (§6.1): `ImageResult` owns its own prompt disclosure, so wrapping it
   in a button nested interactive controls — a real WCAG 4.1.2 violation. The card is presentational and the
   affordances live in a row beneath it (the FS7 DocumentList pattern).
4. **Deleting from the detail routes to `/studio`** rather than calling `history.back()` (§6.2).
5. **The generation honesty surface renders on every viewport** (§6.3), not only in the desktop-only detail
   pane.
6. **No virtualizer in the studio**: TanStack Virtual is a /chat-scoped chunk today and must stay there, so
   the grid uses the contract's own paging (`Load more`).
7. **`entities/actor/model.ts` was NOT touched**: the plan permitted a `referenceCount` mapping only if a live
   wire proved one exists. It does not, so the UI says nothing about how many references an actor has rather
   than rendering a zero (FE-RV-12 asks the question).

## 6. Defects found and fixed

1. **[REAL a11y defect, found by axe] `nested-interactive` on every grid card.** The card was
   `role="button"` and contained `ImageResult`'s prompt-disclosure button — "Element has focusable
   descendants", serious, WCAG 4.1.2, on all three viewports. *Fix:* the structural one (§5.3) — a
   presentational card plus explicit "Open image record …" and "Inspect image record …" buttons; `j/k` now
   roves the real buttons. axe re-ran green.
2. **[REAL UX defect, found by E2E] Deleting a deep-linked record could leave the workspace.** `onDeleted`
   called `window.history.back()`; on a pasted `/studio/<id>` URL the previous entry is another screen (or a
   hard navigation), so the user landed outside the studio and the confirmation toast was lost. *Fix:*
   `router.push('/studio')`.
3. **[REAL honesty defect, found by the mobile E2E project] The generation seam was desktop-only.** The
   explanation of why there is no "Generate" lived in the `xl`-only detail pane, so mobile and tablet users
   saw an image workspace with no generation affordance and no reason given. *Fix:* the seam also renders
   beside the grid below `xl` — every viewport gets the truth.
4. **[Test-side] Four selector/ordering corrections**, all app-correct: the grid is sorted **newest first**
   so `j` from `img_tech_3` moves to `img_tech_2` (the spec had assumed wire order); `getByText('Seed')`
   collided across the parameters and the attempt details (scoped to the `Generation parameters` region);
   `⌘K` raced hydration on a hard navigation (the recorded FS6 pitfall — retry-until-attached); the portal-
   rendered file input must be reached by label, not `container.querySelector` (the FS7 lesson).
5. **[Existing-spec update, I7-legal]** `navigation.spec.ts`'s palette empty-state copy now names Images
   because the group is real. Nothing was weakened.
6. **[Toolchain]** The Windows/pnpm `next` corruption did **not** strike this stage (occurrence count stays
   19); no stale-webServer incident — the kill-port habit was applied before every build and E2E run.

## 7. Bundle & budgets (final artifact)

- **Per-route First Load (authoritative, ≤180):** all 31 routes PASS. **`/studio` 164 kB** — 12 kB under its
  ≤176 target, because the detail pane, the similarity report, the attempt history, the references panel, the
  upload dialog, the AI panel and the inspector row are all lazy. **`/chat` improved to 178** (headroom 2.0
  kB), `/knowledge` 175, `/dashboard` 167, `/memory` 149 (§3 I2).
- **Lazy verification (§6.3 checklist), executed:** `app-build-manifest.json` proves **no FS9 chunk appears in
  any other page's First Load list** — the only two FS9-code-carrying chunks any page lists are the studio
  route's own eager shell (`5435-*` and the studio page chunk), and both are listed **only** for
  `/(workspace)/studio/[[...id]]/page`. The shared ONYX `FileUpload` chunk (two lazy owners since FS9) is
  absent from every page's First Load. The shortcut catalogue is still in the lazy cheat-sheet chunks only.
- **size-limit:** **644.32 / 628 kB — RED, untouched.** Growth vs FS8 = **+26.73 kB**; the lazy share rose
  from 60.2% to **61.0%**, i.e. the growth is more lazy than the baseline. Full attribution and the
  evidence-based proposal: **`FS9_REPORT_SIZE_ADDENDUM.md`**. Per rule №33 the decision is the owner's, at
  acceptance.

**Two rulings are requested at acceptance:** (a) the size-limit threshold (addendum §5); (b) the **I2
deviation** — `/memory` 149 and the stubs at 107, measured to be re-partition + rounding rather than FS9 code
(control experiment above). The alternatives are to accept the new numbers as the standing references, or to
direct a structural commons task in FS10; no threshold was moved either way.

## 8. Honesty & owner-condition compliance

No image-create call was invented and no free-form generation is simulated · **no preview, thumbnail,
placeholder art or data-URI stands in for a picture the contract does not serve** — including in the fixtures
(unit-proven: the dataset contains no URL, no `data:image`, no `url`/`thumbnail` field) · no safety verdict
exists anywhere (no wire field; the AI prompt explicitly forbids one) · no identity-match or uniqueness claim
beyond the reported numbers · verification chips are wire-derived; an unknown status is shown raw and starts
**no** polling · 202 = "queued" wording, never "done" · the upload shows no invented progress and claims
nothing about downstream processing · unknown similarity keys survive by raw name · generation internals
(`face_embedding`, `reference_images_folder`) never reach a ViewModel · Images ≠ Knowledge ≠ Memory is
structural (separate routes, entities, keys, cards, palette groups; no cross-entity import) · Studio ≠ AI
Chat: zero chat files touched · fixtures kill-switched and grep-locked · Aurora only on the genuine AI moment.

## 9. FE-RV register impact

**Opens FE-RV-12 — live image round-trip** (owner-acceptance pending): image wire casing/fields · **whether
any media URL or signed link exists** (the single switch that turns previews on, plus the SEC-5 `img-src` CSP
decision it implies) · the `GET /images/{id}/similarity` report shape (§R6.4) · the `/history` shape (§R6.5) ·
`POST /images/{id}/regenerate` accepted body, its 202 payload and **the response when `IMAGE_MAX_REGEN` is
exhausted** · `DELETE` semantics · **the `POST /actors/{id}/references` transport (multipart *(assumed)*), its
response, and whether actors expose a reference count** · the locations list shape · list channel
filtering/pagination · whether analyst/viewer may read images at all (D7). **Single adjustment points:**
`entities/image/{model,paths,keys}.ts`, `entities/location/{model,paths}.ts`, `entities/actor/paths.ts` and
the upload transport in `features/upload-references`. FE-RV-3…10 unchanged (I6 verified); FE-RV-11's actor
line is extended here and cross-referenced.

## 10. Risks entering FS10

| # | Risk | Mitigation |
|---|---|---|
| R1 | **size-limit red pending the addendum ruling** | rule at acceptance; the per-route UX gate is green and binding |
| R2 | **`/chat` headroom is 2.0 kB again** — but only because webpack re-cut the graph, not because bytes were removed | FS10 must still add zero commons rows; the entity-local key mechanism (T-FS9.1) is the reusable pattern; the budget gate is the backstop |
| R3 | **Rounding volatility is now a recurring cost** (`/memory` +1, stubs +1, `/chat` −1 in one stage with no code on those routes) | diagnose every movement from `app-build-manifest.json` and prove it with a control build, as this stage did — never from a plausible story |
| R4 | **FE-RV-12 assumptions**, above all whether any media URL exists | one mapper line turns previews on; the similarity report already degrades gracefully by raw key |
| R5 | **A studio with no pixels may read as incomplete** to a reviewer | the honesty surface states the reason at the exact place a preview would appear, on every viewport |
| R6 | The shared `FileUpload` module now has two lazy owners | verified absent from every First Load; if webpack ever hoists it, the fix is a `dynamic()` boundary inside the studio dialog |
| R7 | Windows hazards (19 `next` corruptions; stale webServer) | documented habits held this stage; CI (FE-RV-4) remains the authoritative environment |

## 11. STOP (at delivery)

**FS9 is complete: 9 of 10 gates green, executed for real; the tenth (size-limit) is honestly red at
644.32/628 with the threshold untouched and the dedicated addendum filed for your ruling (rule №33).** Seven
of the eight §3.7 invariants were verified mechanically; the eighth (I2) is reported with a **control-build
measurement** of its cause rather than an explanation. Awaiting your acceptance — including the size decision
and the I2 ruling. README, the handoff kit, commits, tags and FS10 remain untouched until your separate word.

---

## 12. Acceptance addendum (2026-08-02) — owner's ruling executed

**FS9 ACCEPTED.** Acceptance followed a dedicated **evidence pack** the owner requested before ruling: the
full `pnpm budget` route table (all 31 routes) · the full `pnpm size` output and the untouched detector
config · the addendum's eager/lazy split with per-category and per-chunk attribution · a three-way proof of
the `/memory` 148 → 149 movement · a manifest check that every FS9 lazy chunk is absent from every page's
First Load · and the no-touch mtime + import scan.

**Size-limit decision: Option A — the detector is re-baselined to 655 kB.** Executed:
`.size-limit.json` → `655 KB`; `pnpm size` re-run → ✅ **644.32 / 655 kB (headroom 10.68 kB)**.
**All ten gates are now green.** Rule №33 unchanged and followed exactly (measure → dedicated per-chunk
addendum → owner's evidence-based ruling; the threshold was never pre-raised). This is the **fifth** measured
re-baseline (FS5 → 485, FS6 → 560, FS7 → 598, FS8 → 628, **FS9 → 655**). The **180 kB per-route First Load
budget remains the authoritative, non-revisable UX gate.**

**The §3 I2 deviation is ruled resolved:** the owner accepted the movement as **webpack re-partition plus
Next's rounding, not FS9 code entering any First Load**. The post-FS9 standing reference numbers are
therefore **`/chat` 178 · `/knowledge` 175 · `/dashboard` 167 · `/memory` 149 · stub routes 107 · `/studio`
164**; FS10 must not regress them and is not required to win back the kilobytes rounding reclaimed.

**Facts confirmed at acceptance (each machine-verified, not asserted):**

1. **Eager/lazy confirmed:** 70 files in the detector glob · walk-gzip 630.24 kB · eager **245.70 kB
   (39.0%)** · lazy **384.54 kB (61.0%)**, up from FS8's 60.2%.
2. **Every FS9-carrying chunk in the glob is lazy** — 7 chunks, 26.23 kB, eager contribution exactly
   **0.00 kB**; each is listed in **0** page First Load lists (76 distinct chunks span all First Loads). The
   only FS9-carrying chunks any manifest lists are the `/studio` route's own eager shell
   (`page-d9f6cd07…` 9.07 kB + `5435` 2.38 kB), listed **only** for `/(workspace)/studio/[[...id]]/page`.
3. **The `/memory` movement is established as re-partition/rounding**, on three independent measurements:
   the route's own page chunk **shrank** 11.8 → 8.43 kB while its First Load rose 1 kB (and the 25 stub
   routes, which contain no FS9 byte by construction, moved 106 → 107 the same way); a **control build**
   with FS9's only byte-level addition to the memory graph removed still reported **149 kB**; and a marker
   scan of all 23 `/memory` First Load chunks returned **0 FS9 hits**.
4. **No-touch confirmed:** every protected file's mtime predates the stage (latest 2026-08-02 01:47 vs FS9
   starting 13:27), and an import scan across all 17 protected directories found **0** FS9 imports;
   `shared/config/query-keys.ts` gained **0** rows (the T-FS9.1 entity-local mechanism).
