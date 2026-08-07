# FS6 — size-limit Technical Addendum (to FS6_REPORT §7)

**Purpose:** the owner accepted FS6 but deferred the size-limit decision pending a full technical
justification. This addendum is ANALYSIS ONLY — no code, config, README or handoff was changed; the detector
still reads **485 kB** and `pnpm size` is red. **Date:** 2026-08-01 · **Build analysed:** the FS6 acceptance
build (the same `.next` the ten gates ran on).

**Measurement bases.** The gate truth is `size-limit` (glob `.next/static/chunks/*.js`, per-file gzip):
**550.33 kB**. The per-chunk tables below use an independent gzip walk of the same files, which totals
**538.4 kB in-glob** — a constant ≈2.2% tooling delta (identical ratio at FS5: walk ≈465 vs gate 475.37), so
attribution percentages hold; absolute per-chunk numbers are the walk's.

**Two corrections to FS6_REPORT §7 (honesty first):**

1. **Arithmetic:** §7 said "+64.96 kB vs FS5". Wrong decomposition of two different numbers:
   growth vs FS5 = 550.33 − 475.37 = **+74.96 kB**; overage vs the 485 threshold = **+65.33 kB**. The
   analysis below explains the **+74.96**.
2. **Overbroad claim:** §7 said the fixture text appears in NO client chunk. Precisely: the **FS6 AI fixture
   is in no client chunk** (verified: `AI-FIXTURE INTEGRITY` / the fixture output template match nothing
   under `.next/static/chunks/**`). The string "Deterministic fixture reply…" DOES occur once in chunk
   `9301` (2.0 kB) — that is the **FS5 data-fixture dataset/browser-worker chunk** (it now includes the FS6
   `body_preview` dataset entry), the exact chunk the owner's FS5 ruling knowingly keeps inside the
   measurement: kill-switched, lazy, loadable only in local/ci, emitted in every build. No new leak; the §7
   sentence was too broad, not the build wrong.

---

## 1–2. Full breakdown: every chunk in the measurement (glob = TOP-LEVEL `chunks/*.js` only)

The glob covers 46 top-level files (538.4 kB walk-gzip). It **excludes** the `chunks/app/**` page/layout
files (≈47 kB total: the largest are `/dashboard` page 8.2 kB, `/chat` page 6.9 kB, root layout 3.5 kB,
eight 2.4 kB error/loading chunks, twenty-five ~0.2 kB stubs) and `chunks/pages/*` (2.9 kB Next internals).
Those excluded files ARE part of per-route First Load but have never been part of this detector's number
(same glob since FS2).

**Eager (First Load) chunks inside the glob** — classification from `.next/app-build-manifest.json`:

| kB | Chunk | Loaded by | Contents |
|---|---|---|---|
| 51.8 | `3b442ec9` | ALL routes (commons) | React DOM core |
| 49.6 | `4003` | ALL routes (commons) | Next runtime/router core |
| 2.1 + 0.2 | `webpack` + `main-app` | ALL routes | runtime glue |
| 17.2 | `8927` | authed layouts + login | TanStack Query core |
| 16.8 | `8129` | authed group layouts | Radix dropdown (switcher/avatar) + shared Radix internals |
| 9.9 | `8790` | all layouts | lucide icon runtime + shell chrome |
| 9.5 | `3458` | login/register | react-hook-form + login form |
| 10.8 | `9593` | **/chat only** | TanStack Virtual + Radix Select (composer) |
| 4.1 | `9034` | /chat + /dashboard | send-message/stream plumbing shared by chat & summary |
| 7.9 | `1165` | authed layouts | Radix dialog primitives (shell overlays) |
| 6.5 / 5.6 / 5.4 / 5.3 / 5.1 / 4.8 / 3.8 / 3.6 / 3.5 / 3.3 / 2.8 / 2.5 | `5117 5115 5377 8243 2505 8819 4599 8870 6445 3134 3560 5784` | per-layout/per-group | shell widgets, providers, inspector shell, auth UI, small commons |

Eager-in-glob subtotal ≈ **222 kB**. Per-route First Load (the UX budget, machine-checked): **/chat 178** ·
/dashboard 165 · /login·/register 141 · landing/403 110 · 25 stub routes 106 — **all ≤ 180, gate green**.

