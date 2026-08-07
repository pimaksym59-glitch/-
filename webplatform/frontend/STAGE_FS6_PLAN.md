# FS6 — AI Chat (Plan)

**Track:** Web Platform implementation · **SoT:** `FRONTEND_MASTER_SPEC.md` · implements **D3 §5 (AI Chat —
"the emotional center") + §6 (Chat History) + the D3 §4 AI-assistance row** through Stage 2 §4 (data layer /
SSE-over-fetch / BFF relay) · §7 (state owners: Streaming = transient Zustand; Draft = local persistence) and
the Stage 3 inventories (§4 entities `conversation`/`message` · §5 route `/chat/[[...id]]` "SSE tokens" ·
§6 hook `useAssistantStream` · feature `send-message`), against the frozen contract **`API_SPEC.md`**:
**AI Studio `POST /studio/dry-run` `{prompt|persona_id, model}` — generation WITHOUT publication or memory
write, response includes `cost` (§R10.9)** · Posts `POST /channels/{id}/posts → 201` + `POST
/posts/{id}/generate → 202` (the chat→pipeline bridge) · RBAC §R10.5 (Content = editor+). Design language:
D2 §14 AI set (StreamingMessage/ThinkingState/AIComposer/TrustLabel/ExplainabilityPanel/AIActionButton —
built in FS3) · D1 A5–A8 (AI presence, Explainability, Trust, no blocking spinners, Aurora only on genuine
AI moments). **This is a PLAN. No code yet.**

**Goal of FS6:** the working AI surface. `/chat` stops being a stub: real conversations with streamed-in
assistant turns over the frozen dry-run contract, Stop that actually cancels, message actions incl. **Insert
to channel** (the first chat→pipeline bridge), a searchable local Chat History rail, the palette **`/` Ask
AI** seam replaced, and the dashboard's **"What changed today?"** seam card replaced by a real, user-invoked,
metrics-grounded AI summary with Trust + Explainability. Frozen inputs consumed as-is; **no `app/` /
Protocol / MASTER_SPEC change; no endpoint invented; no ONYX token-value change.**

**Entry conditions — satisfied:** FS5 accepted 2026-08-01 (size-limit re-baselined to 485 kB); this plan is
FS6's first deliverable.

---

## 1. Scope

**IN:** an **AI gateway seam + BFF SSE relay** (§2 T-FS6.1): `app/api/ai/stream` is the Stage 2 §4
"SSE relay" BFF — it calls the real upstream `POST /studio/dry-run` with the caller's cookies and relays the
result to the client as SSE consumed by the existing `openStream`; a deterministic **fixture AI gateway**
(local/ci only, FS4/FS5 triple-kill-switch discipline) emits genuinely chunked, scenario-aware streams so the
whole streaming machinery is exercised end-to-end offline — registered as **FE-RV-9** (live AI round-trip) ·
**streaming state** per the frozen owners: `useAssistantStream` (openStream → transient Zustand via the
StreamingProvider registry, AbortController **Stop**, partial output preserved on error/stop, announcer
updates, reconcile into the conversation store on `done`) · **local-first conversations** (the contract has
NO conversation endpoints — §5.2 deviation D1): `shared/lib/persist` (versioned, size-capped localStorage —
the Stage 2 §7 Draft owner) + entities `conversation` (title/snippet/model/pinned/aggregated cost;
rename/pin/delete) and `message` (role/content/model/per-turn `cost` from the wire/trust=Generated/partial
flag) · feature **`send-message`** (AIComposer: `⌘↵` send · `⇧↵` newline · `↑` edit last · model selector
from a static *(assumed)* models registry · **Stop `⌘⌫`**; retry keeps history honest) · feature
**`insert-to-channel`** (message action → `POST /channels/{active}/posts` → **201** draft + optional
"Generate now" → **202** queue intent; queued-truth toasts; invalidates posts+jobs; `can('content.edit')`) ·
the **Chat screen** `/chat/[[...id]]` (D3 §5): history rail (searchable, pinned-first; tablet collapsible;
mobile sheet) · thread (StreamingMessage + ThinkingState; older messages virtualized via installed TanStack
Virtual; markdown via the lazy entrypoint) · sticky composer · D2 §15 chat empty state (New chat + static
prompt suggestions) · inline message errors with retry, partial preserved, 429 with explained wait ·
shortcuts registered in `shortcuts.ts` (`⌘⇧o` new chat · `[`/`]` prev/next conversation · `⌘⌫` stop — the
cheat-sheet updates itself) · **Inspector `conversation` view** (metadata: model, message count, aggregated
cost, created; actions rename/pin/delete) via the FS5 view registry · **palette `/` = Ask AI, real** (query →
new conversation in `/chat`, submitted; RBAC-filtered like `@admin`) · **dashboard summary card, real**
(D3 §4 AI row): user-invoked AIActionButton → dry-run grounded in the ALREADY-FETCHED channel-scoped
dashboard VMs; gated metrics **excluded from the prompt and named in Limitations** (§R10.3); output =
StreamingMessage + TrustLabel (Generated) + ExplainabilityPanel (data used = the tiles' metrics · model ·
calm confidence · limitations) + per-run cost; visible/invocable only with `can('content.edit')` · fixtures:
deterministic chat/summary streams + `POST /channels/{id}/posts → 201` and dry-run entries in the ONE
dataset (scenario-aware) · tests incl. a full chat E2E journey · gates + `FS6_REPORT.md`.

