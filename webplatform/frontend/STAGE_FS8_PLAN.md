# FS8 — Memory (Plan)

**Track:** Web Platform implementation · **SoT:** `FRONTEND_MASTER_SPEC.md` · implements **D3 §8 (Memory /
Memory Explorer)** through Stage 2 §5 (rendering group "Knowledge / Memory / Prompts: RSC lists + reader;
client for editor") · §7 (state owners: Server = TanStack Query · URL = nuqs · UI = local) and the Stage 3
inventories (§1 route `memory/[[...scope]]` · §5 route row "trace · ✓ entry" · §4 entity `memory` — see
§5.2 D1 for what the frozen contract actually carries), against **`API_SPEC.md`**:

- **Personas** — `GET|POST /channels/{id}/personas` · `GET|PATCH /personas/{id}` ·
  `POST /personas/{id}/archive`
- **Actors** — `GET|POST /channels/{id}/actors` · `GET|PATCH /actors/{id}` ·
  `POST /actors/{id}/references`
- **Content memory = published posts** — the ALREADY-WIRED `GET /channels/{id}/posts?status=` and
  `GET /posts/{id}/history` (FS5's `entities/post`)
- **AI Studio** — the frozen `POST /studio/dry-run` (§R10.9) through the FS6 relay, consumed unchanged

…and **nothing else**: the frozen contract exposes **no `/memory` endpoint**, no trace, no pin, no
exclude-from-generation and no Global-scope surface (§5.2 D1). RBAC §R10.5: *Personas/Actors* = owner/admin/
editor write, **analyst/viewer read-only («ро»)** — matching D3 §8 "Editor/Admin write (audited);
Analyst/Viewer read". Backend truth this stage renders: **§R9.1** memory levels (Global · Channel ·
Persona · Content(`memory kind=published_post`) · Image · Analytics), **§R9.12** Style Memory (persona
`style_features` = *features, not texts*), **§R9.3 "Knowledge Base ≠ Content Memory — не смешивать"**.
Design language: D2 §14 **MemoryCard** (built FS3, data-starved since) · §13.23 Timeline · §15 empty state ·
D1 §6.4 palette `#` · A5–A8 (Trust + Explainability, no blocking spinners, Aurora only on genuine AI
moments). **This is a PLAN. No code yet.**

**Goal of FS8:** make the channel's memory **legible** — "why does it write like this?" — using only what
the contract carries. `/memory` stops being a stub: a scope-aware Memory Explorer grouping the real memory
levels (**Persona** incl. Style Memory features · **Actors** · **published-post history**), guarded persona
editing/archiving (§R10.8-audited server-side), the Inspector `persona`/`actor` views, the palette `#`
**memory scope** joining FS7's real knowledge search, and **explain-style** — user-invoked AI over ONE
persona's own record whose prompt is unit-proven to contain only that persona, so **MemoryCard finally
renders real provenance** (the FS7 Citation/KnowledgeCard precedent). Everything the contract cannot back —
trace, pin, exclude, Global scope, raw `memory` rows — is a **visible honest seam**, never simulated.
Frozen inputs consumed as-is; **no `app/` / Protocol / MASTER_SPEC change; no endpoint invented; no ONYX
token-value change; no new dependencies.**

**Entry conditions — satisfied:** FS7 accepted 2026-08-01 (size-limit re-baselined 598 kB; `/chat` = 179 kB
fixed as the reference; FE-RV-10 opened). This plan is FS8's first deliverable. Frozen FS8 entry duties
(handoff PART4 §8.2): Memory ≠ Knowledge kept distinct (Persona ≠ Actor discipline) per D3 §8 · the palette
`#` memory scope joining the real knowledge search · **the plan must add ZERO commons bytes or carry an
explicit commons-split task** (`/chat` headroom = 1.0 kB) · every heavy leaf lazy from the start · the three
tables required since FS7 (PART1 §4.5) are §3.1/§3.2/§3.3 below.

---

## 1. Scope

**IN:**

- **T-FS8.1 — the commons offload (FIRST, before any feature code).** `widgets/chat/ChatView.tsx` imports
  `shared/config/shortcuts` (for `isTextEntryTarget`), so the shortcut REGISTRY sits in `/chat`'s module
  graph — adding memory rows to it is exactly the kind of byte-level commons growth that moved `/chat`
  178 → 179 at FS7. The registry is therefore split by CONCERN, with zero behaviour change:
  `shortcuts.ts` keeps the **handler side** (`G_CHORDS`, `isTextEntryTarget`, types) consumed by
  ShortcutProvider/ChatView/KnowledgeView/MemoryView; a new `shortcuts-catalog.ts` holds the **display
  side** (`SHORTCUTS`, `SHORTCUT_SCOPE_LABEL`) consumed ONLY by the lazy `ShortcutCheatsheet` overlay. The
  registry-driven invariant holds (one source per concern, re-exported; the cheat-sheet is still generated,
  never hand-maintained). Measured before/after on `/chat`.
- **Entities (T-FS8.2):** `entities/persona` and `entities/actor` — wire mirrors in `dto.ts` (types are
  erased at build time → **zero runtime bytes**), VM mappers (status through `parseStatus`; **secrets and
  generation-internals dropped**), **entity-local `paths.ts`** (the FS7 precedent — knowledge/memory-only
  paths must never enter shared `endpoints.ts`), Query hooks (`usePersonas`/`usePersona`/`useActors`/
  `useActor`, channel-scoped) and the published-post memory list reusing FS5's `entities/post` (a new
  `publishedPosts(channelId)` key + fetch; **no new entity**).
- **Fixtures (T-FS8.3):** PERSONAS (incl. a realistic `style_features` jsonb per §R9.12 — sentence-length
  bands, dialogue frequency, paragraph structure, transitions; **features, never texts**) and ACTORS in THE
  one dataset, plus `?status=published` coverage for the existing POSTS, wired into the browser + node MSW
  handlers (PATCH/POST archive), `empty` scenario honoured, kill-switch and grep locks unchanged.
- **Route + RSC page (T-FS8.4):** `routes.ts` `/memory` permission `content.edit` → **`content.view`**
  (D3 §8 + §R10.5 «ро»; the FS7 D3 precedent — registry datum only, `decideAccess` untouched);
  `app/(workspace)/memory/[[...scope]]/page.tsx` replaces the stub with an RSC initial-data page (cookies →
  `serverApiOrNull` personas + actors for the active channel, **`forChannelId`** discipline).
