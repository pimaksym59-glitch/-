# FS9 — Image Studio (Plan)

**Track:** Web Platform implementation · **SoT:** `FRONTEND_MASTER_SPEC.md` · implements **D3 §9 (Image
Studio)** through Stage 2 §5 (rendering group "AI Chat / Playground / **Image Studio**: server shell +
client-heavy") · §7 (state owners) and the Stage 3 inventories (§1 route `studio/[[...id]]` · §5 route row
"generation · ✓ result" · §3 feature `generate-image` · §4 entity `image`), against **`API_SPEC.md`**:

- **Images (§R6)** — `GET /channels/{id}/images` · `GET /images/{id}` · `GET /images/{id}/history` ·
  `GET /images/{id}/similarity` · `POST /images/{id}/regenerate` → **202** · `DELETE /images/{id}` → soft
- **Actors** — `POST /actors/{id}/references` (**the FS9 entry duty**, §R6.1) + the already-wired
  `GET /channels/{id}/actors` · `GET /actors/{id}` (FS8 `entities/actor`)
- **Locations** — `GET /channels/{id}/locations` (read-only, scene legibility §R6.3)
- **AI Studio** — the frozen `POST /studio/dry-run` (§R10.9) through the **UNCHANGED** FS6 relay

…and **nothing else**. The frozen contract carries **no image-CREATE endpoint**, **no media/binary URL**, and
**no post-update call able to attach an image** (§5.2 D1/D2/D4). Backend truth this stage renders: **§R6.1**
identity-conditioning by references (*not text, not seed*), **§R6.2** actors are fictional, **§R6.4** the
three-mechanism similarity cascade (phash ≠ scene metadata ≠ CLIP), **§R6.5** `IMAGE_MAX_REGEN` and the full
attempt history, **§R6.8** storage as an object key. Design language: D2 §14 **ImageResult** +
**VerificationBadge** (built at FS3, data-starved since) · §13.21 FileUpload · §13.23 Timeline · §15 empty
state · D1 §6.4 palette `#` · A5–A8 (Trust + Explainability, no blocking spinners, Aurora only on genuine AI
moments). **This is a PLAN. No code yet.**

**Goal of FS9:** make the channel's **visual identity and image production legible and verifiable** with what
the contract actually carries. `/studio` stops being a stub: the image-record workspace (results grid →
record detail with prompt/parameter/scene disclosure → the **real** §R6.4 similarity report and the §R6.5
attempt history), **regeneration as a queued 202 intent**, guarded soft delete, the **actor reference upload**
(`POST /actors/{id}/references` — the identity-conditioning input FS8 deliberately left out), read-only
locations for scene legibility, the Inspector `image` view, a palette `#` **Images** group kept structurally
separate from Knowledge and Memory, and **explain-verification** — user-invoked AI over ONE image's own
record + its similarity report, prompt unit-proven, so **ImageResult / VerificationBadge finally render real
data** (the FS7 Citation and FS8 MemoryCard precedent). Everything the contract cannot back — free-form
generation, image pixels, attach-to-post, a safety verdict, aspect/size presets, batch generation — is a
**visible honest seam**, never simulated. **No `app/` / Protocol / MASTER_SPEC change · no endpoint invented ·
no ONYX token-value change · no new dependencies.**

**Entry conditions — satisfied:** FS8 accepted 2026-08-02 (size-limit re-baselined to **628 kB** after a
dedicated addendum **and a full evidence pack**; **`/chat` = 179 kB** re-confirmed as the standing reference,
headroom **1.0 kB**; FE-RV-11 opened). This plan is FS9's first deliverable. Frozen FS9 entry duties
(handoff PART4 §8.2): provider-agnostic image flows per D3 §9 · heavy modules via `dynamic()` · **the actor
reference upload (§R6.1)** · **the plan must add ZERO commons bytes or carry an explicit commons-split task**
(the T-FS8.1 registry lever is spent) · every heavy leaf lazy from the start · the **seven fixed artefacts**
required since FS7/FS8 (PART1 §4.5/§4.6) are §3.1–§3.7 below.

---

## 1. Scope

**IN:**

- **T-FS9.1 — the ZERO-commons mechanism (FIRST, before any feature code).** FS8's offload lever is spent, so
  FS9 does not *remove* commons bytes — it is designed to **add none**. The mechanism: **entity-local query
  keys**, extending the FS7 `documentPaths` / FS8 `personaPaths` precedent one layer up. `entities/image/keys.ts`
  and `entities/location/keys.ts` own their key builders; `shared/config/query-keys.ts` gains **zero rows**
  (only a pointer comment — comments are stripped at build time, so the runtime delta is exactly 0 bytes).
  Locked by a grep test: no `images`/`locations` key builder may appear in `shared/config/query-keys.ts`, and
  the image key namespace may not collide with `posts` / `documents` / `personas` / `actors`.
- **Entities (T-FS9.2):** `entities/image` — wire mirrors in `dto.ts` (**types erased at build → zero runtime
  bytes**), VM mappers (status through `parseStatus`; **generation internals and storage keys never leak** —
  §3.4), entity-local `paths.ts` + `keys.ts`, Query hooks (`useImages`/`useImage`/`useImageHistory`/
  `useImageSimilarity`, channel-scoped, honest polling per FE-ADR-9 — §3.2) and a stateless
  `ui/ImageMetaList.tsx`. `entities/location` — read-only list + `mapLocation`, used **only** to resolve
  `location_id` → name (unknown id renders the raw id honestly).
- **Fixtures (T-FS9.3):** IMAGES (real §R6-shaped records: prompt/negative/provider/seed/resolution/style/
  camera/lighting/composition/phash/quality_score/status, `storage_path` as an object key **and no URL**),
  IMAGE_HISTORY (§R6.5 attempts), SIMILARITY reports (§R6.4 phash + CLIP + scene metadata), LOCATIONS, plus
  `POST /images/{id}/regenerate` → 202, `DELETE` → 204 and `POST /actors/{id}/references` (multipart) in THE
  one dataset + browser/node MSW; `empty` scenario honoured; kill-switch and grep locks unchanged.
- **Route + RSC page (T-FS9.4):** `routes.ts` `/studio` permission `content.edit` → **`content.view`** (§5.2
  D7 — registry datum only, `decideAccess` untouched, the FS7/FS8 precedent);
  `app/(workspace)/studio/[[...id]]/page.tsx` replaces the stub with an RSC initial-data page (cookies →
  `serverApiOrNull` images for the active channel, **`forChannelId`** discipline).
- **Studio workspace (T-FS9.5), `widgets/studio`:** panel rail (**Results** — real · **References** — real,
  the identity inputs) → results grid of ONYX **ImageResult** cards with **wire-derived** verification chips
  and the honest no-preview frame → **LAZY** record detail (prompt + negative disclosure · generation
  parameters · scene: actor + location resolved at the widget level · the §R6.5 **history Timeline** · the
  §R6.4 **similarity report**). `j/k/↵`, nuqs `?q=` list filter (honestly labelled as list filtering),
  paging over the contract's `?limit/offset` (**no virtualizer** — it is a /chat-scoped chunk today and must
  stay there), D2 §15 empty state, per-region loading/error states, D3 responsive (mobile: grid, detail as
  sheet).
