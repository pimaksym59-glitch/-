# PROJECT_HANDOFF.md — Master Continuation Handoff

> **Supersedes** every earlier version (2026-07-27 pre-FS1; 2026-07-29 post-FS2; 2026-07-30 mid-FS5;
> 2026-08-01 post-FS5/FS6/FS7; 2026-08-02 post-FS8/FS9; 2026-08-03 post-FS10/FS11; 2026-08-04 post-FS12;
> 2026-08-05 post-FS13; 2026-08-06 post-FS14). This revision is current as of **2026-08-07, POST-FS15**:
> **FS1–FS15 are delivered and accepted — the frontend implementation track is COMPLETE (15/15 stages).**
> FS15 (Production Readiness) shipped **zero `src/` production modules**, so the size-limit detector stayed
> at **777 kB** with no re-baseline needed (measured 766.23 kB, green, headroom 10.77 kB — unchanged from the
> FS14 acceptance; the nine prior rulings still stand as recorded: FS5 → 485, FS6 → 560, FS7 → 598, FS8 →
> 628, FS9 → 655, FS10 → 677, FS11 → 696, FS12 → 756, FS13 → 777); rule №33 unchanged; the **180 kB First
> Load budget stays the authoritative, non-revisable UX gate** and `/chat` remains **180 / 180 — ZERO
> headroom**, which is the single most binding number in the project, and it held through FS15
> **unconditionally** — FS15 shipped no module that could have moved it.
> **Implementation completion is not Runtime Verification.** FS15 delivered a frontend-local Docker Compose
> overlay (`webplatform/docker-compose.console.yml`, root infrastructure untouched), a real CI E2E-matrix
> fix, a one-off secrets-in-bundle scan, a cross-cutting gated-data audit test, a workstation-only Lighthouse
> pass, and — because this environment has no Docker engine, no CI runner and no live backend — a
> consolidated **`webplatform/frontend/PRODUCTION_READINESS_RUNBOOK.md`** in place of any fabricated closure
> of FE-RV-3/4/17. **No FE-RV closed at FS15** (FE-RV-5 remains the last one closed, at FS14). **There is no
> FS16 on the roadmap.** The frontend track's only remaining work is Runtime Verification against real
> infrastructure — the same category of work the backend has carried as RV-1…18 since its own Stage 20.
> Nothing from older versions was lost — absorbed and expanded across the parts below.

**Purpose.** Let a different Claude (new account, zero prior context) continue this project **as if it had run
it from day one**. Read this file first, then the four parts in order. Do not re-analyse the codebase before
reading them — everything needed is written down.

---

## 0. The 60-second orientation

- **One repo, two tracks.** `C:\Users\Fupxrx\Desktop\projects`
  - **(A) Backend** — *AI Telegram Automation Platform*. **COMPLETE (20/20 stages).** Frozen. Never modify.
  - **(B) Frontend** — *Console* web platform in `webplatform/`. Design + architecture complete and frozen;
    **IMPLEMENTATION COMPLETE — 15 of 15 stages accepted (FS1–FS3 2026-07-29; FS4 2026-07-30; FS5 Dashboard,
    FS6 AI Chat and FS7 Knowledge 2026-08-01; FS8 Memory and FS9 Image Studio 2026-08-02; FS10 Prompt Library
    and FS11 Analytics 2026-08-03; FS12 Platform & Admin 2026-08-04; FS13 Settings/Profile 2026-08-05; FS14
    Integration & Polish 2026-08-06; FS15 Production Readiness 2026-08-07).** **Fifteen real screens**
    (Dashboard, AI Chat, Knowledge, Memory, Image Studio, Prompt Library, Analytics + Admin, Jobs, Audit,
    Health, Providers, Billing + Settings, User Profile) run end-to-end on the frozen contract, **integrated
    as five proved cross-screen journeys** (D3 Part C, FS14); **three more (`/logs`, `/flags`,
    `/notifications`) are honest, contract-verified ABSENCE screens**; the remaining 3 routes (`/channels`,
    `/playground`, `/docs`) render honest stubs, confirmed to stay stubs through FS14/FS15 (owner ruling, D9).
    **The roadmap names no FS16.** FS15 added a frontend-local Docker Compose overlay, a real CI fix, a
    secrets scan, a gated-data audit test and a workstation-only Lighthouse pass — **zero new screens, zero
    `src/` production modules**. What remains is Runtime Verification against infrastructure this environment
    has never had: see `webplatform/frontend/PRODUCTION_READINESS_RUNBOOK.md`.
- **Working method is sacred:** every stage = **plan → owner approval → implement → run all gates → report →
  STOP for acceptance.** Never start a stage without an explicit "GO".
- **Honesty rule:** a check that could not be executed is recorded as **FE-RV / RV (Runtime Verification
  Pending)** — never reported as a pass. The owner has explicitly praised and re-confirmed this rule twice;
  it also applies *retroactively* — at FS7 the acceptance addendum corrected the report's own
  `next`-corruption count (2 → 5), and at FS8 a **measured** explanation replaced a *plausible* one in two
  documents before acceptance (see §0 note below).
- **Evidence beats narrative (FS8 precedent, re-applied at FS9, FS10, FS11 and FS14).** The owner asks for an
  **evidence pack** before ruling: raw gate output, per-chunk tables, build-manifest proofs. At FS8 that pack
  disproved the report's own causal claim about a 1 kB budget movement. At FS9 the standard was met
  *proactively* via a **control build**. At FS10 **two** control builds were needed — one to establish why the
  route budget failed, one to establish that a `/chat` +1 kB was not the stage's code. At FS11 two more
  settled a three-route movement, the second of which (reverting the new route to a stub) returned **every**
  protected route to its exact baseline. At FS14 the technique diagnosed a *test* failure for the first time:
  **three control builds**, each removing one FS14 file with global reach (`global-error.tsx`, the font pin,
  `instrumentation.ts`), excluded every FS14 change as the cause of a failing axe assertion before a DOM
  probe found the real one — a latent client-navigation race in an FS4-era spec. Never defend a hypothesis
  the manifest (or the DOM) contradicts; measure the cause first.
