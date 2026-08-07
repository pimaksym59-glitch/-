# FS10 — Prompt Library (Plan)

**Track:** Web Platform implementation · **SoT:** `FRONTEND_MASTER_SPEC.md` · implements **D3 §10 (Prompt
Library)** through Stage 2 §5 (rendering group "Knowledge / Memory / **Prompts**: RSC lists + reader; client
for the editor") · §7 (state owners) and the Stage 3 inventories (§1 route `prompts/[[...path]]` · §5 route row
"AI refine · ✓ version" · §3 feature `manage-prompt` · §4 entity `prompt`), against **`API_SPEC.md`**:

- **Prompts (§R10.6 — versioned)** — `GET /prompts?type=` · `POST /prompts` (**a new version**) ·
  `GET /prompts/{id}/versions`
- **AI Studio** — the frozen `POST /studio/dry-run` (§R10.9 — *"тест промптов … dry-run … не пишет в память
  каналов и не публикует"*) through the **UNCHANGED** FS6 relay

…and **nothing else**. The `/prompts` group is **three calls**. The frozen contract carries **no
`GET /prompts/{id}`**, **no PATCH**, **no DELETE**, **no promote/activate call**, **no `is_active` column**,
**no `name` column**, **no `variables` field** and **no `channel_id`** on the record (`DATABASE_SPEC` §prompts:
`id · type prompt_type · text · version int · author uuid · model text · result text · created_at`, with the
normative note **"Правка = новая версия"**). Backend truth this stage renders: **§R10.6** prompts are a
versioned administrative artifact · **§R5.3** the runtime prompt is *assembled by the backend prompt-builder*
from persona + style rules + topic + schedule + few-shot + constraints — a stored row is an input to that
builder, never "the prompt the model received" · **§R11.4** prompts may not be auto-changed; only an
administrator changes them · **§R10.9** dry-run is isolated. Design language: D2 §14 **PromptCard** (built at
FS3, data-starved since) · §13.18 CodeBlock **diff mode** · §13.23 Timeline · §15 empty state · D1 §6.4 palette
`#` · A5–A8 (Trust + Explainability, no blocking spinners, Aurora only on genuine AI moments).
**This is a PLAN. No code yet.**

**Goal of FS10:** make the platform's **prompt history legible, comparable and safely extendable** with what
the contract actually carries. `/prompts` stops being a stub: the versioned prompt library (prompt types →
version chain → version reader), a **real diff between any two versions** (computed client-side over two texts
the contract serves, rendered through the frozen CodeBlock diff mode), **new-version authoring as the
contract's only write** (`POST /prompts` — editing *is* versioning), the Inspector `prompt` view, a palette `#`
**Prompts** group kept structurally separate from Knowledge, Memory and Images, and — if the owner approves
§5.2 **D8** — **test-this-version**, a user-invoked isolated dry-run of exactly the selected version's text, so
**PromptCard finally renders real data** (the FS7 Citation, FS8 MemoryCard and FS9 ImageResult precedent).
Everything the contract cannot back — activation/promotion, deletion, variables, per-channel prompts, author
identity, model comparison — is a **visible honest seam**, never simulated. **No `app/` / Protocol /
MASTER_SPEC change · no endpoint invented · no ONYX token-value change · no new dependencies.**

**Entry conditions — satisfied:** FS9 accepted 2026-08-02 (size-limit re-baselined to **655 kB** after a
dedicated addendum **and** a full evidence pack; the I2 rounding deviation ruled resolved; post-FS9 standing
references **`/chat` 178** · `/knowledge` 175 · `/dashboard` 167 · `/studio` 164 · `/memory` 149 · stubs 107;
FE-RV-12 opened). This plan is FS10's first deliverable. Frozen FS10 entry duties (handoff PART4 §8.2):
prompt management per D3 §10 on the frozen versioned `/prompts` group — **"nothing else exists, so
diff/promote/playground surfaces must be checked against the contract before they are promised"** (§2 below is
that check) · the plan must add **ZERO commons bytes** (entity-local keys, T-FS9.1, are the proven mechanism) ·
every heavy leaf lazy from the start · the **seven fixed artefacts** required since FS7/FS8 (PART1 §4.5/§4.6)
are §3.1–§3.7 below.

---

## 1. Scope

**IN:**

- **T-FS10.1 — the ZERO-commons mechanism (FIRST, before any feature code).** FS8's offload lever is spent and
  FS9's kilobyte was returned by webpack, not won; FS10 is therefore designed to **add no commons rows at all**.
  The mechanism is the now-default one (FS9 T-FS9.1): **entity-local paths + keys**.
  `entities/prompt/{paths,keys}.ts` own their builders; `shared/config/query-keys.ts` and
  `shared/lib/api/endpoints.ts` gain **zero rows** (pointer comments only — stripped at build, exactly 0 runtime
  bytes). Locked by a grep test: no `prompts` key/path builder may appear in either commons module, and the
  `prompts` key namespace may not collide with `posts` / `documents` / `personas` / `actors` / `images` /
  `locations`. **New for FS10:** the namespace is **channel-free by construction** (§5.2 D1) — the lock also
  asserts that no prompt key carries a channel dimension, so the channel switcher can never re-scope it.
- **Entities (T-FS10.2):** `entities/prompt` — wire mirrors in `dto.ts` (**types erased at build → zero runtime
  bytes**), VM mappers (**unknown `type` values render by their raw value**, the `parseStatus`/`style_features`
  discipline; `author` is surfaced as the raw id — the console never calls the owner-only `/users` group to
  resolve it, §2), entity-local `paths.ts` + `keys.ts`, Query hooks (`usePrompts` / `usePromptsByType` /
  `usePromptVersions`), the pure grouping selector (rows → prompt types → version chains), and the pure
  **`diffVersions(a, b)`** utility (Stage 3 §4 names it) producing `+`/`-` prefixed lines for the frozen
  CodeBlock diff mode — **no diff dependency, no diff endpoint** (§5.2 D7).
- **Fixtures (T-FS10.3):** PROMPTS rows across several `prompt_type` values with **real version chains**
  (v1…v3 of the same type, monotonic `created_at`, `model`/`result` present on some rows and absent on others),
  **one row carrying an unrecognised `type`** so the raw-value path is exercised, plus `GET /prompts?type=`
  filtering, `GET /prompts/{id}/versions` and `POST /prompts` → **201 with an incremented `version`** in THE one
  dataset + browser/node MSW; `empty` scenario honoured; kill-switch and grep locks unchanged.
- **Route + RSC page (T-FS10.4):** `routes.ts` `/prompts` permission `content.edit` → **`content.view`**
  (§5.2 D9 — registry datum only, `decideAccess` untouched, the FS7/FS8/FS9 precedent);
  `app/(workspace)/prompts/[[...path]]/page.tsx` replaces the stub with an RSC initial-data page
  (`serverApiOrNull('/prompts')` — **no channel scoping and no `forChannelId`**, because the record has no
  `channel_id`; the page states that platform truth instead of implying a scope it does not have).
- **Prompt workspace (T-FS10.5), `widgets/prompts`:** two-pane library → **type list** (each row: type label,
  latest version number, when it was last changed, version count) → **LAZY** prompt detail (the version
  **Timeline** §R9.10-style, the selected version's text in a reading-grade `<pre>` — plain text, **not** a code
  highlighter — with `model`/`result` shown only when the wire carries them) → **LAZY** diff view (any two
  versions of the same type through the frozen CodeBlock diff mode). `j/k/↵`, nuqs `?q=` list filter (honestly
  labelled as list filtering), the contract-native **`?type=`** facet (the one filter the wire itself accepts),
  D2 §15 empty state, per-region loading/error states, D3 responsive (mobile: list → detail full-screen, diff as
  a sheet).