- **features/regenerate-image (T-FS9.6)** — Stage 3 §3's `generate-image` slot realized as what the contract
  carries: `POST /images/{id}/regenerate` → **202 queued-truth** toast naming the task (§R10.1 wording, the
  FS5/FS7 precedent) + invalidations per §3.2, and a **guarded soft delete** (`DELETE /images/{id}`).
  `content.edit`-gated at the call site; confirmed, never optimistic. The §R6.5 regen cap is stated as a
  **backend fact** (the FS8 "audited server-side" precedent) — the UI shows the real attempt count from
  history and never invents a remaining-regens number.
- **features/upload-references (T-FS9.7) — the FS9 entry duty.** `POST /actors/{id}/references` over the
  existing `apiFetch({ formData })` seam (FS7), with the **same honest upload machine**: in-flight = *Queued*
  (fetch exposes no upload progress — a percentage would be false precision), accepted = *Verified*; no
  ingestion invention (the contract exposes no reference-processing status). Copy states §R6.1 truth
  (references are the identity-conditioning input — not text, not seed) and the §R6.2 rule (actors are
  fictional; do not upload real people). Invalidates `actor(id)` + `actors(ch)` (§3.2).
- **Inspector `image` (T-FS9.8):** one **LAZY** registry row (the FS7/FS8 precedent — the Inspector panel sits
  in shell commons): overview + chips + parameters + guarded actions; `?inspect=image:<id>` under the
  unchanged FS2 URL contract. The FS8 `actor` view is **reused unchanged** for `?inspect=actor:<id>` from the
  References panel. Palette **`#` Images group** (active channel's images, on-demand inside the existing lazy
  overlay chunk), rendered **distinct from Knowledge and Memory** (§2). Studio shortcuts (`/` search, guarded
  `r` regenerate, `↵` inspect; `j/k` reuse `lists`) added to the **lazy** `shortcuts-catalog.ts` only —
  `⌘↵ generate` and `a accept` are deliberately **not** registered (no contract target; no dead shortcuts).
- **features/explain-verification (T-FS9.9):** LAZY, user-invoked "Explain this image's verification" over the
  frozen dry-run path via the **UNCHANGED** FS6 relay/stream machinery: a pure `buildImagePrompt` unit-proven
  to contain ONLY the selected image's own record + its similarity report + the user's question; output
  carries TrustLabel (**Generated · Source Available**), a provenance card citing **that image record**,
  ExplainabilityPanel (data used = this image; **confidence honestly absent**), wire-only cost, Stop preserves
  partial, nothing auto-runs, `content.edit`-gated. **No safety verdict, no identity-match claim, no
  uniqueness claim beyond the numbers the report carries** (§5.2 D5/D6).
- **Honest-absence surfaces (T-FS9.10):** free-form generation (no create endpoint) · image pixels (no media
  URL in the contract) · attach-to-post / accept (no post-update call) · a safety verdict (no wire field) ·
  aspect/size presets and batch generation (nothing to submit them to) — each renders canonical honest copy
  naming the backend as owner, the FS7 retrieval-honesty / FS8 memory-honesty precedent.
- Tests (T-FS9.11/12) and gates + `FS9_REPORT.md` (T-FS9.13).

**OUT (full list §8):** any simulation of image creation, generation progress, previews/thumbnails, safety
verdicts or CLIP/face-match verdicts the wire does not carry · `POST /posts/{id}/regenerate` (a **post**
surface action — the content/review screen owns it) · locations CREATE/PATCH (channel setup — FS12/FS13) ·
persona/actor editing (FS8 owns it; actors gain **only** the reference upload) · `GET|PUT /channels/{id}/settings`
to display the regen cap (a new endpoint group and a new *(assumed)* wire for one number — the cap is stated as
a backend fact instead) · AI prompt-improvement / preset suggestion (§5.2 D6) · new dependencies · threshold
changes.

**Carried from FS8 (§10):** R2 → §3.3/§6.1 keep `/chat` at 179 with **zero commons rows added** (T-FS9.1) ·
R3 → FE-RV-11 unchanged except its actor line, which FS9 extends and records in FE-RV-12 (§5.3) · R5 → the
actor read-only note is retired exactly where the contract allows (references only) · R6 → the four recorded
Playwright pitfalls are honoured by construction in the new spec.

## 2. The contract reality of image generation (a first-class constraint, not a note)

D3 §9 describes "prompt → generate → verify → attach". The frozen contract supports **verify** and part of
**generate**, and supports **neither** free-form creation nor attach:

| D3 §9 promise | Contract reality | FS9 |
|---|---|---|
| prompt + negative + preset → **Generate** | **no image-create endpoint** exists (§Images has read/regenerate/delete/similarity only); image generation is the pipeline stage `generate_image` (§R2.5/§R13.2) owned by the backend queue | honest seam (§5.2 D1) — no composer that cannot submit |
| identity references | **`POST /actors/{id}/references`** — real (§R6.1) | **delivered** (the entry duty) |
| results grid | **`GET /channels/{id}/images`** — real | delivered |
| verification chips (safety / phash / regen ×n) | phash + CLIP + scene metadata via **`GET /images/{id}/similarity`** (§R6.4) and attempts via **`/history`** (§R6.5) are real; a **safety verdict has no wire field** | chips are wire-derived only; safety is honestly absent (§5.2 D5) |
| the image itself | `images.storage_path` is an **object key** (§R6.8); no endpoint serves the binary | honest no-preview frame; one mapper line turns previews on if the live wire carries a URL (§5.2 D2, FE-RV-12) |
| Regenerate | **`POST /images/{id}/regenerate` → 202** (§R6.5) | delivered as a queued intent |
| Accept / Attach to post | **no post-update endpoint** can set `posts.image_id` | honest seam (§5.2 D4) — no dead controls |
| AI improves prompts | a rewritten prompt would have **no submit target** | replaced by **explain-verification** (§5.2 D6) |

**Images ≠ Knowledge ≠ Memory — structural, like §R9.3 was at FS8:**