- **Next action:** **NOTHING until the owner gives a new, separate instruction.** The frontend implementation
  track is COMPLETE — there is no FS16 on the roadmap, and no stage is "next" by default. FS15 (accepted
  2026-08-07) closed the roadmap's own entry duties **to the extent this environment allows**: it could not
  execute FE-RV-3 (Docker) or FE-RV-4 (CI) for real (no `docker`/`gh`/`act` binary exists here), so neither is
  closed — each has an exact, numbered procedure in `webplatform/frontend/PRODUCTION_READINESS_RUNBOOK.md`
  instead, alongside FE-RV-17 and the ten FE-RV-7…16 live-round-trip items (which "share one closing event,"
  per that Runbook's own §10). What FS15 *did* close for real: two FS1-postmortem §7 checklist items that
  became executable on this workstation for the first time — no secrets in the client bundle, and gated-data
  honesty (now one cross-cutting test) — plus a genuine CI E2E-matrix gap. **`/chat` is still 180 / 180 kB
  with ZERO headroom** and remains the governing number, now in its **terminal** state: implementation is
  done, so any future frontend work (a live-infra fix, a hypothetical FS16) inherits this number as a starting
  baseline, not a target to re-earn. The proven zero-commons mechanism is **entity-local query keys** (FS9
  T-FS9.1, re-applied at FS10–FS12) and, since FS13, **declaring no key, path or fetcher at all** (FS14 and
  FS15 both declared none); the proven structural levers when a route is over are in §1.9–§1.12 below —
  reference material for whatever comes next, not an active task list.

## 1. ⚠️ Critical warnings — read before touching anything

1. **ALL FRONTEND WORK IS UNCOMMITTED.** `git status` shows only untracked entries:
   `PROJECT_HANDOFF.md`, `PROJECT_HANDOFF_PART1..4.md` and `webplatform/`. The entire design phase,
   Stage 2/3 and FS1–FS14 — every file — exists **only in the working tree**. There are **no FS git tags**.
   Backend commits/tags are intact (HEAD `a8224ec`). → If the owner ever asks to commit, this is a large,
   careful first commit. **Do not commit unprompted** — the standing rules are "commit only when instructed"
   and "never push to remote".
2. **Never modify `app/`** (backend source), any public Protocol, business logic, layering, the 25 DB tables,
   or `MASTER_SPEC.md` / `FRONTEND_MASTER_SPEC.md`. Production Code + Architecture Freeze.
3. **Never change ONYX token *values*** (`webplatform/console/src/styles/tokens.css`). Contrast problems are
   fixed by changing **which token a component uses**, never by editing a token. **Five real precedents**
   (FS1, FS2, FS5, plus pre-emptive FS6/FS7, and **FS10** — PromptCard's 12px meta line measured 3.78:1 the
   first time the card carried real data). A11y defects in *embedded content* are fixed in the **widget**,
   never in the ONYX component (FS7 heading demotion — PART4 §3.4); FS9 fixed an axe `nested-interactive`
   violation by restructuring the widget's card markup, and FS10 fixed an invisible (zero-width) provenance
   title by shortening what the **call site** passes, leaving both ONYX contracts untouched. *One sanctioned
   exception exists:* FS10's **PromptCard MINOR extension** (two additive optional props), approved by the
   owner in advance under D4 §13 — see PART2 §5.4.11.
4. **Never fabricate a green gate,** and never let a plausible explanation stand where a measurement
   disagrees (FS8 precedent — PART4 §3.5). If a tool cannot run here, say so and open an FE-RV entry.
5. **Windows/pnpm hazard:** the `next` package self-corrupts — **28 occurrences** (11 across FS1–FS5; 0 in
   FS6; 5 in FS7; 3 in FS8; 0 in FS9; 3 in FS10; 0 in FS11; 1 in FS12; 4 in FS13; **1 in FS14**, every one
   auto-recovered — and at FS13/FS14 the signature was confirmed by REPRODUCING it, not inferred from an
   exit code). Treat any unexplained
   `Cannot find module …next…` or `Cannot find module './impl'` build failure as this first. Recovery:
   `pnpm install --force`; the working habit `pnpm build || (pnpm install --force && pnpm build)` is what
   keeps it off the critical path — **and it must be UNPIPED**: at FS10 a recovery chain silently failed
   because the build was piped into `tail`, and a pipeline's exit status is the last command's.
   **Second Windows hazard since FS7:** a Playwright `webServer` can SURVIVE its run — kill port 3000
   before any build/E2E, or a rebuilt `.next` under a stale server produces mass phantom failures. Details
   in PART4 §3.1/§3.1b.
6. **Budgets are never pre-raised (rule №33).** The size-limit detector stands at **777 kB** — unchanged
   through FS14 (measured **766.23** at the FS14 acceptance, green, headroom 10.77 kB; the nine prior
   evidence-based re-baselines stand: FS5 → 485, FS6 → 560, FS7 → 598, FS8 → 628, FS9 → 655, FS10 → 677,
   FS11 → 696, FS12 → 756, FS13 → 777, each earned by a dedicated per-chunk addendum, and the last six only
   after a full evidence pack). Every re-baseline ruling used the same reproducible derivation: **measured +
   the headroom granted at the previous ruling, rounded up to the next whole kB.** The per-route **First Load
   budget 180 kB is the authoritative UX gate and is not revisited**; **`/chat` = 180 / 180 kB with ZERO
   headroom** is its standing reference since FS12, and it held through FS14 by a **measured refusal of a
   client observability sink**, not by margin. **This is a hard wall: any commons byte fails `pnpm budget`.**
   If a future stage blocks on the detector: measure → per-chunk analysis → evidence-based proposal. Never
   raise in advance.
7. **A first consumer of a heavy shared module can tax EVERY route (FS10).** The first FS10 build failed the
   route budget at `/chat` 182 kB with the First Load chunk *set* unchanged: the growth was entirely in the
   **webpack runtime's chunk-id map**, because the stage became the first product consumer of `shared/ui`'s
   CodeBlock and made Shiki's per-grammar chunk graph reachable app-wide. Before consuming a heavy
   `shared/ui` module for the first time, check whether it is currently unreferenced and measure the runtime
   chunk before/after. The fix is always structural, never a threshold. *(FS11 executed exactly that check as
   a task: becoming the visx family's second consumer moved the runtime chunk only 2.58 → 2.70 kB.)*
8. **A slice another screen imports must not gain `'use client'` modules in its barrel (FS11).** Re-exporting
   the FS11 analytics hooks from the FS5 `entities/analytics` barrel put a 5.23 kB chunk into `/dashboard`'s
   First Load (+2 kB), because a client module reached through a barrel is bundled whole — the FS3 barrel
   lesson at slice scope. The fix was structural: a separate `entities/analytics-report` slice that imports
   nothing from the FS5 one. When extending a slice another screen consumes, byte-compare that screen
   immediately.

9. **The eager view is where mutation machinery leaks in (FS12).** `/jobs` failed the budget at 183 kB
   because an eager list view called a `useMutation` hook: that pulled TanStack Query's mutation machinery
   AND Next's `dynamic()` client runtime into the route as an 8.5 kB chunk. Moving the hook **into the lazy
   component that uses it** took the route to 172 kB. Related FS12 levers, all measured: platform dialogs
   behind `dynamic()`; a static honesty/markup block moved from the client view into the **RSC page** (it
   leaves the client bundle entirely); and **N lazy `dynamic()` rows consolidated into ONE chunk** when they
   belong to the same screen family — six separate Inspector rows grew the webpack runtime chunk-id map
   enough to round two protected routes up.
10. **The first-consumer check can and should REFUSE a component (FS12).** `shared/ui/data-table` had zero
   product consumers; a probe consumer moved the runtime chunk +58 B gz and rounded `/memory` 149 → 150, and
   a control build with the probe removed returned a **byte-identical** runtime chunk. The pre-declared
   fallback ran: DataTable is **not used**, and the tables are ONYX-primitive lists with the same interaction
   contract (`j/k/↵`, sticky header, tnum numerics). **TanStack Table is still in no bundle** — the check
   applies again to whoever reaches for it next.
11. **FSD itself can force a commons edit, and no plan can wish that away (FS13).** A preference consulted
   where toasts are EMITTED must be readable by `NotificationProvider`, one of the frozen seven — and a
   provider may not import a feature. The read side therefore has to live in `shared/`, and it cost `/audit`
   174 → **175** and `/providers` 153 → **154**. Four clean builds settled it: **control C** (only that read
   side removed) returned both routes to baseline, and **build D** (the same logic inlined, no new module)
   cost exactly the same — so the price is inherent to the *placement*, not the packaging. Before promising
   "one commons edit", check where the consumer of the new state actually lives. **`/chat` and `/memory` stayed
   byte-stable and `pnpm budget` passed**; the owner accepted the deviation as measured and forbade re-wording
   it.
12. **A pre-declared fallback is what turns a refusal into a ten-minute measurement (FS14).** Stage 2 §11's
    observability seam needed a client sink; it was built, measured in TWO independent placements (the three
    route-group boundaries, and the root `global-error.tsx` alone), and cost `/billing`, `/dashboard` and
    `/jobs` **1 kB each in both shapes** — a **control build** (client sink removed, server half kept)
    returned a byte-identical runtime chunk in both cases. Because the plan wrote the fallback ladder down in
    advance, the answer was "ship server-only" with no debate, and the owner's acceptance ruling **froze that
    shape**: `/api/telemetry` stays without a client caller, by decision, not by omission. The same
    discipline caught and fixed a false ESLint-driven "improvement" — converting two seam anchors to
    `next/link` measured `/health` 139→143 and `/jobs` 172→176, so the anchors were kept with a **per-line
    suppression whose justification is the measurement itself**, not a preference.

## 2. Reading order for the new Claude

| # | Document | Why |
|---|---|---|
| 1 | **`PROJECT_HANDOFF.md`** (this file) | orientation, warnings, bootstrap prompt |
| 2 | **`PROJECT_HANDOFF_PART1.md`** | goal, completion %, full stage-by-stage history, all accumulated owner requirements |
| 3 | **`PROJECT_HANDOFF_PART2.md`** | complete architecture (both tracks), every technical decision + rationale, freezes, invariants, ADRs |
| 4 | **`PROJECT_HANDOFF_PART3.md`** | full file structure, purpose of every file, exact dependency versions, environment, all commands |
| 5 | **`PROJECT_HANDOFF_PART4.md`** | working method & prompts, code style, known problems + fixes, FE-RV register, backlog, next steps, git state |
| 6 | `MASTER_SPEC.md` | **backend Source of Truth** (only when backend questions arise) |
| 7 | `webplatform/FRONTEND_MASTER_SPEC.md` | **frontend Source of Truth** — read before any frontend work |
| 8 | `webplatform/frontend/STAGE2_ARCHITECTURE_PLAN.md` + `STAGE3_TECHNICAL_SPEC.md` | the frozen engineering architecture implementation must follow |
| 9 | `webplatform/design/02-design-system.md` (D2 / ONYX) | tokens, 24 components, status vocabulary — required for any UI work |
| 10 | `webplatform/frontend/FS1_REPORT.md` → `FS1_POSTMORTEM.md` → `FS2_REPORT.md` → `FE_ADR_DECISIONS.md` → `FS3_REPORT.md` → `FS4_REPORT.md` → `FS5_REPORT.md` → `FS6_REPORT.md` (+size addendum) → `FS7_REPORT.md` (+size addendum) → `FS8_REPORT.md` (+size addendum) → `FS9_REPORT.md` (+size addendum) → `FS10_REPORT.md` (+size addendum) → `FS11_REPORT.md` (+size addendum) → `FS12_REPORT.md` (+size addendum) → `FS13_REPORT.md` (+size addendum) → `FS14_REPORT.md` + `FS14_REPORT_SIZE_ADDENDUM.md` → **`FS15_REPORT.md` + `FS15_REPORT_SIZE_ADDENDUM.md` + `PRODUCTION_READINESS_RUNBOOK.md`** | what was built, what broke, what was learned, which decisions the owner made (FS6 §11 = 560 kB; FS7 §12 = 598 kB + a honesty correction; FS8 §12 = 628 kB + the evidence-pack correction; FS9 §12 = 655 kB + the I2 rounding ruling; FS10 §12 = 677 kB + the I1 rounding ruling + the owner requirements A/B; FS11 §12 = 696 kB + the I2 re-partition ruling; FS12 §10 = acceptance + 756 kB + the Prettier legacy carry-over + I1/I2 reported MISSED with two control builds; FS13 §9 = acceptance + 777 kB + the I2 deviation on `/audit` and `/providers` accepted exactly as measured, with four builds and control C; FS14 §11 = acceptance + size-limit UNCHANGED at 777 kB (766.23 measured, no re-baseline needed) + the observability client sink refused on measurement and frozen server-only by owner ruling + the Prettier `.size-limit.json` carry-over accepted per the FS12 precedent; **FS15 §11 = acceptance + size-limit UNCHANGED (766.23/777, re-confirmed, zero `src/` modules shipped) + FE-RV-3/4/17 explicitly NOT closed (no Docker/CI/live backend exists in this environment) + the consolidated Runbook replacing any fabricated closure**) |
| 11 | `webplatform/design/01-foundations.md`, `03-screens.md`, `04-ui-specification.md` | product/UX depth; D3 §7 (Knowledge), §8 (Memory), §9 (Image Studio), §10 (Prompt Library), §12 (Analytics), §14–§22 (Platform & Admin), §23 (Settings), §24 (User Profile) and **Part C (cross-screen journeys) were consumed at FS7…FS14** |
| 12 | `RUNTIME_VERIFICATION_REGISTRY.md`, `TECHNICAL_BACKLOG.md` | backend open items (operational, not defects) — the frontend's analogous register is now `webplatform/frontend/PRODUCTION_READINESS_RUNBOOK.md` |

**Minimum path if in a hurry:** 1–5, then 7, then 9.

## 3. State snapshot (verified 2026-08-07, post-FS15 acceptance)

```
Repo            C:\Users\Fupxrx\Desktop\projects            OS: Windows 11
Branch          master        HEAD: a8224ec                 Main branch for PRs: main
Backend tags    19 tags: stage-1-baseline … stage-20-docs   (stages 6–7 folded into stage 4)
Git status      ?? PROJECT_HANDOFF*.md    ?? webplatform/   ← frontend is 100% untracked
Python          .venv / 3.14.6            app/: 256 .py     tests/: 131 .py
Node            v22.23.1     pnpm 9.15.9 (corepack)     npm 10.9.8     corepack 0.34.6
Frontend code   webplatform/console/      608 source files (54 stories) — UNCHANGED, FS15 shipped zero
                src/ modules; tests/: 103 test files (Vitest, +1 at FS15: gated-fields-audit.test.ts)
                20 entity slices · 24 feature slices  (FS13, FS14 AND FS15 each created NO entity slice)
Frontend infra  webplatform/docker-compose.console.yml (new, FS15) · console/scripts/{check-no-secrets,
                lighthouse-local}.mjs (new, FS15) · console/.github/workflows/ci.yml (fixed, FS15: full
                3-viewport E2E matrix, was desktop-dark only) — root docker-compose.yml/Caddyfile UNTOUCHED
```

**Gate status, both tracks, as last executed (FS15 acceptance, 2026-08-07 — the terminal gate state of the
frontend implementation track):**

| Track | Gate | Result |
|---|---|---|
| Backend | ruff · mypy --strict · pytest | clean · Success (385 files, 0 `type: ignore`) · **466 passed / 6 skipped** |
| Frontend | ESLint · `tsc --noEmit` strict | clean · **0 errors, 0 unjustified `any`** |
| Frontend | Prettier | **RED on one pre-existing file** — `.size-limit.json` (CRLF carry-over from the FS13 acceptance edit); accepted as a legacy carry-over at FS12, reaffirmed at FS14 and again at FS15 (FS12 precedent); every FS15 file is formatted |
| Frontend | Vitest (unit + component) | **800 passed / 103 files** (the FS14 floor of 794/102 plus one new cross-cutting test at FS15) |
| Frontend | Playwright E2E | **400 passed, 0 failed, 17 skipped** (3 viewports) — unchanged from FS14; the CI workflow that runs this matrix was itself fixed at FS15 (it previously ran only one of the three projects) |
| Frontend | axe accessibility | **0 violations** — unchanged from FS14 (FS15 touched no rendered surface) |
| Frontend | dependency-cruiser (FSD boundaries) | **0 violations** (609 modules, 1578 dependencies — byte-identical to FS14) |
| Frontend | Storybook build | ✅ full library (54 story files) on the Vite builder — unchanged |
| Frontend | contract | ✅ every endpoint used exists verbatim in `API_SPEC.md`; FS15 introduced no new `/api/v1` path and touched no wire type |
| Frontend | **`pnpm budget`** (machine-checked per-route First Load) | ✅ **32 routes ≤ 180 kB** · /health 139 · /billing 144 · /analytics 148 · /memory 150 · /prompts 150 · /providers 154 · /studio 165 · /dashboard 168 · /jobs 172 · /audit 175 · /knowledge 176 · /admin 179 · /settings 121 · /profile 121 · seams 111 · stubs 107 · commons 107 · /api/telemetry 107 (server-only) · worst **/chat 180 kB** (headroom **0.0 kB** — held through FS14 by a measured refusal and through FS15 unconditionally, since FS15 shipped no `src/` module) — proven byte-identical by a manifest diff, not assumed |
| Frontend | size-limit | ✅ **766.23 / 777 kB** (threshold UNCHANGED since FS13; re-confirmed at FS15 acceptance with zero movement — headroom 10.77 kB) |

## 4. Completion

| Component | Done | Notes |
|---|---|---|
| **Backend implementation** | **100%** (20/20 stages) | code-complete, frozen; only live-infra RV remains |
| Backend runtime verification | 0% | RV-1…RV-18 need real infrastructure |
| **Frontend design (D1–D4 + Preview)** | **100%** | frozen as ONYX v1.0 |
| **Frontend engineering architecture (Stage 2 + Stage 3)** | **100%** | frozen |
| **Frontend implementation (FS1…FS15)** | **15/15 accepted (100%) — COMPLETE** | FS1–FS15 ✅ · no FS16 on the roadmap |
| Frontend runtime verification | 0% | FE-RV-3/4/6/7…17 need real infrastructure (Docker, CI, live backend, staging) — none of it exists in this environment; procedure in `PRODUCTION_READINESS_RUNBOOK.md` |
| **Overall product (usable console on live infra)** | **≈95%** | **fifteen** real screens (Dashboard, AI Chat, Knowledge, Memory, Image Studio, Prompt Library, Analytics, Admin, Jobs, Audit, Health, Providers, Billing, Settings, User Profile) end-to-end on fixtures, **integrated** via five proved D3 Part C cross-screen journeys, plus three contract-verified absence screens; FE-RV-7…16 reconcile auth+data+AI+knowledge+memory+images+prompts+analytics+platform+account with the live backend; FE-RV-5 closed at FS14; FE-RV-17 (CSP enforcement + client telemetry) opened at FS14, **still open at FS15** — the remaining ≈5% is Runtime Verification, not undelivered implementation |

## 5. The non-negotiables (short list; full detail in PART2 §6–§7)

1. `app/` never changes. No public Protocol, business logic, layering, or DB-table meaning change.
2. `MASTER_SPEC.md` and `FRONTEND_MASTER_SPEC.md` are read-only Sources of Truth.
3. ONYX v1.0 token values, component contracts and status vocabulary change only via D4 §12/§13.
4. Frontend architecture (FSD layering, RSC-by-default, six state owners, FE-ADR-1…11) is frozen during
   implementation.
5. FSD import direction is one-way: `app → widgets → features → entities → shared`; features never import
   sibling features; enforced by dependency-cruiser in CI.
6. TypeScript strict with **zero unjustified `any`**; backend `mypy --strict` with **zero `type: ignore`**.
7. WCAG 2.1 AA+ is a build gate, not a goal. Streaming-first; no blocking spinners on AI surfaces.
8. The Aurora gradient appears **only** on genuine AI moments. Never decorative, never neon.
9. Gated/unavailable/mock data is labelled honestly, never fabricated (§R10.3). AI never fabricates fields
   the contract does not carry (tool calls, confidence, sources, anomaly flags — the FS6 owner condition);
   **citations are user-provenance, never model claims, and retrieval is never simulated** (FS7);
   **no influence/attribution claims, and Style Memory is shown as derived parameters, never as stored
   texts** (FS8); **no image preview, thumbnail or placeholder stands in for a binary the contract does not
   serve, and no safety/identity verdict exists without a wire field** (FS9); **no activation state, no
   variables claim, no author name and no AI-authored prompt text exist where the contract carries none, and
   AI output is never auto-saved into a governed artifact** (FS10); **a gated metric shows no value even when
   the wire carries a number, no anomaly/forecast/recommendation/system metric is synthesised, and an
   algorithm version is rendered only when the response carries one** (FS11, §R11.9). Progress and freshness
   are never invented where the transport reports none.
10. Secrets are write-only in the UI — never fetched, rendered, logged, or bundled.
11. RBAC is enforced server-side; the UI only reflects it. 403 renders a permission state, never a crash.
12. No stage starts without an explicit GO; no stage ends without green gates + a report + a STOP.
13. Never push to remote. Commit only when instructed. Never create an ADR automatically.
14. Never change the Python version.
15. `legacy/` is archived — do not touch.
16. Budgets/thresholds are never pre-raised (rule №33): measure → analysis → evidence-based proposal.

## 6. Bootstrap prompt for the new chat

> Paste this whole block as the first message in the new account's chat.

```
You are the direct continuation of an existing two-track project in the repo
C:\Users\Fupxrx\Desktop\projects (Windows 11, PowerShell + Git-Bash, Python venv .venv/3.14.6,
Node v22.23.1 + pnpm 9.15.9).

Read these files IN THIS ORDER before doing anything, and do not re-analyse the codebase first:
  1. PROJECT_HANDOFF.md
  2. PROJECT_HANDOFF_PART1.md   (goal, completion, full history, owner requirements)
  3. PROJECT_HANDOFF_PART2.md   (architecture, decisions, freezes, invariants, ADRs)
  4. PROJECT_HANDOFF_PART3.md   (structure, files, versions, environment, commands)
  5. PROJECT_HANDOFF_PART4.md   (method, code style, known problems, backlog, git state)
Then, before any frontend work: webplatform/FRONTEND_MASTER_SPEC.md and
webplatform/design/02-design-system.md. If the owner opens Runtime Verification work, read
webplatform/frontend/PRODUCTION_READINESS_RUNBOOK.md next — it is the single ordered procedure for
every open FE-RV item, written at FS15 specifically so this is mechanical rather than exploratory.

STATE — BOTH TRACKS ARE NOW IMPLEMENTATION-COMPLETE. Only Runtime Verification remains, on both sides,
and neither track has ever had the infrastructure to perform it.
- BACKEND = AI Telegram Automation Platform: COMPLETE (20/20 stages, tags stage-1-baseline …
  stage-20-docs, HEAD a8224ec on master). Gate: ruff clean; mypy --strict Success (385 files,
  0 type: ignore); pytest 466 passed / 6 skipped. Offline-first via provider/port fakes. The only open
  work is Runtime Verification RV-1…RV-18 on live infrastructure — NOT defects. FROZEN.
- FRONTEND = "Console" in webplatform/: design (D1-D4 + Preview, ONYX v1.0) and engineering architecture
  (Stage 2 + Stage 3) COMPLETE and FROZEN. Implementation FS1–FS15 ALL delivered and ACCEPTED —
  15/15, 100%, COMPLETE. THE ROADMAP NAMES NO FS16. Any further frontend stage is a new decision the
  owner has not yet made, not a continuation of a planned sequence:
  FS1 Infrastructure · FS2 Routing & Navigation · FS3 ONYX Component Library · FS4 Auth & RBAC · FS5
  Dashboard · FS6 AI Chat (VERBATIM SSE relay over the frozen POST /studio/dry-run; ONE
  ConversationRepository) · FS7 Knowledge · FS8 Memory · FS9 Image Studio · FS10 Prompt Library (the only
  ONYX component-API change in the project — PromptCard MINOR) · FS11 Analytics (a gated field yields no
  value even when the wire carries a number) · FS12 Platform & Admin (all NINE routes of the (platform)
  group; the first secret-writing surface; three routes delivered as VERIFIED ABSENCES) ·
  FS13 Settings / Profile / Notification preferences (accepted 2026-08-05 — the account surface) ·
  FS14 Integration & Polish (accepted 2026-08-06 — the D3 Part C cross-screen journeys) ·
  FS15 Production Readiness (accepted 2026-08-07 — the terminal stage; zero `src/` production modules
  shipped; see below).

  WHAT FS13 ESTABLISHED, because it still shapes everything after it:
  * THE CONTRACT HAS NO PREFERENCES RESOURCE. D4 §4 marked Settings API "(assumed) user prefs"; the
    frozen /api/v1 carries no preferences call, and `users` has no preferences column. So Settings is
    REAL but BROWSER-LOCAL, and every panel says so. Theme + density keep the FS1 COOKIES that
    app/layout.tsx applies during SSR (no FOUC — proved in E2E against the INITIAL HTML DOCUMENT);
    experience level and notification choices live in localStorage behind ONE module
    (features/change-settings/model/preferences.ts).
  * THERE IS NO SELF-SERVICE ACCOUNT WRITE — no PATCH /users/me, no password change, no avatar upload,
    no name column, no MFA call, no session inventory, no sign-in history, no data export, no SSO. All
    are VERIFIED ABSENCES with a negative-lock test; NO FE-RV was opened for them.
  * NO MFA STATE IS RENDERED AT ALL, because `mfa_enabled` arrives as an optional wire field that
    mapAuthMe defaults to false — the console cannot tell "off" from "the response did not say", and
    rendering "disabled" would be a fabrication. FE-RV-16 asks.
  * A CONTROL THAT WOULD CHANGE NOTHING IS NOT SHIPPED. Experience Level existed in Stage 2 §7 but no
    screen read it. FS13 shipped it only because it made it CONSUMED (Beginner hides detail, Advanced
    reveals cookie names + the raw payload, Power adds the keyboard path), with copy naming WHICH screens
    respond today. FS14 extended the rollout to exactly two more screens on the same rule (see below).
  * NOTIFICATION PREFERENCES ARE CONSOLE-LOCAL TOASTS, and `danger` is UNMUTABLE BY CONSTRUCTION
    (refused three independent times: absent from the writable union, stripped by sanitize on read and
    write, refused by the emitter before it reads the cookie). D4 §9 forbids a critical outcome resting
    on a suppressible channel.
  * PERSONAL ACTIVITY IS THE AUDIT LOG, ACTOR-SCOPED OR ABSENT. GET /audit-log?actor= is the only call
    that can answer "what have I done". A blank/missing user id renders an honest absence and NEVER
    widens to the platform-wide log — a REAL privacy defect was caught by a component test and fixed at
    the normalisation point. Audit read is owner/admin/analyst, so editor and viewer meet a PERMISSION
    STATE INSIDE the screen.
  * FS13 CREATED NO ENTITY SLICE AND DECLARED NO QUERY KEY, ENDPOINT PATH OR FETCHER (a first, repeated
    at FS14 — see below). Identity is FS4 entities/session (already in EVERY route First Load via
    AuthProvider — do not extend its barrel); activity is FS12 entities/audit. Neither was opened.
  * ONE AI SURFACE: explain-activity — user-invoked, over already-loaded records, over the UNCHANGED FS6
    relay, unit-proven to forbid security advice (D3 §24 asks for "tips"; the data cannot support them),
    completeness claims, intent, risk and anomaly, and to carry field NAMES but not field VALUES.

  WHAT FS14 ESTABLISHED, because it shapes everything after it:
  * FIVE D3 PART C JOURNEYS ARE PROVED END TO END (tests/e2e/journeys.spec.ts, ×3 viewports): J1 Compose
    → Pipeline (Dashboard → streamed /chat turn → 201 draft + 202 generate → Jobs → 202 approve →
    Analytics — the three steps the contract cannot back, a validation report, an attach-to-post call and
    any media URL, are stated as NAMED SEAMS, never skipped), J2 Cite → Source, J3 Alert → Triage, J4
    Explain-this (no influence-trace claim ever produced), J5 Everything ⌘K (proved REGISTRY-DRIVEN by
    iterating ROUTE_LIST, not a hand-written list — a future route cannot silently escape the assertion).
  * THE OBSERVABILITY SEAM SHIPPED SERVER-ONLY, BY MEASUREMENT AND THEN BY OWNER RULING. A client
    telemetry sink was built and measured in TWO independent placements (three route-group boundaries;
    the root global-error.tsx alone) — both cost /billing, /dashboard and /jobs 1 kB EACH, and a control
    build with the client sink removed returned a byte-identical runtime chunk both times. The
    pre-declared fallback executed: src/instrumentation.ts + the first-party app/api/telemetry route,
    allowlist-scrubbed to an error name + digest, correlation-id aligned with the backend's structured
    logs. THE OWNER RULED AT ACCEPTANCE: this stays server-only, NO CLIENT CALLER IS TO BE ADDED, and
    /api/telemetry intentionally remains without a frontend producer until a future stage rules
    otherwise — a standing decision FS15 inherits, not a gap to close by default.
  * FE-RV-5 CLOSED: the two self-hosted font binaries are committed under console/public/fonts/,
    fonts.ts uses next/font/local, the build needs no network. The narrowing (latin-only subsets; other
    scripts fall back to the system stack) is recorded and reversible in one file.
  * THE CSP PROMOTION PACKAGE IS AUTHORED, NOT ENABLED. next.config.ts documents the enforced header,
    the nonce-vs-unsafe-inline cost, and the finding that report-only has ALWAYS reported nowhere (no
    report-uri/report-to ever existed). Enforcement is FE-RV-17, opened at FS14.
  * PROGRESSIVE DISCLOSURE ROLLED OUT TO EXACTLY TWO SCREENS (/jobs, /audit — Advanced/Power reveal a
    raw record the screen already holds, zero extra request) and was REFUSED on /analytics, /studio,
    /knowledge because a tier there would reveal nothing new (the FS13 rule: a control that changes
    nothing is a fabricated capability, applied a second time).
  * A REAL A11Y DEFECT SURVIVED FIVE AUDITS because no axe scan had ever OPENED the avatar menu or the
    command palette (both only exist in the DOM once opened). 11px role label in text.tertiary measured
    3.6:1 in dark — sixth usage fix, token VALUES untouched. Now scanned every run.
  * A REAL HONESTY GAP: the StudioHonesty "attach" seam existed in code since FS9 and rendered NOWHERE.
    Now renders in ImageDetail, where the missing affordance would have been.
  * A LATENT FS4-ERA TEST RACE was diagnosed by THREE CONTROL BUILDS (each excluding one FS14 file with
    global reach) plus a DOM probe, not fixed by guessing — the register→login axe scan ran before the
    client navigation painted; fixed as a strictly stronger wait-for-element assertion.
  * FS14 CREATED NO ENTITY SLICE AND DECLARED NO QUERY KEY, ENDPOINT PATH OR FETCHER (repeats FS13's
    first). The three cross-links added are static route-local markup only.

  WHAT FS15 ESTABLISHED, because it is the terminal stage and its ruling governs everything after it:
  * THIS ENVIRONMENT HAS NO DOCKER ENGINE, NO CI RUNNER AND NO LIVE BACKEND — verified directly
    (`docker`, `gh`, `act` all "command not found"), not assumed. This is the same category of fact as
    the backend's RV-1…RV-18 ceiling, now stated explicitly for the frontend for the first time. FE-RV-3
    (Docker) and FE-RV-4 (CI) were NOT closed at FS15 — they cannot be, here.
  * A FRONTEND-LOCAL DOCKER COMPOSE OVERLAY WAS CREATED, ROOT INFRASTRUCTURE UNTOUCHED:
    webplatform/docker-compose.console.yml adds the `console` service on the FS1 Dockerfile without
    editing root docker-compose.yml or docker/Caddyfile — the first time any frontend stage touched
    deployment infrastructure at all, and it did so by addition, not by editing a shared file. The
    shared-Caddy route is ONE deliberately deferred manual step, documented in
    PRODUCTION_READINESS_RUNBOOK.md item 1, not attempted blind.
  * A REAL CI GAP WAS FOUND AND FIXED: ci.yml's E2E step ran ONLY `--project=desktop-dark`, one of the
    three shipped Playwright projects, even though every stage since FS1 has certified all three on a
    workstation. It now runs all three; verified by running the equivalent command locally (400/0/17,
    unchanged).
  * TWO FS1_POSTMORTEM.md §7 CHECKLIST ITEMS BECAME EXECUTABLE FOR THE FIRST TIME AND WERE CLOSED FOR
    REAL: no secrets in the client bundle (a new script, check-no-secrets.mjs — its first run found a
    real false positive inside NEXT'S OWN VENDORED amphtml-validator WASM blob, investigated and scoped
    out, not silently dismissed) and gated-data honesty (one new cross-cutting test,
    gated-fields-audit.test.ts, proving §R10.3's three-part rule across every gated surface in one
    place instead of nine separate per-stage proofs).
  * A LOCAL-ONLY LIGHTHOUSE PASS WAS RUN AND MUST NEVER BE CITED AS STAGING/PRODUCTION EVIDENCE:
    lighthouse-local.mjs (perf 0.49–0.68, a11y 1.0 on every route measured) is a workstation number
    against the fixture backend — §F8.1's staging measurement is still open, per
    PRODUCTION_READINESS_RUNBOOK.md item 9.
  * THE PRODUCTION READINESS RUNBOOK IS THE NEW STANDING PROCEDURE for every open FE-RV: ten numbered
    entries, including the one session that closes FE-RV-7…16 together, each with its exact command
    sequence and single adjustment point (already verified to still exist at FS15).
  * FS15 SHIPPED ZERO `src/` PRODUCTION MODULES — the strongest no-touch guarantee any stage has made,
    and it means the usual budget risk this handoff spends pages on simply did not exist this stage.
    `pnpm budget`/`pnpm size` were still re-measured and diffed byte-for-byte, because "we didn't touch
    it" is a claim this project always proves.
- Gates at FS15 acceptance (the terminal gate state of the implementation track), all executed for real:
  ESLint clean · Prettier RED on ONE pre-existing file (.size-limit.json, CRLF carry-over from the FS13
  acceptance edit — accepted as a legacy carry-over per the FS12 precedent, reaffirmed at FS14 and again
  at FS15, FILE NOT TO BE MODIFIED) · tsc 0 errors · Vitest 800 (103 files — the FS14 floor of 794/102
  plus one new cross-cutting test) · Playwright E2E 400/0 (17 skipped) across 3 viewports, unchanged from
  FS14 · axe 0 · dependency-cruiser 0 (609 modules, 1578 deps, byte-identical to FS14) · Storybook ✅
  (54 stories, unchanged) · contract ✅ (no new /api/v1 path) · pnpm budget 32 routes ≤180
  (/health 139, /billing 144, /analytics 148, /memory 150, /prompts 150, /providers 154, /studio 165,
  /dashboard 168, /jobs 172, /audit 175, /knowledge 176, /admin 179, /settings 121, /profile 121,
  seams 111, stubs 107, commons 107, /api/telemetry 107 server-only, worst /chat 180) — proven
  byte-identical to the pre-FS15 baseline by a manifest diff · size-limit 766.23/777 kB — UNCHANGED since
  FS13, re-confirmed at the FS15 post-acceptance sync with zero movement (rule №33 — thresholds are
  NEVER pre-raised).

  ⚠️ /chat IS AT 180 / 180 kB WITH ZERO HEADROOM. This is the single most binding number in the project.
  It held through FS14 by a MEASURED REFUSAL of a client sink, and through FS15 UNCONDITIONALLY — FS15
  shipped no `src/` module, so nothing could have moved it. This is now the TERMINAL state of the
  constraint: any future frontend work inherits it as a starting baseline, not a target to re-earn.

  ⚠️ THE FS13 I2 DEVIATION IS ACCEPTED AS MEASURED AND MUST NOT BE RE-WORDED: /audit 174→175 and
  /providers 153→154. Four clean builds; control build C (only the D5-B toast-mute read side removed)
  returns both to baseline; build D (same logic inlined) costs identically, so the price is inherent to
  WHERE the state is consulted, not to packaging. /chat and /memory stayed byte-stable; budget passed.

  ⚠️ THE FS14 GATE-A REFUSAL AND THE PRETTIER CARRY-OVER ARE BOTH OWNER-RULED AND MUST NOT BE
  RE-WORDED: (1) /api/telemetry ships with NO CLIENT CALLER — this is the accepted shape, not an
  unfinished task, and FS15 explicitly did NOT reopen it; (2) .size-limit.json's Prettier RED is a
  legacy carry-over from the FS13 acceptance edit and the file is NOT to be modified by any later stage
  on that basis alone — confirmed unchanged at the FS15 sync too.

  ⚠️ FE-RV-3, FE-RV-4 AND FE-RV-17 MAY ONLY BE CLOSED BY REAL EXECUTION ON THE REQUIRED
  INFRASTRUCTURE. FS15's synchronization did not close them and no later documentation pass may describe
  them as closed without that execution having actually happened.
- The three frontend ADRs are DECIDED (webplatform/frontend/FE_ADR_DECISIONS.md): visx (heavy graphics
  only via dynamic()) · Tailwind v4 + CSS Modules (no CSS-in-JS) · observability — Option A (vendor-
  agnostic seam, no vendor SDK) executed at FS14, server-side only; a vendor binding is still undecided
  and was NOT revisited at FS15 (production readiness was explicitly scoped to exclude new frontend
  functionality).
- ALL frontend work is UNCOMMITTED (webplatform/ is untracked, no FS tags). Do not commit unprompted.
- Open runtime items — the complete list, unchanged in scope by FS15's acceptance, each with its exact
  procedure now in webplatform/frontend/PRODUCTION_READINESS_RUNBOOK.md: FE-RV-3 (Docker), FE-RV-4
  (CI never executed), FE-RV-6 (Chromatic — needs CHROMATIC_PROJECT_TOKEN, 54 stories), FE-RV-7 (live
  auth), FE-RV-8 (live /api/v1 data — incl. the pending-vs-queued task vocabulary), FE-RV-9 (live AI),
  FE-RV-10 (live knowledge), FE-RV-11 (live memory), FE-RV-12 (live images — above all WHETHER ANY MEDIA
  URL EXISTS), FE-RV-13 (live prompts — whether GET /prompts returns every version row or only the
  newest per type), FE-RV-14 (live analytics — whether GET /analytics/channels/{id} honours ?from=&to=),
  FE-RV-15 (live platform & admin — whether GET /config-versions carries the `snapshot` payload, what
  GET /api-keys returns when values are withheld, whether /health/ready enumerates providers by name),
  FE-RV-16 (live account — ABOVE ALL WHETHER GET /auth/me CARRIES A STABLE USER `id`, the fact that
  decides whether a personal activity feed is possible at all; plus whether `mfa_enabled` is real or an
  FS4 assumption, and whether GET /audit-log?actor= accepts the caller own id), FE-RV-17 (CSP
  enforcement + client telemetry on real infrastructure — opened at FS14: whether the enforced policy
  survives a real browser behind Caddy, above all whether Next's inline bootstrap needs unsafe-inline or
  a nonce and what a nonce costs in rendering mode; whether report-to/report-uri reaches the sink
  through the proxy; what img-src must become the day FE-RV-12 answers; whether client web-vitals can be
  mounted at all without editing the frozen provider tree). FE-RV-5 (font pin) CLOSED at FS14. NO FE-RV
  CLOSED AT FS15. Adjustment points: entities/*/{model,paths,keys}.ts plus widgets/profile/identity.ts,
  features/change-settings/model/preferences.ts, next.config.ts and
  src/{instrumentation.ts,app/api/telemetry/route.ts} — every one verified still present at its stated
  path during the FS15 Runbook authoring.

HARD RULES:
- Never modify app/, public Protocols, business logic, layering, the 25 DB tables, or either MASTER_SPEC.
- Never change ONYX token values; fix contrast by changing which token a component uses (SIX precedents,
  the sixth at FS14 — the avatar menu role label + palette placeholder, both text.tertiary at 3.6:1 in
  dark). An a11y defect caused by what a PAGE renders is fixed where the page renders it, never in the
  shared shell (FS7 heading demotion, FS9 nested-interactive, FS10 zero-width title, FS12
  scrollable-region-focusable). The ONLY sanctioned component-API change is FS10 PromptCard MINOR.
- Never fabricate a green gate, and never let a PLAUSIBLE explanation stand where a MEASUREMENT disagrees:
  the build manifest (or, for a test failure, the DOM) is the arbiter, and a contested movement is settled
  with a CONTROL BUILD (FS9 once, FS10 twice, FS11 twice, FS12 twice, FS13 with four builds incl. a
  control that removed only the contested module and a variant that re-shaped it, FS14 with three control
  builds diagnosing a TEST failure for the first time).
- An invariant that cannot be held is REPORTED, never re-worded (FS9 rule 44). FS12 reported I1/I2 MISSED;
  FS13 reported I2 MISSED on two routes; FS14 held every invariant by executing pre-declared fallbacks
  rather than accepting a movement. Acceptance did not re-write any of them.
- AI honesty (binding owner conditions, cumulative FS6→FS14): never fabricate fields the contract does not
  carry; citations/cards are USER-PROVENANCE; NO influence/attribution, safety/identity/uniqueness,
  causal, anomaly, forecast or engagement claims; NO AI-authored prompt text and NO auto-save into a
  governed artifact; no invented log lines, no cause the record does not state, no retry prediction, no
  destructive recommendation; and (FS13) NO SECURITY ADVICE, no completeness claim, no intent/risk
  inference. AI runs only on explicit user intent, over loaded data, through the UNCHANGED FS6 relay.
- Never simulate what the contract cannot back. When a whole SCREEN has no endpoint it states fact ·
  reason · remedy on every viewport, ships zero fixture data, and a negative-lock test proves the absence
  (/logs, /flags, /notifications). The same applies to a SECTION (FS13 account, security and
  notification-delivery absences) and to a SINGLE JOURNEY STEP (FS14: no validation-result UI, no
  post↔image link, no chunk-level citation).
- A BROWSER-LOCAL preference is never presented as an account setting, and a control that would change
  nothing is not shipped (FS13, applied again at FS14's progressive-disclosure rollout — three screens
  were REFUSED it on exactly this rule).
- Secrets are write-only in the UI: submitted, never fetched, rendered, masked, logged or bundled.
- State ownership: nothing is owned by TanStack Query and Zustand at once. FS12 added a state kind that may
  not persist ANYWHERE (a secret being typed); FS13 added one owned by neither (a browser-local
  preference, behind ONE module); FS14 added telemetry, which is fire-and-forget and owned by NEITHER —
  a test asserts it can read or write no store, cache or storage.
- A pre-declared fallback, MEASURED before it is needed, is what turns "add a byte" into "refuse and
  report" without a debate (FS12 DataTable refusal; FS14 the observability client-sink refusal, twice
  over, plus the ESLint-vs-budget trade on two seam anchors — kept as anchors with a per-line suppression
  whose justification IS the measurement).
- Staged delivery: for any stage, FIRST produce ONLY the plan and STOP for approval; then implement → run
  all ten engineering gates → write FS<N>_REPORT.md → STOP for acceptance. Never start a stage without an
  explicit GO. Never push to remote. Never create an ADR automatically.
- Every plan must carry the seven fixed artefacts (PART1 §4.5/§4.6): rendering/loading matrix · query-key
  invalidate graph · file-by-file no-touch guarantee · state-ownership matrix · URL navigation contract ·
  per-chunk bundle ownership · checkable numeric regression invariants. Each is PROVED at acceptance.
- Budgets/thresholds are never pre-raised (rule №33). size-limit stands at 777 kB (unchanged since FS13;
  FS14 measured 766.23 and needed no re-baseline); First Load 180 kB with /chat at 180 — ZERO headroom.
  Every PAST re-baseline used the same reproducible derivation: measured + the headroom granted at the
  previous ruling, rounded up — but a green measurement requires no ruling at all, as FS14 showed.
- BUDGET LEVERS THAT ARE PROVEN TO WORK: move a useMutation hook OUT of an eager view INTO the lazy
  component that uses it (FS12: /jobs 183→172); put dialogs behind dynamic(); move static markup out of a
  client view into the RSC page (it leaves the client bundle entirely — FS14 used this for two honesty
  strips at zero cost); consolidate N lazy dynamic() rows of one screen family into ONE chunk (FS13 shipped
  five settings panels as one chunk for exactly this reason); reuse the router a component ALREADY holds
  instead of importing next/link fresh (FS14: a dashboard cross-link cost 4 kB as next/link, 0 kB as
  router.push — same destination, same accessibility).
- BEFORE consuming a heavy shared/ui module for the FIRST time, measure the webpack runtime chunk
  before/after — and be prepared to REFUSE it (FS12 refused shared/ui/data-table; TanStack Table is still
  in NO bundle — re-confirmed at FS14's R1c re-scan, the fourth time this project has checked).
- BEFORE promising "zero commons edits", check where the CONSUMER of the new state lives. FSD forbids a
  provider importing a feature, so state consulted inside the frozen seven MUST have its read side in
  shared/ (FS13 toast muting, which cost two protected routes 1 kB each). FS14 traced this for its ONE
  new cross-cutting candidate (observability) BEFORE writing code, found the consumers were all commons,
  and therefore never promised zero commons for that one candidate — it promised a MEASURED gate instead.
- If a required input document (e.g. STAGE_FS15_PLAN.md) does not exist, STOP and say so — do not invent
  the stage scope (FS2 precedent, owner-confirmed).
- Windows: treat any `Cannot find module …next…` / `./impl` build failure as the known pnpm corruption (28
  occurrences; recover with `pnpm build || (pnpm install --force && pnpm build)` — UNPIPED), kill port 3000
  before any build/E2E, and REBUILD after any control build.
- No implementation may fabricate production verification (FS15, binding). If Docker, CI, a live backend,
  staging or any other infrastructure is unavailable, report the limitation honestly and convert it into a
  documented procedure (PRODUCTION_READINESS_RUNBOOK.md) rather than a simulated pass. FE-RV-3, FE-RV-4 and
  FE-RV-17 may ONLY be closed by real execution on the required infrastructure — never from local
  assumption, and never by a later documentation pass alone.
- A local-only measurement (e.g. a Lighthouse pass run without staging) must be labelled as exactly that,
  every time it is cited, not just the first time (FS15). A workstation number is real signal but is not
  the measurement a budget or SLA actually names.

NEXT ACTION: NONE by default. The frontend implementation track is COMPLETE (FS1–FS15, 15/15) and the
roadmap names no FS16 — there is no "next stage" to start without a new, separate owner decision. Two
kinds of future work are anticipated but NEITHER is authorized by this handoff alone:
  (a) Runtime Verification against real infrastructure (Docker, CI, a live backend, staging) — when the
      owner opens this, follow webplatform/frontend/PRODUCTION_READINESS_RUNBOOK.md's ten numbered items
      in order; closing any of FE-RV-3/4/6/7…17 still requires the owner's explicit go-ahead to spend that
      infrastructure, and each closure must show real executed evidence, per the binding rule above.
  (b) A new frontend stage (a hypothetical "FS16" or any other scope) — this is a new decision, not a
      continuation. Treat it exactly like every prior stage: plan first, STOP for approval, implement,
      run all ten gates, report, STOP for acceptance. Do not infer its scope from this handoff.
`/chat` 180/180 remains a wall, not a target, for whichever kind of work comes next.

Confirm you have read the handoff parts, restate the current state (implementation complete, Runtime
Verification the only open category of work) and ask the owner what they want to do next. Do not modify
app/.
```

## 7. Part index

| Part | Covers |
|---|---|
| **PART1** | 1 project goal · 2 completion % · 15 accumulated owner requirements · 16 full stage history · roadmap forward |
| **PART2** | 3 full architecture · 5 all decisions + rationale · 13 unbreakable decisions · freezes · invariants · ADRs (accepted + open) |
| **PART3** | 4 implemented components · 7 full structure · 8 technologies + exact versions · 9 environment config · 10 important files and their purpose · 18 all commands |
| **PART4** | 6 rules/codestyle/conventions/constraints · 14 prompts, instructions, system rules, working method · 12 known problems + solutions · 11 TODO/backlog/next steps · 19 git commits, tags, stages · 20 everything else worth knowing |

---

**End of master handoff.** Continue with `PROJECT_HANDOFF_PART1.md`.
