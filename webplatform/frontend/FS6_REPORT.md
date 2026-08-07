# FS6 — AI Chat · Implementation Report (v1.0)

**Track:** Web Platform (Console) · **Stage:** FS6 (AI Chat — the working AI surface) · **SoT:**
`FRONTEND_MASTER_SPEC.md` implementing **D3 §5/§6 + the D3 §4 AI row** against the frozen contract
**`API_SPEC.md`**: AI Studio `POST /studio/dry-run` (§R10.9) · Posts `POST /channels/{id}/posts → 201` +
`POST /posts/{id}/generate → 202` · **Date:** 2026-08-01 · **Plan:** `STAGE_FS6_PLAN.md` (approved with
deviations D1–D3 and six binding implementation conditions).

**Result:** the AI surface is **working**. `/chat` is a real three-pane screen: streamed assistant turns over
the frozen dry-run contract via a **verbatim** BFF SSE relay, a **Stop** that cancels the underlying request
and preserves partial output as an honest message, local-first conversations behind **ONE
ConversationRepository** (the owner's single swap point), message actions incl. **Insert to channel** — the
first chat→pipeline bridge (real 201 draft + optional 202 generation intent), a searchable history rail, the
palette **`/` Ask AI** made real, and the dashboard's **"What changed today?"** seam replaced by a real,
strictly user-invoked, metrics-grounded summary with Trust + Explainability (gated metrics provably never
enter the prompt). **Nine of ten gates green, executed for real; the size-limit detector is honestly RED at
485 kB** — measured 550.33 kB; per the owner's condition the threshold was **not** touched; the §7 per-chunk
analysis + evidence-based proposal awaits the owner's decision (rule №33). **No `app/` change · no ONYX
token-value change · no architecture change · no SoT edit · no new dependency · no endpoint invented · no
new ADR.**

---

## 1. Scope delivered (maps to STAGE_FS6_PLAN §2; owner conditions 1–6 referenced as C1–C6)

| Task | Delivered | Status |
|---|---|---|
| **T-FS6.0** Gate prep | baseline gate green before new code; no dependency intake; no threshold changes (C5/C6) | ✅ |
| **T-FS6.1** AI gateway + relay + FE-RV-9 | `shared/lib/ai-gateway/{types,sse,real,fixture,select}`: **real = VERBATIM relay** (C2 — a JSON upstream becomes exactly ONE `result` frame + `[DONE]`, zero chunk cadence; an SSE upstream is piped byte-for-byte; failures pass the upstream status through incl. Retry-After — all three outcomes unit-locked) · **fixture** = deterministic, truly chunked, kill-switched (module-scope throw + import-shaped grep lock + the shared env refusal; pacing exists ONLY in the stand-in so Stop is exercisable — the live path never paces) · `app/api/ai/stream` (SEC-2 session guard, prompt validation, abort propagated so **Stop cancels upstream**) **replaces the FS1 demo relay** · `dto.ts` mirrors (*(assumed)* casing) · dataset gains posts-create 201 / generate 202 | ✅ Verified |
| **T-FS6.2** `useAssistantStream` | transient token state in a module-level Zustand store (the frozen Streaming owner — never Query, never component state); `useAssistantRunner` (per-call key — a first turn creates its conversation and streams under the new id), `useAssistantSlice`, fixed-key convenience hook; announcer updates; outcome reconciles into the caller's store on `done`; stop/error preserve partial | ✅ Verified |
| **T-FS6.3** Conversation layer (C1) | `shared/lib/persist` (namespaced, versioned, corrupt-safe, memory fallback) · `entities/conversation` with **ConversationRepository** — the ONLY storage toucher; `getConversationRepository()` is the ONE swap point for a future backend API; Zustand mirror + hooks on top; caps: 50 conversations (oldest-UNPINNED evicts first, messages removed with the thread), 200 messages/thread; local-only truth stated in the UI; Stage 3's `message` entity folded in (§5.3) | ✅ Verified incl. eviction/cap tests |
| **T-FS6.4** `features/send-message` | Composer (ONYX AIComposer + registry model Select; `⌘↵`/`⇧↵`/`↑` edit-last/Stop) · `useSendMessage`: persist user turn → stream → reconcile; **cost/model recorded ONLY from the wire** (C3); stopped ⇒ `partial`, failed-with-text ⇒ `error` — partial output never lost; retry = a NEW turn (history never rewritten) | ✅ Verified |
| **T-FS6.5** `features/insert-to-channel` | InsertDialog (channel preselected from the active channel · editable title · content preview · optional generation) → **201 "Draft created"** + optional **202 "generation queued (task …)"** — the §R10.1 queued-truth wording; invalidates posts+jobs (the FS5 dashboard picks the draft up); `can('content.edit')`-gated | ✅ Verified |
| **T-FS6.6** Chat screen | `/chat/[[...id]]` stub REPLACED: instant shell + composer; **heavy leaves lazy** (C6): virtualized Thread (TanStack Virtual + StreamingMessage chain), HistoryRail (search/pin/rename/guarded-delete/`j/k/↵`), InsertDialog (chunk loads on the action); D2 §15 empty state with static suggestions; ThinkingState — **no spinner on the surface**; 429 explained; responsive (rail = sheet below `lg`); shortcuts wired + registry flipped honest (`chat-*` active, `⌘⇧O`, `[`/`]`; FS5's `j/k/↵` list entries marked active too) | ✅ Verified |
| **T-FS6.7** Inspector `conversation` | view registry gains `conversation`: model/messages/aggregated wire cost/created/updated/"This browser only"; rename/pin/delete (RBAC-gated); FS2 URL contract unchanged | ✅ Verified |
| **T-FS6.8** Palette `/` — real | query → `/chat?q=…` → consumed ONCE and auto-sent; RBAC-honest for analyst/viewer ("editor action" copy, nothing actionable); `New chat` palette command added; `#` stays an honest seam (FS7) | ✅ Verified |
| **T-FS6.9** Dashboard summary (C4) | `DashboardSummary` (lazy) replaces the FS5 seam: **explicit AIActionButton only — mounting renders the idle state, proven by test**; prompt from the pure `buildSummaryPrompt` — **gated metrics never enter it (even with a smuggled wire number) and are named in Limits**; output = StreamingMessage + TrustLabel(Generated · source available) + ExplainabilityPanel(why/data/limits; **confidence NOT rendered** — the contract carries none, C3) + wire cost; regenerate allowed; read-only roles get the honest no-button state | ✅ Verified |
| **T-FS6.10** Tests | **+35 (215 total / 42 files)**: unit — persist · repository (CRUD/eviction/caps) · ai-gateway (verbatim semantics + kill-switch + grep lock) · summary-prompt (gated exclusion) · `useAssistantStream` (done/error paths over MSW SSE); component — Composer keyboard contract · DashboardSummary (no-auto-run/Trust/Explainability/RBAC) · ChatView integration (create-and-navigate; stream-and-reconcile with wire cost); integration — node-MSW path-only `/api/ai/stream` SSE handler; **E2E +9 journeys** (§2); FS2/FS4/FS5 suites green (2 legitimate upgrades: palette `/` assertion; none deleted) | ✅ Verified |
| **T-FS6.11** Gates + report | all ten executed (§2); this report; README/handoff untouched per the owner's order | ✅ (size-limit honestly red — §7) |

## 2. Gate results (executed, not simulated)

| # (Stage 2 §14) | Gate | Result |
|---|---|---|
| 1 · 2 · 3 | ESLint · Prettier · `tsc` strict | ✅ clean · clean · **0 errors** |
| 4 | Vitest | ✅ **215 passed / 42 files** (FS5: 180) |
| 4b | Playwright E2E | ✅ **88 passed, 0 failed**, 5 viewport-skipped — full 3-project matrix; new journeys: streamed turn with wire cost/model · **Stop preserves partial (the fixture tail provably never arrived)** · reload persistence + `[`/`]` navigation · insert-to-channel 201+202 toasts · palette `/` hand-off · dashboard summary (no-auto-run → Trust/Explainability/cost) · analyst/viewer honesty (403 + no Ask AI) · axe on the real chat |
| 5 | Accessibility | ✅ **0 violations** — and the FS5 §6.4 tertiary trap was caught **pre-emptively** this time (§5.7): the StreamingMessage/AIComposer 12px whispers moved to `secondary` BEFORE the axe run |
| 6 | **size-limit** | at delivery: ❌ **550.33 kB > 485 kB** — truly blocked; per the owner's C6 the threshold was NOT revised; §7 + the dedicated **`FS6_REPORT_SIZE_ADDENDUM.md`** carried the analysis. **At acceptance the owner ruled 560 kB** — config updated, gate re-run: ✅ **550.33 / 560 kB** (§11) |
| 7 | `pnpm budget` | ✅ **worst route /chat 178 kB / 180 kB** — the gate **caught the chat route at 204 kB mid-stage** and forced the honest fix (lazy leaves, §6.1), not a threshold change |
| 8 | dependency-cruiser | ✅ **0 violations** (370 modules, 688 deps) — conversation entity, two features, chat widgets, ai-gateway all pass FSD |
| 9 | Storybook build | ✅ full library builds; Chromatic still FE-RV-6 |
| 10 | Contract | ✅ endpoints used exist verbatim (`/studio/dry-run` §AI-Studio; posts create §70; generate §71); dry-run isolation semantics respected (no publication, no memory write, cost surfaced); **no endpoint added**; wire casing *(assumed)* → FE-RV-9 |

## 3. Definition of Done (plan §4) — verification

- [x] Editor converses at `/chat`: streamed turns, honest ThinkingState, working Stop (cancels upstream via
  the abort chain; partial preserved as an honest `partial` message), retry, model selection, wire-only cost.
- [x] Conversations persist locally (reload-proof E2E), deep-linkable, searchable, pin/rename/guarded-delete;
  the browser-local truth is stated in the rail and the Inspector.
- [x] Insert to channel creates a real draft (201) and can queue generation (202) — queued-truth toasts.
- [x] Palette `/` is real and RBAC-filtered; the seam copy is gone.
- [x] The dashboard summary is strictly user-invoked (mount-state proven by unit + E2E), grounded ONLY in
  non-gated channel metrics (pure-function proof incl. the smuggled-number case), with Trust + Explainability
  and wire cost; nothing auto-runs.
- [x] No fabricated AI artifacts anywhere: no tool calls, no citations, no confidence, no token cadence on
  the live path (relay verbatim semantics unit-locked).
- [x] Analyst/viewer: 403 permission state on `/chat`; no Ask AI affordances (E2E per role).
- [x] Ten gates executed; chat ≤ 180 kB First Load (178); FS2/FS4/FS5 journeys green. ⚠ size-limit measured
  red at the standing 485 — §7 per rule №33 (the prescribed outcome, not a skipped gate).
- [x] FE-RV-9 honest (§4).

## 4. FE-RV register (honest status)

| ID | Item | Status |
|---|---|---|
| FE-RV-3 · 4 · 5 · 6 · 7 · 8 | Docker · CI run · font pin · Chromatic · live auth · live data | ⏳ open (unchanged) |
| **FE-RV-9** *(new)* | **Live AI round-trip** | ⏳ open — cannot execute without the live backend: `POST /studio/dry-run` wire shape (`StudioDryRunResponseWireDTO {output, model, cost_usd}` is an *(assumed)* mirror; the relay's JSON branch + `mapResult` are the single adjustment points) · upstream streaming capability (*(assumed absent)* — if it ever streams, the relay forwards verbatim; one branch to adapt) · real cost field semantics · real 429/limits behaviour · `POST /channels/{id}/posts` request body shape (*(assumed)* `{title, body}`). Exercised end-to-end via the kill-switched fixture gateway; **never reported as live-verified.** |

## 5. Decisions & deviations (all PATCH — no architecture, token-value or contract change)

1. **Approved deviations D1–D3 implemented as approved**: local-first conversations (D1) · verbatim
  relay-over-dry-run streaming posture (D2) · no fabricated AI artifacts (D3).
2. **AI fixture content lives in `ai-gateway/fixture.ts`, not `fixtures/dataset.ts`** (plan §3 listed dataset
  entries): the FS4 auth-gateway precedent — a static dataset import from another slice would break the FS5
  import-shaped grep lock. The dataset still gained the *contract* entries (posts 201 / generate 202); the
  AI stream content is the gateway's own, under its own module-scope throw + its own grep lock.
3. **Stage 3's `message` entity folded into `entities/conversation`** until a backend conversations API
  exists: messages have no life outside their thread, FSD forbids sibling-entity imports, and C1 demands ONE
  repository. The entity materializes with the API.
4. **`useAssistantRunner` (per-call key) + `useAssistantSlice`** alongside the fixed-key hook: a first chat
  turn must create its conversation and stream under the new id in the same call.
5. **The `?q=` hand-off does not clear the query via nuqs on the created path** — a queued nuqs URL write
  RACED the created-conversation `router.replace` and won, stranding the user on `/chat` (found live, §6.3);
  the replace itself drops `?q=`.
6. **Chat heavy leaves lazy** (Thread/HistoryRail/InsertDialog) after the budget gate caught 204 kB (§6.1) —
  the FS3 discipline applied, thresholds untouched; InsertDialog additionally mounts only on the action.
7. **Tertiary whispers fixed pre-emptively** (StreamingMessage/AIComposer 12px meta → `secondary`): the FS5
  §6.4/R4 rule applied at write time instead of waiting for axe to fail — the D4 §12/§13 "define decorative"
  candidate stands.
8. **`launch.json` gained a `console` entry** (dev-tooling only — live preview used to reproduce two E2E
  failures against the real built app).
9. **Registry honesty**: `chat-*` shortcuts flipped active (+`chat-new`, `chat-prev-next`); FS5's list
  entries (`j/k`, `↵`) flipped active retroactively — they have been real since FS5's queue.

## 6. Defects found and fixed during FS6

| # | Symptom | Root cause | Fix |
|---|---|---|---|
| 1 | **`pnpm budget`: /chat at 204 kB > 180** — the first gate failure of the stage | the chat screen eagerly bundled radix select/dialog/checkbox, react-virtual and the StreamingMessage chain | lazy leaves (§5.6); re-measured 178/180. The UX budget did its job — the fix is structural, never a threshold |
| 2 | 9 component tests: `window.matchMedia is not a function`-class jsdom gaps for the virtualized thread | jsdom has no layout — the virtualizer renders zero rows at height 0 | per-file `getBoundingClientRect` stub (the FS3 Chart-test precedent) |
| 3 | **E2E: palette `/` stranded the user on `/chat` with nothing sent** | `setPendingQ(null)` (nuqs) queued a URL write that raced and CLOBBERED the created-conversation `router.replace` — a real UX bug reproduced live in the preview browser | consume-once effect lets the replace drop `?q=` itself (§5.5); regression-locked by the palette E2E journey |
| 4 | E2E: insert-to-channel timed out — the action button "did not exist" | **`getByLabel('Conversation')` matches by SUBSTRING** — it resolved 5 elements (rail "Conversation actions…", "Conversations" list, "Search conversations"…), and `.first()` picked the rail row, which has no actions | `{ exact: true }` + wait for the done marker before interacting (the transient streaming bubble legitimately has no actions) |
| 5 | E2E: ⌘K after `page.goto` intermittently no-opped (desktop-light/mobile) | the keypress raced client hydration — the shortcut listener wasn't attached yet | retry-until-attached pattern (`expect().toPass`) |
| 6 | Race in component tests: found streamed text detached mid-assert | the transient streaming node is REPLACED by the persisted message on done | anchor assertions on the done marker (wire cost) first |
| 7 | Lint: `no-dynamic-delete` ×3 · a static-interaction wrapper | new stores used `delete`; the Composer's `↑` key delegation wrapper | `Object.fromEntries` filters; documented per-line suppression (the palette-autofocus precedent) |

Defects 1, 3, 4 were invisible to typecheck/lint/unit tests — the **seventh stage in a row** where executing
the built app found what static gates cannot; defect 3 is a real product bug only the E2E journey (and the
live preview reproduction) exposed.

## 7. size-limit: measurement, growth analysis, proposal (rule №33; threshold untouched per the owner's C6)

**Measured:** 550.33 kB gzipped vs FS5's 475.37 — **+64.96 kB**, threshold 485 → truly blocked, which
triggers this analysis instead of a raise. **The per-route UX budget held** (worst /chat 178/180 — §2.7):
every heavyweight entered as a **lazy or route-scoped chunk**; the shared First-Load commons are unchanged
(106 kB). The kill-switch held too: **the deterministic fixture text appears in NO client chunk** (verified
during attribution).

**Where the growth is (gzipped, chunk-attributed):**

| Contributor | ≈kB | Nature |
|---|---|---|
| Lazy chat cluster (Thread + StreamingMessage chain + HistoryRail + dialogs; chunk 2777) | 44.0 | loads after the chat shell paints; never in First Load |
| Composer/select + react-virtual commons (9593) | 10.8 | chat-scoped |
| Chat widgets/entities/feature chunks (1169, 9034, +ChatEmpty) | ≈8.5 | route-scoped |
| Inspector view + palette + summary deltas (2505, 4559, …) | ≈5 | additive to existing lazy chunks |
| Commons reshuffle (8927/8129 replacing FS5's 5674/9924) | ≈−3 net | bundler regrouping |

**Proposal (owner's decision; config untouched until then):** set the detector to **560 kB** = measured
550.33 + ≈2% (the FS1 §3.6 philosophy — catch regressions, never authorize waste). Consistent with your FS5
ruling, the msw fixture chunk (27.8 kB) stays INSIDE the measurement — strict control over a smaller number.
Approaching the ceiling remains a STOP-and-report event. Until you rule, `pnpm size` stays red at 485 —
reported here as such, not worked around.

## 8. Freeze & invariant compliance

**Backend untouched** — no `app/` read-for-import or modification; no endpoint invented; dry-run isolation
(§R10.9) and 201/202 semantics adopted, not reinterpreted. **ONYX v1.0 intact** — zero token-value changes
(the whisper fix is a tone-usage change under the FS5 §6.4 rule). **Frontend Architecture Freeze intact** —
seven-provider tree/order unchanged; FSD 0 violations at 370 modules; state owners exact (tokens in the
transient store, threads in the Draft owner behind the repository, inspector target in the URL, server data
in Query); heavy modules lazy. **SoT untouched. No ADR created. No dependency added.** The six owner
conditions are each covered by at least one executable test (C1 repository tests + no direct storage in
components by construction; C2 verbatim-relay unit trio; C3 no-invented-fields by construction + confidence
omitted; C4 no-auto-run unit + E2E; C5 boundaries/freezes; C6 lazy + budget gate + untouched thresholds).

## 9. Risks entering FS7

| # | Risk | Mitigation |
|---|---|---|
| R1 | **size-limit red pending the §7 decision** — regressions can hide inside the overage until a threshold binds | decide §7 at acceptance; the per-route budget (UX gate) is green and binding |
| R2 | **/chat headroom is 2 kB** (178/180) — the next chat-adjacent feature (FS7 citations/attach) will press the route | FS7 must plan its chat additions as lazy from the start; the budget gate is the backstop |
| R3 | **FE-RV-9 assumptions** (dry-run wire shape, streaming capability, post-create body) | single adjustment points in `ai-gateway/real` + dto mappers; first live session closes most of FE-RV-7/8/9 together |
| R4 | Local-first thread limits (50/200, localStorage) are honest but real — heavy users will hit them | stated in the UI; the repository seam (C1) is the one-point upgrade when a backend API lands |
| R5 | The `getByLabel` substring pitfall (§6.4) can bite future specs | chat spec documents the `exact: true` rule; role+name convention unchanged |
| R6 | FS7 replaces the palette `#` seam and brings retrieval/citations — Citation/KnowledgeCard components are still data-starved | FS7 entry duty per the roadmap; nothing faked meanwhile |

## 10. Next step

**STOP — FS6 complete. Awaiting your acceptance, including the §7 size-limit decision (560 kB or your own
number).** FS7 (Knowledge) has not been started and will begin only on your explicit GO, with
`STAGE_FS7_PLAN.md` as its first deliverable. README and the handoff kit were deliberately NOT updated (your
instruction); on your word after acceptance I refresh them. Standing offers unchanged: a
`CHROMATIC_PROJECT_TOKEN` closes FE-RV-6; the first live-backend session closes most of FE-RV-7/8/9; the
first `webplatform/` commit remains at your command.

---

## 11. Acceptance addendum (2026-08-01)

**FS6 ACCEPTED by the owner** (stage work accepted first; the size-limit decision was deferred pending the
dedicated technical justification — **`FS6_REPORT_SIZE_ADDENDUM.md`**, analysis-only, no code changed). The
addendum corrected two §7 statements (growth vs FS5 is **+74.96 kB**, not +64.96 — the latter conflated the
threshold overage of +65.33; and the FS6 **AI** fixture is in no client chunk, while the "Deterministic
fixture reply" string legitimately occurs in the FS5-sanctioned kill-switched data-fixture chunk `9301`),
attributed the growth (commons re-partition net-zero + the real AI-surface weight: markdown pipeline ~30 kB,
virtualizer+select 10.8, chat/summary code ~13.5 — all lazy or /chat-scoped; 59% of the aggregate is lazy),
and recommended 560 kB as the minimal realistic detector.

**The owner's ruling:** **size-limit = 560 kB** — a ONE-TIME re-baseline on FS6 completion; **rule №33
stands unchanged**; the per-route **First Load budget (180 kB) remains the authoritative UX budget and is
not revisited**; the aggregate stays an architectural-regression detector.

Executed at acceptance: `.size-limit.json` → `560 KB`; `pnpm size` re-run → ✅ **550.33 / 560 kB (headroom
9.7 kB)**. All ten gates are now green. Risk §9 R1 is closed; approaching the ceiling remains a
STOP-and-report event. The track README and the handoff set were refreshed to the post-FS6 state on the
owner's instruction. FS7 awaits a separate explicit GO.
