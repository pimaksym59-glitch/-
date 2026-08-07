# FS7 — Knowledge (Plan)

**Track:** Web Platform implementation · **SoT:** `FRONTEND_MASTER_SPEC.md` · implements **D3 §7 (Knowledge
Base / Knowledge Workspace)** through Stage 2 §5 (rendering group "Knowledge / Memory / Prompts: RSC lists +
reader; client for editor/retrieval-preview") · §7 (state owners: Server = TanStack Query; URL = nuqs) and
the Stage 3 inventories (§1 route `knowledge/[[...docId]]` · §4 entity `document` · §3 features
`add-source` / `retrieval-preview` · §5 route row "ingest/retrieval · ✓ chunk"), against the frozen contract
**`API_SPEC.md` §Knowledge Base (§R9.3)**: `GET|POST /documents` (upload → ingestion §R9.4) ·
`GET /documents/{id}` · `PUT /documents/{id}` (new version §R9.10) · `GET /documents/{id}/versions` ·
`POST /documents/{id}/reindex → 202` (`reindex`) · `DELETE /documents/{id}` soft ·
`POST /documents/{id}/assign {channel_id}` — **and nothing else** (see §5.2 D1: the contract carries NO
chunk, NO retrieval/search, NO ingest-SSE endpoint; Stage 3 §8's anticipated "retrieve/chunks/ingest SSE"
line has no contract counterpart and API_SPEC, the frozen input, wins). RBAC §R10.5: KB write =
owner/admin/editor, **analyst/viewer read-only («ро»)** — matching D3 §7 "Editor/Admin write; Analyst/Viewer
read". Design language: D2 §13.21 FileUpload · §13.17 Markdown (reader) · §13.23 Timeline (versions) · §14
**KnowledgeCard + Citation** (built in FS3, data-starved since) · §15 Knowledge empty state (canonical copy)
· D1 §6.4 palette `#` mode · A5–A8 (AI honesty: Trust + Explainability, no blocking spinners, Aurora only on
genuine AI moments). **This is a PLAN. No code yet.**

**Goal of FS7:** the channel-isolated Knowledge workspace. `/knowledge` stops being a stub: a real
document list with upload/ingest truth, a document reader with version history, re-ingest/delete/assign
intents, the Inspector `document` view, the palette **`#` seam replaced** with real knowledge search, and
the first **honestly-sourced citations**: a user-invoked "Summarize / Ask about this document" whose prompt
provably contains the selected document — the Citation chip and KnowledgeCard finally render **real
provenance** (Source Available), never model-claimed sources. Frozen inputs consumed as-is; **no `app/` /
Protocol / MASTER_SPEC change; no endpoint invented; no ONYX token-value change; no new dependencies.**

**Entry conditions — satisfied:** FS6 accepted 2026-08-01 (size-limit re-baselined 560 kB via the dedicated
addendum; First Load 180 kB reaffirmed authoritative); this plan is FS7's first deliverable. Frozen FS7
entry duties (handoff PART4 §8.2): knowledge UX per D3 §7 · `#` seam replaced (memory scope joins in FS8) ·
retrieval-fed citations for the data-starved Citation/KnowledgeCard · **this plan re-measures /chat (2 kB
headroom) and the 560 kB aggregate, and plans every chat-adjacent addition lazy-first** (§6).

---

## 1. Scope

**IN:** the **`document` entity** (T-FS7.1): `DocumentWireDTO`/`DocumentVersionWireDTO` mirrors in `dto.ts`
(*(assumed)* casing/fields — §5.3 FE-RV-10), `entities/document` with model/mappers (status through
`parseStatus`, unknown-safe; no secret fields), Query hooks (`useDocuments` channel-scoped ·
`useDocument` · `useDocumentVersions`) + mutation intents (upload · new-version · reindex **202
queued-truth** · delete · assign), `query-keys.ts`/`endpoints.ts` registry extensions · **fixtures
extension** (T-FS7.2): DOCUMENTS + DOCUMENT_VERSIONS (+ deterministic body text) in THE one dataset, browser
+ node path-only MSW handlers for the whole `/documents` group (incl. a deterministic ingesting→ready
transition after a fixed poll count — pacing lives ONLY in the stand-in, FS6 discipline), `empty` scenario
honoured; the FS5 triple kill-switch and grep locks apply unchanged · **route RBAC correction** (T-FS7.3,
PATCH): `routes.ts` `/knowledge` permission `content.edit` → **`content.view`** so analyst/viewer read
(D3 §7 + §R10.5 «ро»); every write/AI affordance gated `can('content.edit')` — read-only roles get the FS5
honest read-only variant, never a 403 for a screen the matrix lets them read · the **Knowledge screen**
`/knowledge/[[...docId]]` (T-FS7.4): RSC initial data (cookies → `serverApiOrNull` documents list, active
channel scope, **`forChannelId`** discipline) → hydrated Query islands; **list pane** (title · source ·
size · ingest StatusBadge; `j/k/↵`; nuqs `?q=` + source filter — client-side *list filtering*, honestly
labelled search of loaded documents, never presented as retrieval), **reader** (lazy Markdown, 72ch,
sanitized; version Timeline + "Upload new version" (PUT); non-text types get an honest "no preview for this
type" state), D2 §15 canonical empty state, per-region loading skeletons + error states with retry, D3
responsive (mobile list→reader full-screen, inspector as sheet) · **feature `add-source`** (T-FS7.5): lazy
dialog on FileUpload → `POST /documents` (multipart *(assumed)*), per-file honest state machine
uploading→ingesting→ready/failed (**no fabricated percentages**; ingest progress = Query polling of the
document status — FE-ADR-9 polling fallback; the contract has no ingest SSE), per-file errors with retry;
re-ingest → `POST /documents/{id}/reindex` **202 "queued"** toast; delete (confirm dialog, soft); assign to
channel · **feature `ask-document`** (T-FS7.6): user-invoked **"Summarize document" / "Ask about this
document"** on the reader — pure `buildDocumentPrompt` (FS6 `summary-prompt` precedent: unit-proven to
contain ONLY the selected document's content + the user's question — no metrics, no other documents, no
smuggled fields) → streamed via the EXISTING verbatim relay/dry-run path (`useAssistantStream`; Stop
cancels; partial preserved) → answer rendered with **TrustLabel Generated · Source Available**, an inline
**Citation** chip resolving to the actual source document (popover → "Open source" → reader/Inspector), a
**KnowledgeCard** for the source (title/snippet/source; `score` honestly ABSENT — §5.2 D2), Explainability
(why/data = this document + version, model, limitations; confidence honestly absent), wire-only cost;
`can('content.edit')`; nothing auto-runs · **Inspector `document` view** (T-FS7.7): registry gains
`document` — source/size/status/channel/created + versions Timeline + RBAC-gated re-ingest/delete/assign;
`?inspect=document:<id>` everywhere; chunk-level detail honestly absent (§5.2 D1) · **palette `#` — real
for knowledge** (T-FS7.8): `#query` searches the active channel's documents (on-demand Query fetch inside
the lazy palette overlay), results deep-link `/knowledge/<docId>`; honest copy remains for
posts/logs/audit ("searchable as their workspaces land") and memory (FS8); topbar search entry opens the
palette pre-set to `#` (D1 §6.7) · **shortcuts** (T-FS7.9): knowledge scope `n` add source (edit-gated) ·
`/` focus knowledge search; `j/k/↵` reuse the active `lists` scope; cheat-sheet updates itself from the
registry · **retrieval honesty surfaces** (T-FS7.9): the D3 "Retrieval Preview" region renders the
canonical honest state ("Retrieval runs inside the backend at generation time; this console never simulates
it. Preview arrives with a retrieval endpoint.") — a visible seam, never fake scores/chunks · tests
(T-FS7.10/11) and gates + `FS7_REPORT.md` (T-FS7.12).

**OUT (full list §8):** chat knowledge-attach and chat-thread citations (the 2 kB /chat headroom rules them
out — deferred with honest seams intact; §6.1) · any retrieval/chunk simulation · "suggest tags" (no
persistable field in the contract) · document download (no endpoint) · Memory (FS8) · new dependencies ·
threshold changes.

**Carried from FS6 (§9):** R2 → FS7 adds NOTHING to the chat route; /chat is re-measured at the gate (§6.1)
· R6 → this stage feeds Citation/KnowledgeCard with real provenance; tool-call cards stay data-starved
(honest) · R3/R5 → FE-RV-7/8/9 unchanged; FE-RV-10 joins with the same single-adjustment-point rule ·
R5 (tone) → any new 12px whisper uses `secondary` pre-emptively (fourth-precedent rule).

## 2. Task sequence (each with a completion criterion)

| Task | Produces | Done when |
|---|---|---|
| **T-FS7.0** Contract & gate prep | endpoint-by-endpoint verification against `API_SPEC.md` §Knowledge Base (all seven calls verbatim; nothing added); *(assumed)* wire shapes written into `dto.ts` comments; no dependency intake; no threshold change (`.size-limit.json` stays 560 — rule №33) | `pnpm gate` baseline green before new code; the §5.2 deviations approved with this plan |
| **T-FS7.1** `entities/document` + registries | `dto.ts` document/version mirrors · `entities/document/{model,hooks,index}` (mappers unknown-status-safe; VM carries ingest status via the 12-status vocabulary) · `query-keys.ts` (`documents(channelId)` · `document(id)` · `documentVersions(id)`) · `endpoints.ts` document group | mapper unit tests green (casing seam isolated; parseStatus unknowns; no invented fields); keys channel-scoped |
| **T-FS7.2** Fixtures | DOCUMENTS/DOCUMENT_VERSIONS (+ fixed body text, fixed timestamps) in `shared/lib/fixtures/dataset.ts`; browser + node MSW path-only handlers for the `/documents` group (upload 201, reindex 202 `{task_id}`, delete 204, assign 200, deterministic ingesting→ready after N polls); `onyx-fixture-scenario=empty` covered | fixture/real drift is a type error (same wire mirrors); kill-switch + static-import grep locks stay green |
| **T-FS7.3** Route RBAC + RSC page | `routes.ts` `/knowledge` → `content.view` (PATCH, recorded in the report); `app/(workspace)/knowledge/[[...docId]]/page.tsx` replaces the stub: RSC initial documents (serverApiOrNull, active-channel scope, `forChannelId`), doc param → reader mode | middleware/`decideAccess` mechanics untouched; analyst/viewer reach the screen read-only; deep link `/knowledge/<docId>` renders the reader; switch-channel re-scopes (no stale initialData — FS5 lesson) |
| **T-FS7.4** `widgets/knowledge` | KnowledgeView (list shell instant; Reader LAZY via the markdown entrypoint; AddSource/AskPanel LAZY on intent), DocumentList (`j/k/↵`, StatusBadge, nuqs `?q=`+source filter), VersionsTimeline, KnowledgeEmpty (D2 §15 canonical copy), per-region error/skeleton states, responsive per D3 | stub replaced; all states render; no spinner on any AI surface; 12px whispers use `secondary` |
| **T-FS7.5** `features/add-source` | AddSource dialog (FileUpload) → POST multipart *(assumed — single transport seam)*; honest per-file state machine (no invented %); ingest polling stops at ready/failed; re-ingest 202 queued-truth toast; delete confirm (soft); assign-to-channel; all `content.edit`-gated; invalidates documents | MSW-tested incl. per-file failure + retry; 202 wording = "queued", never "done"; RBAC-hidden for read roles |
| **T-FS7.6** `features/ask-document` | `buildDocumentPrompt` (pure) + AskDocumentPanel (lazy): Summarize / free question → existing relay stream → StreamingMessage + TrustLabel (Generated · Source Available) + **Citation → real source doc** + **KnowledgeCard (no score)** + ExplainabilityPanel + wire cost; Stop preserves partial; user-invoked only | prompt-builder unit proof: output contains the document text + question and NOTHING else; no auto-run; analyst/viewer see the honest "editor action" copy |
| **T-FS7.7** Inspector `document` | view registry row `document`: overview + versions Timeline + gated actions (re-ingest/delete/assign) | FS2 `?inspect=` contract unchanged; unregistered types keep the fallback; `useInspector` API untouched |
| **T-FS7.8** Palette `#` + topbar entry | `#` mode: on-demand channel-scoped document search inside the lazy overlay; results deep-link; honest copy kept for not-yet-landed entity types; topbar search button opens palette in `#` | FS2 palette tests upgraded, not deleted; `#` fetch happens only when the mode is entered; palette stays a dynamic overlay (no First Load impact) |
| **T-FS7.9** Shortcuts + honesty surfaces | `shortcuts.ts`: knowledge scope `n`/`/` (+ scope label); Retrieval Preview honest state; cheat-sheet auto-reflects | registry-driven (no hand-wired copy); `n` inert for read roles; honest copy exact per §1 |
| **T-FS7.10** Unit + component tests | unit: document mappers · fixtures contract · `buildDocumentPrompt` inclusion/exclusion proof · palette `#` filter · shortcut registry; component: KnowledgeView per role/state · DocumentList `j/k/↵` · AddSource state machine · AskDocumentPanel (no-auto-run/Trust/Citation/Explainability) · DocumentInspector | `pnpm test` green; FS2–FS6 suites untouched-green |
| **T-FS7.11** E2E + axe | journeys (editor unless noted): list→`j/k/↵`→Inspector · reader deep-link + versions · upload→ingesting→ready (fixture-deterministic) · re-ingest 202 queued toast · `#` palette → deep link · ask-document: streamed answer anchored on the wire-cost done marker → Citation → source opens · analyst: read-only (no `n`, no AI action, page renders) · `empty` scenario hero · axe list+reader, 3 viewports; `getByLabel` with `{ exact: true }` near "Document…"/"Conversation…" labels | full `pnpm e2e` green (3 projects); real-form sign-in |
| **T-FS7.12** Gates + report | `pnpm format` → `gate` → **`budget` (all routes ≤180; /knowledge new; /chat re-measured)** → `e2e` → **`size` (measure vs 560; if over → STOP + dedicated per-chunk addendum, rule №33 — never pre-raise)** → `build-storybook`; `FS7_REPORT.md` (three statuses; FE-RV register + FE-RV-10); README/handoff only on the owner's word | gates green or honestly FE-RV/STOP-flagged; **STOP for acceptance** |

Order is strict: 0→1→2→3→4→5→6→7→8→9→10→11→12 (each layer consumed by the next; tests last-but-gates).

## 3. Deliverables (file-level, maps to Stage 3 §1/§3–§5)

`src/shared/types/dto.ts` (+document/version mirrors) · `src/shared/config/{query-keys,routes,shortcuts}.ts`
(registry extensions; the ONE `/knowledge` permission PATCH) · `src/shared/lib/api/endpoints.ts` ·
`src/entities/document/{model,hooks,index}.ts` · `src/shared/lib/fixtures/dataset.ts` + browser/node MSW
handlers · `src/app/(workspace)/knowledge/[[...docId]]/page.tsx` (stub replaced) ·
`src/widgets/knowledge/{KnowledgeView,DocumentList,Reader(lazy),VersionsTimeline,KnowledgeEmpty,index}` ·
`src/features/add-source/{index, model/useAddSource.ts + intents, ui/AddSourceDialog(lazy)}` ·
`src/features/ask-document/{index, model/{buildDocumentPrompt,useAskDocument}.ts, ui/AskDocumentPanel(lazy)}`
· `src/widgets/inspector/DocumentInspector.tsx` (+ registry row) · `src/widgets/command-palette/*` (`#`
wiring) + topbar search entry · `tests/{unit,component,e2e}/*` additions · `FS7_REPORT.md`. **Other route
stubs untouched · chat widgets/features untouched · no new endpoints · no new dependencies ·
`.size-limit.json` untouched (560) · no new stories required (Citation/KnowledgeCard/FileUpload stories
exist since FS3; story count stays 54).**

### 3.1 Rendering & loading matrix (fixed at approval — every new Knowledge UI module)

| Module | Server / Client | Eager / Lazy | First Load impact |
|---|---|---|---|
| `knowledge/[[...docId]]/page.tsx` | **Server (RSC)** — cookies → `serverApiOrNull` initial data | eager (route entry) | defines the /knowledge route; RSC itself ships no client JS |
| `KnowledgeView` (shell) | Client (Query islands, keyboard, layout) | eager — the route shell island | **YES — /knowledge only** (inside the ≤165 target); imports nothing heavy statically |
| `DocumentList` | Client (`j/k/↵`, selection, nuqs `?q=`/source filter) | eager (part of the shell) | **YES — /knowledge only** |
| `KnowledgeEmpty` | Client (static markup, no state) | eager (bytes; part of the shell) | YES — /knowledge only, byte-level |
| `Reader` | Client | **LAZY** — `dynamic()` on document selection; consumes the EXISTING `markdown` lazy entrypoint | **NO** — markdown/shiki chunks stay out of every First Load (§6.3.1) |
| `VersionsTimeline` | Client | lazy — bundled into the Reader chunk | **NO** |
| `AddSourceDialog` (+ FileUpload) | Client | **LAZY** — `dynamic()` on intent (`n` / Add source) | **NO** — FileUpload's first-in-bundle weight lands in a lazy chunk (aggregate only, §6.2) |
| `AskDocumentPanel` (+ streaming machinery) | Client | **LAZY** — `dynamic()` on intent (Summarize / Ask) | **NO** |
| `DocumentInspector` | Client | lazy — rides the existing Inspector surface chunk | **NO** route First Load impact |
| Palette `#` wiring | Client | inside the existing FS2 **dynamic palette overlay** chunk; the `#` document fetch fires only on mode entry | **NO** |
| Topbar search entry (opens palette in `#`) | Client (Topbar is a client widget) | eager — shell commons | **byte-level on shell routes** — covered by the §6.3.6 /chat byte-compare |
| Registry/data extensions (`routes` · `shortcuts` · `query-keys` · `endpoints` · `dto`) | isomorphic data modules | eager | byte-level, additive rows only — covered by §6.3.6 |
| `entities/document` (model/hooks) | Client lib (+ mappers used by the RSC branch) | eager **within the /knowledge shell only** (statically imported nowhere else) | YES — /knowledge only |

Rule fixed with this table: **the only eager-client additions live inside the /knowledge route shell**; every
heavy or cross-route module is lazy or rides an already-lazy surface. Any deviation found at `pnpm budget`
is fixed structurally, never by threshold.

### 3.2 Query keys & invalidate graph (fixed at approval)

New keys (all channel-scoped where relevant — `forChannelId` discipline; RSC initialData seeds
`documents(forChannelId)` only):

```
documents(channelId)        ← list          document(id)            ← detail/reader
documentVersions(id)        ← version history
```

Invalidate graph (writer → keys):

```
useAddSource        POST /documents → 201            → invalidate documents(activeChannelId)
useNewVersion       PUT /documents/{id}              → invalidate document(id) · documentVersions(id) · documents(ch)
useReindex          POST /documents/{id}/reindex→202 → invalidate document(id) · documents(ch) · jobs('recent', ch)
                                                       (the queued reindex task is visible on the FS5 surfaces — queued truth)
useDeleteDocument   DELETE /documents/{id} → 204     → REMOVE document(id) + documentVersions(id) from cache · invalidate documents(ch)
useAssign           POST /documents/{id}/assign      → invalidate document(id) · documents(oldCh) · documents(newCh)
```

Non-invalidation flows, fixed explicitly: **ingest polling** = `refetchInterval` on
`documents(ch)`/`document(id)` while status is `ingesting`, stops at ready/failed (polling per FE-ADR-9 —
not invalidation, not simulated streaming) · **ask-document** performs **zero Query writes** (streamed
answer lives in the transient Zustand owner; rendered from the stream's done result; invalidates nothing) ·
**channel switch** invalidates nothing — keys carry `channelId`, so switching re-scopes (FS5 lesson).
No FS5/FS6 key shapes change; `jobs('recent', ch)` is the existing FS5 key, invalidated additively by
`useReindex` exactly as FS6's insert-to-channel already does.

### 3.3 FS6 no-touch guarantee (protects /chat 178/180)

**Guaranteed ZERO edits** (no line of these files changes in FS7):
`app/(workspace)/chat/[[...id]]/*` · `widgets/chat/*` (ChatView, Thread, HistoryRail, ChatEmpty,
MessageItem, InsertDialog) · `features/send-message/*` · `features/insert-to-channel/*` ·
`entities/conversation/*` (incl. THE ConversationRepository) · `shared/lib/stream/*` (openStream,
assistant store, `useAssistantStream` — **consumed as-is by ask-document, never modified**) ·
`shared/lib/ai-gateway/*` (types/real/fixture/select — ask-document sends its prompt through the same
gateway unchanged) · `app/api/ai/stream/route.ts` · `shared/lib/persist/*` · `shared/config/models.ts` ·
`widgets/dashboard/DashboardSummary.tsx` + `summary-prompt.ts` · `widgets/inspector/ConversationInspector.tsx`.

**Shared files edited additively** (and why they cannot move /chat First Load): `command-palette/*` — lives
in the FS2 dynamic overlay chunk, outside every route First Load · `widgets/inspector/Inspector.tsx` — one
added registry row; the file rides the lazy Inspector surface · `widgets/topbar/*` — one search button
(byte-level shell commons) · `routes.ts`/`shortcuts.ts`/`query-keys.ts`/`endpoints.ts`/`dto.ts`/
`fixtures/dataset.ts` — additive data rows (bytes; the fixture module is reachable only via dynamic import
outside its slice — grep-locked). Backstop for all of the above: **§6.3.6 — /chat First Load is
byte-compared pre/post; any regression, including commons re-partition, is fixed structurally before the
gate; 180 kB is non-revisable and 178 kB is the reference number.**

## 4. Definition of Done (FS7)

- A signed-in editor at `/knowledge` browses the active channel's documents (title/source/size/ingest
  status), searches/filters the loaded list (`?q=` shareable), opens a reader with sanitized Markdown and a
  version Timeline, uploads a source with honest ingest truth (uploading→ingesting→ready/failed, polling,
  no invented progress), re-ingests (202 "queued"), deletes (guarded, soft), assigns to a channel.
- "Summarize / Ask about this document" streams a real answer over the frozen dry-run path with **Trust
  (Generated · Source Available), a Citation resolving to the actual source document, a KnowledgeCard
  without a fabricated score, Explainability (confidence honestly absent), wire-only cost, Stop preserving
  partial** — and the prompt is unit-proven to contain only that document + the question.
- Inspector `document` works via `?inspect=document:<id>` in every route group; the FS2 contract unchanged.
- Palette `#` searches real knowledge documents and deep-links; other entity types keep honest copy;
  the topbar search entry opens it; `g k`, `n`, `/`, `j/k/↵` live in the registry and the cheat-sheet.
- Analyst/viewer read the workspace (route `content.view`), see zero write/AI affordances, and get honest
  copy — never a crash, never a fake control.
- Chunk inspector / retrieval preview / retrieval scores are visibly, honestly absent (§5.2 D1) — no
  simulated retrieval anywhere; the Retrieval Preview region states the truth.
- Empty scenario renders the D2 §15 canonical Knowledge empty state.
- All ten gates green **executed for real**; every route ≤ 180 kB First Load (incl. /knowledge and the
  re-measured /chat); size-limit measured against 560 with the rule-№33 procedure if exceeded;
  FS2–FS6 suites stay green; axe 0 violations.

## 5. Gates, contract truth & honesty

### 5.1 Engineering gates
The ten Stage 2 §14 gates run exactly as in FS6 (fast block → budget → e2e → size → storybook; the §3.1
Windows/pnpm safe order and `pnpm build || (pnpm install --force && pnpm build)` habit stand). Contract
gate: every endpoint used exists **verbatim** in `API_SPEC.md` §Knowledge Base (+ the already-confirmed
`/studio/dry-run` for ask-document); nothing added, nothing renamed.

### 5.2 Contract truth & deviations (decided by approving this plan)
- **D1 — no chunks, no retrieval API, no ingest SSE.** The frozen contract's knowledge surface is the
  seven `/documents` calls only. Stage 3 §8 anticipated `retrieve`/`ChunkDTO`/"ingest/retrieval SSE" — those
  endpoints do not exist in `API_SPEC.md`, and the SoT hierarchy (frozen contract > Stage 3) rules. Therefore:
  the **chunk inspector, retrieval preview and retrieval scores are honestly ABSENT** (visible canonical-copy
  seams, FS5 gated-tile discipline); ingest progress is Query **polling** (FE-ADR-9 fallback), never a
  simulated stream; `KnowledgeCard.score` stays unused. A backend retrieval/chunks endpoint is optional
  future backend work (PART1 §1.4) — never a prerequisite, never faked. D3 §7's "used by", "exclude chunk",
  "download" and "suggest tags" have no wire counterpart → honestly absent (see §8).
- **D2 — citations are provenance-fed, not retrieval-claimed.** The FS7 entry duty "retrieval-fed citations"
  is realized with the only truth the contract carries: the citation points at the **document the user
  explicitly fed into the prompt** (Source Available — provable, FS6 `buildSummaryPrompt` discipline). The
  model's own output is never parsed for invented sources; confidence/tool-calls stay absent (FS6 owner
  conditions binding). When a retrieval endpoint ever lands, real retrieval citations plug into the same
  Citation/KnowledgeCard contracts — no rework.