- **Memory Explorer (T-FS8.5), `widgets/memory`:** scope rail (**Channel** — real; **Global** — honest
  unavailable state, §5.2 D1) → entries **grouped by kind** per D3 §8 (Persona · Style features · Actors ·
  Published posts) with `j/k/↵` and nuqs `?q=` (client-side list filtering, honestly labelled — the FS7
  wording precedent) → LAZY detail panes. D2 §15 empty state ("Memory grows as you publish. Here's what
  shapes this channel's voice."), per-region loading/error states, D3 responsive (mobile: scope + list,
  detail as sheet).
- **Style Memory rendering (T-FS8.5):** persona `style_features` rendered as **calm feature rows** (label +
  value + unit) — never as prose the model "remembers", never a fabricated confidence. An unknown feature
  key renders honestly by its raw name (the `parseStatus` discipline applied to jsonb).
- **features/edit-persona (T-FS8.6):** guarded, `content.edit`-gated PATCH of the persona's own voice
  fields (per DATABASE_SPEC §R4.7/R9.12: name/description/greeting/farewell/storytelling style, vocabulary
  notes) + **archive** (`POST /personas/{id}/archive`) behind a confirm dialog. Confirmed mutations, never
  optimistic; the UI states that changes are **audited server-side** (§R10.8) and that **`style_features`
  are derived by the backend and are not hand-edited here**.
- **Inspector `persona` / `actor` (T-FS8.7):** two **LAZY** registry rows (the FS7 DocumentInspector
  precedent — the Inspector panel sits in shell commons): persona overview + style-feature list + guarded
  actions; actor overview (appearance/prompt description, reference count) **read-only in FS8** (reference
  upload is a generation input §R6.1 → FS9 Image Studio). `?inspect=persona:<id>` / `?inspect=actor:<id>`
  under the unchanged FS2 URL contract.
- **Palette `#` memory scope (T-FS8.8):** the FS7 `#` search gains a **Memory** result group (personas +
  actors of the active channel, on-demand inside the existing lazy overlay chunk), rendered as a group
  DISTINCT from Knowledge (§2 Memory ≠ Knowledge); results deep-link `/memory/...`; honest copy remains for
  posts/logs/audit. Shortcuts (T-FS8.8): memory scope `/` search · `e` edit (guarded) registered in the
  catalog — the cheat-sheet auto-reflects; `j/k/↵` reuse the active `lists` scope.
- **features/explain-style (T-FS8.9):** LAZY, user-invoked "Explain this persona's voice" over the frozen
  dry-run path via the **UNCHANGED** FS6 relay/stream machinery: a pure `buildPersonaPrompt` unit-proven to
  contain ONLY the selected persona's own record (fields + style_features) and the user's question;
  output carries TrustLabel (**Generated · Source Available**), a **MemoryCard citing the actual persona
  record** (scope/kind/content real, "why this matters" = the field it came from), ExplainabilityPanel
  (data used = this persona; **confidence honestly absent**), wire-only cost, Stop preserves partial,
  nothing auto-runs, `content.edit`-gated. **No influence claims** (§5.2 D3).
- **Honest-absence surfaces (T-FS8.10):** the D3 §8 **trace** region, **Global scope**, **pin /
  exclude-from-generation**, and the raw `memory` rows (kind=example/note, weights, embeddings) each render
  canonical honest copy explaining that the backend owns them and the contract exposes no endpoint — the
  FS7 retrieval-honesty precedent.
- Tests (T-FS8.11/12) and gates + `FS8_REPORT.md` (T-FS8.13).

**OUT (full list §8):** any memory/trace/pin/exclude/global endpoint simulation · "explain influence" ·
Locations (`/channels/{id}/locations` — an image-generation input, FS9) · actor reference upload (FS9) ·
persona CREATE (`POST /channels/{id}/personas` — channel-setup territory, FS12/FS13) · memory surfaces
inside AI Chat (§2) · style-over-time comparison (D3 "Advanced" — needs analytics history, FS11) · new
dependencies · threshold changes.

**Carried from FS7 (§10):** R1 → §6 makes the commons offload task #1 and re-measures `/chat` · R2/R3 →
FE-RV-10 and FE-RV-7/8/9 unchanged; FE-RV-11 joins with the same single-adjustment-point rule · R5 → any
new 12px whisper uses `secondary` pre-emptively · R6 → the four recorded Playwright pitfalls are honoured
by construction in the new spec.

## 2. Memory ≠ Knowledge, Memory ≠ AI Chat (a first-class constraint, not a note)

**§R9.3 is a backend requirement, not a UI preference:** *"Knowledge Base ≠ Content Memory — не
смешивать"*. FS8 enforces it structurally:

| Dimension | Knowledge (FS7) | Memory (FS8) |
|---|---|---|
| Route | `/knowledge/[[...docId]]` | `/memory/[[...scope]]` |
| Contract | `/documents` (§R9.3 reference knowledge, versioned) | `/personas`, `/actors`, published posts (§R9.1 levels) |
| Entities | `entities/document` | `entities/persona`, `entities/actor` (+ FS5 `entities/post`) |
| Query keys | `documents(ch)` / `document(id)` / `documentVersions(id)` | `personas(ch)` / `persona(id)` / `actors(ch)` / `actor(id)` / `publishedPosts(ch)` |
| ONYX card | **KnowledgeCard** (source + snippet) | **MemoryCard** (scope + kind + why-it-matters) |
| Palette `#` group | "Knowledge" | **separate "Memory" group** |
| AI panel | ask-document (a document's text) | explain-style (a persona's own record) |