| Dimension | Knowledge (FS7) | Memory (FS8) | **Images (FS9)** |
|---|---|---|---|
| Route | `/knowledge/[[...docId]]` | `/memory/[[...scope]]` | **`/studio/[[...id]]`** |
| Contract | `/documents` | `/personas`, `/actors`, published posts | **`/images` (+ `/actors/{id}/references`, `/locations`)** |
| Entities | `entities/document` | `entities/persona`, `entities/actor` | **`entities/image`, `entities/location`** |
| Query keys | commons `documents(ch)`… | commons `personas(ch)`… | **entity-local `images(ch)`…** (T-FS9.1) |
| ONYX card | KnowledgeCard | MemoryCard | **ImageResult + VerificationBadge** |
| Palette `#` group | "Knowledge" | "Memory" | **separate "Images" group** |
| AI panel | ask-document (a document's text) | explain-style (a persona's record) | **explain-verification (an image's record + report)** |

No shared "asset" abstraction, no merged list, **no cross-entity import** (`entities/image` never imports
`entities/actor` or `entities/location`; the *widget* composes them — dependency-cruiser's `no-cross-entity`
rule proves it). **Studio ≠ AI Chat:** FS9 touches **zero** chat files (§3.3).

## 3. Deliverables, matrices and guarantees

### 3.1 Rendering & loading matrix (fixed at approval — every new UI module)

| Module | Server / Client | Eager / Lazy | First Load impact |
|---|---|---|---|
| `studio/[[...id]]/page.tsx` | **Server (RSC)** — cookies → `serverApiOrNull` images | eager (route entry) | defines `/studio`; RSC ships no client JS |
| `StudioView` (shell + panel rail + grid host) | Client (Query islands, keyboard, nuqs) | eager — the route shell island | **YES — /studio only** (target ≤176 kB); imports nothing heavy statically |
| `ImageGrid` (ImageResult cards, `j/k/↵`, paging) | Client | eager (part of the shell) | **YES — /studio only** |
| `StudioEmpty` (D2 §15) · `StudioHonesty` (generation/preview/attach/safety seams) | Client (static markup) | eager (bytes) | YES — /studio only, byte-level |
| `ImageDetail` (prompt + params + scene) | Client | **LAZY** — `dynamic()` on selection | **NO** |
| `SimilarityReport` (§R6.4) · `GenerationHistory` (§R6.5 Timeline) | Client | **LAZY** — bundled with the detail chunk | **NO** |
| `ReferencesPanel` + `UploadReferencesDialog` (+ ONYX FileUpload) | Client | **LAZY** — `dynamic()` on `?panel=references` / intent | **NO** |
| `ExplainVerificationPanel` (+ streaming machinery) | Client | **LAZY** — `dynamic()` on intent | **NO** |
| `ImageInspector` | Client | **LAZY** registry row (FS7/FS8 precedent) | **NO** route First Load impact |
| Palette `#` Images group | Client | inside the existing FS2 **dynamic palette overlay**; fetch only on `#` entry | **NO** |
| Studio rows in `shortcuts-catalog.ts` | isomorphic data | eager **only inside the lazy cheat-sheet chunk** (T-FS8.1 split preserved) | **NO** |
| `entities/image` · `entities/location` (model/hooks/paths/**keys**) | Client lib (+ mappers used by RSC) | eager **within the /studio shell only** | YES — /studio only |
| `shared/config/query-keys.ts` | isomorphic data | eager (commons) | **ZERO — no rows added** (T-FS9.1; pointer comment only, stripped at build) |
| `shared/config/routes.ts` | isomorphic data | eager (commons) | one permission **value** change; no new import |
| `shared/types/dto.ts` | types | — | **zero runtime** (types erased) |
| `entities/actor/paths.ts` | isomorphic data | eager within /memory + /studio | +1 path string (~80 B) — declared and measured (§3.3) |

Rule fixed with this table: **every eager-client addition lives inside the /studio route shell**, and the only
shared-module edits are a permission datum, a types-only file and one entity-local path string. Any deviation
found at `pnpm budget` is fixed **structurally**, never by threshold.

### 3.2 Query keys & invalidate graph (fixed at approval)

New keys, **entity-local** (T-FS9.1) — channel-scoped where relevant; RSC initialData seeds only the
`forChannelId` channel:

```
imageKeys.list(channelId)  ['images','list',channelId]      imageKeys.detail(id)     ['images','detail',id]
imageKeys.history(id)      ['images','history',id]          imageKeys.similarity(id) ['images','similarity',id]
locationKeys.list(channelId) ['locations','list',channelId]
```

Invalidate graph (writer → keys):

```
useRegenerateImage  POST /images/{id}/regenerate → 202  → invalidate images.detail(id) · images.list(ch)
                                                          · images.history(id) · queryKeys.jobs(*)  (the
                                                            queued task is real work — the FS5 Jobs surface
                                                            must see it, the FS7 re-ingest precedent)
useDeleteImage      DELETE /images/{id}                 → invalidate images.list(ch)  (soft delete, guarded)
useUploadReferences POST /actors/{id}/references        → invalidate queryKeys.actor(id) · queryKeys.actors(ch)
                                                          (the ONLY FS9 writer touching a memory key — by
                                                           design: references change the actor record)
```

**Honest polling (FE-ADR-9), not invented progress:** the contract has no generation SSE, so after a 202 the
`images.detail(id)` query refetches on an interval **only while the record's parsed status is queued/running**,
and stops at any terminal status. An **unknown** wire status starts **no** polling (the `parseStatus`
discipline — the UI never guesses that work is in flight). No progress bar, no percentage, ever.

Non-invalidation flows, fixed explicitly: **explain-verification performs ZERO Query writes** (the streamed
answer lives in the transient Zustand owner) · **the reference upload never invalidates an image key** (it is an
identity input, not an image mutation) · **channel switch invalidates nothing** — every key carries
`channelId`, so switching re-scopes (the FS5 lesson) · FS5–FS8 key shapes are **untouched**, and no FS9 writer
invalidates `['documents',…]`, `['personas',…]` or `['posts',…]`.

### 3.3 FS6 / FS7 / FS8 no-touch guarantee (protects /chat 179 · /knowledge 175 · /memory 148 · /dashboard 167)

**Guaranteed ZERO edits** — chat surface: `app/(workspace)/chat/[[...id]]/*` · `widgets/chat/*` ·
`features/send-message/*` · `features/insert-to-channel/*` · `entities/conversation/*` (incl. THE
ConversationRepository) · `shared/lib/stream/*` · `shared/lib/ai-gateway/*` · `app/api/ai/stream/route.ts` ·
`shared/lib/persist/*` · `shared/config/models.ts`. Knowledge surface: `app/(workspace)/knowledge/*` ·
`widgets/knowledge/*` · `features/add-source/*` · `features/ask-document/*` · `entities/document/*`. Memory
surface: `app/(workspace)/memory/*` · `widgets/memory/*` · `features/edit-persona/*` ·
`features/explain-style/*` · `entities/persona/*`. Dashboard: `widgets/dashboard/*`. The FS6 stream/relay
machinery is **consumed as-is** (explain-verification calls `useAssistantStream` exactly as ask-document and
explain-style do) — never modified.

**Shared files edited, and why each cannot grow a protected route:**

| File | Edit | Why safe |
|---|---|---|
| `shared/config/query-keys.ts` | **pointer comment only — ZERO rows** | comments are stripped at build; the runtime delta is exactly 0 bytes (T-FS9.1) |
| `shared/config/routes.ts` | one permission datum (`/studio` → `content.view`) | value change, not a new import |
| `shared/config/shortcuts-catalog.ts` | studio rows | lives only in the lazy cheat-sheet chunk (T-FS8.1 split preserved and lock-tested) |
| `shared/types/dto.ts` | +image/location/similarity wire mirrors | **types erased at build — zero runtime bytes** |
| `entities/actor/paths.ts` | **+1 path** (`references(id)`) | a ~80-byte string in a file that /memory already loads (headroom 32 kB) and /studio needs; FSD-correct (an actor endpoint belongs to the actor entity); **measured** in §6.3 |
| `entities/actor/model.ts` | **only if** the live wire proves a reference count exists — otherwise untouched | additive optional field; absent data renders honestly, never a zero |
| `widgets/inspector/Inspector.tsx` | +1 LAZY registry row | `dynamic()` — no static weight in shell commons (twice-proven at FS7/FS8) |
| `widgets/command-palette/*` | Images result group | inside the FS2 dynamic overlay chunk |
| `shared/lib/fixtures/{dataset,browser,meta}` | images/locations/references coverage | fixture env only; kill-switched, grep-locked, lazy |

**Backstop:** §6.3 byte-compares `/chat` (179), `/knowledge` (175), `/memory` (148) and `/dashboard` (167)
pre/post. Any regression is fixed **structurally inside FS9's own surface** — deeper lazy splitting of the
studio shell, or registering the image Inspector view from the studio widget instead of the shared registry —
and if no structural fix holds the number, the stage **STOPS and reports** (the FS7 precedent). 180 kB is
non-revisable.

### 3.4 State-ownership matrix (fixed at approval)

Stage 2 §7 / D4 §7 owners applied to every piece of FS9 state. **Hard rule: no state is owned by TanStack
Query and Zustand at the same time.**

| State | Owner | Persistence | Invalidation source | Server / Client | Cache lifetime | Replacement seam |
|---|---|---|---|---|---|---|
| **Image list** | **TanStack Query** — `imageKeys.list(ch)` | none | `useRegenerateImage`, `useDeleteImage` (§3.2); channel switch re-scopes by key | RSC seeds via `serverApiOrNull` + `forChannelId` | `staleTime 30s` | `entities/image/{hooks,paths,keys,model}.ts` (FE-RV-12) |
| **Image detail** | **TanStack Query** — `imageKeys.detail(id)` | none | same + honest polling while queued/running (§3.2) | client | `staleTime 15s` | same |
| **Generation history (§R6.5)** | **TanStack Query** — `imageKeys.history(id)` | none | regenerate only | client (LAZY pane) | `staleTime 30s` | same |
| **Similarity report (§R6.4)** | **TanStack Query** — `imageKeys.similarity(id)` | none | regenerate only | client (LAZY pane) | `staleTime 60s` | `entities/image/model.ts` — the ONLY place the report jsonb is interpreted (unknown keys render by raw name, the FS8 `style_features` discipline) |
| **Locations** | **TanStack Query** — `locationKeys.list(ch)` | none | read-only in FS9 | client | `staleTime 5m` | `entities/location/*` |
| **Actors (references context)** | **TanStack Query** — the existing FS8 `queryKeys.actors/actor` | none | `useUploadReferences` only | client | FS8 values unchanged | `entities/actor/*` (FE-RV-11/12) |
| **Scene resolution (actor/location names on an image)** | **NOT a state of its own** — a pure widget-level join of two Query results | none | inherits both entries | client render | inherits | `widgets/studio` composition (no cross-entity import — §2) |
| **Reference-upload machine (per-file phases)** | **component `useState`** (the FS7 add-source precedent) | none — dies with the dialog | user action only | client | n/a | `features/upload-references/model` |
| **Studio UI state** | **split by shareability, never Zustand:** URL (**nuqs**) owns `?q=`, `?panel=`, `?inspect=`; the selected image lives in the **route segment**; component `useState` owns only ephemeral things (dialog open, focused index) | URL is the persistence | user navigation only | client | n/a | `shared/hooks/useInspector` + nuqs keys (§3.5) |
| **explain-verification result** | **transient Zustand** — the FS6 assistant store, keyed `image:<id>` | none — never persisted, never reconciled into Query | `reset()`/unmount; a new run replaces the slice | client | until unmount | `shared/lib/stream/assistant.ts` (consumed UNCHANGED — §3.7 I3) |

**The no-double-ownership rule, made checkable (T-FS9.11):**
1. `features/explain-verification` contains **zero** `queryClient` writes (`setQueryData`/`invalidateQueries`)
   — source-level test over the slice (the FS6/FS8 rule).
2. The assistant key namespace used here (`image:<id>`) never appears in a Query key — asserted in the same
   test (image keys are `['images', …]` only).
3. No FS9 module imports `useUiStore` for studio data (the global store keeps owning only theme/density/
   sidebar/active-channel/palette/toasts) — grep-lock test.
4. The upload machine never copies server state: it holds `File` + phase in component state and, on
   acceptance, **invalidates** rather than `setQueryData` — asserted by test.
5. `ImageMetaList` and `SimilarityReport` are pure functions of their props (stateless) — asserted by test.

### 3.5 Navigation contract (URL is the state; every transition is reversible)

Stage 3's route is `/studio/[[...id]]`; FS9 fixes the segment and query grammar inside it. **Every transition
is expressible as a URL, restorable by paste, and reversible by the browser Back button.**

| URL | Meaning | Rendering |
|---|---|---|
| `/studio` | the image workspace, Results panel, nothing selected | RSC grid, no detail pane |
| **`/studio/<imageId>`** | the image-record deep link | RSC grid + **LAZY** `ImageDetail` (params · scene · history · similarity) |
| `/studio?q=<text>` | list filter (nuqs, `history: replace`) | filters the loaded records; honestly labelled as list filtering |
| **`/studio?panel=references`** | the identity-inputs panel (§R6.1) | **LAZY** `ReferencesPanel`; nuqs **`history: 'push'`** — a real state change must be Back-reversible (**the FS8 `?scope=` defect precedent, applied preventively**) |
| `/studio?inspect=image:<id>` | image Inspector overlay | drawer (desktop) / sheet (mobile); **no navigation**; Esc or Back closes |
| `/studio?inspect=actor:<id>` | the **FS8 actor view, reused unchanged** (from References) | same overlay contract |
| `/studio?inspect=job:<id>` | the **FS5 job view, reused unchanged** (from a 202 regeneration toast) | same overlay contract |
| `/knowledge?inspect=document:<id>` · `/memory?inspect=persona:<id>` | **unchanged FS7/FS8 contracts** — listed only to show the shared grammar | FS7/FS8 views |

**Grammar rules (unchanged since FS2, restated so FS9 cannot drift):** `?inspect=<type>:<id>` works in every
route group and never navigates; `?inspect` writes with `history: 'push'` (Back closes the inspector); list
filters write with `history: 'replace'`; a segment change (`/studio` ⇄ `/studio/<imageId>`) is a real
navigation and a real history entry.

**Cross-surface transitions:**

| From → To | Trigger | URL effect | Reversible by |
|---|---|---|---|
| anywhere → Studio | palette `#<query>` → **Images** group (separate from Knowledge/Memory, §2) · `g i` chord · sidebar | `push /studio/<imageId>` or `push /studio` | Back |
| Studio → image detail | grid card `↵`/click | `push /studio/<imageId>` (open) or `push ?inspect=image:<id>` (inspect) | Back / Esc |
| Studio → References | panel rail | `push ?panel=references` | Back |
| References → actor record | "Inspect actor" | `push ?inspect=actor:<id>` on the SAME page (never a new screen) | Back / Esc |
| Regeneration toast → the queued task | toast action | `push ?inspect=job:<taskId>` | Back / Esc |
| Studio ⇄ Chat / Knowledge / Memory | **no direct link in FS9** — the palette is the shared entry point | — | — |

**Invariant (asserted in E2E):** for each of `/studio`, `/studio/<imageId>`, `?panel=references`,
`?inspect=image:<id>` — a full page reload reproduces the same visible state, and Back returns to the exact
previous state without losing the channel scope.

### 3.6 Bundle ownership (per-chunk architecture)

| Chunk | Imported by (the ONLY importer) | First loaded when | Could it reach commons? | Proof it does not |
|---|---|---|---|---|
| `studio-shell` (StudioView + ImageGrid + StudioEmpty + StudioHonesty + image/location hooks) | `app/(workspace)/studio/[[...id]]/page.tsx` (route entry) | `/studio` is opened | **It IS route-eager — by design, route-scoped** | it appears in the `/studio` First Load list of `app-build-manifest.json` and **in no other page's list** |
| `studio-detail` (ImageDetail + ImageMetaList + SimilarityReport + GenerationHistory) | `StudioView` via `dynamic()` | an image is selected (segment or card click) | only if someone static-imports it | grep: no static import outside the `dynamic()` call; absent from every page's First Load list |
| `studio-references` (ReferencesPanel + UploadReferencesDialog + upload transport) | `StudioView` via `dynamic()` | `?panel=references` or the upload intent | same | same manifest + grep proof; additionally RBAC-gated so read roles never mount it |
| **ONYX `FileUpload` (shared with FS7 `add-source`)** | two lazy owners: `features/add-source` (knowledge) and `features/upload-references` (studio) | either owner's dialog opens | **webpack may hoist a module needed by two chunks** — the §3.6 rule-2 case | whatever chunk it lands in must be **lazy for both owners**: verified by its absence from **every** page's First Load list; if it were hoisted into commons, the fix is a `dynamic()` boundary inside the studio dialog, never a threshold |
| `explain-verification` (panel + `buildImagePrompt` + Trust/Explainability usage) | `ImageDetail` via `dynamic()` | the user presses "Explain this image's verification" | same | manifest + grep proof; the streaming machinery it uses is the **already-existing** FS6 chunk, not a new copy |
| `image-inspector` | `widgets/inspector/Inspector.tsx` via `dynamic()` (registry row) | the first `?inspect=image:` target | **highest risk** — `InspectorPanel` sits in shell commons, so a static import taxes EVERY route | the FS7/FS8 precedent: the row is `dynamic()`; verified by the manifest check + the `/chat` byte-compare |
| palette Images group | `widgets/command-palette/CommandPalette.tsx` (already a `dynamic()` overlay) | the palette is first opened | no — it inherits the existing overlay chunk | it adds no new chunk; the `#` image fetch is `enabled`-gated on mode entry |
| studio rows in `shortcut-catalog` | `widgets/shortcut-cheatsheet/*` **only** (a lazy overlay) | `⌘/` is first opened | it must not return to commons | the FS8 lock test re-runs: the catalogue appears in exactly one chunk, absent from every First Load list |

**Ownership rules fixed by this table:** (1) exactly one importer per lazy chunk, except the declared
FileUpload case, which must stay lazy on **both** sides; (2) any module a route shell and a shell-commons
widget both need lives in the **entity** layer (the FS7 `documentPaths` precedent, extended to keys at
T-FS9.1) or is lazy on both sides; (3) **no new chunk and no new row may be introduced into
`shared/config`, `shared/lib/api` or `widgets/app-shell`** — those are commons, and their growth is measured
against `/chat`'s 1.0 kB headroom with the offload lever already spent.

### 3.7 Regression invariants (checkable, not intentions)

| # | Invariant | Proof (executed at T-FS9.13, recorded in FS9_REPORT) |
|---|---|---|
| **I1** | **`/chat` First Load ≤ 179 kB** (the standing reference; 180 non-revisable). FS9 adds **zero commons rows** (T-FS9.1) | `pnpm budget` route table + `.next/route-budget.json`, byte-compared against the FS8 baseline (179); if it moves, `app-build-manifest.json` forensics decide the cause **before** any claim is written (the FS8 evidence-pack lesson: the manifest is the arbiter, never a plausible story) |
| **I2** | **`/knowledge` ≤ 175 · `/memory` ≤ 148 · `/dashboard` ≤ 167**, every other FS1–FS8 route ≤ its FS8 number, all ≤ 180 | full-table comparison (31 routes before, 32 after) |
| **I3** | **The AI relay stays VERBATIM.** `app/api/ai/stream/route.ts` and `shared/lib/ai-gateway/*` byte-identical; explain-verification adds no frame type, no cadence, no post-processing | `git diff --stat` over those paths = empty; the FS6 verbatim-relay unit trio re-runs green untouched |
| **I4** | **ConversationRepository and the conversation slice byte-identical**; no FS9 module imports `entities/conversation` | empty diff + grep over `widgets/studio`, `features/{regenerate-image,upload-references,explain-verification}` |
| **I5** | **Knowledge and Memory key shapes unchanged.** No FS9 writer invalidates `['documents',…]`, `['personas',…]` or `['posts',…]`; the ONLY memory key FS9 touches is `actors`/`actor`, and only from the reference upload (§3.2) | empty diff over the knowledge/memory key builders; grep over every FS9 mutation `onSuccess`; FS7/FS8 journeys re-run green |
| **I6** | **FE-RV-9 and FE-RV-10 gain NO new adjustment points.** FE-RV-11's *actor* line is extended by exactly one transport (`entities/actor/paths.ts` + the upload body) and that extension is recorded in **FE-RV-12** — nothing else moves | the FE-RV register diff; grep: no FS9 file references `ai-gateway`, dry-run DTOs, `documentPaths` or `personaPaths` (explain-verification reaches the relay only through the public `useAssistantStream` hook) |
| **I7** | **FS2–FS8 suites stay green without weakening.** The only legal edits to existing specs are ones FS9 makes factually necessary (the `/studio` RBAC datum; the palette `#` copy if it must now name Images) | `git diff` over `tests/` shows additions plus at most those lines; full `pnpm test` + `pnpm e2e` green |
| **I8** | **No state owned by Query and Zustand at once**; no invented progress or status anywhere | the five §3.4 locks; a test asserting the upload machine renders no percentage and that an unknown image status starts no polling; dependency-cruiser 0 (incl. **no cross-entity import** between `image`, `location`, `actor`, `persona`, `document`) |

**Escalation rule:** if any invariant cannot be held while delivering the approved scope, the stage **STOPS
and reports** — the plan is not silently renegotiated (the FS7/FS8 precedent).

### 3.8 File-level deliverables (maps to Stage 3 §1/§3–§5)

`src/shared/config/{routes.ts (1 datum), shortcuts-catalog.ts (studio rows), query-keys.ts (comment only)}` ·
`src/shared/types/dto.ts` (image/history/similarity/location mirrors) ·
`src/entities/image/{model,hooks,paths,keys,index}.ts` + `ui/ImageMetaList.tsx` ·
`src/entities/location/{model,hooks,paths,keys,index}.ts` · `src/entities/actor/paths.ts` (+1 path) ·
`src/shared/lib/fixtures/{dataset,browser,meta}.ts` (+images/history/similarity/locations/references) ·
`src/app/(workspace)/studio/[[...id]]/page.tsx` (stub replaced) ·
`src/widgets/studio/{StudioView,ImageGrid,ImageDetail(lazy),SimilarityReport(lazy),GenerationHistory(lazy),
ReferencesPanel(lazy),StudioEmpty,StudioHonesty,index}` ·
`src/features/regenerate-image/{index, model/useImageIntents.ts, ui/RegenerateAction.tsx}` ·
`src/features/upload-references/{index, model/useUploadReferences.ts, ui/UploadReferencesDialog(lazy)}` ·
`src/features/explain-verification/{index, model/{buildImagePrompt,useExplainVerification}.ts,
ui/ExplainVerificationPanel(lazy)}` · `src/widgets/inspector/ImageInspector.tsx` (+1 lazy registry row) ·
`src/widgets/command-palette/*` (Images group) · `tests/{unit,component,e2e}/*` additions · `FS9_REPORT.md`
(+ `FS9_REPORT_SIZE_ADDENDUM.md` if §6.2 triggers). **Other route stubs untouched · no new endpoints · no new
dependencies · `.size-limit.json` untouched (628) · no new stories required (ImageResult/VerificationBadge/
FileUpload/Timeline exist since FS3; story count stays 54).**

## 4. Task sequence (each with a completion criterion)

| Task | Produces | Done when |
|---|---|---|
| **T-FS9.0** Contract & gate prep | endpoint-by-endpoint verification against `API_SPEC.md` (§Images, `POST /actors/{id}/references`, `/locations` verbatim; dry-run already confirmed at FS6); *(assumed)* wire shapes written into `dto.ts` comments; no dependency intake; no threshold change; **baseline `pnpm budget` recorded** (/chat 179 · /knowledge 175 · /memory 148 · /dashboard 167) and `pnpm size` (617.59/628) | `pnpm gate` baseline green before new code; §5.2 deviations approved with this plan |
| **T-FS9.1** **Zero-commons design lock (first)** | `entities/image/keys.ts` + `entities/location/keys.ts`; `shared/config/query-keys.ts` gains a pointer comment and **no rows**; grep-lock test | the lock test fails if an image/location key builder appears in commons or if an image key namespace collides with `posts`/`documents`/`personas`/`actors` |
| **T-FS9.2** `entities/image` + `entities/location` | dto mirrors · VM mappers (status via `parseStatus`; **`storage_path` never exposed as a URL**; unknown similarity keys render by raw name) · entity-local `paths.ts`/`keys.ts` · Query hooks with the honest polling rule · stateless `ImageMetaList` | mapper unit tests green (casing seam isolated; no fabricated preview/safety/uniqueness values; unknown status ⇒ no polling) |
| **T-FS9.3** Fixtures | IMAGES + IMAGE_HISTORY + SIMILARITY + LOCATIONS in THE dataset; browser + node MSW for GET/regenerate(202)/DELETE(204)/references(multipart); `empty` scenario; multipart meta extraction reusing the FS7 seam | fixture/real drift is a type error (same wire mirrors); **no fixture invents an image URL**; kill-switch + grep locks green |
| **T-FS9.4** Route RBAC + RSC page | `/studio` → `content.view`; RSC page with `forChannelId`-scoped initial data; §3.5 segment/query grammar parsed | analyst/viewer reach the screen read-only; the deep link `/studio/<imageId>` renders; channel switch re-scopes with no stale seeds |
| **T-FS9.5** `widgets/studio` | StudioView (panel rail · grid · `j/k/↵` · `?q=` · paging) · LAZY ImageDetail/SimilarityReport/GenerationHistory · StudioEmpty · StudioHonesty | the stub is REPLACED; all states render; no spinner on any AI surface; 12px whispers use `secondary`; no virtualizer enters the graph |
| **T-FS9.6** `features/regenerate-image` | 202 queued-truth toast (task named, jobs invalidated) + guarded soft delete | RBAC-hidden without `content.edit`; MSW-tested incl. the regen-exhausted failure path (whatever status the wire returns is surfaced honestly); confirmed (non-optimistic) mutations; invalidations exactly per §3.2 |
| **T-FS9.7** `features/upload-references` (**entry duty**) | multipart upload to `POST /actors/{id}/references` over the FS7 `formData` seam; honest phases (Queued → Verified); §R6.1/§R6.2 copy; actor invalidation | **no percentage anywhere** (unit + component proof); rejected files explain why; RBAC-gated; a failed upload never claims acceptance |
| **T-FS9.8** Inspector `image` + palette + shortcuts | one LAZY registry row; palette `#` **Images** group distinct from Knowledge and Memory; studio rows in the lazy catalogue | FS2 `?inspect=` contract unchanged; the three `#` groups never merge; `#` image fetch fires only on mode entry; cheat-sheet auto-reflects; no dead shortcut is registered |
| **T-FS9.9** `features/explain-verification` | pure `buildImagePrompt` + LAZY panel over the UNCHANGED relay; Trust · provenance card citing the image record · Explainability (confidence absent) · wire cost · Stop | prompt-builder unit proof: contains that image's own record + its similarity report + the question and **NOTHING else** (no other image, no actor references, no knowledge); no auto-run; analyst/viewer see the honest "editor action" copy |
| **T-FS9.10** Honest-absence surfaces | generation · preview pixels · attach/accept · safety verdict · presets/batch — canonical copy naming the backend as owner | copy states the truth without promising a date; **no fake control, no placeholder image, no zero-valued chip** is rendered anywhere |
| **T-FS9.11** Unit + component tests | unit: image/location mappers · similarity-report interpretation (unknown keys) · polling rule · fixtures contract · `buildImagePrompt` proof · palette grouping · the five §3.4 ownership locks · the T-FS9.1 commons lock; component: StudioView per role/state · grid `j/k/↵` · ImageDetail (params/scene/history/similarity) · UploadReferencesDialog (no %) · ExplainVerificationPanel (no-auto-run/Trust/no-confidence) · ImageInspector (RBAC · 202 wording · guarded delete) | `pnpm test` green; FS2–FS8 suites untouched-green |
| **T-FS9.12** E2E + axe | `studio.spec.ts` (editor unless noted): grid with wire-derived chips · `j/k/↵` → Inspector · `/studio/<imageId>` deep link · similarity report shows real numbers and **no safety chip** · regenerate → queued toast → job inspector · guarded delete · references upload (Queued → Verified, **no %**) · explain-verification anchored on the wire-cost done marker → provenance cites the image · analyst read-only · honest-absence surfaces + `?panel=references` Back-reversibility + empty scenario · axe on grid AND detail, 3 viewports | full `pnpm e2e` green (3 projects); real-form sign-in; the four recorded Playwright pitfalls honoured |
| **T-FS9.13** Gates + report | `pnpm format` → `gate` → **`budget` (all ≤180; /studio new; /chat + /knowledge + /memory + /dashboard byte-compared)** → `e2e` → **`size` (measure vs 628; if over → STOP + dedicated per-chunk addendum, rule №33 — never pre-raise)** → `build-storybook`; `FS9_REPORT.md` (three statuses; FE-RV register incl. FE-RV-12; the §3.7 invariants each proved mechanically) | gates green or honestly FE-RV/STOP-flagged; **STOP** |

Order is strict: 0→1→…→13. T-FS9.1 precedes every feature task so the commons decision is locked before any
FS9 code can drift into `shared/config`.

## 5. Gates, contract truth & honesty

### 5.1 Engineering gates

The ten Stage 2 §14 gates run exactly as in FS7/FS8 (fast block → budget → e2e → size → storybook). Windows
discipline (PART4 §3.1/§3.1b): **kill port 3000 before any build/E2E**, and treat any
`Cannot find module …next…` / `./impl` failure as the known pnpm corruption (**19 occurrences**; recover with
`pnpm install --force`). Contract gate: every endpoint used exists **verbatim** in `API_SPEC.md`.

### 5.2 Contract truth & deviations (decided by approving this plan)

- **D1 — there is NO image-CREATE endpoint.** §Images carries `GET` list/detail/history/similarity,
  `POST /images/{id}/regenerate`, `DELETE /images/{id}` — and nothing that creates an image from a prompt.
  D4 §4's "Assumed API: `POST /images`" is a design-time assumption that the frozen contract does not honour;
  the SoT hierarchy (the backend contract is a §F2.3 **frozen input** > D4's assumption) rules. Image
  generation is the pipeline stage `generate_image` (§R2.5/§R13.2) owned by the backend queue. FS9 therefore
  ships **no prompt composer that cannot submit**: the free-form generation surface is an **honest, visible
  seam** (T-FS9.10), exactly as FS7 handled retrieval and FS8 handled the memory trace. A future create
  endpoint is optional backend work — never a prerequisite, never faked.
- **D2 — the contract exposes no image binary.** `images.storage_path` is an **object key** (§R6.8) and no
  endpoint serves the file. FS9 renders image **records**; the ONYX `ImageResult` frame is used with **no
  `src`** and an honest caption stating the binary lives in the backend's object storage. **No placeholder
  art, no generated thumbnail, no data-URI stand-in — including in the fixtures.** If the live wire turns out
  to carry a URL or signed link, **one mapper line** turns previews on (FE-RV-12); enabling remote images will
  additionally require an SEC-5 `img-src`/CSP decision, which is **recorded, not pre-configured**.
- **D3 — what the Image Studio IS in FS9.** The honest intersection of D3 §9 with the contract: the results
  grid · record detail (prompt + negative disclosure, generation parameters, scene metadata with actor and
  location resolved) · the §R6.5 **attempt history** · the §R6.4 **similarity report** (phash · CLIP · scene
  metadata — the first real verification data in the product) · the 202 **regeneration intent** · guarded soft
  delete · the §R6.1 **reference upload**. This is not a reduced screen; it is the screen's stated purpose
  ("prompt → generate → verify", D3 §9) answered from real data wherever the contract can back it.
- **D4 — no "Accept" and no "Attach to post".** No endpoint updates a post's `image_id` (§Posts has create,
  generate, regenerate, validate, approve/reject, schedule, publish, save-as-template — no attach and no
  general update). `ImageResult`'s `onAccept`/`onAttach` props are therefore **not passed**, so no dead control
  is rendered; the absence is explained once in the honesty surface. The ONYX component contract is untouched.
- **D5 — verification chips are wire-derived only.** *Verified / Needs Review* from the record's `status` via
  `parseStatus` · *uniqueness* from the real similarity report · *Regen ×n* from the real history. **A safety
  verdict is honestly absent**: §R6.7's image validator is a backend concern and the contract exposes no
  safety field, so no "Safety ok" chip is ever rendered. Unknown similarity keys render by **raw name** (the
  FS8 `style_features` discipline), so a wire change degrades gracefully.
- **D6 — no AI prompt-improvement, no preset suggestion.** D3 §9's AI row asks for prompt rewriting and preset
  advice; with no generation input endpoint both would be dead ends, and a suggested preset would imply a
  control that cannot submit. FS9 ships the honest analogue — the third instance of the FS7/FS8 pattern:
  **explain-verification**, grounded ONLY in the image record and its similarity report the user selected,
  with the provenance card citing that record. **No claim about safety, identity match (§R6.7), or uniqueness
  beyond the report's own numbers.** If the backend ever exposes generation or verification verdicts, they
  plug into the same components with no rework.
- **D7 — `/studio` RBAC PATCH.** `content.edit` → `content.view` (D3 §9 "Editor/Admin; Analyst/Viewer read"),
  with **every write and AI affordance `content.edit`-gated at the call site** — the FS7/FS8 precedent.
  `decideAccess` untouched. The backend remains the boundary: if the live API denies image reads to
  analyst/viewer, the UI renders the 403 permission state honestly, never a crash (recorded in FE-RV-12).
- **D8 — *(assumed)* image/similarity/reference wire shapes** (field casing, the similarity report structure,
  the 202 regenerate body, the multipart reference transport and its response) → registered as **FE-RV-12**
  (§5.3) with single adjustment points. Fixtures are typed by the same mirrors, so a live correction is a
  mapper-level change.
- FE-RV-3…11 otherwise unchanged. Nothing unexecuted is reported as a pass.

### 5.3 FE-RV impact

**Opens FE-RV-12 — live image round-trip:** image wire casing/fields · **whether any media URL / signed link
exists** (the single switch that turns previews on — plus the SEC-5 `img-src` decision it implies) · the
`GET /images/{id}/similarity` report shape (§R6.4 phash/CLIP/scene) · the `/history` shape (§R6.5) ·
`POST /images/{id}/regenerate` accepted body, the 202 payload and **the response when `IMAGE_MAX_REGEN` is
exhausted** (409/422/429 — the UI surfaces whatever arrives, honestly) · `DELETE` semantics · **the
`POST /actors/{id}/references` transport (multipart *(assumed)*), its response, and whether actors expose a
reference count** · the locations list shape · list channel filtering/pagination (`?limit/offset`
*(assumed)*) · whether analyst/viewer may read images at all (D7). **Single adjustment points:**
`entities/image/{model,paths,keys}.ts`, `entities/location/{model,paths}.ts`, `entities/actor/paths.ts` and
the upload transport in `features/upload-references`. FE-RV-9/10 unchanged (I6); FE-RV-11's actor line is
extended here and cross-referenced. FE-RV-6 (Chromatic) unchanged — no new stories.

## 6. Budget impact (First Load 180 kB · size-limit 628 kB)

### 6.1 Per-route First Load (authoritative, non-revisable)
- **/studio (new):** target **≤ 176 kB**, expectation ~150 (the /memory precedent) — the shell ships the grid
  and honesty surfaces only; detail, similarity, history, references, upload, AI panel and the inspector row
  are all lazy (§3.1). No markdown, no shiki, **no virtualizer**.
- **/chat (179, the standing reference):** FS9 touches no chat file (§3.3) and adds **zero commons rows**
  (T-FS9.1). Expectation: unchanged at 179. Measured before/after; **any movement is diagnosed from
  `app-build-manifest.json` before a single word is written about its cause** (the FS8 evidence-pack lesson).
- **/knowledge (175) · /memory (148) · /dashboard (167):** must not regress; `/memory` additionally absorbs
  the ~80-byte `actorPaths` addition (32 kB headroom).
- `pnpm budget` proves all 32 routes ≤ 180 and `.next/route-budget.json` records both numbers per route.

### 6.2 size-limit aggregate (detector 628 kB; measured 617.59 — headroom 10.41 kB)
Honest expectation: FS9 adds real weight — entities image/location (~3–5 kB), studio widgets + lazy detail
panes (~8–12), references/upload + explain panel (~5–8), fixtures growth (~3–4). **The 10.41 kB headroom will
most likely be exceeded again** — the fifth time in a row. Per rule №33 the plan does **NOT** touch the
threshold: implement → run `pnpm size` → if over, **STOP** and deliver a dedicated per-chunk addendum
(`FS9_REPORT_SIZE_ADDENDUM.md`, the FS6/FS7/FS8 template: growth attribution, eager/lazy split, First-Load
impact, byte-stability of pre-existing chunks, options) for the owner's ruling at acceptance. Expect the
**evidence-pack bar** (raw gate output, per-chunk tables, manifest proofs). `.size-limit.json` stays **628**
throughout the stage. The only remaining structural levers (polyfills/browserslist, icon audit, splitChunks)
are FS14/FS15 items and are **not** pulled forward by this plan.

### 6.3 Lazy-loading & commons verification checklist (executed at T-FS9.13, recorded in the report)
1. `.next/app-build-manifest.json`: **no FS9 chunk** (studio widgets, detail panes, references, upload, AI
   panel, inspector row) appears in ANY page's First Load list.
2. ImageDetail / SimilarityReport / GenerationHistory / ReferencesPanel / UploadReferencesDialog /
   ExplainVerificationPanel load via `dynamic()` on selection or intent only.
3. The image inspector row rides the lazy Inspector surface; no inspector code in any route First Load.
4. **The shared ONYX `FileUpload` chunk is absent from every page's First Load list** (the §3.6 two-owner
   case) — if hoisted, fixed structurally inside FS9.
5. `shortcuts-catalog.ts` still appears **only** in the cheat-sheet chunk (the FS8 lock re-run); the handler
   side carries no catalogue data.
6. **`shared/config/query-keys.ts` gains zero rows** (grep + diff), and `/chat`, `/knowledge`, `/memory`,
   `/dashboard` First Loads are byte-compared pre/post (179 / 175 / 148 / 167).
7. No studio slice statically imported into shared commons; fixtures remain dynamic-import-only from outside
   their slice (grep locks extended); dependency-cruiser 0, incl. **no cross-entity import** between `image`,
   `location`, `actor`, `persona` and `document`.
8. Aggregate per-chunk table produced from the size run (addendum-ready if §6.2 triggers).

## 7. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | **size-limit 628 likely blocks again** (10.41 kB headroom vs a whole new screen) | §6.2: measure → STOP → dedicated addendum + evidence pack → owner ruling; never pre-raise; never un-split code to game the detector |
| R2 | **/chat headroom is 1.0 kB and the offload lever is spent** | T-FS9.1 makes the commons delta **zero by construction**; §6.3.6 byte-compare; manifest forensics before any causal claim; structural fix or STOP |
| R3 | **A screen that shows no image pixels may read as broken** rather than honest | T-FS9.10 states the reason at the exact place a preview would appear; §5.2 D2 records the reasoning; one mapper line enables previews the day the wire carries a URL |
| R4 | **FE-RV-12 assumptions**, above all the similarity-report shape and the multipart reference transport | unknown report keys render by raw name; the upload reuses the FS7-proven `formData` seam; single adjustment points; fixtures typed by the same mirrors |
| R5 | The AI panel could drift toward safety/identity claims under prompt pressure | `buildImagePrompt` is pure and unit-proven; the panel renders only Trust/provenance/cost; **no safety or identity-match UI exists to fill** |
| R6 | The shared `FileUpload` module is now needed by two lazy owners and could be hoisted into commons | §3.6 rule 2 + §6.3.4 manifest check; the fix is a `dynamic()` boundary inside the studio dialog, never a threshold |
| R7 | Regeneration is asynchronous and easy to fake | 202 = queued-truth wording only; polling exists **only** while the wire says queued/running; an unknown status polls nothing and shows nothing (I8) |
| R8 | Reference upload touches a memory-graph file (`entities/actor/paths.ts`) | declared in §3.3, measured in §6.3.6; /memory headroom is 32 kB; FSD-correct placement |
| R9 | D3 §9 promises (generate/attach/presets/batch) may read as incompleteness | each is a visible, explained seam (T-FS9.10); §5.2 D1/D4 records the reasoning; the report repeats it |
| R10 | Windows hazards (19 `next` corruptions; stale Playwright webServer) | PART4 §3.1/§3.1b habits: kill port 3000 first; auto-recovery build pattern; re-verify suspicious numbers on a clean `.next` |
| R11 | Scope creep into FS10/FS11/FS12 (prompt library, analytics on images, locations management) | the OUT list §8 is explicit; those surfaces are not seamed, they are simply absent from this screen |

## 8. Not in FS9 (explicit)

No simulation of image creation, generation progress, previews/thumbnails/placeholder art, safety verdicts,
identity-match verdicts or uniqueness claims the wire does not carry (§5.2 D1/D2/D5) · no "Accept" /
"Attach to post" (§5.2 D4) · no aspect/size preset controls and no batch generation (nothing to submit them
to) · no `POST /posts/{id}/regenerate` (a **post/content** surface action, not the image workspace) · no
locations CREATE/PATCH (channel setup — FS12/FS13) · no persona/actor editing (FS8 owns it; actors gain only
the §R6.1 reference upload) · no `GET|PUT /channels/{id}/settings` read for the regen cap (stated as a backend
fact instead) · no AI prompt-improvement or preset advice (§5.2 D6) · no image surfaces inside AI Chat, and no
chat/knowledge/memory-widget edits at all (§3.3) · no backend change, `app/`/Protocol/SoT change · no ONYX
token-value change · no new dependencies (`date-fns` stays deferred) · no threshold changes (628/180 stand) ·
no new ADR · no new stories · no README/handoff updates during the stage · no commits/pushes unless
instructed.

---

**STOP — FS9 plan complete. Awaiting your approval, including the §5.2 deviations D1–D8 (no image-create
endpoint → generation is an honest seam · no media URL → records without fabricated previews · what the Image
Studio IS · no accept/attach · wire-derived chips with safety honestly absent · no AI prompt-improvement →
explain-verification instead · the `/studio` RBAC PATCH · *(assumed)* image/similarity/reference wire shapes →
FE-RV-12), the §1/T-FS9.1 zero-commons mechanism (entity-local query keys) as the stage's first action, and
the §6.2 expectation that the 628 kB detector will again need the rule-№33 measure-then-decide procedure at
acceptance.** On approval I implement §4 in order, run all ten gates for real, write `FS9_REPORT.md`, and stop
for acceptance. FS10 will not be started.