**OUT:** tool-call cards (the dry-run contract carries no tool steps — **nothing is faked**; they arrive
with a backend surface that emits them) · knowledge attach / citations-from-retrieval and D3 §6 AI search /
summarize-a-conversation (need FS7 retrieval — honest seams with copy, like the FS5 AI card was) ·
persona picker in the composer (persona-aware generation arrives with FS8 Memory; dry-run's `persona_id` is
not exercised) · `POST /studio/compare` (AI Playground screen, later stage) · D3 §4 "AI flags anomalies"
(needs Analytics trends — FS11; absence is honest, not seamed with fake flags) · conversation
sharing/multi-device (no backend — §5.2 D1) · Chat exports · prompt suggestions from `/prompts` (FS10;
static design copy instead) · voice/attachments · no `app/` / Protocol / SoT / ONYX-token-value change ·
**no new dependencies** (markdown/virtual/AI set/rhf already installed; `date-fns` stays deferred).

**Carried from FS5 (§9):** R6 copy-anchored E2E — chat E2E anchors on roles+names and deterministic fixture
text · R9 visible seams: this stage replaces the dashboard AI card and palette `/`; palette `#` remains for
FS7 (honest) · R1/R2 FE-RV-7/8 unchanged; FE-RV-9 joins them with the same single-adjustment-point rule.

## 2. Task sequence (each with a completion criterion)

