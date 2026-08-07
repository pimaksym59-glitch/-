# FS15 — Production Readiness (Plan)

**Track:** Web Platform implementation · **SoT:** `FRONTEND_MASTER_SPEC.md` · implements the stage the frozen
roadmap fixes as **Production Readiness** (handoff PART4 §8.2, §F10.2 names it "Production Polish"): **FE-RV-3**
(Docker) + **FE-RV-4** (CI) closed *where this environment allows*, the FS1-postmortem §7 live-infra checklist
executed *to the extent this environment allows*, CSP enforcement exercised against the package FS14 already
authored (**FE-RV-17**), no secrets in the bundle, real non-owner RBAC, Lighthouse vs §F8.1, container
behaviour, gated-data honesty — and the FS14 owner ruling that `/api/telemetry` has no client caller stands,
inherited, not reopened. Also implements Stage 2 §13 (Deployment), FE-ADR-11 (a separate Next service behind
the shared reverse proxy — decided, never yet executed), Stage 2 §14 (gates) and the closing half of §F9/§F10.

**This is a PLAN. No code yet.**

---

## 0. The headline finding — and it governs everything below

FS15 was verified against three things before any task was drafted: the frozen roadmap's own words for this
stage, the actual tool availability of **this workstation**, and the actual state of the repository's
deployment surface. One fact dominates:

**This environment has no Docker engine, no CI runner, no live backend, and no staging deployment — exactly
as the backend has had none for its own RV-1…RV-18 across 20 stages.** Verified directly, not assumed:

```
$ docker --version   → command not found
$ gh --version        → command not found
$ act --version       → command not found
```

There is no `postgres`/`redis` reachable, no `api` service running, no Caddy instance, no
`CHROMATIC_PROJECT_TOKEN`. This is not a gap FS15 can code its way past — it is the same category of fact as
FS9's "no image-create endpoint" or FS12's "no providers endpoint": a verified absence, not an unbuilt task. So
the roadmap's own entry duty — "**FE-RV-3 + FE-RV-4 closed**" — **cannot be executed for real in this
environment.** Claiming otherwise would be exactly the "fabricated green gate" rule №4 in the master handoff
forbids. What FS15 *can* honestly do, and what this plan is built around, is the same split the backend has
lived with since Stage 1: **prepare everything that does not require the missing infrastructure, verify
everything that this workstation genuinely can verify, and report — item by item — what still requires
infrastructure that does not exist here.**

Four more source-verified findings shape the scope:

1. **The Dockerfile is orphaned.** `webplatform/console/Dockerfile` is well-formed (multi-stage, non-root,
   `standalone`, healthcheck — FS1 delivered it) but **root `docker-compose.yml` and `docker/Caddyfile` carry
   zero reference to it.** FE-ADR-11 decided "deployment as a separate Next service behind the shared reverse
   proxy" and Stage 2 §13 repeats it, but **no FS stage has ever touched a root-level file** — every one of
   FS1–FS14's "no-touch" guarantees was scoped to `webplatform/`. Wiring the console into the shared compose
   topology is therefore the first time any frontend stage would edit a file outside `webplatform/`, and that
   is a decision this plan puts to the owner (D2), not one it makes unilaterally.
2. **The CI workflow tests only one of the three shipped viewport projects.** `playwright.config.ts` declares
   `desktop-dark` / `desktop-light` / `mobile` (Stage 2 §12), and every FS1–FS14 acceptance ran and reported
   all three (FS14: "400 passed… across 3 viewports"). `ci.yml`'s E2E step runs
   `--project=desktop-dark` only. So the workflow this project would actually execute in CI checks **strictly
   less** than what every stage has certified on this workstation — a real, source-level gap, independent of
   whether CI itself has ever run (FE-RV-4).
3. **The CSP promotion package FS14 authored needs no new code** — `next.config.ts` already carries the exact
   directive set, the nonce-vs-`unsafe-inline` cost analysis, and the header swap is one line. There is
   nothing to *build* for CSP at FS15; the only honest action is a **runbook**, because — per FS14's own
   finding — the report-only policy has *never reported anywhere* (no `report-uri`/`report-to` was ever
   configured, by design, since there was no sink to send them to), so there is still no report data to
   promote from, and enforcing a policy that has never been observed in a browser remains the fabricated gate
   this project has refused twice already (FS14 D8).