- **D3 — route RBAC correction is a PATCH.** `/knowledge` moves `content.edit` → `content.view` to match
  D3 §7 + the §R10.5 matrix (analyst/viewer «ро»). Write stays `content.edit`-gated per affordance. The
  FS2 `decideAccess` mechanism is untouched — only the registry datum changes (registry-driven pattern).
- **D4 — upload transport is *(assumed)* multipart/form-data**, ingest-status vocabulary and all document
  wire fields *(assumed)* — registered as **FE-RV-10** (§5.3) with single adjustment points. The fixture is
  typed by the same mirrors, so a live correction is a mapper-level change.
- FE-RV-3…9 unchanged. Nothing unexecuted is reported as a pass.

### 5.3 FE-RV impact
**Opens FE-RV-10 — live knowledge round-trip:** document wire casing/fields (incl. whether
`GET /documents/{id}` carries body text — the reader's honest fallback covers "metadata-only") · upload
transport (multipart *(assumed)*) + 201 body · ingest status values → 12-status mapping · versions wire
shape · `assign` response semantics · reindex 202 follow-up · list channel-filtering (`?channel_id=`
*(assumed)*; else client-side scoping over the assignment field). **Single adjustment points:**
`entities/document/model.ts` mappers + the `add-source` transport call. Exercised end-to-end offline via
the kill-switched fixtures; the first live-backend session closes most of FE-RV-7/8/9/10 together.
No other FE-RV changes; FE-RV-6 (Chromatic) unchanged — no new stories.

## 6. Budget impact (First Load 180 kB · size-limit 560 kB)

### 6.1 Per-route First Load (authoritative UX gate — non-revisable)
- **/knowledge (new):** target ≤ 165 kB — the list shell ships light (no DataTable; simple `j/k/↵` list),
  ALL heavy leaves lazy (§6.3). The markdown/shiki chunks already exist (built for /chat) and are loaded
  on reader intent, not in First Load.
- **/chat (178/180, 2 kB headroom):** FS7 touches **no chat widget/feature/route file**. The only shared
  surfaces touched are the palette (a lazy overlay — outside First Load) and pure registry data
  (routes/shortcuts — bytes). Residual risk is a **commons re-partition** (webpack re-chunking when new
  routes land — the FS6-addendum phenomenon): /chat is re-measured at T-FS7.12; if commons shift presses
  any route past 180, the fix is **structural** (split/lazy), never a threshold.
- All other routes stay ≤ their FS6 numbers; `pnpm budget` (machine gate) proves all 26+ routes ≤ 180 and
  `.next/route-budget.json` records both numbers per route for the report.

### 6.2 size-limit aggregate (regression detector, 560 kB; measured 550.33 — headroom 9.7 kB)
Honest expectation: FS7 adds real lazy weight — knowledge widgets/features (~10–15 kB est.), FileUpload
first-in-bundle (built FS3, tree-shaken until now), `entities/document` + fixtures growth (~5–8 kB est.).
**The 9.7 kB headroom will likely be exceeded.** Per rule №33 the plan does NOT touch the threshold:
implement → run `pnpm size` → if over, **STOP** and deliver a dedicated per-chunk addendum
(FS6_REPORT_SIZE_ADDENDUM precedent: growth attribution, lazy share, First-Load impact = none, byte-diff of
pre-existing chunks) and the owner decides at acceptance. `.size-limit.json` stays 560 throughout the stage.

### 6.3 Lazy-loading verification checklist (chat + knowledge; executed at T-FS7.12, recorded in the report)
1. Reader consumes the **existing** `markdown` lazy entrypoint — /knowledge First Load contains no
   markdown/shiki chunk (proof: `.next/route-budget.json` chunk union).
2. `AddSourceDialog` (+ FileUpload) and `AskDocumentPanel` (+ streaming machinery) load via `dynamic()` on
   intent only.
3. `DocumentInspector` rides the existing lazy Inspector surface; no inspector code in any route First Load.
4. Palette `#` changes stay inside the FS2 dynamic palette overlay chunk; the `#` document fetch fires only
   on mode entry.
5. No knowledge slice is statically imported into shared commons; fixtures remain dynamic-import-only from
   outside their slice (existing grep-lock tests extended to the new modules); dependency-cruiser 0.
6. /chat First Load byte-compared against 178 kB pre/post; any regression → structural fix before the gate.
7. Aggregate per-chunk table produced from the size run (addendum-ready if §6.2 triggers).

## 7. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | **Aggregate 560 likely blocks** (9.7 kB headroom vs real new lazy weight) | §6.2: measure → STOP → dedicated per-chunk addendum → owner decision at acceptance; never pre-raise; never un-split code to game the detector |
| R2 | **Commons re-partition presses /chat** (2 kB headroom) without FS7 touching chat code | §6.1/§6.3.6 byte-compare; structural fix (lazy/split) if it moves; budget gate is the hard backstop |
| R3 | **FE-RV-10 assumptions** (upload transport, wire fields, ingest statuses, channel filtering) | single adjustment points (`entities/document/model.ts`, add-source transport); fixtures typed by the same mirrors |
| R4 | Upload UX without real progress events could tempt fake percentages | honest state machine only (uploading→ingesting→ready/failed); polling truth; explicitly tested |
| R5 | `#` search could read as "retrieval" and overpromise | copy states it searches loaded documents; retrieval honesty surface (§1) keeps the distinction visible |
| R6 | Ask-document prompt could leak beyond the selected document (cross-doc/channel) | pure `buildDocumentPrompt` + unit inclusion/exclusion proof (FS6 precedent); channel isolation via the scoped query |
| R7 | RBAC route-permission PATCH could ripple into middleware/nav tests | registry-driven change only; FS2/FS4 suites re-run; read-only E2E journey added |
| R8 | E2E label pitfalls recur (substring `getByLabel`, post-stream anchors) | `{ exact: true }` convention + wire-cost done-marker anchoring, both already documented in chat.spec |
| R9 | Windows/pnpm `next` corruption (11 historical occurrences) | §3.1 safe order + auto-recovery habit; re-verify suspicious numbers on a clean `.next` |
| R10 | Scope creep toward chat-attach (FS7+) or Memory (FS8) | OUT list §8 is explicit; chat honest seams stay untouched |

## 8. Not in FS7 (explicit)

No chat knowledge-attach and no citations inside chat threads (deferred — /chat headroom is 2 kB; the chat
seams stay honest; owner schedules the stage) · no retrieval preview/scores/chunk inspector/"used by"/
"exclude chunk" simulation (no contract source — §5.2 D1) · no "suggest tags" (no persistable field) · no
document download (no endpoint) · no knowledge SSE (polling per FE-ADR-9) · no Memory surfaces or `#`
memory scope (FS8) · no `/studio/compare` (later stage) · no backend/`app/`/Protocol/SoT change · no ONYX
token-value change · no new dependencies (`date-fns` stays deferred) · no threshold changes (560/180 stand)
· no new ADR · no new stories · no README/handoff updates during the stage · no commits/pushes unless
instructed.

---

**Plan APPROVED by the owner** (2026-08-01: "в целом принимаю" + three fixations requested and recorded as
§3.1 rendering/loading matrix · §3.2 query-key invalidate graph · §3.3 FS6 no-touch guarantee; "после этих
уточнений план считаю окончательно утверждённым"). The approval covers the §5.2 deviations D1–D4 and the
§6.2 rule-№33 expectation for the 560 kB detector. Implementation proceeds per §2 on the owner's word; all
ten gates run for real; `FS7_REPORT.md` follows; then STOP for acceptance. FS8 will not be started.