| Task | Produces | Done when |
|---|---|---|
| **T-FS6.0** Gate prep | no dependency intake (none needed); no threshold changes (rule №33 — size-limit stays 485 kB, measured at the gate) | `pnpm gate` baseline green before new code |
| **T-FS6.1** AI gateway + BFF SSE relay + FE-RV-9 | `shared/lib/ai-gateway/{types,real,fixture,select}` (FS4 AuthGateway pattern): **real** = upstream `POST /studio/dry-run` with caller cookies, result relayed as SSE frames (if the upstream ever streams — RV — the relay forwards verbatim; single adjustment point); **fixture** = deterministic chunked streams from the ONE dataset (kill-switched: env refusal · module-scope throw · the FS5 import-shaped grep lock extended) · `app/api/ai/stream/route.ts` (POST; RAW header discipline; AbortSignal propagated upstream so **Stop cancels the real request**) · the FS1 demo relay `app/api/stream` is **replaced** by this real one · `dto.ts` gains `StudioDryRunRequest/ResponseWireDTO` (*(assumed)* casing; mapper = adjustment point) | fixture streams are deterministic per scenario; staging/production builds provably cannot contain the fixture (unit + grep locks); **FE-RV-9 registered**; no fabricated token cadence on the real path — a non-streaming upstream renders after an honest ThinkingState, in one append |
| **T-FS6.2** `useAssistantStream` | streaming hook per Stage 3 §6: consumes `openStream('/api/ai/stream')`; transient Zustand state via StreamingProvider's registry (Stop-all works); AbortController Stop; error keeps partial output + error class; polite announcer progress; on `done` reconciles the finished message into the conversation store | unit-tested with mocked streams: thinking→streaming→done, stop-preserves-partial, error-preserves-partial; no Query pollution with transient tokens |
| **T-FS6.3** Local conversation layer | `shared/lib/persist` (namespaced, versioned, size-capped localStorage; corrupt-data safe) · `entities/conversation` (VM+store: CRUD, pin, rename, search by title/snippet, pinned-first ordering, aggregated cost) · `entities/message` (VM: role/content/model/cost/trust=Generated/partial/error) | unit-tested: persistence round-trip, version migration guard, size cap eviction (oldest unpinned first), search; honest copy "threads live in this browser" surfaced in UI (§5.2 D1) |
| **T-FS6.4** `features/send-message` | Composer on ONYX `AIComposer` (⌘↵ / ⇧↵ / ↑ edit-last / model select / Stop) + `useSendMessage`: append user turn → stream assistant turn (T-FS6.2) → record per-turn `cost` from the wire; retry re-sends the same prompt as a NEW turn (history never rewritten silently) | component-tested per state incl. keyboard contract; cost renders only from wire values (never computed client-side) |
| **T-FS6.5** `features/insert-to-channel` | message action → dialog (active channel preselected) → `POST /channels/{id}/posts` (**201**, draft) → toast links to the draft; optional "Generate now" → `POST /posts/{id}/generate` (**202** — queued-truth toast, FS5 §R10.1 discipline); invalidates posts+jobs | RBAC: hidden without `content.edit`; MSW-tested incl. failure; the draft appears in the FS5 dashboard queue when its fixture status matches |
| **T-FS6.6** Chat screen | `/chat/[[...id]]` replaces its stub: RSC shell + client islands; history rail (search, pin, `[`/`]`, "See all" index state = D3 §6 basics: j/k/↵, rename/pin/delete); thread (virtualized backlog, StreamingMessage, ThinkingState — **no spinner anywhere on the surface**); sticky composer; D2 §15 empty state; inline error/429 states; responsive per D3 (mobile: full-screen thread, rail+inspector as sheets, docked composer) | the stub is REPLACED; deep link `/chat/<id>` restores a conversation; reload persists; all three viewports; skeletons only for shell/rail — AI output areas use ThinkingState |
| **T-FS6.7** Inspector `conversation` view | FS5 view registry gains `conversation` (Overview: model, messages, aggregated cost, created; Actions: rename/pin/delete, RBAC-aware); `?inspect=conversation:<id>` deep link | FS2 URL contract/esc/focus unchanged; unregistered types keep the fallback |
| **T-FS6.8** Palette `/` Ask AI — real | palette `/query` mode: submit → new conversation, query sent, navigate `/chat/<new>`; RBAC-filtered (roles without `content.edit` don't see actionable Ask AI — same rule as `@admin` filtering); seam copy removed | FS2 palette tests upgraded, not deleted; E2E: `/draft a post` lands in a streaming chat |
| **T-FS6.9** Dashboard summary — real | the FS5 seam card replaced: AIActionButton "Generate summary" (visible with `content.edit`) → prompt built ONLY from the already-fetched dashboard VMs of the active channel (gated metrics excluded + named in Limitations); streamed into the card as StreamingMessage; TrustLabel **Generated**; ExplainabilityPanel (why/data/confidence/limits per D1 A6); per-run cost from the wire; regenerate allowed; nothing auto-runs (cost honesty) | never renders without an explicit user action; analyst/viewer see the card's honest "editor action" state, no button; gated engagement NEVER appears in the prompt or the output claims (unit-tested prompt builder) |
| **T-FS6.10** Tests | unit: persist layer · ai-gateway (fixture determinism, kill-switch locks, relay SSE framing) · prompt builder (gated exclusion) · models registry · conversation store; component: Composer keyboard contract · StreamingMessage lifecycle (thinking/streaming/done/stopped/error-partial) · history rail actions · summary card (trust/explainability/RBAC); integration: node-MSW path-only handlers for `/api/ai/stream` (SSE) + posts 201/202 over the ONE dataset; **E2E:** editor journey (new chat ⌘⇧o → send → deterministic streamed reply → **Stop preserves partial** → retry → reload persists → `[`/`]` navigation → insert-to-channel → 201 toast → "Generate now" 202 toast) · palette `/` journey · dashboard summary journey (generate → streamed text → Trust + Explainability visible → cost shown) · analyst/viewer: `/chat` → 403 permission state, no `/` action, no summary button · axe on the real chat (3 viewports) · FS2/FS4/FS5 suites stay green | `pnpm test` + full `pnpm e2e` green |
| **T-FS6.11** Gates + report | all ten gates (`pnpm format` → `gate` → `budget` (chat ≤180 kB — markdown/virtual lazy) → `e2e` → `size` (485 — **measure**; if truly blocked: per-chunk analysis + evidence proposal, rule №33) → `build-storybook`); `FS6_REPORT.md` (three statuses; FE-RV register incl. FE-RV-9); README + handoff on the owner's word | gates green or honestly FE-RV-flagged; **STOP** |

## 3. Deliverables (file-level, maps to Stage 3 §1/§4–§6)

`src/shared/lib/ai-gateway/{types,real,fixture,select,index}.ts` · `src/app/api/ai/stream/route.ts`
(replaces `src/app/api/stream/route.ts`) · `src/shared/lib/persist/{index,store}.ts` ·
`src/shared/lib/stream/useAssistantStream.ts` (or `shared/hooks` per Stage 3 §6 placement) ·
`src/shared/config/models.ts` (static *(assumed)* registry) + `shortcuts.ts`/`query-keys.ts`/`dto.ts`
extensions (registries extended, never copied) · `src/entities/{conversation,message}/{index,model,store}.ts`
· `src/features/send-message/{index, model/useSendMessage.ts, ui/Composer.tsx}` ·
`src/features/insert-to-channel/{index, model/useInsert.ts, ui/InsertDialog.tsx}` ·
`src/app/(workspace)/chat/[[...id]]/page.tsx` + `src/widgets/chat/*` (ChatView, HistoryRail, Thread,
ChatEmpty, index) · `src/widgets/inspector/ConversationInspector.tsx` (+ registry row) ·
`src/widgets/command-palette/*` (`/` mode wiring) · `src/widgets/dashboard/DashboardSummary.tsx` (replaces
the seam block in `DashboardView`) · `src/shared/lib/fixtures/dataset.ts` (chat/summary/dry-run entries) ·
`tests/{unit,component,e2e}/*` additions · `FS6_REPORT.md`. **Other route stubs untouched; no new
endpoints; no new dependencies; `.size-limit.json` untouched (485).**

## 4. Definition of Done (FS6)

- A signed-in editor converses at `/chat`: streamed assistant turns, honest ThinkingState (no spinner),
  working **Stop** that cancels the underlying request and preserves partial output, retry, model selection,
  per-turn cost from the wire.
- Conversations persist locally (reload-proof, deep-linkable, searchable, pin/rename/delete), with the
  browser-local truth stated honestly in the UI.
- **Insert to channel** creates a real draft (201) and can queue generation (202) — queued-truth toasts;
  the draft is visible to the FS5 surfaces (queue/inspector) where its status matches.
- Palette `/` is the real Ask AI path; the seam copy is gone; RBAC-filtered.
- The dashboard "What changed today?" card generates a real, user-invoked, channel-scoped summary with
  **Trust (Generated) + full Explainability (why/data/confidence/limits)**; gated metrics never enter the
  prompt or the claims; cost is shown; nothing auto-runs.
- Every AI block carries Trust + Explainability (D1 A6/A7); Aurora appears only on these genuine AI moments;
  **no fabricated token cadence** — the live path renders exactly what the wire delivered, when it delivered.
- Analyst/viewer: `/chat` renders the 403 permission state (never a crash); no Ask AI affordances offered.
- All ten gates green; chat route ≤ 180 kB First Load; size-limit measured against 485 (rule №33);
  FS2/FS4/FS5 journeys stay green; axe 0 on the real chat.

## 5. Gates, environment & honesty

### 5.1 Engineering gates
The ten Stage 2 §14 gates run exactly as in FS5 (fast block → budget → e2e → size → storybook; §3.1
corruption recovery habit stands). Contract gate: every endpoint used (`/studio/dry-run`,
`/channels/{id}/posts`, `/posts/{id}/generate`) exists verbatim in `API_SPEC.md`; nothing added.

### 5.2 Honesty & deviations (decided by approving this plan)
- **D1 — conversations are local-first.** The frozen contract has no conversation/message endpoints; storage
  is the Stage 2 §7 Draft owner (localStorage). Sharing, multi-device history and D3 §5's "analyst/viewer
  read shared threads" are unrepresentable without backend work and are honestly ABSENT (the route stays
  editor+ per the frozen registry). This is the Register precedent: the UI states the truth instead of
  inventing an API. A future backend conversations API is future work, not FE-RV.