## 3. Lazy chunks inside the glob (load after paint or on action; never in any First Load)

| kB | Chunk | Contents | Why it exists |
|---|---|---|---|
| 56.3 | `framework` | React framework split | Next's own split; loaded post-hydration path |
| 51.9 | `28efd8eb` | **shiki** (CodeBlock ONYX dual themes) | FS3 heavy module, strictly lazy — **byte-identical to FS5** (same hash) |
| 44.0 | `2777` | **the FS6 chat cluster**: react-markdown/micromark/hast pipeline + Thread/StreamingMessage/HistoryRail/dialog leaves | the T-FS6.6 lazy split that took /chat from 204→178 kB First Load |
| 38.7 | `polyfills` | legacy-browser polyfills | Next default; candidate §7 |
| 31.3 | `main` | Next client entry (legacy pages runtime) | Next default |
| 27.8 | `8581` | **msw worker** (data fixtures) | local/ci-only, kill-switched; counted by the owner's FS5 ruling |
| 11.8 + 7.9 + 4.9 | `3513 600 2783` | **visx** chart family | ADR-FE-1, lazy since FS5 |
| 6.0 + 2.3 | `4559 3913` | cmdk palette + cheat-sheet overlays | FS2 lazy overlays |
| 4.4 | `1169` | chat UI leaves (empty state/suggestions) | FS6 |
| 2.0 | `9301` | data-fixture dataset/worker bootstrap | FS5 ruling (see correction 2) |
| ~9 (rest) | `2048 6126 3599 1375 7539 9538 7810 4098 9713 3863` | small lazy leaves (markdown wrapper, inspector views, misc) | FS3–FS6 |

Lazy subtotal ≈ **316 kB** — 59% of the measured aggregate never enters any route's First Load.

## 4. First Load — what a user actually downloads

Covered in §1–2: commons ≈104 kB + per-group layout chunks + route chunks. The authoritative per-route
numbers are machine-checked by `pnpm budget` (§2.7 of the report): worst **/chat 178/180**. Nothing in the
FS6 growth entered the shared commons: `3b442ec9`, `4003`, `28efd8eb`, `framework`, `polyfills`, `main`,
`8581`, all visx chunks are **byte-identical or size-identical to FS5**.

## 5. Why exactly +74.96 kB (475.37 → 550.33)

Mechanically, two movements (walk-gzip figures; they reconcile to +74.6, matching the gate's +74.96 at the
tooling ratio):

1. **Commons re-partition (net ≈ 0, but it reshapes the table).** When the chat route joined the graph,
   webpack re-cut FS5's eight mid-size commons (`5674 9924 1850 1859 4713 6797 2946 6406`, **−88.9 kB
   removed**) into nineteen finer chunks (part of the +163.5 kB of new files). The same bytes (Query, Radix,
   shell widgets, review feature, inspector) now sit in more, smaller, better-scoped chunks — that is why
   the new-chunk list looks large while per-route First Load barely moved (dashboard 158→165, stubs 106
   unchanged).
