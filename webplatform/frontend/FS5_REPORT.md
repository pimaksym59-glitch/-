# FS5 — Dashboard · Implementation Report (v1.0)

**Track:** Web Platform (Console) · **Stage:** FS5 (Dashboard — first functional screen) · **SoT:**
`FRONTEND_MASTER_SPEC.md` implementing **D3 §4** against the frozen contract **`API_SPEC.md`** (Channels ·
Posts · Tasks · Analytics & Cost) · **Date:** 2026-07-31 · **Plan:** `STAGE_FS5_PLAN.md` (approved, with the
owner's size-limit exception: **345 kB stands — measure-then-propose, never pre-raise**).

**Result:** the Dashboard is the **first real screen**. The FS1 stub is replaced by an RSC initial-data page
feeding hydrated Query islands: four metric tile families with per-card error isolation, the honest **Gated**
engagement tile (§R10.3 — copy, never zeros), the read-only schedule timeline, the Needs-Review queue with
`j/k/↵` and real **202 queue intents**, the lazy activity feed, a real channel switcher that re-scopes every
channel-keyed query, and the Inspector's first real entity views (`post`, `job`) behind the unchanged FS2 URL
contract. The FS4 fixture pattern is generalized to **data**: ONE deterministic DTO-typed dataset feeds the
server branch, the browser MSW worker and node MSW, under the same triple kill-switch — **FE-RV-8**
registered. **Nine of ten gates green, executed for real; the size-limit detector is honestly RED at the
standing 345 kB threshold** — measured 475.37 kB, per-chunk growth analysis and an evidence-based proposal in
§7 for the owner's decision (the config was **not** touched). **No `app/` change · no ONYX token-value
change · no architecture change · no SoT edit · no new dependency · no endpoint invented.**

**Transfer note:** the stage was implemented across a session transfer (mid-FS5 handoff). Everything built
before the transfer was treated as unverified until the gates said otherwise; the resume followed
PROJECT_HANDOFF_PART4 §11.2 exactly.

---

## 1. Scope delivered (maps to STAGE_FS5_PLAN §2)

| Task | Delivered | Status |
|---|---|---|
| **T-FS5.0** Gate prep | Per the owner's GO exception: **no threshold change** — the detector stayed at 345 kB and was measured at the gate (§7); no dependency intake (none needed) | ✅ per the binding order |
| **T-FS5.1** Data seam + FE-RV-8 | `shared/lib/fixtures/{guard,dataset,browser,FixtureBoot}`: ONE deterministic dataset (FIXTURE_TODAY=2026-07-30) typed by the SAME wire mirrors the client maps from; `resolveFixture` is a pure resolver shared by the server branch (`server-fetch.ts` — `serverApi`/`serverApiOrNull`), the browser worker (`/api/v1/*` path handlers, local/ci only) and node MSW; scenario cookie `onyx-fixture-scenario` (default\|empty); triple kill-switch = FS4 pattern (env refusal · module-scope throw · static-import grep test); `FixtureBoot` mounted as a technical adapter (NuqsAdapter precedent) — the frozen 7-provider tree untouched | ✅ Verified — each lock unit-tested |
| **T-FS5.2–5.5** Entities | `entities/{channel,analytics,job,post}` — model (VM + mapper) + hooks + single `index.ts` each: `ChannelVM` (no token ref — proven by test), `MetricVM {value, gated}` (**gated ⇒ null + flag, even if the wire carried a number**), `JobVM` (statuses via `parseStatus`; unknown wire statuses stay raw + null, never coerced) + `selectUpcomingPublish`, `PostVM` + history line; initialData-seeded queries on channel-scoped keys | ✅ Verified |
| **T-FS5.6** `features/review-post` | `useReview` — approve/reject as **202 queue intents** (confirmed-not-optimistic per Stage 3 §8), invalidates `posts`+`jobs`(+`analytics`), toasts state the queued truth ("Approval queued … the worker will process it"); `ReviewActions` offered ONLY behind `can('content.publish')` (SEC-7) | ✅ Verified incl. failure path |
| **T-FS5.7** Real ChannelSwitcher | consumes `entities/channel`; loading/error/honest-empty states; selection → cookie-backed ui-store; `⌘.` unchanged — **FS2 R6/R8 closed** | ✅ Verified (E2E re-scoping journey) |
| **T-FS5.8** Dashboard screen | `dashboard/page.tsx` stub **REPLACED** by the RSC page: `cookies()` → `serverApiOrNull` for `/channels`, active channel = `onyx-channel` cookie ?? first, then **parallel** `/analytics/channels/{id}` · `/cost?group_by=day` · `/tasks?channel_id=` · `/channels/{id}/posts?status=needs_review` → entity mappers → `DashboardView` initial. Widgets: MetricTiles (per-card isolation; gated tile with canonical D2 §15 copy), ScheduleTimeline (read-only), NeedsReviewQueue (`j/k/↵`), DashboardActivity (**lazy**), greeting + Compose → `/chat`, **honest AI-summary seam** (labelled, nothing generated — FS6's entry duty), D2 §15 onboarding empty state, RBAC render variants, responsive | ✅ Verified |
| **T-FS5.9** Inspector views | view registry in `widgets/inspector` keyed by target type: `post` → title/preview/StatusBadge + history Timeline (registry statuses only; unknowns stay raw) + RBAC-gated ReviewActions; `job` → type/StatusBadge/attempts/run-at/created + error class. FS2 `?inspect=` URL contract and esc/focus **unchanged**; unregistered types keep the honest fallback | ✅ Verified (E2E deep-link + `↵` journey) |
| **T-FS5.10** Tests | **+33 (180 total / 34 files)**: unit — `resolveFixture` contract semantics (scenarios, 202, honest 404s, §R10.3), fixture-integrity locks, entity mappers (gated/secret-drop/parseStatus); component — MetricTiles per state **incl. the isolation proof** (fail ONLY analytics ⇒ jobs/posts tiles alive), NeedsReviewQueue (`j/k/↵`, RBAC per role, queued toast), DashboardView composition per role + empty; integration — node MSW got **path-only** `/api/v1` handlers backed by the SAME dataset; E2E — 7 new dashboard journeys (below) | ✅ Verified |
| **T-FS5.11** Gates + report | all ten executed (§2); this report; README + FE-RV register updated | ✅ (size-limit honestly red — §7) |

## 2. Gate results (executed, not simulated)

| # (Stage 2 §14) | Gate | Result |
|---|---|---|
| 1 · 2 · 3 | ESLint · Prettier · `tsc` strict | ✅ clean · clean · **0 errors** |
| 4 | Vitest | ✅ **180 passed / 34 files** (FS4: 147) |
| 4b | Playwright E2E | ✅ **64 passed, 0 failed**, 5 viewport-skipped — full 3-project matrix; new journeys: deterministic metrics · gated tile · `j/k/↵` → post Inspector · approve → "Approval queued" · **channel switch re-scopes** · analyst/viewer read-only · empty scenario via `onyx-fixture-scenario` · axe on the real dashboard. FS2/FS4 journeys stay green (one assertion legitimately **upgraded**: the shell journey now expects the real greeting h1, not the stub's "Dashboard") |
| 5 | Accessibility | ✅ **0 violations** — and the gate **found a real defect again** (§6.4): the MetricCard source whisper (`text.tertiary` at 12px) failed rendered contrast; fixed by token **usage**, then re-scanned clean on all three viewports |
| 6 | **size-limit** | at delivery: ❌ **475.37 kB > 345 kB (standing threshold)** — measured analysis + proposal in **§7**, config untouched per the owner's binding order. **At acceptance the owner chose Option A (485 kB)** — config updated, gate re-run: ✅ **475.37 / 485 kB** (§11) |
| 7 | `pnpm budget` | ✅ **worst route /dashboard 158 kB / 180 kB** (headroom 22 kB) — the first data-heavy route stayed within the UX budget with charts/feed lazy |
| 8 | dependency-cruiser | ✅ **0 violations** (341 modules, 578 deps) — four entities + one feature + dashboard widgets pass the FSD rules |
| 9 | Storybook build | ✅ full library builds (57.6 s); Chromatic upload still **FE-RV-6** |
| 10 | Contract | ✅ every endpoint used exists verbatim in `API_SPEC.md` (§Posts 69/74, §Scheduler 95–96, §Analytics 100/103); approve/reject honoured as `202 {task_id}`; engagement honoured as gated; **no endpoint added or changed**; wire casing remains *(assumed)* → FE-RV-8 |

## 3. Definition of Done (plan §4) — verification

- [x] The Dashboard answers D3 §4 with real contract data end-to-end — tiles, schedule, queue with working
  202 intents, activity, channel scoping; skeleton-first; `j/k/↵`; responsive; axe-clean (3 viewports).
- [x] **One failing metric never breaks the page** — proven by the component test that fails ONLY the
  analytics fixture and asserts the jobs/posts tiles still render.
- [x] **Gated engagement renders the honest Gated state** — proven against the gated fixture; the mapper
  test additionally proves a gated metric never surfaces a number even if the wire carried one.
- [x] The channel switcher is real; switching re-scopes every dashboard query (E2E: ch_tech → ch_daily flips
  cost, queue and schedule) — and the switch surfaced a real cross-channel seeding bug that is now fixed and
  regression-locked (§6.3).
- [x] The Inspector renders its first real entity views via the FS2 URL contract, unchanged.
- [x] The AI-summary card is an honest labelled seam; tile customization visibly deferred (plan §1 OUT).
- [x] All five roles reflected — E2E per role; analyst/viewer read-only.
- [x] Dashboard ≤ 180 kB First Load (158). ⚠ size-limit: measured, red at 345, proposal in §7 — per the
  owner's exception this is the prescribed outcome when the threshold truly blocks, not a skipped gate.
- [x] FE-RV-8 honest (§4).

## 4. FE-RV register (honest status)

| ID | Item | Status |
|---|---|---|
| FE-RV-3 · FE-RV-4 · FE-RV-5 | Docker · CI run · font pin | ⏳ open (unchanged) |
| FE-RV-6 | Chromatic baseline upload | ⏳ open (token still absent; 54 story files) |
| FE-RV-7 | Live auth round-trip | ⏳ open (unchanged; FS4 §4) |
| **FE-RV-8** *(new)* | **Live `/api/v1` data round-trip** | ⏳ open — cannot execute without the live backend. *(assumed)* and awaiting wire truth: **field casing** of the FS5 mirrors in `shared/types/dto.ts` (snake_case assumed; `entities/*/model.ts` mappers are the single adjustment points) · **"Cost today"/"Published today" derivations** from the analytics snapshot shape · **"Scheduled" = queued `publish` tasks with `run_at`** · **activity-from-tasks** (the contract has no dedicated activity endpoint) · real 202 task follow-up semantics · availability-flag wire shape. Implemented against the contract + the deterministic dataset; every *(assumed)* is marked at its source. **Never reported as live-verified.** |

## 5. Decisions & deviations (all PATCH — no architecture, token-value or contract change)

1. **`FixtureBoot` is a technical adapter, not an eighth provider** (mid-FS5 decision, confirmed): owns no
   state, mounted outermost like NuqsAdapter (FS2 §5.3); the frozen seven-provider order is untouched.
2. **`msw/browser` is aliased away in the SERVER webpack pass** (`next.config.ts`): msw declares
   `node: null` in its exports map, so the SSR compilation of the client graph cannot resolve the worker
   import even though it is lazy. Build-config PATCH; the browser bundle resolves it normally; the worker
   itself only ever starts in local/ci (kill-switched).
3. **Channel-scoped initialData carries `forChannelId`** — server seeds apply ONLY to the channel the server
   fetched for; cost-by-day (channel-independent) stays seeded. This decision is the fix for defect §6.3.
4. **`DashboardInitial.channels` is nullable**: a server-side channels failure hands the client island an
   honest page-level pending → error → retry path; the onboarding hero renders ONLY for a *confirmed* empty
   list (never on failure — that would be a lie).
5. **Scenario cookie over a channel-less fixture account**: the plan sketched a "new fixture role dataset"
   for the empty-state journey; the built seam's `onyx-fixture-scenario=empty` cookie covers it with one
   deterministic dataset and no extra account. Same coverage, less surface.
6. **The kill-switch grep lock is import-shaped, not name-shaped**: legal access to fixture modules is
   dynamic `import()` behind the env check (server-fetch precedent, reused by the dashboard page for
   scenario parsing); the integrity test therefore bans **static** imports of `fixtures/{guard,dataset,
   browser}` anywhere under `src/` outside the fixtures slice.
7. **`jsdom` gained a guarded `matchMedia` stub** in the shared test setup (same policy as the existing
   ResizeObserver/pointer-capture gaps) — the dashboard is the first surface whose tests mount
   AccessibilityProvider's reduced-motion context under jsdom.
8. **E2E heading assertion upgraded, not deleted** (FS2/FS4 discipline): the shell journey's
   `h1 "Dashboard"` belonged to the stub; the real screen's h1 is the greeting.

## 6. Defects found and fixed during FS5

| # | Symptom | Root cause | Fix |
|---|---|---|---|
| 1 | `next build` failed: "Package path ./browser is not exported from msw" | msw's exports map sets `node: null` for `./browser`; Next compiles client components for SSR too, so even the lazy worker import is resolved in a node context | server-pass webpack alias `'msw/browser': false` (§5.2) |
| 2 | 9 component tests crashed: `window.matchMedia is not a function` | jsdom gap surfaced by the first tests mounting AccessibilityProvider | guarded stub in `vitest.setup.ts` (§5.7) |
| 3 | **E2E: switching to Daily Brief kept showing Tech Digest's numbers** ($2.11 never appeared) | channel-scoped queries for the NEW channel were seeded with the OLD channel's RSC initialData — fresh-for-staleTime, so no refetch corrected it; a real data-correctness bug invisible to every static gate and to single-channel tests | `forChannelId` scoping (§5.3): seeds apply only to the server-fetched channel; the switch now fetches ch_daily live (worker/backend) — E2E green |
| 4 | **axe: MetricCard source whisper 12px `text.tertiary` failed contrast** on the real dashboard (all viewports, both themes) | the whisper was classified "decorative meta" (the tone mechanism's `tertiary` allowance) but it is real text at 12px — the FS1/FS2 small-text rule applies | usage fix (the sanctioned kind): whisper → `META_TEXT_TONE_CLASS.secondary`; token values untouched; note added for the D4 §12/§13 candidate list (what counts as "decorative" needs a crisper definition) |
| 5 | E2E strict-mode: "Approval queued" resolved to 2 elements | the toast title AND the polite announcer live-region both carry the copy (by design, D2 §17) | assert the exact toast title; `.first()` for the description (FS4 §6.4 precedent) |
| 6 | `next` package corrupted **1×** (`processChild.js` missing) mid-`pnpm budget` | PART4 §3.1 — the recorded workstation hazard (11th occurrence) | `pnpm install --force`, numbers re-verified on the clean rebuild |

Defects 1, 3, 4, 5 were invisible to typecheck/lint/unit tests — the **sixth stage in a row** where executing
the built app found what static gates cannot. Defect 3 is the strongest instance yet: it was invisible even
to the component suite and surfaced only in the cross-channel E2E journey the plan demanded.

## 7. size-limit: measurement, growth analysis, proposal (the owner's §5.1/№33 procedure)

**Measured:** 475.37 kB gzipped (detector glob `.next/static/chunks/*.js`) vs FS4's 343.18 kB —
**+132.19 kB**, threshold 345 kB → the gate is genuinely blocked, which per the GO ruling triggers this
analysis instead of a silent raise. **The per-route UX budget is unaffected** (worst route 158/180 — §2.7):
every new heavyweight entered as a **lazy** chunk, which is exactly the FS2 §5.3 dynamic — code-splitting
grows the aggregate while protecting what users download.

**Where the growth is (gzipped, chunk-attributed):**

| Contributor | ≈kB | Nature |
|---|---|---|
| **MSW browser worker** (chunk 8581) | 27.8 | **local/ci-only** — lazy behind the env check AND kill-switched; can never execute in staging/production, but the chunk is emitted and the detector counts it |
| **visx chart family** (chunks 3513 + 600 + 2783) | 24.6 | first real chart consumer (tile Sparkline) pulled the FS3 lazy chart modules into the build for the first time — ADR-FE-1's expected cost |
| `features/review-post` (2946) | 7.4 | lazy-loaded with the dashboard |
| Inspector entity views (2505) | 6.8 | lazy-loaded with the shell |
| Dashboard page chunk | 6.0 | (lives under `app/…`, below the detector glob) |
| Shared/common chunk growth (4003, 5674, 9924, 1850, 1165, …) | ≈65 | four entity slices, dashboard widgets, first inclusion of Timeline/ActivityFeed/MetricCard, switcher dropdown usage — spread by the bundler across existing commons |

**Proposal (owner's decision; config untouched until then):**

- **Option A (recommended):** set the detector to **485 kB** = measured 475.37 + ≈2% (the FS1 §3.6
  philosophy: catch regressions, never authorize waste). One number, simple, same semantics as today.
- **Option B (more precise, more config):** split the detector — exclude the fixture worker chunk from the
  production-truth entry (475.37 − 27.8 ≈ **447.6 kB** → threshold ≈ **456 kB**) and track the worker in a
  second, local-only entry. Reflects what staging/production can actually ship, at the cost of a
  pattern-matched exclusion that must be maintained.

Approaching-the-ceiling remains a STOP-and-report event either way. Until the owner rules, `pnpm size` stays
red at 345 — reported here as such, not worked around.

## 8. Freeze & invariant compliance

**Backend untouched** — no `app/` read-for-import or modification; no endpoint invented or changed; 202/gated
semantics adopted from the contract, not reinterpreted. **ONYX v1.0 intact** — zero token-value changes (the
§6.4 contrast fix changed which tone class a call site uses). **Frontend Architecture Freeze intact** —
provider tree and order unchanged (FixtureBoot is an adapter); FSD one-way boundaries at 0 violations with
341 modules; six state owners respected (server data in Query, active channel in the cookie-backed ui-store,
inspector target in the URL); heavy modules stay lazy (charts, activity feed, worker). **SoT untouched. No
ADR created.** Fixture discipline: staging/production builds cannot contain a stand-in — env refusal +
module-scope throw + the static-import grep lock, each executed in the suite.

## 9. Risks entering FS6

| # | Risk | Mitigation |
|---|---|---|
| R1 | **The size-limit gate is red pending the owner's §7 decision** — until a threshold is set, any aggregate regression hides inside the existing overage | decide §7 at acceptance; either option restores a binding detector; per-route budget (the UX gate) is green and unaffected |
| R2 | **FE-RV-8 assumptions** (wire casing, metric derivations, activity-from-tasks) surface only against the live backend | every *(assumed)* is marked at its source; `entities/*/model.ts` mappers are the single adjustment points; first live session closes most of FE-RV-7+8 together |
| R3 | Fixture/real drift now covers **data AND worker timing** (E2E trusts the browser worker to answer post-hydration fetches) | one dataset typed by the client's own mirrors; path-only handlers; FE-RV-8 is the reconciliation point |
| R4 | The tone mechanism's `tertiary` "decorative meta" allowance misclassified real text once (§6.4) — other meta-text call sites could repeat it | D4 §12/§13 candidate noted: define "decorative" (aria-hidden / duplicated info only); until then the MetricCard comment is the rule of record |
| R5 | Dashboard E2E anchors on real copy (greeting h1, toast titles, gated copy) — future copy edits will move tests | acceptable: the selectors follow the FS2 role+name convention; copy changes are reviewable diffs in both places |
| R6 | FS6 must replace the AI-summary seam and the palette `/` seam and wire `openStream` — the dashboard's seam card is now user-visible | FS6's entry duty per the roadmap; the seam is labelled honestly, never "done" silently |

## 10. Next step

**STOP — FS5 complete. Awaiting your acceptance, including the §7 size-limit decision (Option A / Option B /
your own number).** FS6 (AI Chat) has not been started and will begin only on your explicit GO, with a plan
as its first deliverable. Standing offers unchanged: a `CHROMATIC_PROJECT_TOKEN` closes FE-RV-6
(config-only); the first live-backend session closes most of FE-RV-7/FE-RV-8; the first `webplatform/`
commit remains at your command.

---

## 11. Acceptance addendum (2026-08-01)

**FS5 ACCEPTED by the owner.** The §7 size-limit decision: **Option A — the detector threshold is 485 kB**
(= measured 475.37 + ≈2%). The owner's rationale, recorded verbatim in substance: the growth is real
Dashboard dependency weight (visx, Inspector and related chunks); the fixture/msw chunk is deliberately NOT
excluded from the measurement so the control stays strict; **rule №33 stands** — the threshold was corrected
exactly once, after the factual bundle-composition analysis, never in advance.

Executed at acceptance: `.size-limit.json` → `485 KB`; `pnpm size` re-run → ✅ **475.37 / 485 kB (headroom
9.6 kB)**. All ten gates are now green. Risk §9 R1 is closed; approaching the new ceiling remains a
STOP-and-report event (FS1 §3.6). The handoff set was refreshed to the post-FS5 state on the owner's
instruction. FS6 awaits a separate explicit GO.