- **D2 — streaming transport.** The upstream dry-run is (assumed) non-streaming. The BFF relay + `openStream`
  machinery is real end-to-end and exercised by genuinely chunked fixture streams; on the live path a
  single-chunk upstream renders once, after an honest ThinkingState — **no simulated token cadence**. If the
  upstream ever streams, the relay forwards verbatim (single adjustment point). Registered as **FE-RV-9**:
  live dry-run round-trip (wire casing *(assumed)* · streaming capability *(assumed absent)* · cost field
  shape · 429 semantics).
- **D3 — no tool-call cards, no fake citations, no anomaly flags** — the contract provides none of them;
  the D2 §14 components wait for real data (FS7/FS11+).
- FE-RV-3…8 unchanged. Nothing unexecuted is reported as a pass.

## 6. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | **Chat route budget** — markdown + virtualization + AI set on one screen | heavy modules only via lazy entrypoints (FS3 discipline); `pnpm budget` is the gate; composer/thread shell stays light |
| R2 | **size-limit 485** — new chat chunks grow the aggregate | measure at the gate; rule №33 procedure if truly blocked (per-chunk analysis + proposal, never pre-raise) |
| R3 | **FE-RV-9 assumptions** (dry-run wire shape, streaming capability, cost, 429) | one adjustment point each: `ai-gateway/real` + the dto mapper; fixture typed by the same mirrors |
| R4 | localStorage limits/eviction could lose long histories | size-capped store with oldest-unpinned eviction + honest UI copy; unit-tested cap behaviour |
| R5 | Streaming state leaking into Query or component state | frozen owners enforced: transient Zustand only for tokens; Query/local store only on `done`; unit test asserts no token writes to Query |
| R6 | The summary prompt could leak gated metrics or cross-channel data | prompt builder is a pure unit-tested function over the active channel's VMs; gated fields excluded + named in Limitations (§R10.3/§R2.6) |
| R7 | Palette `/` and dashboard card double-trigger costs | actions are explicit and debounced; nothing auto-runs; cost surfaced per run |
| R8 | Scope creep into FS7 (knowledge/citations) and FS10 (prompts) | OUT list is explicit; seams stay honest copy, never fake data |

## 7. Not in FS6 (explicit)

No knowledge attach / retrieval citations / `#` palette mode (FS7) · no persona-aware generation (FS8) ·
no `/studio/compare` / Playground (later stage) · no prompt-library suggestions (FS10) · no anomaly flags
(FS11) · no conversation sharing or backend persistence (no contract) · no tool-call rendering (no wire
source) · no `app/` / Protocol / SoT / token-value change · no new dependencies · no threshold changes ·
no commits/pushes unless instructed.

---

**STOP — FS6 plan complete. Awaiting your approval of the plan, including the §5.2 deviations D1–D3
(local-first conversations · relay-over-dry-run streaming posture · no faked AI artifacts).** On approval I
implement §2 in order, run the gates (§5), write `FS6_REPORT.md`, and stop for acceptance. FS7 will not be
started.