2. **Genuinely new functionality ≈ +75 kB**, all of it chat/AI scoped and none of it in commons:
   - **`2777` 44.0 kB — the lazy chat cluster.** Its dominant content is the **react-markdown/micromark
     sanitized-rendering pipeline** (D2 §17 / SEC-4), entering the app bundle for the FIRST time — FS6's
     chat messages and dashboard summary are the first real Markdown consumers (at FS5 no route rendered
     Markdown; shiki has always been a separate chunk). Plus the Thread/StreamingMessage/HistoryRail leaves.
     **Duplication was checked and ruled out**: the pipeline exists exactly once (`28efd8eb` contains shiki
     only — probed for `micromark/mdast/hast/react-markdown`: all absent there, all present in `2777`).
   - **`9593` 10.8 kB** — TanStack Virtual (first consumer: the thread) + Radix Select (first consumer: the
     composer's model selector), eager for /chat only.
   - **`1169` + `9034` ≈ 8.5 kB** — chat widgets/feature/stream plumbing (9034 shared by chat + summary).
   - **Inspector/palette/summary deltas ≈ 5 kB** — ConversationInspector, the real `/` mode, the summary
     card.
   - The remainder is the re-partition residue of movement 1 (finer chunks carry slightly more webpack
     boilerplate per chunk — the known cost of better splitting).

In one sentence: **the aggregate grew by the real weight of the AI surface (markdown pipeline + virtualizer +
select + chat/summary code), delivered entirely as lazy or /chat-scoped chunks, while every pre-FS6 heavy
chunk stayed byte-identical.**

## 6. What cannot shrink without harming the architecture

| Block | ≈kB | Why irreducible |
|---|---|---|
| React/Next floor (`framework, 3b442ec9, 4003, main, webpack, main-app`) | 191 | the platform itself (FE-ADR-1/2) |
| shiki | 51.9 | D2 CodeBlock with the frozen ONYX dual themes; already lazy; untouched since FS3 |
| react-markdown pipeline | ~30 (in 2777) | SEC-4 sanctioned sanitized rendering — hand-rolling Markdown is the forbidden alternative; already lazy; single copy proven |
| Radix primitives (dropdown/dialog/select/…) | ~35 across chunks | FE-ADR-7: accessibility is bought, not re-implemented |
| visx | 24.6 | ADR-FE-1; already lazy |
| **msw worker + dataset** | 29.8 | **the owner's FS5 ruling**: kill-switched local/ci stand-in, deliberately kept inside the measurement for strict control (excluding it would show a "prod-true" ≈520 kB, but that option was already rejected — recorded, not re-proposed) |
| TanStack Query/Virtual, zustand, nuqs, rhf | ~35 | the frozen state-owner architecture (FE-ADR-4/5) |
| Chat/dashboard feature code | ~25 | the delivered functionality itself |

## 7. What could still be optimized (future stages; every item needs code changes — none made now)

| Candidate | Potential | Where/when |
|---|---|---|
| **`polyfills` 38.7 kB** | the largest single prize: a modern `browserslist` target drops most of it | FS14/FS15 — needs the field-data decision (Lighthouse pass is already the FS15 plan) |
| **shiki grammar/theme subset** | unknown until measured; CodeBlock's real language set arrives with FS10 (Prompt Library) | FS10/FS14 |
| **lucide icon audit** (`8790` 9.9 eager) | a few kB if unused icons leak through the shell import | FS14 polish |
| **webpack chunk consolidation** (19 finer chunks each carry boilerplate) | ~3–5 kB via `splitChunks` tuning | FS14 — low value, real regression risk to the budget gate |
| Re-partition drift review after FS7 | n/a | FS7's plan must re-measure (the /chat headroom is 2 kB — FS6_REPORT §9 R2) |

Realistic total near-term potential: **~15 kB** without the polyfills decision; **~45–50 kB** with it. None
of it is available inside FS6 (code frozen for this addendum), and none of it changes the honest current
measurement.

## 8. Recommended threshold and why

**Recommendation: 560 kB** (= measured 550.33 + 1.76%).

- **Strict minimum would be 551 kB** (ceiling of the measurement) — but a detector at the exact measured
  value turns every accepted PATCH into a threshold renegotiation: FS6's own acceptance-grade fixes moved
  chunk contents and re-cut the graph by several kB (the lazy-split alone moved /chat 204→177→178 across two
  builds). A regression detector that fires on sanctioned one-line fixes stops detecting and starts nagging.
- **560 keeps the FS1 §3.6 philosophy intact**: ~9.7 kB of headroom catches any real regression (a single
  accidentally-eager Radix or chart import is 8–25 kB — it WILL trip), while absorbing hash/re-cut noise and
  small in-stage fixes. It is the same "measured + ≈2%, tightened, never pre-raised" procedure the owner
  approved at FS5 (475.37 → 485).
- Anything **above 560 authorizes waste** and is not recommended. If you prefer maximum strictness, **555**
  (+0.85%) is workable — with the stated cost that FS7-era acceptance fixes will likely force renegotiation.
- The per-route **180 kB UX budget stays the authoritative user-facing gate** either way (worst route 178,
  machine-checked); this detector remains what it has been since FS2 — a total-JS regression tripwire.

---

**STOP — addendum complete. No code, config, README or handoff was changed; `pnpm size` remains honestly red
at 485 until your decision. FS7 is not started.** On your ruling I will set `.size-limit.json` to the chosen
value, re-run `pnpm size`, and record the decision in FS6_REPORT §11 as an acceptance addendum — nothing
else.