- **features/manage-prompt (T-FS10.6)** — Stage 3 §3's slot realized as what the contract carries: **"New
  version"** (`POST /prompts` → 201) from the version composer (ONYX Textarea + react-hook-form + Zod, all
  existing deps), **confirmed, never optimistic** (§R11.4 makes this an administrative act), prefilled from the
  version being viewed, with an **unsaved-work draft** persisted through the existing FS6 `shared/lib/persist`
  primitive behind **one feature-owned module** (components never touch storage directly — the FS6 owner
  condition, applied at feature scale), cleared on a successful save. `content.edit`-gated at the call site.
  **No promote, no delete, no rename, no PATCH** — none exists (§5.2 D2/D3).
- **Inspector `prompt` + palette + shortcuts (T-FS10.7):** one **LAZY** registry row (the FS7/FS8/FS9
  precedent — the Inspector panel sits in shell commons): version metadata, the recorded `model`, the raw
  `author` id, the text preview, and a "Compare with previous" link; `?inspect=prompt:<rowId>` under the
  unchanged FS2 URL contract. Palette **`#` Prompts group** (a **fourth** deliberately separate group, §2),
  fetched on `#` entry inside the existing lazy overlay chunk. Prompt shortcuts (`/` search, `n` new version,
  `d` diff, `⌘s` save inside the composer) added to the **lazy** `shortcuts-catalog.ts` only; the generic
  `detail-save` / `detail-edit` rows stay **inactive** (they would claim behaviour other screens do not have),
  and **`⌘↵ run in Playground` is deliberately not registered** — there is no Playground screen to run in.