4. **Some of the FS1-postmortem §7 checklist genuinely IS executable here**, and treating the whole checklist
   as blocked would under-deliver. Specifically: **no secrets in the client bundle** needs only a production
   build (`pnpm build`), which this workstation has run at every acceptance since FS1; **gated-data honesty**
   needs only the shipped fixtures, already exercised; and a **local** Lighthouse pass against `pnpm start`
   (using Playwright's own bundled Chromium, already present at
   `~/AppData/Local/ms-playwright/chromium-1155`, since no system Chrome is on `PATH`) produces a real,
   reportable number — honestly labelled as a **workstation measurement**, never the staging measurement §F8.1
   and RV-item-7 actually ask for. The remaining checklist items (cookie round-trip, correlation-id
   continuity, SSE through Caddy, container behaviour, real non-owner RBAC against a live role) need
   infrastructure this environment does not have, and FS15 delivers each of them as a **runbook**: the exact
   command sequence to run the day that infrastructure exists, so closing them becomes mechanical rather than
   exploratory (the handoff's own words: "ten live items still share one closing event").

**Goal of FS15:** close everything closeable on this workstation with real, executed evidence; wire the
console into the deployment topology the architecture already decided (pending one ruling on *how*); fix the
one real CI gap found by verification; and leave a **single, ordered, mechanical runbook** for every item that
needs infrastructure this project has never had — so that the day a live backend or a container runtime exists,
closing FE-RV-3/4/6/7…17 and backend RV-1…18 is execution, not investigation. **No `app/` change · no
`MASTER_SPEC`/`FRONTEND_MASTER_SPEC` change · no ONYX token-value change · no new production `src/` module · no
new screen, entity, query key, endpoint path, Inspector row, palette group, mutation or dependency · no
threshold pre-raised · zero commons bytes, because FS15 ships no application code at all.**

**Entry conditions — satisfied.** FS14 accepted 2026-08-06 (size-limit **unchanged** at 777 kB — measured
766.23, no re-baseline needed; every invariant held; FE-RV-5 closed; FE-RV-17 opened). Post-FS14 standing
references (identical to post-FS13 — every protected route held): **`/chat` 180 / 180 — ZERO headroom** ·
`/admin` 179 · `/knowledge` 176 · `/audit` 175 · `/jobs` 172 · `/dashboard` 168 · `/studio` 165 · `/providers`
154 · `/memory` 150 · `/prompts` 150 · `/analytics` 148 · `/billing` 144 · `/health` 139 · `/settings` 121 ·
`/profile` 121 · seams 111 · stubs 107 · shared commons 107 · `/api/telemetry` 107 (server-only). Gate floor to
hold: ESLint/Prettier clean · tsc 0 errors · Vitest **794 / 102 files** · Playwright **400 / 0 failed / 17
skipped** across 3 viewports · axe 0 · dependency-cruiser 0 (609 modules, 1578 deps) · Storybook 54 stories ·
contract ✅ · `pnpm budget` 32 routes ≤ 180 · `pnpm size` 766.23 / 777. This plan is FS15's first deliverable.

---

## 1. Scope

**IN:**

- **T-FS15.1 — the zero-commons guarantee, restated for an infra-only stage, and the protected-route
  baseline.** FS15 ships **no `src/` production module**: every deliverable is root-level deployment config, a
  CI workflow fix, a small number of standalone Node verification scripts under `console/scripts/`, test-only
  additions, and documentation. Because nothing shipped reaches a route's First Load, the usual budget risk
  does not exist this stage — but the floor is still captured **before any FS15 change**
  (`pnpm budget` + `pnpm size` + `app-build-manifest.json`), and re-run at acceptance, precisely because "we
  didn't touch it" is a claim this project always proves, never assumes (rule 6/`I6` precedent).
- **T-FS15.2 — Docker/Compose integration, per the D2 ruling.** Wire `webplatform/console/Dockerfile` into the
  deployment topology FE-ADR-11 already decided. The shape (root-file edit vs. an overlay compose file scoped
  to `webplatform/`) is a ruling request (§5.2 D2), because it is the first time any frontend stage would touch
  a file outside `webplatform/`. Whichever shape is ruled: the compose/Caddy config is **authored and reviewed
  against the existing `docker/Caddyfile`/`docker-compose.yml` conventions** (§R12.5 — only Caddy publishes
  ports; secrets via environment only; the `internal`/`public` network split preserved), but it **cannot be
  validated with `docker compose config` or a real build in this environment** (no `docker` binary) — that
  validation is recorded as **still open**, with the exact command to run the day a Docker engine is available.
- **T-FS15.3 — the CI workflow fix, verified by running the equivalent commands locally.** `ci.yml`'s E2E step
  is changed from `--project=desktop-dark` to all three shipped projects (matching `playwright.config.ts` and
  every stage's own acceptance evidence). The fix itself is proved the only way this environment can prove a
  CI-authored file: by running `pnpm e2e` (all three projects) **on this workstation** and confirming the count
  matches the floor (400 / 0 failed / 17 skipped) — the same "gates pass on one workstation, CI execution
  itself is FE-RV-4" distinction the FS1 postmortem drew (risk R7) and that has held for 14 stages.
- **T-FS15.4 — what the live-infra checklist (FS1_POSTMORTEM §7) allows THIS environment to execute for
  real:**
  1. **No secrets in the client bundle** — a small standalone Node script
     (`console/scripts/check-no-secrets.mjs`) greps the **built** `.next/standalone` + `.next/static` output
     for a fixed pattern set (`sk-`, `AKIA`, `-----BEGIN`, the literal names/values of every server-only env
     var in `server-env.ts`, `postgresql://`, `redis://`) and exits non-zero on a hit. Run once against a real
     `pnpm build`, recorded in the report with its exit code and the exact patterns checked. §5.2 D3 asks
     whether it becomes a standing (non-blocking, informational) CI step or stays a one-off verification —
     never a new blocking eleventh gate (rule 79's discipline: a gate is added only on a written, costed
     justification, and this one costs nothing to keep as a reusable script either way).
  2. **Gated-data honesty, swept once across every shipped surface.** FS5–FS14 each proved §R10.3 locally
     (per-mapper, per-prompt, per-export); FS15 adds **one** cross-cutting unit test
     (`tests/unit/gated-fields-audit.test.ts`) that enumerates every DTO/mapper this project has ever flagged
     `gated` (dashboard engagement, analytics engagement) and asserts the same three things every prior stage
     proved individually — no value reaches the view, no value reaches an AI prompt, no value reaches an
     export — in one place, so a **future** stage cannot reopen the gap piecemeal. This is a test-only
     addition; it changes no shipped module.
  3. **A local Lighthouse pass, honestly labelled.** `pnpm build && pnpm start`, then Lighthouse against
     `http://localhost:3000` for `/chat` (the primary protected route) and `/dashboard`, using
     Playwright's bundled Chromium (`CHROME_PATH` pointed at the already-installed
     `chromium-1155` binary, since no system browser is on `PATH`) — **a workstation number against the
     fixture backend, not §F8.1's staging-on-a-mid-tier-device measurement**, reported as exactly that. §5.2
     D4 asks whether to attempt this at all (it is cheap and adds real signal) or skip it and state plainly
     that §F8.1 needs staging.
  4. **Session-cookie round-trip, correlation-id continuity, SSE through Caddy, real non-owner RBAC against a
     live role, container behaviour (`docker build` + healthcheck)** — **cannot be executed here**; each
     becomes one numbered entry in the **Production Readiness Runbook** (T-FS15.5) with the exact command
     sequence, expected result, and the single adjustment point to touch if it fails, so the day a live
     backend or container runtime exists these are mechanical, not exploratory.
  5. **CSP enforcement** — the package is already authored (FS14); nothing to build. The runbook entry states
     the one-line header-key swap, the pre-condition (a real `report-to` sink must exist and be watched for at
     least one deploy cycle before flipping), and the nonce-vs-`unsafe-inline` cost already written into
     `next.config.ts`'s comments. **Not enabled at FS15** — enforcing an unobserved policy remains the
     fabricated gate this project has refused twice.
- **T-FS15.5 — the Production Readiness Runbook**, one new document
  (`webplatform/frontend/PRODUCTION_READINESS_RUNBOOK.md`) that does two things a narrative report cannot:
  consolidates the **ten** live FE-RV items (FE-RV-7…16) that the handoff says "share one closing event" into
  a **single ordered checklist** for that one session (verified against the register: every named "single
  adjustment point" file still exists at its stated path — a source-level check this environment CAN run), and
  gives FE-RV-3/4/17 and the five non-executable checklist items above their own numbered, infra-gated entries.
  This is a procedure document, not a narrative — it replaces nothing in `RUNTIME_VERIFICATION_REGISTRY.md`
  (backend-owned, untouched) or PART4 §6.2 (updated at handoff-refresh time, per precedent, not by this plan).
- **T-FS15.6 — the ten gates, budget verification, `FS15_REPORT.md` → STOP.** Because this is the last stage
  the frozen roadmap names, the report also states plainly what "done" means for the frontend track at this
  point — the same shape the backend reached at Stage 20: **implementation complete, gates green, only
  infrastructure-gated verification remains** — subject to owner confirmation this is in fact the terminal
  stage (§5.2 D5).

**OUT (explicit):** everything in §8.

---

## 2. The FS1-postmortem §7 checklist, resolved item by item (a first-class constraint, not a note)

| # | Checklist item (FS1_POSTMORTEM §7) | Executable in THIS environment? | FS15 disposition |
|---|---|---|---|
| 1 | Session-cookie round-trip through Caddy | **No** — no live backend, no Caddy instance | Runbook entry; adjustment point `shared/lib/auth-gateway/map.ts` (FE-RV-7) |
| 2 | Correlation-id continuity into backend structured logs | **No** — no backend logs to inspect | Runbook entry; the client half (`shared/lib/api/correlation-id.ts`) is unchanged and already sends `X-Request-Id` on every request — verified by source, not by a live log |
| 3 | SSE through the reverse proxy (buffering/compression/idle timeout) | **No** — no Caddy, no live SSE upstream | Runbook entry; adjustment point `app/api/ai/stream/route.ts` (FE-RV-9) |
| 4 | CSP promotion from report-only data | **No data exists to promote from** (FS14 finding, unchanged) | Runbook entry — the one-line swap + its pre-condition (§5.2 D-CSP) |
| 5 | No secrets in the client bundle | **Yes** — needs only `pnpm build`, already run at every acceptance | **Executed** (T-FS15.4.1) |
| 6 | RBAC with a real non-owner role | **Partially** — the five fixture roles are already exercised in every FS4–FS14 E2E suite; a *real* backend-assigned role needs a live backend | Fixture coverage **re-confirmed**, not re-invented; the "real" half is a runbook entry |
| 7 | Real performance numbers (Lighthouse vs §F8.1) | **Approximated** — a local pass against the fixture-backed production server is possible and adds signal, but is not the staging measurement | **Executed, honestly labelled** (T-FS15.4.3), staging pass stays a runbook entry |
| 8 | Container behaviour (`docker build`, healthcheck, standalone binding) | **No** — no Docker engine | Runbook entry; the Dockerfile + healthcheck are reviewed by static reading, not by a build |
| 9 | Gated data honesty as soon as any analytics surface is wired | **Yes** — every gated surface has shipped since FS5/FS11 | **Executed** (T-FS15.4.2) — a swept, cross-cutting proof rather than nine per-stage ones |

Three items (5, 7, 9) are genuinely closeable on this workstation and were not attempted by any prior stage
because the surfaces they check did not exist yet. Six items need infrastructure this project has never had —
the same category as the backend's own RV-1…RV-18, unopened for 20 stages by design, not by neglect.

---

## 3. Deliverables, matrices and guarantees

### 3.1 Rendering & loading matrix (fixed at approval — every new or changed module)

| Module | Layer | S/C | Eager/Lazy | Touches First Load? |
|---|---|---|---|---|
| `docker-compose.yml` or `webplatform/docker-compose.console.yml` *(D2)* | infra config | — | — | **no — not application code** |
| `docker/Caddyfile` edit *(D2, Option B only)* | infra config | — | — | **no** |
| `.github/workflows/ci.yml` (E2E matrix fix) | CI config | — | — | **no** |
| `console/scripts/check-no-secrets.mjs` | build-time script | — | — | **no — runs against build OUTPUT, ships nothing** |
| `tests/unit/gated-fields-audit.test.ts` | tests | — | — | **no — never shipped** |
| Lighthouse invocation (ad hoc or `console/scripts/lighthouse-local.mjs`) | dev tooling | — | — | **no** |
| `webplatform/frontend/PRODUCTION_READINESS_RUNBOOK.md` | docs | — | — | **no** |
| `webplatform/frontend/FS15_REPORT.md` | docs | — | — | **no** |

**FS15 adds zero modules under `src/`.** This is the entire budget strategy for the stage (§6).

### 3.2 Query keys & invalidate graph (fixed at approval)

**FS15 declares no query key, no endpoint path and no fetcher — the third stage in a row** (after FS13, FS14).
There is no FS15 resource: nothing built this stage reads or writes `/api/v1`.

| Read/Write | Key | Owner | Added by FS15 |
|---|---|---|---|
| *(none)* | — | — | nothing |

**Locked by test:** FS15 contains no `useMutation`, no `invalidateQueries`, no `setQueryData`, no `apiFetch`
call and no new file under `entities/**` or `features/**` — the same lock pattern FS11/FS13 established,
trivially true here because nothing in scope touches application state.

### 3.3 FS1–FS14 no-touch guarantee (protects every route named in the entry-conditions table)

**Not touched, file by file** (proved at acceptance by mtime + content grep + First-Load manifest, same method
as every prior stage): **all of `src/`** — every slice under `app/`, `widgets/`, `features/`, `entities/`,
`shared/`, `styles/`. No exceptions: FS15 is the first stage whose no-touch set is "the entire application
source tree," because nothing in scope is application code.

**Files FS15 MAY edit, with the reason each cannot move a protected route's budget:**

| File | Edit | Why it is safe |
|---|---|---|
| `docker-compose.yml` / new `webplatform/docker-compose.console.yml` *(D2)* | add the console service | infra config, outside the Next build graph entirely |
| `docker/Caddyfile` *(D2, Option B only)* | add a console route | infra config, same reason |
| `.github/workflows/ci.yml` | fix the E2E project matrix | CI YAML, never enters the Next build |
| `console/scripts/*.mjs` **(new)** | build-time verification scripts | run against build *output*, never imported by `src/` |
| `console/next.config.ts` | **not edited** — the CSP package already shipped at FS14; T-FS15.4.5 is a runbook entry, not a code change | — |
| `webplatform/frontend/*.md` **(new)** | the runbook + this plan + the report | documentation |
| `tests/**` | the gated-fields audit + the CI-matrix proof run | never shipped |

Every fixture stays byte-identical: FS15 adds **no fixture row**, because nothing in scope reads a fixture.

### 3.4 State-ownership matrix (fixed at approval)

| State | Owner | Persistence | Invalidated by | S/C | Lifetime | Replacement seam |
|---|---|---|---|---|---|---|
| *(none — FS15 introduces no new state of any kind)* | — | — | — | — | — | — |

The six-kind model (PART2 §2.3) is unaffected because FS15 ships no component, no hook, and no store
consumer. This row is empty by construction, not by omission — a lock test asserts no file under
`src/shared/providers`, `src/shared/lib/store`, or any Zustand/Query call site changed.

### 3.5 Navigation contract

**No new transition.** FS15 adds no route, no URL parameter, and no Inspector/palette entry. The navigation
contract every prior stage built is unchanged and is proved unchanged by the same mtime/grep sweep as §3.3.

### 3.6 Bundle ownership (per-chunk architecture)

| New chunk | Single importer | First-load trigger | Could it reach commons? | Mechanical proof |
|---|---|---|---|---|
| *(none)* | — | — | — | **not created — FS15 ships no `src/` module, so there is no chunk to own** |

### 3.7 Regression invariants (checkable, not intentions)

- **I1 — every route's First Load is byte-identical to the FS14 acceptance numbers.** `/chat` stays
  **180 / 180 kB**, the primary protected route, checked once before any FS15 change and once at acceptance —
  a formality this stage rather than a risk, since nothing in scope can move it, and the project proves that
  claim rather than asserting it (rule 6).
- **I2 — shared commons stays 107 kB; `query-keys.ts` and `endpoints.ts` are not opened at all.**
- **I3 — `pnpm size` stays 766.23 / 777 kB**, unchanged, no ruling needed (the FS14 precedent — a green
  measurement needing no ritual, rule 25 — applies trivially here).
- **I4 — ONYX untouched:** `styles/tokens.css` and every `shared/ui` component byte-identical. No MINOR
  requested, no new status registered.
- **I5 — no `src/` file modified anywhere** — the strongest no-touch guarantee any stage has stated, and it is
  proved the same way every narrower one was: mtime + content grep across the whole tree.
- **I6 — previous suites stay green without weakening.** Floors: Vitest **794 / 102 files** *plus* the one new
  gated-fields-audit test, Playwright **400 passed / 0 failed / 17 skipped** across 3 viewports (verified
  again with the CI-matching command), axe **0**, dependency-cruiser **0**.
- **I7 — every FE-RV item this stage touches is described with exactly one of three outcomes: CLOSED (with
  the executed evidence attached), OPEN (with the exact blocking infrastructure named), or DEFERRED TO THE
  RUNBOOK (with its numbered entry).** No fourth description exists, and none of the ten live-round-trip items
  (FE-RV-7…16) or FE-RV-3/4/6/17 may be marked CLOSED without executed evidence in this environment — a
  runbook entry is not a close.
- **I8 — no new dependency · no ADR created · no token change · no threshold pre-raised · no `app/` change ·
  no backend endpoint invented · no fixture row added.**

### 3.8 File-level deliverables

```
webplatform/frontend/STAGE_FS15_PLAN.md              ← this document
webplatform/frontend/PRODUCTION_READINESS_RUNBOOK.md ← T-FS15.5, new
webplatform/frontend/FS15_REPORT.md                  ← T-FS15.6, at acceptance
docker-compose.yml  OR  webplatform/docker-compose.console.yml   ← T-FS15.2, per D2
docker/Caddyfile (edit)  OR  a documented manual route step        ← T-FS15.2, per D2
webplatform/console/.github/workflows/ci.yml (edit)  ← T-FS15.3
webplatform/console/scripts/check-no-secrets.mjs     ← T-FS15.4.1, new
webplatform/console/scripts/lighthouse-local.mjs     ← T-FS15.4.3, new (per D4)
webplatform/console/tests/unit/gated-fields-audit.test.ts  ← T-FS15.4.2, new
```

---

## 4. Task sequence (each with a completion criterion)

| # | Task | Done when |
|---|---|---|
| T-FS15.1 | Zero-commons guarantee restated · protected-route baseline captured | `pnpm budget`/`pnpm size`/`app-build-manifest.json` recorded **before any FS15 change**; the "no `src/` module ships" claim stated in writing |
| T-FS15.2 | Docker/Compose integration per the D2 ruling | the compose/Caddy config authored against existing conventions (§R12.5); explicitly reported as **not validated by a real `docker compose config`/build in this environment**, with the exact command recorded for the day Docker exists |
| T-FS15.3 | CI E2E matrix fix | `ci.yml`'s E2E step covers all three shipped Playwright projects; the equivalent command run locally and its result (400/0/17) recorded as the proof this environment can offer |
| T-FS15.4.1 | Secrets-in-bundle scan | `check-no-secrets.mjs` run once against a real `pnpm build`; zero hits recorded with the exact pattern set checked, per D3's ruling on whether it becomes a standing script or a one-off |
| T-FS15.4.2 | Gated-fields cross-cutting audit | one new test enumerates every shipped `gated`-flagged field and proves the §R10.3 triple (no view value, no AI-prompt leak, no export leak) in one place |
| T-FS15.4.3 | Local Lighthouse pass, per the D4 ruling | if attempted: `/chat` and `/dashboard` measured against `pnpm start`, reported as a **workstation** number against §F8.1, never as the staging measurement |
| T-FS15.4.4/5 | The five infra-gated checklist items | each becomes exactly one numbered Runbook entry — command sequence, expected result, single adjustment point — no fabricated pass |
| T-FS15.5 | Production Readiness Runbook | the ten FE-RV-7…16 items ordered into one session's checklist; every named adjustment-point file verified to still exist at its stated path; FE-RV-3/4/17 and the five checklist items each get their own entry |
| T-FS15.6 | Ten gates + budget verification + `FS15_REPORT.md` | executed for real; every number recorded; the terminal-stage framing stated per D5 → **STOP for acceptance** |

---

## 5. Gates, contract truth & honesty

### 5.1 Engineering gates

All ten, executed for real (Stage 2 §14): ESLint · Prettier · `tsc --noEmit` strict (0 errors, 0 unjustified
`any`) · Vitest (794 + 1 new) · Playwright ×3 viewports (400/0/17, re-run via the fixed CI-matching command) ·
axe 0 · dependency-cruiser 0 · Storybook build · contract (**FS15 introduces no endpoint and touches no wire
type**) · `pnpm budget` (32 routes ≤ 180 kB, unchanged) · `pnpm size` (766.23/777, unchanged). **A gate that
ends RED is reported RED with the threshold untouched** (rule №33) — though nothing in this plan's scope can
plausibly move any of them, since no `src/` file is edited.

### 5.2 Contract truth & deviations (decided by approving this plan)

- **D1 — This environment cannot execute Docker or a CI runner; FS15 prepares and verifies what it can, and
  reports the rest as infrastructure-gated, never as closed.** Verified directly (`docker`, `gh`, `act` all
  "command not found"). This governs every task in §1 and is not optional — it is the same discipline the
  backend has applied to RV-1…RV-18 for 20 stages. *No alternative offered; this is a verified fact, not a
  choice.*
- **D2 — Docker/Compose integration shape: OWNER RULING REQUESTED.** FE-ADR-11 decided the destination
  ("a separate Next service behind the shared reverse proxy") but no FS stage has ever edited a file outside
  `webplatform/`.
  **Option A (recommended):** a new overlay file, `webplatform/docker-compose.console.yml`, adding a `console`
  service on the same `internal`/`public` networks, run alongside the root file
  (`docker compose -f docker-compose.yml -f webplatform/docker-compose.console.yml --profile app up`). The
  root `docker-compose.yml` and `docker/Caddyfile` stay byte-identical — the frontend's own established
  discipline ("no-touch outside `webplatform/`") extended to infra for the first time it has ever been
  tested. The console is reachable on its own published port in this shape; wiring it behind the **shared**
  Caddy instance (a single Caddyfile edit adding a route) is deferred to the Runbook as the one remaining
  manual step, because it is the one file every other service's routing already depends on and this plan
  will not edit it without an explicit ruling.
  **Option B:** edit `docker-compose.yml` and `docker/Caddyfile` directly, matching FE-ADR-11 literally in one
  step (a `console` entry beside `api`/`worker`/`scheduler`, and a path- or host-based Caddy split). Cost: the
  first-ever frontend edit to backend-track infra files, on a project that has treated "no-touch outside
  webplatform/" as absolute since FS1.
  **Option C:** leave the Dockerfile exactly as FS1 shipped it, unwired, and record Docker/Compose integration
  itself as an open Runbook item rather than attempting it without a build to prove it against.
  *Recommendation: A, with Option B's shared-Caddy route named explicitly as the Runbook's next manual step —
  this gets the topology right without touching a file no frontend stage has ever needed to.*
- **D3 — The secrets-in-bundle scan: standing script or one-off?** **Option A (recommended):** keep it as a
  reusable script under `console/scripts/`, run once now with its result recorded, **not** wired into `ci.yml`
  as a blocking step (rule 79's discipline — no eleventh gate without a costed reason, and this one has none
  yet). **Option B:** wire it into `ci.yml` as a non-blocking informational step now, since it costs nothing
  to run and the pattern list is cheap to maintain. *Recommendation: A now, B is a one-line addition later if
  the owner wants it standing.*
- **D4 — Attempt a local Lighthouse pass?** **Option A (recommended):** yes, using Playwright's bundled
  Chromium against `pnpm start`, reported explicitly as a **workstation number**, not the §F8.1 staging
  measurement. **Option B:** skip it entirely and state only that §F8.1 requires staging — avoids any risk of
  a workstation number being mistaken for a field measurement. *Recommendation: A, with the caveat in every
  place the number appears, exactly as this plan states it here.*
- **D5 — Confirmation that FS15 is the terminal stage.** The frozen roadmap (PART1 §5.1) lists no FS16.
  `FS15_REPORT.md` will therefore also state the frontend track's **completion status** in the same shape the
  backend reached at Stage 20 (STAGE20_REPORT + PROJECT_COMPLETION_SUMMARY.md): implementation complete, all
  ten gates green, only infrastructure-gated Runtime Verification remains. **Requesting explicit confirmation**
  this is correct before the report is framed that way, since no prior FS stage has had to make this claim.
- **D-CSP — restated, not reopened.** FS14 already authored the enforcement package and the owner has not
  reopened D6/D8. FS15 adds no CSP code; the Runbook states the one-line swap and its pre-condition (a real
  report sink must exist and be observed for at least one deploy cycle first). This is not a ruling request —
  it restates FS14's standing decision per rule 24 (a ruling that says "not yet" is as binding as one that says
  "now").

### 5.3 FE-RV impact

**No FE-RV closes by code change alone this stage** — FE-RV-3, FE-RV-4, FE-RV-6, FE-RV-7…16 and FE-RV-17 all
require infrastructure this environment does not have, and each is reported with exactly the outcome §3.7 I7
requires (CLOSED-with-evidence is not available for any of them here; each becomes an ordered Runbook entry).
This is not a regression from FS14's closing rate — it is the same honest ceiling the backend has reported for
RV-1…RV-18 across 20 stages, applied consistently for the first time to the *entire* remaining frontend
register in one place instead of scattered across nine stage plans.

**No new FE-RV is opened.** FS15 verifies and consolidates; it introduces no new unverified assumption about
the contract, since it touches no `/api/v1` call.

---

## 6. Budget strategy (First Load 180 kB · size-limit 777 kB)

**Trivial by construction, and proved anyway.** FS15 ships no `src/` module, so there is no mechanism by which
any route's First Load or the size-limit aggregate could move. `/chat` stays **180 / 180 — ZERO headroom**,
unchanged since FS12; `pnpm size` stays **766.23 / 777**, unchanged since FS14. Both are measured **before**
any FS15 change and **again** at acceptance (rule 52's discipline, applied even though this stage carries none
of the risk that rule was written for) — because "nothing moved" is a claim this project always proves, never
assumes, and a stage that skipped the proof because it "obviously" couldn't move anything would be the first
one to.

---

## 7. Risks

| # | Risk | Mitigation |
|---|---|---|
| **R1** | **A stage framed as "closing" items could quietly report an infrastructure-gated item as closed** — the single biggest honesty risk this stage carries, precisely because it is under roadmap pressure to close FE-RV-3/4 | I7's three-outcome rule is absolute: CLOSED requires executed evidence *in this environment*; everything else is OPEN or a Runbook entry, stated as such in the same sentence every time |
| **R2** | **The Docker/Compose edit could be the first crack in "no-touch outside `webplatform/`"** if Option B is chosen without full deliberation | D2 puts the choice to the owner explicitly, with Option A (an overlay file, root untouched) as the recommended default; whichever is ruled, the edit is reviewed against `docker-compose.yml`'s own §R12.5 conventions before being called done, not merely typed and left unvalidated |
| **R3** | **A local Lighthouse number could be mistaken for the real §F8.1 field measurement** by a future reader who skips the caveat | the caveat is repeated at every place the number appears (D4, T-FS15.4.3, the report), not stated once and assumed to travel |
| **R4** | **The CI E2E-matrix fix could increase CI wall-clock past the 30-minute job timeout**, a risk this workstation cannot measure directly since CI itself doesn't run here | the fix is verified by running the equivalent command locally and recording its wall-clock as the best available estimate; if the owner runs CI for real and it times out, the fallback (splitting into a matrix job) is already known and cheap |
| **R5** | **The secrets-scan pattern list could be incomplete** and give false confidence | the list is drawn directly from `server-env.ts`'s own declared secret-shaped variables plus generic credential shapes, not invented; the script is committed and reusable, so the list can grow without re-deriving the mechanism |
| **R6** | **Windows hazards persist**: the `next` corruption (28 occurrences) and the stale-`webServer` hazard, exercised again by T-FS15.3's local matrix run | the unpiped recovery habit and the port-3000 kill remain standing procedure; unchanged from FS1–FS14 |
| **R7** | **Framing FS15 as terminal (D5) could be wrong** if the owner intends further frontend stages | D5 asks explicitly rather than assuming; if the owner declines, `FS15_REPORT.md` is written without the completion framing and nothing else in this plan changes |

---

## 8. Not in FS15 (explicit)

**No `src/` production module of any kind** — no new screen, entity, feature, query key, endpoint path,
Inspector row, palette group, mutation, dependency, or ONYX change. **No CSP enforcement** (the header stays
Report-Only; the swap is a Runbook step, not a code change). **No vendor SDK, no reopening of the FS14
observability ruling** (`/api/telemetry` still has no client caller, by standing decision — rule 78). **No
Chromatic upload** unless a `CHROMATIC_PROJECT_TOKEN` is supplied (D-adjacent, not asked here since none has
ever been offered — stays open by default). **No actual Docker build, no actual CI execution, no actual live
backend round-trip of any kind** — this environment cannot perform any of them, and this plan does not pretend
otherwise. **No `/channels`, `/playground`, `/docs` screen work** (D9 from FS14 stands — building any of them
is a separate stage with its own GO, and the roadmap names none). **No edit to `MASTER_SPEC.md`,
`FRONTEND_MASTER_SPEC.md`, `RUNTIME_VERIFICATION_REGISTRY.md`, or `app/`.**

---

**STOP — FS15 plan complete. No code has been written.** Awaiting the owner's approval of this plan, and
explicit rulings on:

1. **D2 — Docker/Compose integration shape**: **Option A** an overlay file under `webplatform/`, root
   untouched, shared-Caddy routing deferred to the Runbook *(recommended)* · **Option B** edit
   `docker-compose.yml`/`docker/Caddyfile` directly · **Option C** leave the Dockerfile unwired and record
   integration itself as open.
2. **D3 — the secrets-in-bundle scan**: **Option A** a reusable one-off script, not wired into CI
   *(recommended)* · **Option B** wired into `ci.yml` as a non-blocking informational step now.
3. **D4 — attempt a local Lighthouse pass**: **Option A** yes, honestly labelled as a workstation number
   *(recommended)* · **Option B** skip it; state only that §F8.1 needs staging.
4. **D5 — confirmation that FS15 is the roadmap's terminal stage**, so `FS15_REPORT.md` may state the
   frontend track's completion status in the same shape the backend reached at Stage 20.

Implementation begins only after that approval.
