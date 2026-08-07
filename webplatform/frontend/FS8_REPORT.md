# FS8 — Memory (Report)

**Track:** Web Platform implementation · **Plan:** `STAGE_FS8_PLAN.md` (approved with deviations D1–D5 and
the four owner-required sections fixed at approval: §3.4 ownership matrix · §3.5 navigation contract ·
§3.6 bundle ownership · §3.7 regression guarantees; T-FS8.1 mandated as the stage's first action).
**Scope executed:** T-FS8.0 … T-FS8.13, nothing beyond. **Honesty statuses:** Implemented & Verified unless
explicitly marked. **The size-limit ruling request lives in the dedicated `FS8_REPORT_SIZE_ADDENDUM.md`
(rule №33 — the plan's §6.2 prediction materialized again).**

## 1. What FS8 delivered

`/memory` stopped being a stub. On the frozen contract's actual memory surface (§Personas, §Actors, plus
published posts — §5.2 D1/D2):

- **Memory Explorer (D3 §8):** channel-scoped RSC initial data (`forChannelId`) → entries **grouped by
  kind** — **Persona** (the writing voice), **Actors** (the visual identity), **Published posts** (content
  memory, §R9.1) — with `j/k/↵`, a shareable `?q=` list filter, and a scope rail whose **Global** tab is an
  honest unavailable state rather than a fake list.
- **Style Memory made legible (§R9.12):** `persona.style_features` rendered as calm feature rows —
  *parameters, never stored texts* — with **unknown backend keys surfaced honestly by their raw name**
  (proven by a fixture that deliberately carries one).
- **Guarded editing:** `PATCH /personas/{id}` on the voice fields + `POST /personas/{id}/archive`, both
  confirmed (never optimistic), with the **§R4.2 optimistic lock** honoured — a stale `version` renders an
  honest "changed elsewhere" conflict instead of a silent overwrite — and the audit truth (§R10.8) stated
  as a backend fact, not a fabricated trail. `style_features` are explicitly read-only in the UI.
- **explain-style (the honest replacement for D3 §8's "explain influence"):** user-invoked AI over ONE
  persona record through the **unchanged** FS6 relay; the pure `buildPersonaPrompt` is unit-proven to
  contain only that persona and the question; the answer carries TrustLabel (Generated · Source Available),
  a **MemoryCard citing the actual persona record** (its first real data), Explainability with confidence
  honestly absent, wire-only cost, Stop preserving partial output. **No influence claims anywhere.**
- **Inspector `persona` / `actor`** as LAZY registry rows under the unchanged FS2 `?inspect=` contract;
  **palette `#` gained a Memory group kept visually and structurally SEPARATE from Knowledge** (§R9.3);
  memory shortcuts (`/`, guarded `e`) registered in the catalog.
- **Honest-absence surfaces:** influence **trace**, **Global scope**, **pin / exclude-from-generation** and
  the raw `memory` rows each explain that the backend owns them and the contract exposes no endpoint.
- **RBAC PATCH:** `/memory` opens on `content.view` (analyst/viewer read); every write and AI affordance is
  `content.edit`-gated at the call site.
- **T-FS8.1 commons offload (the stage's first action):** the keyboard registry was split by concern —
  handler side (`shortcuts.ts`, in commons) vs display catalogue (`shortcuts-catalog.ts`, consumed only by
  the lazy cheat-sheet). Measured effect **before any feature code**: `/chat` 179 → **178 kB**,
  `/knowledge` 176 → **175 kB**.

## 2. The ten gates — executed for real (final artifact, 2026-08-02)

| # | Gate | Result |
|---|---|---|
| 1 | ESLint | ✅ clean |
| 2 | Prettier | ✅ formatted |
| 3 | `tsc --noEmit` strict | ✅ 0 errors, 0 unjustified `any` |
| 4 | Vitest | ✅ **307 passed / 58 files** (254 → 307; +53) |
| 5 | Playwright E2E | ✅ **145 passed / 0 failed / 8 skipped** (3 viewports; 117 → 145; 10 new memory journeys) |
| 6 | axe | ✅ 0 violations — incl. the memory list AND persona detail on all three viewports |
| 7 | dependency-cruiser | ✅ 0 violations (**418 modules, 912 dependencies**) |
| 8 | `pnpm budget` (per-route First Load ≤ 180 kB) | ✅ **31 routes PASS · /memory 148 kB · /knowledge 175 · /dashboard 167 · worst /chat 179 (headroom 1.0 kB)** |
| 9 | size-limit (detector 598 kB) | ❌ **617.59 kB — exceeded by 19.59 kB.** Threshold NOT touched (rule №33); the per-chunk analysis and evidence-based proposal are in **`FS8_REPORT_SIZE_ADDENDUM.md`** — the owner rules at acceptance |
| 10 | Storybook build · contract | ✅ builds (Vite, 54 stories — unchanged) · ✅ every endpoint verbatim in `API_SPEC.md` (§Personas/§Actors + the already-confirmed posts and dry-run calls) |

## 3. The §3.7 regression invariants — each verified

| # | Invariant | Verdict & evidence |
|---|---|---|
| **I1** | `/chat` ≤ 179 kB | ✅ **179 kB** (`.next/route-budget.json`). Verified against `app-build-manifest.json` at acceptance: **T-FS8.1 really did move the route 179 → 178** before any feature code landed · **no Memory chunk entered any First Load** · **no FS8 string is present in any of `/chat`'s 16 First Load chunks** (the single `published` hit is the FS1 status vocabulary, and `/chat`'s graph does not import `query-keys` at all) · the route returned to 179 **solely through webpack's shared-graph re-partition and the resulting change in Next's rounding** (middle-layer chunks re-cut `6214/8243/1084` → `614/938/1811`, +0.05 kB; `webpack` runtime +0.16 kB) · the **union walk-gzip actually DECREASED**, 175.10 → 174.74 kB · the chat no-touch set was fully honoured (mtimes all predate the stage; zero FS8 imports). The invariant holds with no FS8 byte on the route. |
| **I2** | `/knowledge` ≤ 176 kB and no FS1–FS7 route regresses | ✅ **175 kB** (improved by the offload); every other route at or below its FS7 number |
| **I3** | The AI relay stays verbatim | ✅ `app/api/ai/stream/route.ts` and `shared/lib/ai-gateway/*` untouched (mtimes remain in the FS6 session window; no FS8 edit); the FS6 verbatim-relay unit trio re-ran green |
| **I4** | ConversationRepository / conversation slice untouched | ✅ untouched (mtimes unchanged) + a source-level test asserts **zero** `entities/conversation` imports across all FS8 slices |
| **I5** | Knowledge query keys unchanged; no FS8 writer invalidates them | ✅ locked by unit tests (`documents/document/documentVersions` shapes asserted; no `['documents'…]` invalidation in any FS8 mutation); FS7 knowledge journeys re-ran green |
| **I6** | FE-RV-9/10 gain no new adjustment points | ✅ import-level test: no FS8 module imports `ai-gateway` or `entities/document`; explain-style reaches the relay **only** through the public `useAssistantStream` hook (the FS6 dashboard-summary pattern) |
| **I7** | FS2–FS7 suites stay green without weakening | ✅ 307/307. Two existing specs changed, both made factually necessary by FS8: the shortcuts **import path** (module split) and the palette `#` **copy** (Knowledge+Memory). No assertion was relaxed. |
| **I8** | No state owned by Query and Zustand at once | ✅ four source-level locks (explain-style writes nothing to Query · no FS8 slice writes the UI store · assistant-key namespace cannot collide with Query keys · `StyleFeatureList` is stateless) |

## 4. Deliverables (files)

`shared/config/{shortcuts.ts (split), shortcuts-catalog.ts (new), routes.ts (1 datum), query-keys.ts}` ·
`shared/types/dto.ts` (persona/actor mirrors — **types erased at build time, zero runtime bytes**) ·
`entities/persona/{model,hooks,paths,index}` + `ui/StyleFeatureList` · `entities/actor/{model,hooks,paths,index}` ·
`entities/post/hooks.ts` (+`fetchPublishedPosts`/`usePublishedPosts`, additive) ·
`shared/lib/fixtures/{dataset,meta,browser}` (personas/actors + PATCH/archive + JSON body meta) ·
`app/(workspace)/memory/[[...scope]]/page.tsx` (stub replaced) ·
`widgets/memory/{MemoryView,MemoryGroupList,PersonaDetail(lazy),ActorDetail(lazy),PublishedMemoryList(lazy),MemoryEmpty,MemoryHonesty,index}` ·
`features/edit-persona/*` · `features/explain-style/*` ·
`widgets/inspector/{PersonaInspector,ActorInspector}` + 2 lazy registry rows ·
`widgets/command-palette/*` (Memory group) · tests: 4 unit + 3 component files + `memory.spec.ts` (10
journeys). **No new dependencies · no ONYX token change · no SoT/`app/` change · `.size-limit.json`
untouched (598) · no new stories (54).**

## 5. PATCH decisions made during implementation

1. **The registry split is by CONCERN, not by convenience** (T-FS8.1): `shortcuts.ts` keeps the chord map,
   types and text-entry guard (needed by the provider and every screen); `shortcuts-catalog.ts` holds the
   catalogue the cheat-sheet generates from. Locked by a test that fails if the catalogue returns to
   commons or if a second consumer appears.
2. **Entity-local paths again** (`personaPaths`, `actorPaths`) — the FS7 precedent, keeping memory-only
   bytes out of `shared/lib/api/endpoints` (commons).
3. **Content memory reuses `entities/post`** rather than inventing a "memory entry" shape: §R9.1's content
   level *is* published posts, and the FS5 post Inspector already tells that story.
4. **`?scope=` pushes history** (found by E2E — §6.2): the scope switch is a real state change, so Back
   reverses it, while list filters stay `replace`. This is now explicit in the navigation contract.
5. **Actors are read-only in FS8**: `POST /actors/{id}/references` exists in the contract but is a
   generation input (§R6.1) belonging to FS9 — no placeholder affordance stands in for it.
6. **Unknown `style_features` keys render by raw key** with a quiet "(raw key)" marker — the `parseStatus`
   discipline applied to jsonb, so a wire change degrades gracefully instead of hiding data.

## 6. Defects found and fixed

1. **[Real, found by E2E] `?scope=` was not reversible.** The Global-scope toggle wrote the URL with nuqs's
   default `history: 'replace'`, so the browser Back button left the screen instead of returning to the
   channel scope — a direct violation of the plan's own §3.5 ("every transition reversible by Back").
   *Fix:* `history: 'push'` on the scope key only; filters keep `replace`. Covered by the E2E journey that
   caught it.
2. **[Test-side] Strict-mode collisions in two memory journeys:** the persona's manner-of-speech line
   appears both as a list-row preview and in the detail pane. *Fix:* scope those assertions to the
   `Memory detail` region — the same "scope to the visible region" lesson FS7 recorded for mobile panes.
3. **[Existing-spec updates, I7-legal]** the shortcuts import path (module split) and the palette `#` copy
   (now "knowledge and memory") — both factually necessary, neither weakening an assertion.
4. **[Toolchain] The Windows/pnpm `next` corruption struck twice** (occurrences #17 and #18), both
   auto-recovered by the documented `pnpm build || (pnpm install --force && pnpm build)` habit. No stale
   webServer incident this stage (the kill-port habit from FS7 was applied before every build/E2E).

## 7. Bundle & budgets (final artifact)

- **Per-route First Load (authoritative, ≤180):** all 31 routes PASS. **`/memory` 148 kB** — 28 kB under
  the ≤176 target, because every detail pane, the edit dialog, the AI panel and both inspector rows are
  lazy. `/chat` 179 (§3 I1), `/knowledge` 175, `/dashboard` 167.
- **Lazy verification (§6.3), executed:** `app-build-manifest.json` proves **no FS8 chunk appears in any
  page's First Load list**; the shortcut catalogue now lives in two lazy chunks and **in no First Load**;
  `/memory`'s First Load is 8 chunks; dependency-cruiser 0 with no cross-entity import between `persona`,
  `actor` and `document`.
- **size-limit:** **617.59 / 598 kB — RED, untouched.** Growth vs FS7 = **+29.85 kB**; the lazy share rose
  from 58.7% to **60.2%**, i.e. the growth is predominantly lazy weight. Full attribution and the
  evidence-based proposal: **`FS8_REPORT_SIZE_ADDENDUM.md`**. Per rule №33 the decision is the owner's, at
  acceptance.

## 8. Honesty & owner-condition compliance

Memory ≠ Knowledge is structural, not cosmetic (separate route, entities, keys, cards, palette groups; the
`no-cross-entity` rule proves it) · Memory ≠ AI Chat: **zero chat files touched**, and no memory affordance
exists inside chat · no `/memory` endpoint was invented; trace, pin/exclude, Global scope and raw memory
rows are visible honest seams · **no influence claims** — the AI answer is grounded in one user-selected
record and says so · confidence stays absent (no wire source) · the optimistic-lock conflict is surfaced,
never swallowed · audit is stated as a backend fact · Style Memory is presented as parameters, never as
stored texts · generation internals (`face_embedding`, `reference_images_folder`) never reach a ViewModel ·
fixtures kill-switched and grep-locked · Aurora only on the genuine AI moment.

## 9. FE-RV register impact

**Opens FE-RV-11 — live memory round-trip** (owner-acceptance pending): persona/actor wire casing and
fields · the **`style_features` jsonb shape** (key naming, units, nesting — unknown keys already degrade
gracefully) · `PATCH /personas/{id}` accepted body and the real `version`/409 semantics · the archive
response · whether the persona list filters archived rows server-side · `?status=published` ordering and
pagination for content memory · whether actors expose reference counts. **Single adjustment points:**
`entities/persona/{model,paths}.ts`, `entities/actor/{model,paths}.ts`, and the edit-persona mutation body.
FE-RV-3…10 unchanged (I6 verified).

## 10. Risks entering FS9

| # | Risk | Mitigation |
|---|---|---|
| R1 | **size-limit red pending the addendum ruling** | rule at acceptance; the per-route UX gate is green and binding |
| R2 | **`/chat` headroom is back to 1.0 kB** and the offload lever is now spent | FS9 must add zero commons bytes; the remaining structural levers are listed in the addendum §4 (polyfills/browserslist, icon audit, splitChunks) — all FS14/FS15 items |
| R3 | FE-RV-11 assumptions, above all the `style_features` shape | unknown keys render honestly; single adjustment points |
| R4 | D3 §8 promises (trace/pin/exclude/global) may read as incompleteness | each is a visible, explained seam (T-FS8.10); §5.2 D1 records the reasoning |
| R5 | Actors are read-only until FS9 wires references | stated in the UI; no placeholder control |
| R6 | Windows hazards (18 `next` corruptions; stale webServer) | documented habits; CI (FE-RV-4) remains the authoritative environment |

## 11. STOP (at delivery)

**FS8 is complete: 9 of 10 gates green, executed for real; the tenth (size-limit) is honestly red at
617.59/598 with the threshold untouched and the dedicated addendum filed for your ruling (rule №33).**
All eight §3.7 regression invariants were verified mechanically. Awaiting your acceptance — including the
size decision and, if you wish, a note on whether `/chat` staying at 179 (rather than the momentary 178)
is acceptable as the standing reference. README, the handoff kit, commits, tags and FS9 remain untouched
until your separate word.

---

## 12. Acceptance addendum (2026-08-02) — owner's ruling executed

**FS8 ACCEPTED.** Acceptance followed a dedicated **evidence pack** the owner requested before ruling: the
full `pnpm budget` route table, the full `pnpm size` output, the addendum's eager/lazy split with
per-category attribution, a manifest-level forensic of the `/chat` 179 → 178 → 179 movement, a
content-marker proof that no FS8 chunk reaches any First Load, and an mtime + import-level proof for the
no-touch set.

**Size-limit decision: Option A — the detector is re-baselined to 628 kB.** Executed:
`.size-limit.json` → `628 KB`; `pnpm size` re-run → ✅ **617.59 / 628 kB (headroom 10.41 kB)**.
**All ten gates are now green.** Rule №33 unchanged and followed exactly (measure → dedicated per-chunk
addendum → owner's evidence-based ruling; the threshold was never pre-raised). This is the **fourth**
measured re-baseline (FS5 → 485, FS6 → 560, FS7 → 598, FS8 → 628). The **180 kB per-route First Load
budget remains the authoritative, non-revisable UX gate.**

**`/chat` reference number stays 179 kB.** Consequence carried into FS9 (§10 R2): the next stage must add
zero commons bytes or carry an explicit commons-split task; the T-FS8.1 lever is now spent.

**Facts confirmed at acceptance (each machine-verified, not asserted):**

1. **T-FS8.1 really did move `/chat` 179 → 178** before any feature code landed (and `/knowledge`
   176 → 175, where the gain survived the stage).
2. **No Memory lazy chunk entered any First Load.** Eleven chunks carrying FS8 code were located by
   content marker and cross-checked against `app-build-manifest.json`: **0 appear in any page's First
   Load list** (74 distinct chunks span all First Loads).
3. **The return to 179 is not FS8 code.** No FS8 string exists in any of `/chat`'s 16 First Load chunks —
   the lone `published` match is the FS1 status vocabulary, and `/chat`'s graph does not import
   `query-keys` at all. The cause is **webpack shared-graph re-partition plus the resulting change in
   Next's rounding** (`6214/8243/1084` → `614/938/1811`, +0.05 kB; `webpack` runtime +0.16 kB), while the
   **union walk-gzip actually decreased**, 175.10 → 174.74 kB.
4. **The chat no-touch set is intact**: every file's mtime predates the stage's start (latest 2026-08-01
   02:35 vs FS8 beginning 2026-08-02 00:33), with zero FS8 imports, locked in CI by
   `tests/unit/memory-ownership.test.ts`.

### 12.1 Correction recorded before acceptance (honesty rule)

The delivered §3 I1 and the addendum's §2.3 both explained the 178 → 179 movement as FS8's own sanctioned
commons additions (query-key builders, the RBAC datum, the palette wiring) consuming the offload gain. The
evidence pack **disproved that causal claim** — those bytes are not in `/chat`'s First Load at all. Both
statements were replaced with the verified explanation above *before* the owner accepted the stage. The
lesson is recorded in PART4: a plausible cause is not a measured one, and the manifest is the arbiter.