No shared "entry" abstraction, no shared card, no merged list, no cross-import between the two entity
slices (dependency-cruiser's `no-cross-entity` rule proves it). **Memory ≠ AI Chat:** FS8 touches **zero**
chat files (§3.3); memory cards inside chat threads and any chat-side memory attach are explicitly OUT
(§8) — both because the `/chat` budget has 1.0 kB of headroom and because the owner scoped this stage to
the Memory workspace.

## 3. Deliverables, matrices and guarantees

### 3.1 Rendering & loading matrix (fixed at approval — every new UI module)

| Module | Server / Client | Eager / Lazy | First Load impact |
|---|---|---|---|
| `memory/[[...scope]]/page.tsx` | **Server (RSC)** — cookies → `serverApiOrNull` personas+actors | eager (route entry) | defines the /memory route; RSC ships no client JS |
| `MemoryView` (shell + scope rail + grouped list) | Client (Query islands, keyboard, nuqs) | eager — the route shell island | **YES — /memory only** (target ≤176 kB); imports nothing heavy statically |
| `MemoryGroupList` (kind groups, `j/k/↵`) | Client | eager (part of the shell) | **YES — /memory only** |
| `MemoryEmpty` (D2 §15) · `MemoryHonesty` (trace/global/pin seams) | Client (static markup) | eager (bytes) | YES — /memory only, byte-level |
| `PersonaDetail` (voice fields + style-feature rows) | Client | **LAZY** — `dynamic()` on selection | **NO** |
| `ActorDetail` | Client | **LAZY** — bundled with the detail chunk | **NO** |
| `PublishedMemoryList` (post history via FS5 entity) | Client | **LAZY** — `dynamic()` on the kind group opening | **NO** |
| `EditPersonaDialog` (+ archive confirm) | Client | **LAZY** — `dynamic()` on intent (`e` / Edit) | **NO** |
| `ExplainStylePanel` (+ streaming machinery) | Client | **LAZY** — `dynamic()` on intent | **NO** |
| `PersonaInspector` / `ActorInspector` | Client | **LAZY** registry rows (FS7 precedent) | **NO** route First Load impact |
| Palette `#` Memory group | Client | inside the existing FS2 **dynamic palette overlay**; fetch only on `#` entry | **NO** |
| `shortcuts-catalog.ts` (T-FS8.1 split) | isomorphic data | eager **only inside the lazy cheat-sheet chunk** | **NEGATIVE (removes bytes)** from every route that imports the handler side, incl. **/chat** |
| `shortcuts.ts` (handler side, after the split) | isomorphic data | eager (commons) | byte-level, and **smaller than today** |
| Registry/data extensions (`routes` · `query-keys` · `dto` · entity `paths.ts`) | isomorphic data | eager | `dto.ts` = **zero runtime** (types erased); the rest is additive rows measured in §6.3 |
| `entities/{persona,actor}` (model/hooks) | Client lib (+ mappers used by RSC) | eager **within the /memory shell only** | YES — /memory only |

Rule fixed with this table: **the only eager-client additions live inside the /memory route shell**, and
the one change to a shared module (T-FS8.1) is designed to REMOVE bytes from other routes. Any deviation
found at `pnpm budget` is fixed structurally, never by threshold.

### 3.2 Query keys & invalidate graph (fixed at approval)

New keys (channel-scoped where relevant; RSC initialData seeds only the `forChannelId` channel):

```
personas(channelId)   ← list        persona(id)   ← detail
actors(channelId)     ← list        actor(id)     ← detail
publishedPosts(channelId)           ← content-memory list (reuses FS5 entities/post fetch)
```

Invalidate graph (writer → keys):

```
useUpdatePersona    PATCH /personas/{id}            → invalidate persona(id) · personas(activeChannelId)
useArchivePersona   POST  /personas/{id}/archive    → invalidate persona(id) · personas(activeChannelId)
                                                      (archived personas leave the active list by status)
```

Non-invalidation flows, fixed explicitly: **explain-style performs ZERO Query writes** (the streamed answer
lives in the transient Zustand owner and is rendered from the run's result) · **channel switch invalidates
nothing** — every key carries `channelId`, so switching re-scopes (the FS5 lesson) · **no polling anywhere
in FS8** (nothing in the memory contract is asynchronous — no 202 intents, no ingestion) · FS5/FS6/FS7 key
shapes are untouched, and `publishedPosts(ch)` is additive beside the existing `needsReview(ch)`.

### 3.3 FS6 + FS7 no-touch guarantee (protects /chat 179 and /knowledge 176)

**Guaranteed ZERO edits** — chat surface: `app/(workspace)/chat/[[...id]]/*` · `widgets/chat/*` ·
`features/send-message/*` · `features/insert-to-channel/*` · `entities/conversation/*` (incl. THE
ConversationRepository) · `shared/lib/stream/*` · `shared/lib/ai-gateway/*` · `app/api/ai/stream/route.ts` ·
`shared/lib/persist/*` · `shared/config/models.ts` · `widgets/dashboard/*`. Knowledge surface:
`app/(workspace)/knowledge/*` · `widgets/knowledge/*` · `features/add-source/*` · `features/ask-document/*` ·
`entities/document/*`. The FS6 stream/relay machinery and the FS7 document stack are **consumed as-is** by
FS8 (explain-style calls `useAssistantStream` exactly as ask-document does) — never modified.

**Shared files edited, and why each cannot grow a protected route:**

| File | Edit | Why safe |
|---|---|---|
| `shared/config/shortcuts.ts` | **split** (handler side stays; display side moves out) | strictly REMOVES bytes from /chat, /knowledge, /dashboard; behaviour identical; unit-locked |
| `shared/config/shortcuts-catalog.ts` (new) | memory rows added here | lives only in the lazy cheat-sheet chunk |
| `shared/config/routes.ts` | one permission datum (`/memory` → `content.view`) | value change, not a new import |
| `shared/config/query-keys.ts` | +5 key builders | additive rows; measured in §6.3 |
| `shared/types/dto.ts` | +persona/actor wire mirrors | **types are erased at build time — zero runtime bytes** |
| `widgets/inspector/Inspector.tsx` | +2 LAZY registry rows | `dynamic()` — no static weight in shell commons |
| `widgets/command-palette/*` | Memory result group | inside the FS2 dynamic overlay chunk |

**Backstop:** §6.3 byte-compares `/chat` (179) and `/knowledge` (176) pre/post; any regression is fixed
structurally before the gate; 180 kB is non-revisable.

### 3.4 Memory ownership matrix (fixed at approval)

The Stage 2 §7 / D4 §7 state owners applied to every piece of FS8 state. **Hard rule locked here: no state
is owned by TanStack Query and Zustand at the same time.** Query owns everything that comes from the wire;
the transient streaming store owns only tokens in flight; the URL owns everything shareable; component
state owns only what dies with the component.

| State | Owner | Persistence | Invalidation source | Server / Client | Cache lifetime | Replacement seam |
|---|---|---|---|---|---|---|
| **Persona (list + detail)** | **TanStack Query** — `personas(ch)`, `persona(id)` | none (in-memory cache; nothing written to storage) | `useUpdatePersona`, `useArchivePersona` (§3.2); channel switch re-scopes by key, never by invalidation | RSC seeds the LIST via `serverApiOrNull` + `forChannelId`; detail fetched client-side | `staleTime 30s`, default gcTime | `entities/persona/{hooks,paths,model}.ts` (FE-RV-11) |
| **Actor (list + detail)** | **TanStack Query** — `actors(ch)`, `actor(id)` | none | **no writer in FS8** (read-only; reference upload is FS9) — refresh only via staleness/channel switch | RSC seeds the LIST; detail client-side | `staleTime 60s` (changes rarely) | `entities/actor/{hooks,paths,model}.ts` (FE-RV-11) |
| **Style Features** | **NOT a state of its own** — a pure projection of `persona.style_features` rendered by `StyleFeatureList` | none | inherits the persona entry exactly (one cache entry, one source of truth) | client render of Query data | inherits `persona(id)` | `entities/persona/model.ts` mapper (`mapStyleFeatures`) — the only place the jsonb is interpreted |
| **Published posts (content memory)** | **TanStack Query** — `publishedPosts(ch)` via the FS5 `entities/post` fetcher | none | read-only in FS8; the existing FS5 review intents already invalidate the `['posts']` prefix, which covers this key | client island (LAZY group) | `staleTime 30s` | `entities/post/hooks.ts` (existing FS5 seam; FE-RV-8) |
| **Memory Explorer UI state** | **split by shareability, never Zustand:** URL (**nuqs**) owns `?q=`, `?scope=`, `?inspect=`; the selected persona lives in the **route segment**; component `useState` owns only ephemeral things (dialog open, focused row index) | URL is the persistence (shareable, restorable, back-button-reversible); component state dies on unmount | user navigation only | client | n/a | `shared/hooks/useInspector` + nuqs keys (§3.5) |
| **Explain-style result** | **transient Zustand** — the FS6 assistant store, keyed `persona:<id>` | none — never persisted, never reconciled into Query | cleared by `reset()`/unmount; a new run replaces the slice | client | until the surface unmounts | `shared/lib/stream/assistant.ts` (consumed UNCHANGED — §3.7) |

**The no-double-ownership rule, made checkable (T-FS8.11):**
1. `features/explain-style` contains **zero** `queryClient` writes (`setQueryData`/`invalidateQueries`) —
   asserted by a source-level unit test over the slice, mirroring the FS6 rule that streaming tokens never
   enter Query.
2. The assistant-store key namespace used here (`persona:<id>`) never appears in a Query key
   (`queryKeys.*` produce `['personas'|'actors'|'posts', …]` only) — asserted in the same test.
3. No FS8 module imports `useUiStore` for memory data (the global Zustand store keeps owning only theme/
   density/sidebar/active-channel/palette/toasts, per Stage 2 §7) — asserted by a grep-lock test.
4. `style_features` is never copied into a second state container: `StyleFeatureList` is a pure function of
   its props, and the mapper is the single interpreter — asserted by a unit test that the component holds
   no state.

### 3.5 Navigation contract (URL is the state; every transition is reversible)

The Stage 3 route is `/memory/[[...scope]]`; FS8 fixes the segment and query grammar inside it. **Every
transition below is expressible as a URL, restorable by paste, and reversible by the browser Back button.**

| URL | Meaning | Rendering |
|---|---|---|
| `/memory` | Memory Explorer, channel scope, nothing selected | RSC list (personas + actors + published groups), no detail pane |
| **`/memory/<personaId>`** | the persona deep link — the "why does it write like this?" entry | RSC list + **LAZY** `PersonaDetail` (style features, guarded actions) |
| `/memory?q=<text>` | list filter (nuqs, `history: replace`) | filters the loaded groups; honestly labelled as list filtering, not retrieval |
| `/memory?scope=global` | Global memory scope | the honest **unavailable** state (§5.2 D1) — a real URL, so the absence is shareable too |
| `/memory?inspect=persona:<id>` | persona Inspector overlay | drawer (desktop) / sheet (mobile); **no navigation**; Esc or Back closes |
| `/memory?inspect=actor:<id>` | actor Inspector overlay (actors have **no** route segment in FS8) | same overlay contract |
| `/memory?inspect=post:<id>` | published-post Inspector (the FS5 view, reused unchanged) | same overlay contract |
| `/knowledge?inspect=document:<id>` | **unchanged FS7 contract** — listed here only to show the shared grammar | FS7 view |

**Grammar rules (unchanged from FS2, restated so FS8 cannot drift):** `?inspect=<type>:<id>` works in every
route group and never navigates; nuqs writes `?inspect` with `history: 'push'` (so Back closes the
inspector) and list filters with `history: 'replace'` (so Back leaves the screen, not the filter). A
segment change (`/memory` ⇄ `/memory/<personaId>`) is a real navigation and a real history entry.

**Cross-surface transitions (Knowledge ↔ Memory ↔ Chat):**

| From → To | Trigger | URL effect | Reversible by |
|---|---|---|---|
| anywhere → Memory | palette `#<query>` → **Memory** group (separate from Knowledge, §2) · `g m` chord · sidebar | `push /memory/<personaId>` or `push /memory` | Back |
| anywhere → Knowledge | palette `#<query>` → **Knowledge** group | `push /knowledge/<docId>` (FS7, unchanged) | Back |
| Memory → Memory detail | list row `↵`/click | `push ?inspect=persona:<id>` (inspect) or `push /memory/<personaId>` (open) | Back / Esc |
| explain-style answer → source | MemoryCard "Open in Memory Explorer" | `push ?inspect=persona:<id>` on the SAME page (never a new screen) | Back / Esc |
| Memory ⇄ Knowledge | **no direct link in FS8** — the two surfaces stay distinct (§2); the palette is the shared entry point | — | — |
| Memory ⇄ Chat | **no transition in FS8** — no memory affordance inside chat and no chat hand-off from memory (§8) | — | — |

**Invariant (asserted in E2E):** for each of `/memory`, `/memory/<personaId>`, `?inspect=persona:<id>`,
`?inspect=actor:<id>` and `?scope=global` — a full page reload of the URL reproduces the same visible
state, and Back returns to the exact previous state without losing the channel scope.

### 3.6 Bundle ownership (per-chunk architecture, beyond the rendering matrix)

Every chunk FS8 creates, who owns it, when it first loads, whether it could leak into commons, and the
**mechanical proof** used at T-FS8.13 (§6.3).

| Chunk | Imported by (the ONLY importer) | First loaded when | Could it reach commons? | Proof it does not |
|---|---|---|---|---|
| `memory-shell` (MemoryView + MemoryGroupList + MemoryEmpty + MemoryHonesty + entities persona/actor hooks) | `app/(workspace)/memory/[[...scope]]/page.tsx` (route entry) | the /memory route is opened | **It IS route-eager — by design, and route-scoped** | it appears in the `/memory` First Load list of `app-build-manifest.json` and **in no other page's list** |
| `memory-detail` (PersonaDetail + ActorDetail + StyleFeatureList) | `MemoryView` via `dynamic()` | a persona/actor is selected (segment or list click) | only if someone static-imports it | grep: no static `from './PersonaDetail'` outside the `dynamic()` call; absent from every page's First Load list |
| `memory-published` (PublishedMemoryList + post-history Timeline usage) | `MemoryView` via `dynamic()` | the "Published posts" kind group is opened | same | same manifest + grep proof |
| `edit-persona` (EditPersonaDialog + form + mutations) | `MemoryView` / `PersonaInspector` via `dynamic()` | the `e` shortcut or the Edit button fires | same | same; additionally RBAC-gated so read roles never even mount it |
| `explain-style` (ExplainStylePanel + buildPersonaPrompt + MemoryCard/Trust/Explainability usage) | `PersonaDetail` via `dynamic()` | the user presses "Explain this persona's voice" | same | same manifest + grep proof; the streaming machinery it uses is the **already-existing** FS6 chunk, not a new copy |
| `persona-inspector`, `actor-inspector` | `widgets/inspector/Inspector.tsx` via `dynamic()` (registry rows) | the first `?inspect=persona:` / `?inspect=actor:` target | **highest risk** — `InspectorPanel` sits in shell commons, so a static import taxes EVERY route | the FS7 DocumentInspector precedent: the registry row is `dynamic()`; verified by the manifest check + the `/chat` byte-compare |
| `shortcut-catalog` (`SHORTCUTS` + `SHORTCUT_SCOPE_LABEL`, moved out by T-FS8.1) | `widgets/shortcut-cheatsheet/ShortcutCheatsheet.tsx` **only** (itself a lazy overlay) | the `⌘/` cheat-sheet is first opened | it currently DOES sit in commons — removing that is the point of T-FS8.1 | grep the built chunks for a catalog-only string (e.g. a scope label): it must appear in exactly one chunk, and that chunk must be absent from every page's First Load list |
| palette Memory group | `widgets/command-palette/CommandPalette.tsx` (already a `dynamic()` overlay) | the palette is first opened | no — it inherits the existing overlay chunk | it adds no new chunk; the `#` memory fetch is `enabled`-gated on mode entry |

**Ownership rules fixed by this table:** (1) exactly one importer per lazy chunk — no chunk is reachable
from two owners, so no chunk can be pulled into a shared parent; (2) any module that both a route shell and
a shell-commons widget would need must live in the **entity** layer (the FS7 `documentPaths` precedent) or
be lazy on both sides; (3) a new chunk may never be introduced into `shared/config`, `shared/lib/api` or
`widgets/app-shell` — those are commons, and their growth is measured against `/chat`'s 1.0 kB headroom.

### 3.7 FS6 / FS7 regression guarantees (checkable invariants, not intentions)

Beyond the no-touch file list (§3.3), FS8 is bound by these **numeric and behavioural invariants**. Each
has a stated proof that runs at T-FS8.13; any breach is a stage blocker fixed structurally, never by
adjusting a threshold or a test.

| # | Invariant | Proof (executed, recorded in FS8_REPORT) |
|---|---|---|
| **I1** | **`/chat` First Load ≤ 179 kB** (the FS7 accepted reference; 180 is non-revisable). T-FS8.1 is expected to *improve* it toward 178 — an improvement is allowed, a regression is not | `pnpm budget` route table + `.next/route-budget.json`, byte-compared against the FS7 baseline (179) |
| **I2** | **`/knowledge` First Load ≤ 176 kB** and every other FS1–FS7 route ≤ its FS7 number | same route table, full-table comparison (31 routes before, 32 after) |
| **I3** | **The AI relay stays VERBATIM.** `app/api/ai/stream/route.ts` and `shared/lib/ai-gateway/*` are byte-identical; explain-style adds no frame type, no cadence, no post-processing | `git diff --stat` over those paths = empty; the FS6 verbatim-relay unit trio re-runs green untouched |
| **I4** | **`ConversationRepository` and the whole conversation slice are byte-identical**; no FS8 module imports `entities/conversation` | empty diff over `entities/conversation/*`; grep: zero `entities/conversation` imports under `widgets/memory`, `features/edit-persona`, `features/explain-style` |
| **I5** | **Knowledge query keys are unchanged** — `documents(ch)`, `document(id)`, `documentVersions(id)` keep their exact shapes, and no FS8 writer invalidates a `['documents', …]` key | empty diff over the knowledge key builders; grep: no `documents` prefix inside FS8 mutation `onSuccess` handlers; the FS7 knowledge E2E journeys re-run green |
| **I6** | **FE-RV-9 and FE-RV-10 gain NO new adjustment points.** The live-AI seam stays `ai-gateway/real.ts` + the FS6 dto mappers; the live-knowledge seam stays `entities/document/{model,paths}.ts` + the add-source transport. FS8's own *(assumed)* wire lives exclusively in the NEW FE-RV-11 seams | the FE-RV register diff shows FE-RV-9/10 rows unchanged; grep: no FS8 file references `ai-gateway`, `dry-run` DTOs or `documentPaths` (explain-style reaches the relay only through the public `useAssistantStream` hook, exactly as the FS6 dashboard summary does) |
| **I7** | **FS2–FS7 test suites stay green without edits.** No existing test may be weakened, re-scoped or deleted to accommodate FS8 — the only legal change to an existing spec is one that FS8's own contract change (the `/memory` RBAC datum) makes factually necessary | `git diff` over `tests/` shows additions plus, at most, the RBAC-driven line(s); full `pnpm test` + `pnpm e2e` green |
| **I8** | **Streaming state never enters Query, and Query state never enters Zustand** (§3.4) | the no-double-ownership tests of §3.4; dependency-cruiser 0 |

**Escalation rule:** if any invariant cannot be held while delivering the approved scope, the stage STOPS
and reports — the plan is not silently renegotiated (the FS7 precedent, where a red size-limit was reported
red rather than dissolved).

### 3.8 File-level deliverables (maps to Stage 3 §1/§3–§5)

`src/shared/config/{shortcuts.ts (split), shortcuts-catalog.ts (new), routes.ts (1 datum), query-keys.ts}` ·
`src/shared/types/dto.ts` · `src/entities/persona/{model,hooks,paths,index}.ts` (+ `ui/StyleFeatureList.tsx`) ·
`src/entities/actor/{model,hooks,paths,index}.ts` · `src/entities/post/hooks.ts` (+`fetchPublishedPosts`,
additive) · `src/shared/lib/fixtures/dataset.ts` (+personas/actors/published coverage) + MSW handlers ·
`src/app/(workspace)/memory/[[...scope]]/page.tsx` (stub replaced) ·
`src/widgets/memory/{MemoryView,MemoryGroupList,PersonaDetail(lazy),ActorDetail(lazy),
PublishedMemoryList(lazy),MemoryEmpty,MemoryHonesty,index}` ·
`src/features/edit-persona/{index, model/useEditPersona.ts, ui/EditPersonaDialog(lazy)}` ·
`src/features/explain-style/{index, model/{buildPersonaPrompt,useExplainStyle}.ts, ui/ExplainStylePanel(lazy)}` ·
`src/widgets/inspector/{PersonaInspector,ActorInspector}.tsx` (+2 lazy registry rows) ·
`src/widgets/command-palette/*` (Memory group) · `tests/{unit,component,e2e}/*` additions · `FS8_REPORT.md`.
**Other route stubs untouched · no new endpoints · no new dependencies · `.size-limit.json` untouched (598)
· no new stories required (MemoryCard/Timeline/Dialog stories exist since FS3; story count stays 54).**

## 4. Task sequence (each with a completion criterion)

| Task | Produces | Done when |
|---|---|---|
| **T-FS8.0** Contract & gate prep | endpoint-by-endpoint verification against `API_SPEC.md` (personas/actors verbatim; posts already confirmed at FS5; dry-run at FS6); *(assumed)* wire shapes written into `dto.ts` comments; no dependency intake; no threshold change | `pnpm gate` baseline green before new code; §5.2 deviations approved with this plan |
| **T-FS8.1** **Commons offload (first)** | `shortcuts.ts` split into handler side + `shortcuts-catalog.ts`; all four importers updated; cheat-sheet still generated from the catalog | `pnpm budget` re-measured: `/chat` ≤ 179 (target 178), `/knowledge` ≤ 176, zero behaviour change; unit test locks that every catalog row has a live scope and that the handler side exports no catalog data |
| **T-FS8.2** `entities/persona` + `entities/actor` + keys | dto mirrors · VM mappers (secrets/generation-internals dropped; unknown status honest) · entity-local `paths.ts` · Query hooks · `publishedPosts` fetch on the FS5 post entity | mapper unit tests green (casing seam isolated; `style_features` unknown keys survive honestly); keys channel-scoped |
| **T-FS8.3** Fixtures | PERSONAS (with §R9.12-shaped `style_features`) + ACTORS + `?status=published` posts in THE dataset; browser + node MSW (GET/PATCH/POST archive); `empty` scenario | fixture/real drift is a type error (same wire mirrors); kill-switch + grep locks green |
| **T-FS8.4** Route RBAC + RSC page | `/memory` → `content.view`; RSC page with `forChannelId`-scoped initial data; the §3.5 segment/query grammar parsed | analyst/viewer reach the screen read-only; the deep link **`/memory/<personaId>`** renders (§3.5); channel switch re-scopes with no stale seeds |
| **T-FS8.5** `widgets/memory` | MemoryView (scope rail incl. the honest Global state · kind groups · `j/k/↵` · `?q=`) · StyleFeatureList · LAZY PersonaDetail/ActorDetail/PublishedMemoryList · MemoryEmpty · MemoryHonesty | the stub is REPLACED; all states render; no spinner on any AI surface; 12px whispers use `secondary` |
| **T-FS8.6** `features/edit-persona` | guarded PATCH of voice fields + archive confirm; audited-server-side copy; `style_features` explicitly read-only in the UI | RBAC-hidden without `content.edit`; MSW-tested incl. failure; confirmed (non-optimistic) mutations; invalidations exactly per §3.2 |
| **T-FS8.7** Inspector `persona` / `actor` | two LAZY registry rows + views (persona: overview/style features/guarded actions; actor: read-only overview) | FS2 `?inspect=` contract unchanged; unregistered types keep the fallback; no static weight added to shell commons |
| **T-FS8.8** Palette `#` Memory group + shortcuts | `#` gains a Memory group (personas/actors, on-demand, visually distinct from Knowledge); memory `/` and guarded `e` rows in the catalog | Knowledge and Memory results never merge into one group; `#` fetch fires only on mode entry; cheat-sheet auto-reflects; `e` inert for read roles |
| **T-FS8.9** `features/explain-style` | pure `buildPersonaPrompt` + LAZY ExplainStylePanel over the UNCHANGED relay; Trust · **MemoryCard with real persona provenance** · Explainability (confidence absent) · wire cost · Stop | prompt-builder unit proof: contains the persona's own fields/style_features + the question and NOTHING else (no other persona, no posts, no knowledge); no auto-run; analyst/viewer see the honest "editor action" copy |
| **T-FS8.10** Honest-absence surfaces | trace · Global scope · pin/exclude · raw `memory` rows — canonical copy naming the backend as owner | copy states the truth without promising a date; no fake control is rendered anywhere |
| **T-FS8.11** Unit + component tests | unit: persona/actor mappers · style-feature rendering rules · fixtures contract · `buildPersonaPrompt` proof · palette Memory grouping · shortcuts split locks; component: MemoryView per role/state · kind-group `j/k/↵` · EditPersonaDialog (guarded/audited copy) · ExplainStylePanel (no-auto-run/Trust/MemoryCard/no-confidence) · Persona/ActorInspector | `pnpm test` green; FS2–FS7 suites untouched-green |
| **T-FS8.12** E2E + axe | `memory.spec.ts` journeys (editor unless noted): grouped list → `j/k/↵` → Inspector · persona deep-link with style features · guarded edit → confirmed save · archive confirm · palette `#` shows **separate** Knowledge and Memory groups · explain-style streamed answer anchored on the wire-cost done marker → MemoryCard cites the persona · analyst read-only (no `e`, no AI action) · honest-absence surfaces visible · empty scenario · axe on list + detail, 3 viewports | full `pnpm e2e` green (3 projects); real-form sign-in; the four recorded Playwright pitfalls honoured |
| **T-FS8.13** Gates + report | `pnpm format` → `gate` → **`budget` (all ≤180; /memory new; /chat + /knowledge byte-compared)** → `e2e` → **`size` (measure vs 598; if over → STOP + dedicated per-chunk addendum, rule №33 — never pre-raise)** → `build-storybook`; `FS8_REPORT.md` (three statuses; FE-RV register incl. FE-RV-11) | gates green or honestly FE-RV/STOP-flagged; **STOP** |

Order is strict: 0→1→…→13. T-FS8.1 deliberately precedes every feature task so the budget headroom exists
*before* FS8 code lands.

## 5. Gates, contract truth & honesty

### 5.1 Engineering gates
The ten Stage 2 §14 gates run exactly as in FS7 (fast block → budget → e2e → size → storybook). Windows
discipline (PART4 §3.1/§3.1b): **kill port 3000 before any build/E2E**, and treat any
`Cannot find module …next…` / `./impl` failure as the known pnpm corruption (16 occurrences; recover with
`pnpm install --force`). Contract gate: every endpoint used exists **verbatim** in `API_SPEC.md`.

### 5.2 Contract truth & deviations (decided by approving this plan)

- **D1 — there is NO `/memory` endpoint.** The frozen contract exposes personas, actors, locations, posts
  and analytics — but nothing for the `memory` table itself (§R9.1 Content level, kinds
  `published_post|example|note`, weights, embeddings), nothing for the **trace** ("post ← memory/knowledge
  that shaped it"), nothing for **pin** / **exclude-from-generation**, and nothing for the **Global** memory
  scope. Stage 3 §4 anticipated a `memory` entity with `useTrace`/`useEditEntry`; those endpoints do not
  exist and the SoT hierarchy (frozen backend contract as a §F2.3 frozen input > Stage 3) rules. Therefore
  those surfaces are **honestly ABSENT as visible seams** (T-FS8.10), exactly as FS7 handled retrieval.
  A future backend memory API is optional backend work — never a prerequisite, never faked.
- **D2 — what the Memory Explorer IS in FS8.** The legible view of the memory levels the contract DOES
  expose: **Persona** (the channel's writing identity, incl. `style_features` = Style Memory §R9.12 —
  *features, not texts*), **Actors** (the visual identity — Persona ≠ Actor kept explicit) and **Content
  memory = published posts** (§R9.1, via the FS5 post entity + its history Timeline). This is not a reduced
  Memory screen; it is the honest intersection of D3 §8 with the frozen contract, and it already answers
  the screen's stated purpose ("why does it write like this?") from real data.
- **D3 — NO "explain influence".** D3 §8's AI row asks for "explain influence (which entries influenced
  output)". The contract carries no influence/attribution data, so any such claim would be **fabrication** —
  forbidden by the binding FS6/FS7 owner conditions. FS8 ships the honest analogue: **explain-style**, a
  user-invoked answer grounded ONLY in the persona record the user selected, with the MemoryCard citing
  that record (provenance, not model claims). If the backend ever exposes generation attribution, it plugs
  into the same MemoryCard contract with no rework.
- **D4 — `/memory` RBAC PATCH.** `content.edit` → `content.view` (D3 §8 + the §R10.5 matrix: analyst/viewer
  «ро» on Personas/Actors). Writes stay `content.edit`-gated per affordance; `decideAccess` untouched. The
  FS7 D3 precedent.
- **D5 — *(assumed)* persona/actor wire shapes** (field casing, the `style_features` jsonb structure, the
  archive response, actor reference counts) → registered as **FE-RV-11** (§5.3) with single adjustment
  points. Fixtures are typed by the same mirrors, so a live correction is a mapper-level change.
- FE-RV-3…10 unchanged. Nothing unexecuted is reported as a pass.

### 5.3 FE-RV impact

**Opens FE-RV-11 — live memory round-trip:** persona wire casing/fields · the **`style_features` jsonb
shape** (key naming, units, nesting — FS8 renders unknown keys honestly, so a mismatch degrades gracefully)
· actor fields + whether reference counts are exposed on the actor DTO · `PATCH /personas/{id}` accepted
body + optimistic-lock `version` semantics (§R4.2 — a 409 must render the honest conflict state) ·
`POST /personas/{id}/archive` response · whether the persona list filters archived rows server-side ·
`?status=published` ordering/pagination for the content-memory list. **Single adjustment points:**
`entities/persona/{model,paths}.ts`, `entities/actor/{model,paths}.ts`, and the edit-persona mutation body.
No other FE-RV changes; FE-RV-6 (Chromatic) unchanged — no new stories.

## 6. Budget impact (First Load 180 kB · size-limit 598 kB)

### 6.1 Per-route First Load (authoritative, non-revisable)
- **/memory (new):** target **≤ 176 kB** — the shell ships list + scope rail only; every detail pane, the
  edit dialog and the AI panel are lazy (§3.1). No markdown/shiki/virtualizer in the shell.
- **/chat (179, reference):** FS8 touches no chat file (§3.3). The single shared edit is T-FS8.1, which
  **removes** the shortcut catalog from chat's graph — the expectation is `/chat` ≤ 179 and plausibly
  **178** (the FS7 number restored). Measured before/after; residual re-partition risk is handled
  structurally.
- **/knowledge (176):** same offload benefit; must not regress.
- All other routes stay ≤ their FS7 numbers; `pnpm budget` proves all 32 routes ≤ 180 and
  `.next/route-budget.json` records both numbers per route for the report.

### 6.2 size-limit aggregate (detector, 598 kB; measured 587.74 — headroom 10.26 kB)
Honest expectation: FS8 adds real weight — entities persona/actor (~4–6 kB), memory widgets + lazy detail
panes (~8–12), edit dialog + explain panel (~5–7), fixtures growth (~2–3), minus a small T-FS8.1 saving.
**The 10.26 kB headroom will most likely be exceeded again.** Per rule №33 the plan does NOT touch the
threshold: implement → run `pnpm size` → if over, **STOP** and deliver a dedicated per-chunk addendum
(`FS8_REPORT_SIZE_ADDENDUM.md`, the FS6/FS7 template: growth attribution, eager/lazy split, First-Load
impact, byte-stability of pre-existing chunks, options) for the owner's ruling at acceptance.
`.size-limit.json` stays **598** throughout the stage.

### 6.3 Lazy-loading & commons verification checklist (executed at T-FS8.13, recorded in the report)
1. `.next/app-build-manifest.json` grep: **no FS8 chunk** (memory widgets, detail panes, edit dialog,
   explain panel, inspector rows) appears in ANY page's First Load list.
2. PersonaDetail / ActorDetail / PublishedMemoryList / EditPersonaDialog / ExplainStylePanel load via
   `dynamic()` on selection or intent only.
3. Persona/Actor inspector rows ride the lazy Inspector surface; no inspector code in any route First Load.
4. Palette Memory group stays inside the FS2 dynamic overlay chunk; the `#` memory fetch fires only on
   mode entry.
5. `shortcuts-catalog.ts` appears **only** in the cheat-sheet chunk (grep the built chunks for a catalog-only
   string); the handler side carries no catalog data.
6. `/chat` and `/knowledge` First Load byte-compared pre/post (179 / 176 baselines) — improvement expected,
   regression impossible to ship.
7. No memory slice statically imported into shared commons; fixtures remain dynamic-import-only from
   outside their slice (grep locks extended); dependency-cruiser 0, incl. **no cross-entity import between
   `persona`, `actor` and `document`**.
8. Aggregate per-chunk table produced from the size run (addendum-ready if §6.2 triggers).

## 7. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | **size-limit 598 likely blocks again** (10.26 kB headroom vs a whole new screen) | §6.2: measure → STOP → dedicated addendum → owner ruling; never pre-raise; never un-split code to game the detector |
| R2 | **/chat has 1.0 kB headroom** and webpack re-partition is not fully controllable | T-FS8.1 removes bytes FIRST; §6.3.6 byte-compare; structural fix if it moves; the budget gate is the backstop |
| R3 | **FE-RV-11 assumptions**, above all the `style_features` jsonb shape | unknown keys render honestly by raw name (no crash, no invention); single adjustment points; fixtures typed by the same mirrors |
| R4 | D3 §8 promises trace/pin/exclude/global that the contract cannot back — a reviewer may read their absence as incompleteness | T-FS8.10 makes each absence a VISIBLE, explained seam; §5.2 D1 records the reasoning; the report repeats it |
| R5 | The AI panel could drift toward influence claims under prompt pressure | `buildPersonaPrompt` is pure and unit-proven; the panel renders only Trust/provenance/cost; no attribution UI exists to fill |
| R6 | Optimistic-lock 409 on `PATCH /personas/{id}` (§R4.2) is real and easy to mishandle | the mutation is confirmed (never optimistic) and maps 409 to the honest conflict state with a reload affordance; covered by an MSW test |
| R7 | Guarded edit + audit wording could overpromise (the UI cannot prove an audit entry) | copy says changes are audited **server-side** per §R10.8 — a statement about the backend, not a UI claim; no fake audit trail is rendered |
| R8 | Memory and Knowledge could visually blur in the palette | §2 keeps separate groups, cards, entities and keys; an E2E journey asserts both groups exist separately |
| R9 | Windows hazards (16 `next` corruptions; stale Playwright webServer) | PART4 §3.1/§3.1b habits: kill port 3000 first; auto-recovery build pattern; re-verify suspicious numbers on a clean `.next` |
| R10 | Scope creep into FS9 (actor references, locations) or FS11 (style-over-time) | OUT list §8 is explicit; those surfaces are not seamed, they are simply absent from this screen |

## 8. Not in FS8 (explicit)

No `/memory`, trace, pin, exclude-from-generation or Global-scope endpoint simulation (no contract source —
§5.2 D1) · no "explain influence" / generation-attribution claims (§5.2 D3) · no Locations surface and no
actor reference upload (image-generation inputs §R6.1 — FS9) · no persona CREATE (channel setup — FS12/13) ·
no memory cards or memory attach inside AI Chat, and no chat-file edits at all (§3.3) · no style-over-time
comparison (needs analytics history — FS11) · no backend change, `app/`/Protocol/SoT change · no ONYX
token-value change · no new dependencies (`date-fns` stays deferred) · no threshold changes (598/180 stand)
· no new ADR · no new stories · no README/handoff updates during the stage · no commits/pushes unless
instructed.

---

**STOP — FS8 plan complete. Awaiting your approval, including the §5.2 deviations D1–D5 (no memory/trace/
pin/global endpoints → honest seams · what the Memory Explorer IS · no influence claims → explain-style
instead · the `/memory` RBAC PATCH · *(assumed)* persona/actor wire shapes → FE-RV-11), the §1/T-FS8.1
commons-offload task as the stage's first action, and the §6.2 expectation that the 598 kB detector will
again need the rule-№33 measure-then-decide procedure at acceptance.** On approval I implement §4 in order,
run all ten gates for real, write `FS8_REPORT.md`, and stop for acceptance. FS9 will not be started.