- **features/test-prompt (T-FS10.8) — subject to §5.2 D8 approval.** LAZY, user-invoked "Test this version"
  over the frozen `POST /studio/dry-run` via the **UNCHANGED** FS6 relay/stream machinery: a pure
  `buildPromptRun` unit-proven to send **only the selected version's own text** plus the user's optional sample
  input and **nothing else** (no other version, no persona, no channel data, no knowledge); output carries
  TrustLabel (**Generated · Source Available**), a provenance card citing **that version row**,
  ExplainabilityPanel (data used = this version's text; **confidence honestly absent**), wire-only cost, the
  §R10.9 isolation statement (no publication, no memory write), Stop preserves partial, nothing auto-runs,
  `content.edit`-gated. **The output is never auto-saved** into a version (§5.2 D8).
- **Honest-absence surfaces (T-FS10.9):** activation / "Promote to active" (no endpoint, no field) · deletion
  (no endpoint) · variables and variable insertion (no field, no documented templating; §R5.3 states who
  assembles the runtime prompt) · per-channel prompts (no `channel_id` — the library is **platform-wide**) ·
  author identity (the `/users` group is owner-only; the raw id is shown, never a fabricated name) · model
  comparison (`POST /studio/compare` belongs to the AI Playground screen, which is not this stage) — each
  renders canonical honest copy naming the backend as owner, the FS7/FS8/FS9 precedent.
- Tests (T-FS10.10/11/12) and gates + `FS10_REPORT.md` (T-FS10.13).

**OUT (full list §8):** any simulation of activation, deletion, variables, channel scoping, author names or
model comparison · the AI Playground screen (`/playground` stays a stub; `POST /studio/compare` is its call) ·
AI-authored prompt text (§5.2 D8) · new dependencies · threshold changes.

**Carried from FS9 (§10):** R2 → §3.3/§6.1 keep `/chat` at **178** with **zero commons rows added** (T-FS10.1) ·
R3 → every budget movement is diagnosed from `app-build-manifest.json` and, if contested, proved with a
**control build** before a word is written about its cause · R4 → FE-RV-12 unchanged (FS10 touches no image
file) · R6 → the shared `FileUpload` two-owner case is untouched (FS10 uploads nothing) · R7 → the Windows
habits (kill port 3000; auto-recovery build) apply unchanged.

## 2. The contract reality of prompt management (a first-class constraint, not a note)

D3 §10 describes "author, version, test, diff, promote". The frozen contract supports **author (as a new
version)**, **version** and **list**; it supports **neither promotion nor deletion nor variables**, and the
prompt's identity is its **type**, not a name:

| D3 §10 promise | Contract reality | FS10 |
|---|---|---|
| prompt **list** (name, active version, variables, edited) | `GET /prompts?type=` is real. The row has **`type`, not `name`**; **no `is_active`**; **no `variables`**; "edited" = the newest version's `created_at` | list of **types** with the real version count and timestamp; **no Active/Draft badge, no variables count** (§5.2 D1/D2/D5) |
| **version editor** with variable highlighting | `POST /prompts` = "Правка = новая версия" — real. **No variables field and no documented templating**; §R5.3 says the *backend* assembles the runtime prompt | plain-text version composer; **no variable claims of any kind** (§5.2 D5) |
| **diff** vs previous | **no diff endpoint** — but two version *texts* are served, and a diff is a pure derivation of them | client-side `diffVersions` → the frozen CodeBlock **diff mode** (§5.2 D7) |
| **Promote to active** (guarded) | **no promote endpoint and no active column.** Which row the pipeline uses is decided backend-side and is not expressed in the contract | honest seam — **no promote control, no "active" claim** (§5.2 D2) |
| **Run in Playground** | `POST /studio/dry-run` is real (§R10.9, literally "тест промптов"); `POST /studio/compare` is real but is the **Playground screen's** call | **test-this-version in place** (single version, single model) if §5.2 D8 is approved; compare stays with `/playground` |
| duplicate / delete | **no DELETE, no PATCH** on `/prompts` | absent — no destructive affordance exists to render |
| per-channel prompts | the `prompts` table has **no `channel_id`** | the library is stated as **platform-wide**; the channel switcher provably does not re-scope it (§3.7 I5) |
| author | `author uuid FK→users`; the `/users` group is **owner-only** (RBAC matrix) | the raw id is shown; **no name lookup is attempted and no name is invented** |
| AI drafts/refines prompts | §R11.4: prompts change **only via an administrator**; an AI-authored governed artifact with an auto-save path is the exact thing that requirement forbids | not shipped — the honest analogue is **testing** the human-authored version (§5.2 D8) |

**Prompts ≠ Knowledge ≠ Memory ≠ Images — structural, the §R9.3 discipline generalized a third time:**

| Dimension | Knowledge (FS7) | Memory (FS8) | Images (FS9) | **Prompts (FS10)** |
|---|---|---|---|---|
| Route | `/knowledge/[[...docId]]` | `/memory/[[...scope]]` | `/studio/[[...id]]` | **`/prompts/[[...path]]`** |
| Contract | `/documents` | `/personas`, `/actors`, posts | `/images`, references, `/locations` | **`/prompts` (three calls)** |
| Entities | `document` | `persona`, `actor` | `image`, `location` | **`prompt`** |
| Query keys | commons | commons | entity-local | **entity-local, and channel-FREE** |
| Scope | channel-isolated | channel-isolated | channel-isolated | **platform-wide (no `channel_id`)** |
| ONYX card | KnowledgeCard | MemoryCard | ImageResult | **PromptCard** (§5.2 D6) |
| Palette `#` group | "Knowledge" | "Memory" | "Images" | **separate "Prompts" group** |
| AI panel | ask-document | explain-style | explain-verification | **test-prompt** (§5.2 D8) |

No shared "artifact" abstraction, no merged list, **no cross-entity import**. **Prompts ≠ AI Chat:** FS10
touches **zero** chat files (§3.3), and no prompt affordance appears inside the chat surface.

## 3. Deliverables, matrices and guarantees

### 3.1 Rendering & loading matrix (fixed at approval — every new UI module)

| Module | Server / Client | Eager / Lazy | First Load impact |
|---|---|---|---|
| `prompts/[[...path]]/page.tsx` | **Server (RSC)** — `serverApiOrNull('/prompts')`, no channel scope | eager (route entry) | defines `/prompts`; RSC ships no client JS |
| `PromptLibraryView` (shell + type list host + filters) | Client (Query island, keyboard, nuqs) | eager — the route shell island | **YES — /prompts only** (target ≤170 kB); imports nothing heavy statically |
| `PromptTypeList` (rows, `j/k/↵`, `?q=`/`?type=`) | Client | eager (part of the shell) | **YES — /prompts only** |
| `PromptsEmpty` (D2 §15) · `PromptsHonesty` (activation/delete/variables/channel/author/compare seams) | Client (static markup) | eager (bytes) | YES — /prompts only, byte-level |
| `PromptDetail` (version Timeline + version text reader) | Client | **LAZY** — `dynamic()` on selection | **NO** |
| `PromptDiff` (+ the frozen **lazy** CodeBlock entrypoint → Shiki) | Client | **LAZY** — `dynamic()` on the diff intent | **NO** |
| `VersionComposer` + `useCreatePromptVersion` (+ the draft module) | Client | **LAZY** — `dynamic()` on `n` / "New version" | **NO** |
| `TestPromptPanel` (+ streaming machinery) — *if D8 approved* | Client | **LAZY** — `dynamic()` on intent | **NO** |
| `PromptInspector` | Client | **LAZY** registry row (FS7/FS8/FS9 precedent) | **NO** route First Load impact |
| Palette `#` Prompts group | Client | inside the existing FS2 **dynamic palette overlay**; fetch only on `#` entry | **NO** |
| Prompt rows in `shortcuts-catalog.ts` | isomorphic data | eager **only inside the lazy cheat-sheet chunk** (T-FS8.1 split preserved) | **NO** |
| `entities/prompt` (model/hooks/paths/**keys**/diff) | Client lib (+ mappers used by RSC) | eager **within the /prompts shell only** | YES — /prompts only |
| `shared/config/query-keys.ts` · `shared/lib/api/endpoints.ts` | isomorphic data | eager (commons) | **ZERO — no rows added** (T-FS10.1; pointer comments only, stripped at build) |
| `shared/config/routes.ts` | isomorphic data | eager (commons) | one permission **value** change; no new import |
| `shared/config/shortcuts.ts` | types | eager (commons) | **ZERO** — a **type-only** `'prompts'` scope member (erased at build; the FS9 precedent) |
| `shared/types/dto.ts` | types | — | **zero runtime** (types erased) |

Rule fixed with this table: **every eager-client addition lives inside the /prompts route shell**, and the only
shared-module edits are a permission datum, a types-only file, a type-only union member and two comments. Any
deviation found at `pnpm budget` is fixed **structurally**, never by threshold.

### 3.2 Query keys & invalidate graph (fixed at approval)

New keys, **entity-local and deliberately channel-free** (T-FS10.1 / §5.2 D1):

```
promptKeys.list()          ['prompts','list']            promptKeys.byType(type)  ['prompts','list',type]
promptKeys.versions(id)    ['prompts','versions',id]
```

Invalidate graph (writer → keys):

```
useCreatePromptVersion  POST /prompts → 201  → invalidate promptKeys.list()
                                               · promptKeys.byType(type of the new version)
                                               · promptKeys.versions(id of the row the chain was read from)
```

That is the stage's **only** writer — the contract exposes no other prompt mutation. Non-invalidation flows,
fixed explicitly: **test-prompt performs ZERO Query writes** (the streamed answer lives in the transient
Zustand owner — the FS6/FS7/FS8/FS9 rule) · **a channel switch invalidates and re-scopes nothing** here, because
no prompt key carries a channel (asserted in §3.7 I5 — the inverse of the FS5 cross-channel lesson) · FS5–FS9
key shapes are **untouched**, and no FS10 writer invalidates `['documents',…]`, `['personas',…]`,
`['actors',…]`, `['images',…]`, `['locations',…]` or `['posts',…]`. **No polling anywhere:** `POST /prompts`
returns 201, not a 202 queue intent, so there is no queued truth to poll and none is invented.

### 3.3 FS5 / FS6 / FS7 / FS8 / FS9 no-touch guarantee (protects /chat 178 · /knowledge 175 · /dashboard 167 · /studio 164 · /memory 149)

**Guaranteed ZERO edits** — chat surface: `app/(workspace)/chat/[[...id]]/*` · `widgets/chat/*` ·
`features/send-message/*` · `features/insert-to-channel/*` · `entities/conversation/*` (incl. THE
ConversationRepository) · `shared/lib/stream/*` · `shared/lib/ai-gateway/*` · `app/api/ai/stream/route.ts` ·
`shared/lib/persist/index.ts` (**consumed unchanged** by the draft module) · `shared/config/models.ts`.
Knowledge: `app/(workspace)/knowledge/*` · `widgets/knowledge/*` · `features/{add-source,ask-document}/*` ·
`entities/document/*`. Memory: `app/(workspace)/memory/*` · `widgets/memory/*` ·
`features/{edit-persona,explain-style}/*` · `entities/{persona,actor}/*`. Studio: `app/(workspace)/studio/*` ·
`widgets/studio/*` · `features/{regenerate-image,upload-references,explain-verification}/*` ·
`entities/{image,location}/*`. Dashboard: `widgets/dashboard/*` · `features/review-post/*`. The FS6
stream/relay machinery is **consumed as-is** (test-prompt calls `useAssistantStream` exactly as
ask-document / explain-style / explain-verification do) — never modified.

**Shared files edited, and why each cannot grow a protected route:**

| File | Edit | Why safe |
|---|---|---|
| `shared/config/query-keys.ts` · `shared/lib/api/endpoints.ts` | **pointer comments only — ZERO rows** | comments are stripped at build; the runtime delta is exactly 0 bytes (T-FS10.1) |
| `shared/config/routes.ts` | one permission datum (`/prompts` → `content.view`) | value change, not a new import |
| `shared/config/shortcuts.ts` | **type-only** `'prompts'` scope member | erased at build — zero runtime bytes (the FS9 `'studio'` precedent) |
| `shared/config/shortcuts-catalog.ts` | prompt rows + scope label | lives only in the lazy cheat-sheet chunk (T-FS8.1 split preserved and lock-tested) |
| `shared/types/dto.ts` | +prompt wire mirrors | **types erased at build — zero runtime bytes** |
| `widgets/inspector/Inspector.tsx` | +1 LAZY registry row | `dynamic()` — no static weight in shell commons (thrice-proven at FS7/FS8/FS9) |
| `widgets/command-palette/*` | Prompts result group | inside the FS2 dynamic overlay chunk |
| `shared/ui/ai/prompt-card/*` | **only under §5.2 D6 option 1** — two additive optional props | backward-compatible; a lazy-consumed component; no token value changes; **not touched at all** under D6 option 2 |
| `shared/lib/fixtures/{dataset,browser,meta}` | prompts coverage | fixture env only; kill-switched, grep-locked, lazy |

**Backstop:** §6.3 byte-compares `/chat` (178), `/knowledge` (175), `/dashboard` (167), `/studio` (164),
`/memory` (149) and the stubs (107) pre/post. Any regression is fixed **structurally inside FS10's own surface**
— deeper lazy splitting of the library shell, or registering the prompt Inspector view from the prompts widget
instead of the shared registry — and if no structural fix holds the number, the stage **STOPS and reports**
(the FS7 precedent). 180 kB is non-revisable.

### 3.4 State-ownership matrix (fixed at approval)

Stage 2 §7 / D4 §7 owners applied to every piece of FS10 state. **Hard rule: no state is owned by TanStack
Query and Zustand at the same time.**

| State | Owner | Persistence | Invalidation source | Server / Client | Cache lifetime | Replacement seam |
|---|---|---|---|---|---|---|
| **Prompt list (all types)** | **TanStack Query** — `promptKeys.list()` | none | `useCreatePromptVersion` only (§3.2) | RSC seeds via `serverApiOrNull` (**no `forChannelId` — the record has no channel**) | `staleTime 60s` (Stage 3 §8 "prompts 60s") | `entities/prompt/{hooks,paths,keys,model}.ts` (FE-RV-13) |
| **Prompt list filtered by type** | **TanStack Query** — `promptKeys.byType(type)` | none | same | client (the `?type=` facet is the contract's own filter) | `staleTime 60s` | same |
| **Version chain** | **TanStack Query** — `promptKeys.versions(id)` | none | same | client (LAZY pane) | `staleTime 60s` | same |
| **Diff selection (which two versions)** | **URL (nuqs)** — `?compare=<version>` against the shown version | URL is the persistence | user navigation only | client | n/a | §3.5 grammar |
| **Version composer text (unsaved work)** | **Draft owner** — one feature-owned module over the existing `shared/lib/persist` (D4 §7 "prompt edits … auto-persisted locally"); **components never touch storage** (the FS6 condition) | `localStorage`, namespaced `prompt-draft:<type>`, versioned | cleared on a successful 201; a discard action clears it explicitly | client | until saved/discarded | `features/manage-prompt/model/promptDraft.ts` — the single storage toucher |
| **Composer form state** | **react-hook-form** (component-scoped) | none | user input | client | dies with the dialog | `features/manage-prompt` |
| **Library UI state** | **split by shareability, never Zustand:** URL (**nuqs**) owns `?q=`, `?type=`, `?compare=`, `?inspect=`; the selected type/version lives in the **route segments**; component `useState` owns only ephemeral things (dialog open, focused index) | URL is the persistence | user navigation only | client | n/a | `shared/hooks/useInspector` + nuqs keys (§3.5) |
| **test-prompt result** *(if D8 approved)* | **transient Zustand** — the FS6 assistant store, keyed `prompt:<rowId>` | none — never persisted, never reconciled into Query | `reset()`/unmount; a new run replaces the slice | client | until unmount | `shared/lib/stream/assistant.ts` (consumed UNCHANGED — §3.7 I3) |

**The no-double-ownership rule, made checkable (T-FS10.10):**
1. `features/test-prompt` contains **zero** `queryClient` writes (`setQueryData`/`invalidateQueries`) —
   source-level test over the slice (the FS6/FS8/FS9 rule).
2. The assistant key namespace used here (`prompt:<rowId>`) never appears in a Query key — asserted in the same
   test (prompt keys are `['prompts', …]` only).
3. No FS10 module imports `useUiStore` for prompt data (the global store keeps owning only theme/density/
   sidebar/active-channel/palette/toasts) — grep-lock test.
4. **The draft is not server state:** the draft module never reads or writes the Query cache, and the composer
   never calls `persist` directly — both asserted by test (the ConversationRepository discipline at feature
   scale).
5. `PromptTypeList`, `PromptDiff` and the diff utility are pure functions of their inputs (stateless) —
   asserted by test, `diffVersions` additionally by a table of text pairs.

### 3.5 Navigation contract (URL is the state; every transition is reversible)

Stage 3's route is `/prompts/[[...path]]`; FS10 fixes the segment and query grammar inside it, keeping D1 §5.4's
shape (`/prompts/:name/versions/:v`) with the **type** as the human-readable identity the contract actually
carries (§5.2 D1). **Every transition is expressible as a URL, restorable by paste, and reversible by the
browser Back button.**

| URL | Meaning | Rendering |
|---|---|---|
| `/prompts` | the library, all types, nothing selected | RSC list, no detail pane |
| **`/prompts/<type>`** | one prompt type: its version chain, newest version shown | RSC list + **LAZY** `PromptDetail` |
| **`/prompts/<type>/versions/<n>`** | a specific version of that type | same pane, version `n` selected |
| `/prompts?q=<text>` | list filter (nuqs, `history: replace`) | filters the loaded rows; honestly labelled as list filtering |
| `/prompts?type=<type>` | the **contract-native** facet (`GET /prompts?type=`), nuqs `history: replace` | server-filtered list |
| **`/prompts/<type>/versions/<n>?compare=<m>`** | diff version `n` against version `m` | **LAZY** `PromptDiff`; nuqs **`history: 'push'`** — a real state change must be Back-reversible (**the FS8 `?scope=` defect precedent, applied preventively**) |
| `/prompts?inspect=prompt:<rowId>` | prompt-version Inspector overlay | drawer (desktop) / sheet (mobile); **no navigation**; Esc or Back closes |
| `/knowledge?inspect=document:<id>` · `/memory?inspect=persona:<id>` · `/studio?inspect=image:<id>` | **unchanged FS7/FS8/FS9 contracts** — listed only to show the shared grammar | FS7/FS8/FS9 views |

**Grammar rules (unchanged since FS2, restated so FS10 cannot drift):** `?inspect=<type>:<id>` works in every
route group and never navigates; `?inspect` writes with `history: 'push'` (Back closes the inspector); list
filters write with `history: 'replace'`; a segment change (`/prompts` ⇄ `/prompts/<type>` ⇄
`…/versions/<n>`) is a real navigation and a real history entry.

**Cross-surface transitions:**

| From → To | Trigger | URL effect | Reversible by |
|---|---|---|---|
| anywhere → Prompts | palette `#<query>` → **Prompts** group (separate from Knowledge/Memory/Images, §2) · `g p` chord · sidebar | `push /prompts/<type>` or `push /prompts` | Back |
| library → version | row `↵`/click | `push /prompts/<type>` (open) or `push ?inspect=prompt:<rowId>` (inspect) | Back / Esc |
| version → diff | "Compare with previous" / `d` | `push ?compare=<m>` | Back |
| version → new version | `n` / "New version" | dialog only — **no URL change** (an ephemeral overlay, the FS7 AddSource precedent); a successful save `push`es `/prompts/<type>/versions/<newN>` | Back returns to the previous version |
| Prompts ⇄ Chat / Knowledge / Memory / Studio | **no direct link in FS10** — the palette is the shared entry point | — | — |

**Invariant (asserted in E2E):** for each of `/prompts`, `/prompts/<type>`, `/prompts/<type>/versions/<n>`,
`?compare=<m>`, `?inspect=prompt:<rowId>` — a full page reload reproduces the same visible state, and Back
returns to the exact previous state. **Additionally (new for FS10):** switching the active channel changes
**nothing** on this screen, and the URL is unaffected — prompts are platform-wide (§3.7 I5).

### 3.6 Bundle ownership (per-chunk architecture)

| Chunk | Imported by (the ONLY importer) | First loaded when | Could it reach commons? | Proof it does not |
|---|---|---|---|---|
| `prompts-shell` (PromptLibraryView + PromptTypeList + PromptsEmpty + PromptsHonesty + prompt hooks) | `app/(workspace)/prompts/[[...path]]/page.tsx` (route entry) | `/prompts` is opened | **It IS route-eager — by design, route-scoped** | it appears in the `/prompts` First Load list of `app-build-manifest.json` and **in no other page's list** |
| `prompts-detail` (PromptDetail + version Timeline + version reader) | `PromptLibraryView` via `dynamic()` | a type is selected (segment or row click) | only if someone static-imports it | grep: no static import outside the `dynamic()` call; absent from every page's First Load list |
| `prompts-diff` (PromptDiff + `diffVersions` usage) | `PromptDetail` via `dynamic()` | the diff intent (`d` / "Compare") | same | same manifest + grep proof |
| **ONYX `CodeBlock` → Shiki (51.92 kB, byte-stable since FS3)** | the frozen **lazy** entrypoint, reached only from `prompts-diff` | the first diff is opened | **a second consumer could cause webpack to hoist it** — the FS9 `FileUpload` two-owner case, repeated | it must remain **absent from every page's First Load list**; the version *reader* deliberately uses a plain `<pre>` (prompt text is text, not code), so Shiki has exactly **one** FS10 entry point; if it were ever hoisted, the fix is a `dynamic()` boundary inside the diff pane, never a threshold |
| `prompts-composer` (VersionComposer + `useCreatePromptVersion` + the draft module + rhf/Zod schema) | `PromptLibraryView` via `dynamic()` | the "New version" intent | same | manifest + grep proof; additionally RBAC-gated so read roles never mount it |
| `test-prompt` (panel + `buildPromptRun`) *(if D8 approved)* | `PromptDetail` via `dynamic()` | the user presses "Test this version" | same | manifest + grep proof; the streaming machinery it uses is the **already-existing** FS6 chunk, not a new copy |
| `prompt-inspector` | `widgets/inspector/Inspector.tsx` via `dynamic()` (registry row) | the first `?inspect=prompt:` target | **highest risk** — `InspectorPanel` sits in shell commons, so a static import taxes EVERY route | the FS7/FS8/FS9 precedent: the row is `dynamic()`; verified by the manifest check + the `/chat` byte-compare |
| palette Prompts group | `widgets/command-palette/CommandPalette.tsx` (already a `dynamic()` overlay) | the palette is first opened | no — it inherits the existing overlay chunk | it adds no new chunk; the `#` prompt fetch is `enabled`-gated on mode entry |
| prompt rows in `shortcut-catalog` | `widgets/shortcut-cheatsheet/*` **only** (a lazy overlay) | `⌘/` is first opened | it must not return to commons | the FS8 lock test re-runs: the catalogue appears in exactly one chunk, absent from every First Load list |

**Ownership rules fixed by this table:** (1) exactly one importer per lazy chunk, including the declared Shiki
case, which must stay lazy behind a single entry point; (2) any module a route shell and a shell-commons widget
both need lives in the **entity** layer (the FS7 `paths` / FS9 `keys` precedent); (3) **no new chunk and no new
row may be introduced into `shared/config`, `shared/lib/api` or `widgets/app-shell`** — those are commons, and
their growth is measured against `/chat`'s **2.0 kB** headroom, which webpack returned rather than a lever won.

### 3.7 Regression invariants (checkable, not intentions)

| # | Invariant | Proof (executed at T-FS10.13, recorded in FS10_REPORT) |
|---|---|---|
| **I1** | **`/chat` First Load ≤ 178 kB** (the post-FS9 standing reference; 180 non-revisable). FS10 adds **zero commons rows** (T-FS10.1) | `pnpm budget` route table + `.next/route-budget.json`, byte-compared against the FS9 baseline (178); if it moves, `app-build-manifest.json` forensics — and a **control build** where the movement is contested — decide the cause **before** any claim is written (the FS8/FS9 lesson: the manifest is the arbiter, never a plausible story) |
| **I2** | **`/knowledge` ≤ 175 · `/dashboard` ≤ 167 · `/studio` ≤ 164 · `/memory` ≤ 149 · stubs ≤ 107**, all routes ≤ 180 | full 31-route table comparison (the `/prompts` stub is replaced, so the stub count drops 25 → 24) |
| **I3** | **The AI relay stays VERBATIM.** `app/api/ai/stream/route.ts` and `shared/lib/ai-gateway/*` byte-identical; test-prompt adds no frame type, no cadence, no post-processing | `git diff --stat` over those paths = empty; the FS6 verbatim-relay unit trio re-runs green untouched |
| **I4** | **ConversationRepository, the conversation slice and `shared/lib/persist` byte-identical**; no FS10 module imports `entities/conversation`; the draft module is the only new `persist` consumer | empty diff + grep over `widgets/prompts`, `features/{manage-prompt,test-prompt}` |
| **I5** | **Knowledge / memory / image key shapes unchanged**, and **no prompt key carries a channel dimension**: switching the active channel triggers **no prompt refetch and no visible change** | empty diff over the other key builders; grep over every FS10 mutation `onSuccess`; the channel-free lock test; an E2E journey that switches channel on `/prompts` and asserts an unchanged list |
| **I6** | **FE-RV-9…12 gain NO new adjustment points.** FS10 opens exactly one new register entry (**FE-RV-13**) | the FE-RV register diff; grep: no FS10 file references `ai-gateway`, dry-run DTOs, `documentPaths`, `personaPaths`, `imagePaths` or `actorPaths` (test-prompt reaches the relay only through the public `useAssistantStream` hook) |
| **I7** | **FS2–FS9 suites stay green without weakening.** The only legal edits to existing specs are ones FS10 makes factually necessary (the `/prompts` RBAC datum; the palette `#` empty-state copy if it must now name Prompts) | `git diff` over `tests/` shows additions plus at most those lines; full `pnpm test` + `pnpm e2e` green |
| **I8** | **No state owned by Query and Zustand at once; nothing fabricated.** No Active/Draft badge, no variables count, no author name, no promote/delete control, no invented progress or 202 wording anywhere on this screen | the five §3.4 locks; component tests asserting the absence of each fabricated element; dependency-cruiser 0 (incl. **no cross-entity import** between `prompt`, `document`, `persona`, `actor`, `image`, `location`) |

**Escalation rule:** if any invariant cannot be held while delivering the approved scope, the stage **STOPS and
reports** — the plan is not silently renegotiated, and an invariant is never re-worded to make the stage look
clean (the FS7/FS8/FS9 precedent).

### 3.8 File-level deliverables (maps to Stage 3 §1/§3–§5)

`src/shared/config/{routes.ts (1 datum), shortcuts.ts (type-only member), shortcuts-catalog.ts (prompt rows),
query-keys.ts (comment only)}` · `src/shared/lib/api/endpoints.ts` (comment only) ·
`src/shared/types/dto.ts` (prompt wire mirrors) ·
`src/entities/prompt/{model,hooks,paths,keys,index}.ts` (+ `diffVersions` in `model.ts`, Stage 3 §4) ·
`src/shared/lib/fixtures/{dataset,browser,meta}.ts` (+PROMPTS, version chains, `?type=` filtering, POST 201) ·
`src/app/(workspace)/prompts/[[...path]]/page.tsx` (stub replaced) ·
`src/widgets/prompts/{PromptLibraryView,PromptTypeList,PromptDetail(lazy),PromptDiff(lazy),PromptsEmpty,
PromptsHonesty,index}` ·
`src/features/manage-prompt/{index, model/{useCreatePromptVersion,promptDraft,schema}.ts,
ui/VersionComposer(lazy).tsx}` ·
`src/features/test-prompt/{index, model/{buildPromptRun,useTestPrompt}.ts, ui/TestPromptPanel(lazy).tsx}`
*(only if §5.2 D8 is approved)* · `src/widgets/inspector/PromptInspector.tsx` (+1 lazy registry row) ·
`src/widgets/command-palette/*` (Prompts group) · `tests/{unit,component,e2e}/*` additions · `FS10_REPORT.md`
(+ `FS10_REPORT_SIZE_ADDENDUM.md` if §6.2 triggers). **Other route stubs untouched · no new endpoints · no new
dependencies · `.size-limit.json` untouched (655) · story count unchanged at 54 unless §5.2 D6 option 1 is
approved, in which case the existing PromptCard story gains the no-badge/no-variables states (no new file).**

## 4. Task sequence (each with a completion criterion)

| Task | Produces | Done when |
|---|---|---|
| **T-FS10.0** Contract & gate prep | endpoint-by-endpoint verification against `API_SPEC.md` (§Prompts three calls verbatim; dry-run already confirmed at FS6); *(assumed)* wire shapes written into `dto.ts` comments; no dependency intake; no threshold change; **baseline `pnpm budget` recorded** (/chat 178 · /knowledge 175 · /dashboard 167 · /studio 164 · /memory 149 · stubs 107) and `pnpm size` (644.32/655) | `pnpm gate` baseline green before new code; §5.2 deviations approved with this plan |
| **T-FS10.1** **Zero-commons design lock (first)** | `entities/prompt/{paths,keys}.ts`; `query-keys.ts` + `endpoints.ts` gain pointer comments and **no rows**; grep-lock test incl. the **channel-free** assertion | the lock test fails if a prompt key/path builder appears in commons, if the namespace collides with another entity, or if any prompt key gains a channel dimension |
| **T-FS10.2** `entities/prompt` | dto mirrors · VM mappers (**unknown `type` by raw value**; `author` as a raw id; `model`/`result` only when present) · grouping selector (rows → types → chains) · pure `diffVersions` · entity-local `paths.ts`/`keys.ts` · Query hooks | mapper + diff unit tests green (casing seam isolated; **no `active`, no `variablesCount`, no author name is ever produced by a mapper**) |
| **T-FS10.3** Fixtures | PROMPTS with real version chains across types, one unrecognised type, `model`/`result` present and absent; `?type=` filtering; `/prompts/{id}/versions`; `POST /prompts` → 201 with an incremented version; `empty` scenario | fixture/real drift is a type error (same wire mirrors); kill-switch + grep locks green |
| **T-FS10.4** Route RBAC + RSC page | `/prompts` → `content.view`; RSC page with **no channel scoping**; §3.5 segment/query grammar parsed | analyst/viewer reach the screen read-only; `/prompts/<type>/versions/<n>` renders on a paste; a channel switch changes nothing |
| **T-FS10.5** `widgets/prompts` | PromptLibraryView (type list · `j/k/↵` · `?q=` · contract-native `?type=`) · LAZY PromptDetail (version Timeline + reader) · LAZY PromptDiff · PromptsEmpty · PromptsHonesty | the stub is REPLACED; all states render; 12px whispers use `secondary`; the version reader uses a plain `<pre>` (Shiki has exactly one entry point — the diff) |
| **T-FS10.6** `features/manage-prompt` | "New version" (`POST /prompts` → 201, confirmed, prefilled, `content.edit`-gated) + the draft module over `shared/lib/persist` + Zod schema | RBAC-hidden without `content.edit`; MSW-tested incl. the 4xx path; the draft survives a reload and is cleared on a successful save; **no delete/promote/rename control exists in the tree** |
| **T-FS10.7** Inspector `prompt` + palette + shortcuts | one LAZY registry row; palette `#` **Prompts** group distinct from Knowledge/Memory/Images; prompt rows in the lazy catalogue (`/`, `n`, `d`, `⌘s`) | FS2 `?inspect=` contract unchanged; the four `#` groups never merge; `#` prompt fetch fires only on mode entry; cheat-sheet auto-reflects; **no dead shortcut is registered** (`⌘↵ run in Playground` absent; `detail-save`/`detail-edit` stay inactive) |
| **T-FS10.8** `features/test-prompt` *(if D8 approved)* | pure `buildPromptRun` + LAZY panel over the UNCHANGED relay; Trust · provenance card citing the version row · Explainability (confidence absent) · wire cost · the §R10.9 isolation statement · Stop | prompt-builder unit proof: contains that version's own text + the user's optional input and **NOTHING else**; no auto-run; **the output is never written into a version**; analyst/viewer see the honest "editor action" copy |
| **T-FS10.9** Honest-absence surfaces | activation/promote · deletion · variables · per-channel prompts · author identity · model comparison — canonical copy naming the backend (or a later screen) as owner | copy states the truth without promising a date; **no fake control, no Active/Draft badge, no zero-valued variables count** is rendered anywhere |
| **T-FS10.10** Unit tests | prompt mappers · `diffVersions` table · grouping selector · fixtures contract · palette grouping · the five §3.4 ownership locks · the T-FS10.1 commons + channel-free lock · `buildPromptRun` proof (D8) | `pnpm test` green |
| **T-FS10.11** Component tests | PromptLibraryView per role/state · list `j/k/↵` · PromptDetail (chain + reader + `model`/`result` absent-vs-present) · PromptDiff (added/removed lines) · VersionComposer (guarded, draft, 201 wording) · PromptInspector (RBAC, raw author id) · TestPromptPanel (no-auto-run/Trust/no-confidence) (D8) | FS2–FS9 suites untouched-green |
| **T-FS10.12** E2E + axe | `prompts.spec.ts` (editor unless noted): library grouped by type with real version counts · `j/k/↵` → Inspector · `/prompts/<type>/versions/<n>` deep link · diff shows real added/removed lines and Back reverses it · new version → 201 → the chain grows · draft survives reload · **channel switch changes nothing** · honest-absence surfaces (no Active badge, no delete, no variables) · analyst read-only · empty scenario · test-this-version anchored on the wire-cost done marker (D8) · axe on library AND version detail, 3 viewports | full `pnpm e2e` green (3 projects); real-form sign-in; the four recorded Playwright pitfalls honoured |
| **T-FS10.13** Gates + report | `pnpm format` → `gate` → **`budget` (all ≤180; /prompts new; /chat + /knowledge + /dashboard + /studio + /memory + stubs byte-compared)** → `e2e` → **`size` (measure vs 655; if over → STOP + dedicated per-chunk addendum, rule №33 — never pre-raise)** → `build-storybook`; `FS10_REPORT.md` (three statuses; FE-RV register incl. FE-RV-13; the §3.7 invariants each proved mechanically) | gates green or honestly FE-RV/STOP-flagged; **STOP** |

Order is strict: 0→1→…→13. T-FS10.1 precedes every feature task so the commons decision is locked before any
FS10 code can drift into `shared/config`.

## 5. Gates, contract truth & honesty

### 5.1 Engineering gates

The ten Stage 2 §14 gates run exactly as in FS7/FS8/FS9 (fast block → budget → e2e → size → storybook). Windows
discipline (PART4 §3.1/§3.1b): **kill port 3000 before any build/E2E**, and treat any
`Cannot find module …next…` / `./impl` failure as the known pnpm corruption (**19 occurrences**; recover with
`pnpm install --force`). Contract gate: every endpoint used exists **verbatim** in `API_SPEC.md`.

### 5.2 Contract truth & deviations (decided by approving this plan)

- **D1 — a prompt's identity is its `type`, and the library is PLATFORM-WIDE.** The record has **no `name`**
  and **no `channel_id`** (`DATABASE_SPEC` §prompts); the only filter the contract accepts is `?type=`. FS10
  therefore organizes the library by **type** — which doubles as D1 §5.4's human-readable `:name` segment —
  and states plainly that prompts are platform-wide, not per-channel. **No channel scoping, no `forChannelId`,
  no channel-keyed query** (§3.2/§3.7 I5). Unknown type values render by their **raw value** (the FS8/FS9
  discipline). `author` is a `uuid` whose resolution would require the **owner-only** `/users` group, so the id
  is shown as an id and **no name is invented or fetched**.
- **D2 — there is NO activation.** The contract has no promote/activate call and the table has no `is_active`
  column; which version the pipeline uses is decided backend-side (§R5.3's prompt-builder) and is **not
  expressed in the contract**. D3 §10's "Promote to active" and Stage 3 §4's `usePromote`/`activeVersion` are
  design-time assumptions the frozen contract does not honour — the SoT hierarchy (the backend contract is a
  §F2.3 **frozen input**) rules, exactly as it did for FS9's `POST /images`. FS10 ships **no promote control and
  no Active/Draft badge**; "newest version" is stated as a fact about the chain, never as "the active one".
- **D3 — editing IS versioning; nothing is destructive.** `POST /prompts` creates a new version
  (§R10.6 "Правка = новая версия"); there is **no PATCH and no DELETE**. So the library has exactly one write,
  it is additive, and no destructive affordance is rendered at all. Because §R11.4 makes prompt changes an
  administrative act, the save is **confirmed, never optimistic**, and the toast states the created version
  number (201 truth — **never 202 "queued" wording**, which would be false here).
- **D4 — there is no `GET /prompts/{id}`.** The version detail is composed from the rows the list already
  serves plus `GET /prompts/{id}/versions`; no single-record endpoint is invented. If a live wire proves the
  list returns only the newest row per type, the versions call is already the chain's source and the mapper is
  the single adjustment point (FE-RV-13).
- **D5 — no variables, and no variable claims.** The record has no `variables` field and the contract documents
  no templating syntax; §R5.3 says the runtime prompt is *assembled by the backend* from persona + rules + topic
  + few-shot + constraints. Highlighting `{{…}}`-looking tokens would assert an interpolation mechanism the
  contract never defines, so FS10 renders **no variables count, no variable highlighting and no "insert
  variable" affordance** — the D3 §10 promise becomes an honest seam that names the prompt-builder as the owner
  of assembly. (This is the FS9 "no placeholder art" rule applied to text.)
- **D6 — PromptCard needs two fields the contract cannot fill; the owner picks the resolution.** The frozen
  D2 §14 component requires `variablesCount: number` and defaults `active` to `false`, which renders a **"Draft"
  badge on every prompt** — both would be fabrications (§5.2 D2/D5).
  **Option 1 (recommended): two additive, backward-compatible props under D4 §13 MINOR** — `variablesCount?`
  optional (the meta line drops the clause when absent) and `active?: boolean | null` where **`null` renders no
  badge at all**. Nothing changes for a caller that passes today's props; the FS4 precedent (`Input` accepting
  `ref` — "additive library MINOR, no D2 contract change") applies. This lets **PromptCard finally carry real
  data**, the way FS7/FS8/FS9 fed Citation, MemoryCard and ImageResult.
  **Option 2 (zero ONYX touch):** the library rows are composed from ONYX `Card` primitives at the widget level
  and **PromptCard stays data-starved**, recorded as a D4 §12/§13 candidate ("a component whose anatomy assumes
  fields the backend contract does not carry").
  FS10 will not fabricate a zero or a badge under either option.
- **D7 — the diff is derived, not invented.** No diff endpoint exists, but a line diff between two texts the
  contract serves is a pure, deterministic derivation of data the user is already looking at (the same class as
  rendering Markdown). `diffVersions` is a pure function in `entities/prompt/model.ts` (Stage 3 §4 names it),
  rendered through the **frozen CodeBlock diff mode** (D2 §13.18). **No new dependency**, no claim about how the
  backend compares versions.
- **D8 — the AI affordance: test, do not author.** D3 §10 asks for "AI drafts/refines prompts, suggests
  variables, critiques a prompt". Generating prompt *text* would have the AI author a **governed artifact**
  that §R11.4 says only an administrator may change, and would imply a save path for unverified text; suggesting
  variables is ruled out by D5. The contract-native alternative is exactly what §R10.9 exists for
  (*"тест промптов … dry-run … не пишет в память каналов и не публикует"*): **test-this-version** — a
  user-invoked, isolated dry-run of **only** the selected version's text through the **unchanged** FS6 relay,
  with Trust + Explainability + wire-only cost and the isolation statement, and **no auto-save of the output**.
  Model **comparison** (`POST /studio/compare`) is deliberately left to the **AI Playground** screen (D3 §11),
  which this stage does not build. **If the owner prefers no AI on this screen at all,** T-FS10.8 is dropped and
  the surface becomes an honest seam — the rest of the plan is unaffected.
- **D9 — `/prompts` RBAC PATCH.** `content.edit` → `content.view` (D3 §10 "Editor/Admin write; Analyst/Viewer
  read" + the `API_SPEC` matrix row *Personas/Actors/KB/**Prompts*** = «ро» for analyst/viewer), with **every
  write and AI affordance `content.edit`-gated at the call site** — the FS7/FS8/FS9 precedent. `decideAccess`
  untouched. The backend remains the boundary: if the live API denies prompt reads to analyst/viewer, the UI
  renders the 403 permission state honestly, never a crash (recorded in FE-RV-13).
- **D10 — *(assumed)* prompt wire shapes** (field casing, whether `GET /prompts` returns every version row or
  only the newest per type, the `POST /prompts` accepted body and its 201 payload, how `version` is assigned,
  whether `/prompts/{id}/versions` returns siblings of the same type, and the `model`/`result` semantics) →
  registered as **FE-RV-13** (§5.3) with single adjustment points. Fixtures are typed by the same mirrors, so a
  live correction is a mapper-level change.
- FE-RV-3…12 otherwise unchanged. Nothing unexecuted is reported as a pass.

### 5.3 FE-RV impact

**Opens FE-RV-13 — live prompt round-trip:** prompt wire casing/fields · **whether `GET /prompts` returns all
version rows or only the newest per type** (the single fact that decides whether the list or the versions call
owns the chain) · whether `?type=` accepts the eight `prompt_type` values verbatim and how an unknown value
behaves · the **`POST /prompts` accepted body** (`{type, text, model?}` *(assumed)*), its 201 payload, and
**who assigns `version`** · `GET /prompts/{id}/versions` shape and ordering · the semantics of the `model` and
`result` columns on a stored row · whether the backend exposes **any** notion of an active/selected version
(today it does not — if that ever changes, D2's seam becomes a real surface) · pagination on `/prompts` ·
whether analyst/viewer may read prompts at all (D9). **Single adjustment points:**
`entities/prompt/{model,paths,keys}.ts` and the `useCreatePromptVersion` request body. FE-RV-9…12 unchanged
(I6). FE-RV-6 (Chromatic) unchanged — no new story files.

## 6. Budget impact (First Load 180 kB · size-limit 655 kB)

### 6.1 Per-route First Load (authoritative, non-revisable)
- **/prompts (new):** target **≤ 170 kB**, expectation ~145–155 (the /memory 149 and /studio 164 precedents) —
  the shell ships the type list and honesty surfaces only; the detail pane, the diff (and therefore **Shiki**),
  the composer, the AI panel and the inspector row are all lazy (§3.1). No markdown, no charts, no virtualizer.
- **/chat (178, the standing reference, 2.0 kB headroom):** FS10 touches no chat file (§3.3) and adds **zero
  commons rows** (T-FS10.1). Expectation: unchanged at 178. Measured before/after; **any movement is diagnosed
  from `app-build-manifest.json`, and a contested one is proved with a control build, before a single word is
  written about its cause** (the FS8/FS9 lesson).
- **/knowledge (175) · /dashboard (167) · /studio (164) · /memory (149) · stubs (107):** must not regress.
- `pnpm budget` proves all 31 routes ≤ 180 and `.next/route-budget.json` records both numbers per route.

### 6.2 size-limit aggregate (detector 655 kB; measured 644.32 — headroom 10.68 kB)
Honest expectation: FS10 adds real weight — `entities/prompt` incl. the diff utility (~3–4 kB), the library
widgets + lazy detail/diff panes (~7–10), the composer + draft module (~4–6), the AI panel (~3–4 if D8 is
approved), fixtures growth (~2–3). **The 10.68 kB headroom will most likely be exceeded again** — the sixth
time in a row. Per rule №33 the plan does **NOT** touch the threshold: implement → run `pnpm size` → if over,
**STOP** and deliver a dedicated per-chunk addendum (`FS10_REPORT_SIZE_ADDENDUM.md`, the FS6/FS7/FS8/FS9
template: growth attribution, eager/lazy split, First-Load impact, byte-stability of pre-existing chunks,
options) for the owner's ruling at acceptance. Expect the **evidence-pack bar** (raw gate output, per-chunk
tables, manifest proofs, and a control build for any contested movement). `.size-limit.json` stays **655**
throughout the stage. The only remaining structural levers (polyfills/browserslist, icon audit, splitChunks) are
FS14/FS15 items and are **not** pulled forward by this plan.

### 6.3 Lazy-loading & commons verification checklist (executed at T-FS10.13, recorded in the report)
1. `.next/app-build-manifest.json`: **no FS10 chunk** (library detail, diff, composer, AI panel, inspector row)
   appears in ANY page's First Load list.
2. PromptDetail / PromptDiff / VersionComposer / TestPromptPanel load via `dynamic()` on selection or intent
   only.
3. The prompt inspector row rides the lazy Inspector surface; no inspector code in any route First Load.
4. **The Shiki/CodeBlock chunk is absent from every page's First Load list** and is byte-stable at 51.92 kB
   (the §3.6 single-entry-point case) — if hoisted, fixed structurally inside FS10.
5. `shortcuts-catalog.ts` still appears **only** in the cheat-sheet chunk (the FS8 lock re-run); the handler
   side carries no catalogue data and no new runtime member.
6. **`shared/config/query-keys.ts` and `shared/lib/api/endpoints.ts` gain zero rows** (grep + diff), and
   `/chat`, `/knowledge`, `/dashboard`, `/studio`, `/memory` and the stubs are byte-compared pre/post
   (178 / 175 / 167 / 164 / 149 / 107).
7. No prompts slice statically imported into shared commons; fixtures remain dynamic-import-only from outside
   their slice (grep locks extended); dependency-cruiser 0, incl. **no cross-entity import** between `prompt`,
   `document`, `persona`, `actor`, `image` and `location`.
8. Aggregate per-chunk table produced from the size run (addendum-ready if §6.2 triggers).

## 7. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | **size-limit 655 likely blocks again** (10.68 kB headroom vs a whole new screen) | §6.2: measure → STOP → dedicated addendum + evidence pack → owner ruling; never pre-raise; never un-split code to game the detector |
| R2 | **/chat headroom is 2.0 kB and no lever remains** | T-FS10.1 makes the commons delta **zero by construction**; §6.3.6 byte-compare; manifest forensics + a control build before any causal claim; structural fix or STOP |
| R3 | **Shiki (51.92 kB) gains a new lazy consumer** and webpack could hoist it | one entry point only (the diff pane); the version reader deliberately uses plain `<pre>`; §6.3.4 manifest check; the fix is a `dynamic()` boundary inside the diff pane, never a threshold |
| R4 | **A three-call contract may read as a thin screen** | §2 states exactly what exists; the value delivered is real version history + a real diff + the only write the contract has; every gap is a visible, explained seam (T-FS10.9) |
| R5 | **FE-RV-13's biggest unknown** — whether `GET /prompts` returns all rows or only the newest per type — changes how the chain is assembled | both sources are already mapped (list + versions call); the grouping selector and mapper are the single adjustment points; fixtures cover the version-chain shape |
| R6 | The AI panel could drift toward authoring or promoting prompts | D8 forbids both by construction: `buildPromptRun` is pure and unit-proven, the output has **no save path**, and no promote control exists anywhere in the tree |
| R7 | The draft store could become a second owner of server state | §3.4 lock 4: one feature-owned module, never the Query cache, never a component calling `persist` directly (the FS6 condition at feature scale) |
| R8 | D3 §10 promises (promote, variables, playground) may read as incompleteness | each is a visible, explained seam; §5.2 D2/D5/D8 records the reasoning; the report repeats it |
| R9 | PromptCard's frozen anatomy cannot be filled honestly | §5.2 D6 puts the choice with the owner **before** any code; neither option fabricates a value |
| R10 | Scope creep into FS11/FS12/FS13 (Playground, analytics on prompt usage, admin config versions) | the OUT list §8 is explicit; those surfaces are simply absent from this screen |
| R11 | Windows hazards (19 `next` corruptions; stale Playwright webServer) | PART4 §3.1/§3.1b habits: kill port 3000 first; auto-recovery build pattern; re-verify suspicious numbers on a clean `.next` |

## 8. Not in FS10 (explicit)

No promote/activate control and **no Active/Draft badge** (no endpoint, no column — §5.2 D2) · no delete,
rename, duplicate or PATCH (none exists — §5.2 D3) · no variables count, variable highlighting or "insert
variable" (no field, no documented templating — §5.2 D5) · no per-channel prompt scoping (no `channel_id`) · no
author-name lookup (the `/users` group is owner-only) · **no AI-authored or AI-refined prompt text and no
auto-save of any AI output** (§R11.4, §5.2 D8) · **no AI Playground screen and no `POST /studio/compare`**
(D3 §11 — a later stage; `/playground` stays an honest stub) · no prompt usage analytics (FS11) · no
`config_versions`/rollback surface (FS12 admin) · no prompt affordance inside AI Chat, and no
chat/knowledge/memory/studio/dashboard-widget edits at all (§3.3) · no backend change, `app/`/Protocol/SoT
change · no ONYX **token-value** change (and no ONYX component change at all unless §5.2 D6 option 1 is
approved) · no new dependencies (`date-fns` stays deferred) · no threshold changes (655/180 stand) · no new
ADR · no new story files · no README/handoff updates during the stage · no commits/pushes unless instructed.

---

**STOP — FS10 plan complete. Awaiting your approval, including the §5.2 deviations D1–D10** — the contract's
prompt identity is `type` and the library is **platform-wide** (D1) · **no activation exists** → no promote
control, no Active/Draft badge (D2) · editing **is** versioning and nothing is destructive (D3) · no
`GET /prompts/{id}` (D4) · **no variables claims of any kind** (D5) · **PromptCard: option 1 (two additive
optional props, D4 §13 MINOR — recommended) or option 2 (zero ONYX touch, card stays data-starved)** — your
call (D6) · the diff is a pure client-side derivation through the frozen CodeBlock diff mode (D7) · **the AI
affordance is test-this-version via the isolated dry-run, not prompt authoring** — and may be dropped entirely
if you prefer (D8) · the `/prompts` RBAC PATCH (D9) · *(assumed)* wire shapes → **FE-RV-13** (D10) — **plus the
§1/T-FS10.1 zero-commons mechanism (entity-local, channel-free keys) as the stage's first action, and the §6.2
expectation that the 655 kB detector will again need the rule-№33 measure-then-decide procedure at
acceptance.** On approval I implement §4 in order, run all ten gates for real, write `FS10_REPORT.md`, and stop
for acceptance. FS11 will not be started.
