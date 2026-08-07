# FS15 — Production Readiness (Report)

**Track:** Web Platform implementation · **SoT:** `FRONTEND_MASTER_SPEC.md` · **Plan:** `STAGE_FS15_PLAN.md`,
approved with rulings D2 (Option A — a frontend-local Compose overlay, root infrastructure untouched), D3
(Option A — a one-off secrets scan, not a permanent gate), D4 (Option A — a local Lighthouse pass, reported
explicitly as a workstation measurement) and D5 (confirmed — FS15 is the roadmap's terminal frontend stage).

**This report covers implementation. It STOPS at the end of §10 for the owner's acceptance** — no acceptance
ruling is recorded here, per the working method.

---

## 1. What was delivered

FS15 shipped **zero `src/` production modules** — the plan's own governing constraint, restated as delivered
fact: nothing in this stage could move a route's First Load, so the usual budget risk that dominated FS5–FS14
did not apply here, and §4 below proves that rather than assuming it.

1. **T-FS15.1 — protected-route baseline**, captured before any change and re-proven identical at completion
   (§4.1).
2. **T-FS15.2 — `webplatform/docker-compose.console.yml`** (D2 Option A): a new overlay adding the `console`
   service on the same `internal`/`public` networks as the root compose file. **Root `docker-compose.yml` and
   `docker/Caddyfile` were not touched** — confirmed by `git diff --stat` returning nothing for either path.
   YAML syntax and Compose-Spec shape verified with a Python parser (no `docker` binary exists here to run the
   real `config` command — see §9).
3. **T-FS15.3 — the CI E2E-matrix fix**: `ci.yml`'s E2E step ran only `--project=desktop-dark`; it now runs
   all three shipped Playwright projects, matching every FS1–FS14 acceptance's own reported floor. Verified by
   running the exact equivalent command locally (§4.2). Job timeout raised 30 → 45 minutes as a stated,
   unmeasured buffer.
4. **T-FS15.4.1 — `scripts/check-no-secrets.mjs`**, run once against a real `pnpm build`. Its first real run
   found a genuine hit — investigated, confirmed a false positive, and fixed by scope, not by weakening the
   pattern (§5).
5. **T-FS15.4.2 — `tests/unit/gated-fields-audit.test.ts`**: one cross-cutting test proving §R10.3's three-part
   rule (no view value, no AI-prompt leak, no export leak) across every gated-capable surface this project has
   ever shipped, in one place.
6. **T-FS15.4.3 — `scripts/lighthouse-local.mjs`**, a reusable, self-contained local Lighthouse runner. Two
   real bugs were found and fixed while building it (§5) — both in this new tool, not in the shipped app.
7. **T-FS15.5 — `PRODUCTION_READINESS_RUNBOOK.md`**: ten numbered procedures (Docker validation, CI execution,
   five infra-gated FS1-postmortem-§7 items, CSP enforcement, staging Lighthouse, and the one session that
   closes FE-RV-7…16 together), each with its exact command sequence, expected result and single adjustment
   point.
8. **T-FS15.6 — this report**, all ten gates executed for real, budget/size re-verified byte-for-byte.

---

## 2. Gate results — executed for real

| Gate | Result |
|---|---|
| ESLint | ✅ clean |
| Prettier | 🟡 RED on **one pre-existing file**, `.size-limit.json` — the FS12/FS13/FS14 legacy carry-over, untouched here (see §3). All FS15-authored files are formatted; Prettier flagged `scripts/lighthouse-local.mjs` once during authoring and it was fixed immediately (not a carry-over — an FS15 file, fixed at FS15) |
| `tsc --noEmit` strict | ✅ 0 errors |
| Vitest (unit + component) | ✅ **800 passed / 103 files** (FS14 floor 794/102 + 1 new file, 6 new tests) |
| Playwright E2E | ✅ **400 passed / 0 failed / 17 skipped**, all three viewport projects (desktop-dark, desktop-light, mobile) — run via the exact command the fixed `ci.yml` now runs, unchanged from the FS14 floor |
| axe accessibility | ✅ 0 violations (inside the Playwright suite above — unchanged, FS15 touches no rendered surface) |
| dependency-cruiser (FSD boundaries) | ✅ 0 violations (**609 modules, 1578 dependencies** — byte-identical to FS14) |
| Storybook build | ✅ 54 stories, unchanged |
| Contract | ✅ FS15 introduces no `/api/v1` call and touches no wire type — trivially true, since no `src/` file changed |
| `pnpm budget` (per-route First Load) | ✅ **32 routes ≤ 180 kB**, byte-for-byte identical to the pre-FS15 baseline (§4.1) — `/chat` still 180/180, ZERO headroom |
| `pnpm size` (aggregate detector) | ✅ **766.23 / 777 kB**, unchanged |

Nine of ten gates fully green; the tenth is RED on exactly the same pre-existing file every stage since FS12
has reported, for the same reason, unmodified.

---

## 3. The gate that ended RED, reported RED

`.size-limit.json` fails Prettier with CRLF line terminators — the carry-over from the FS13 acceptance edit,
ruled a legacy carry-over at FS12's precedent and reaffirmed at FS14's acceptance, with the explicit owner
instruction that the file is **not to be modified on that basis alone**. FS15 never opened it. This is not a
new finding; it is restated here because every stage's report states its gate results in full, never by
omission.

---

## 4. Measurement record

### 4.1 The protected-route baseline, captured and re-proven

`pnpm budget` and `pnpm size` were run **before any FS15 change** and again **at completion**:

| | Before | After |
|---|---|---|
| `pnpm budget` worst route | `/chat` 180/180 kB | `/chat` 180/180 kB |
| `pnpm budget` result | 32 routes PASS | 32 routes PASS |
| `pnpm size` | 766.23 / 777 kB | 766.23 / 777 kB |
| `.next/route-budget.json` | captured | **`diff` against the captured baseline: empty — byte-identical** |

`.next/app-build-manifest.json`'s raw text differs between the two builds — but only in **key insertion order**
and **chunk-hash suffix values**, a known Next.js build-to-build non-determinism (two separate `next build`
invocations of byte-identical source do not guarantee identical manifest serialization order or identical
content-hash strings for every chunk). This is stated here rather than glossed over: the derived,
**authoritative** artifact this project's own gate actually checks — `route-budget.json` — is byte-identical;
the raw manifest is not, and treating that as a discrepancy would be measuring the wrong thing. No `src/` file
was edited between the two builds (§4.5 confirms the no-touch guarantee independently).

### 4.2 The CI E2E-matrix fix, verified by running its exact equivalent

```
pnpm exec playwright install --with-deps chromium
pnpm exec playwright test
→ 400 passed (2.7m), 17 skipped
```

Matches the FS14 acceptance floor exactly, across all three projects — the fixed `ci.yml` step now checks
what every stage has actually certified on a workstation since FS1, closing the gap described in the plan's
§0 finding 2.

### 4.3 The secrets scan — one real hit, investigated, fixed by scope

First run against `.next/standalone` + `.next/static`:

```
[check-no-secrets] FAIL — 1 suspicious pattern(s) found:
  - AWS access key id in .../node_modules/.pnpm/next@.../next/dist/compiled/amphtml-validator/validator_wasm.js
```

Investigated, not dismissed: `file` confirmed the target is a 4 MB JS source file; the matched context
(`wJAAkAgCSgChAEiBCAJKAKIAU4EQCAJQQE6AHBCACECDAELIARBAWohECAJK`) is a base32-shaped WASM data literal inside
Next.js's own **vendored** `amphtml-validator` dependency — code this project did not write and Next.js could
never have inlined a `NEXT_PUBLIC_*` value (or anything else project-specific) into, because env inlining only
touches Next's own compiled output. The script was narrowed to exclude `node_modules` from the walk (documented
in the script's own header, not silently fixed), and the final result:

```
[check-no-secrets] PASS — 0 hits across 2 build output directories, 10 patterns checked.
```

### 4.4 `lighthouse-local.mjs` — two real bugs found while building the tool itself

Neither bug was in the shipped application; both were in the new FS15 script, and both are documented in the
script's own comments so a future maintainer does not rediscover them the hard way:

1. **`execFileSync` starved the Playwright browser connection.** The first end-to-end run failed with
   `Protocol error (Page.navigate): Target closed` on the very first route. Root cause: `execFileSync` blocks
   the Node.js event loop for the whole Lighthouse child-process run, and the Playwright-managed Chromium
   connection shares that same event loop — a blocked loop starves it. Fixed by switching to the async
   `execFile` (`node:util.promisify`), verified by a clean end-to-end run afterward.
2. **Inline JSON in `--extra-headers` did not survive Windows `cmd.exe` shell-quoting.** The second run failed
   on `/chat` (the first authenticated route) with `Expected property name or '}' in JSON at position 1` —
   the `{"Cookie":"session=...; onyx-role=..."}` argument's embedded quotes and `;` did not survive
   `shell: true`'s pass through `cmd.exe`. Fixed using Lighthouse's own documented alternative,
   `--extra-headers=./path/to/file.json` (a temp file, cleaned up in a `finally` block after each run) —
   sidesteps shell quoting entirely rather than trying to escape it correctly for one platform.

Also worth noting as an environment fact, not a script bug: launching the Playwright-bundled `chrome.exe`
**directly** (as Lighthouse's own `chrome-launcher` tries to by default) fails on this workstation with a
Windows side-by-side (WinSxS) configuration error. Playwright's own launcher succeeds because it sets up an
environment `chrome-launcher` does not replicate. This is why the script asks Playwright to launch Chromium
with `--remote-debugging-port` open and points the Lighthouse CLI at that existing instance via `--port`,
instead of letting Lighthouse spawn its own — documented at length in the script's header, since it is the
least obvious thing about it.

**Final, reproducible result** (three independent runs, numbers stable within normal Lighthouse run-to-run
variance):

| Route | Perf | A11y | FCP | LCP | TBT | CLS | TTI |
|---|---|---|---|---|---|---|---|
| `/login` (public) | 0.65–0.68 | **1.0** | 1.5 s | 2.4 s | 310–380 ms | 0.001 | 3.9 s |
| `/chat` (authenticated, primary protected route) | 0.52–0.53 | **1.0** | 1.5 s | 3.5 s | 510–550 ms | 0 | 4.4 s |
| `/dashboard` (authenticated) | 0.49–0.55 | **1.0** | 0.9–1.5 s | 4.4 s | 530–540 ms | 0 | 4.5–4.6 s |

**These are workstation numbers — `next start` on this machine, over `localhost`, headless Chromium, the
fixture backend, no CDN, no edge cache, no real network latency. They are NOT the §F8.1 staging measurement
(FCP < 1.2s, LCP < 2.0s, TTI < 2.5s, CLS < 0.05, INP < 200ms) and must never be read as satisfying it — that
measurement is Production Readiness Runbook item 9, still open, blocked on a staging deployment that does not
exist here.** The one genuinely comparable signal: **accessibility scored 1.0 (100) on all three routes**,
consistent with this project's standing zero-axe-violations record across 400 E2E tests.

### 4.5 No-touch guarantee, proven

```
git status --short   (repo root)     →  only the pre-existing untracked handoff docs + webplatform/
git diff --stat -- docker-compose.yml docker/Caddyfile   →  empty (both untouched)
```

Every file FS15 created or modified is listed in §6. No file under `webplatform/console/src/` appears in that
list — the strongest no-touch guarantee any stage in this project has stated, proven the same way every
narrower one was.

---

## 5. Defects found and fixed

All three defects found this stage were in **FS15's own new tooling**, not in the shipped application — listed
in full in §4.3 and §4.4 above. Summarized: an AWS-key-shaped false positive in a vendored third-party WASM
blob (fixed by excluding `node_modules` from the scan, documented as a deliberate scope decision) · a
Node.js event-loop-starvation bug in the Lighthouse runner (`execFileSync` → async `execFile`) · a Windows
shell-quoting bug in the same runner (inline JSON header → a temp file path, Lighthouse's own documented
mechanism). Zero defects were found in `src/` — expected, since FS15 read but never edited it.

---

## 6. File-level deliverables (complete list — everything FS15 touched)

```
webplatform/frontend/STAGE_FS15_PLAN.md                    ← the approved plan (prior deliverable)
webplatform/frontend/PRODUCTION_READINESS_RUNBOOK.md        ← new (T-FS15.5)
webplatform/frontend/FS15_REPORT.md                         ← this document
webplatform/docker-compose.console.yml                      ← new (T-FS15.2, D2 Option A)
webplatform/console/.github/workflows/ci.yml                ← edited (T-FS15.3)
webplatform/console/.gitignore                               ← edited (added /.lighthouse)
webplatform/console/scripts/check-no-secrets.mjs            ← new (T-FS15.4.1)
webplatform/console/scripts/lighthouse-local.mjs            ← new (T-FS15.4.3)
webplatform/console/tests/unit/gated-fields-audit.test.ts   ← new (T-FS15.4.2)
```

**Root `docker-compose.yml`, `docker/Caddyfile`, `app/`, `MASTER_SPEC.md`, `FRONTEND_MASTER_SPEC.md`,
`RUNTIME_VERIFICATION_REGISTRY.md` — all untouched.** No file under `webplatform/console/src/` was created,
edited or deleted.

---

## 7. Contract truth & deviations as built (the rulings, delivered exactly as ruled)

- **D2 (Option A):** delivered exactly as ruled — `webplatform/docker-compose.console.yml`, root files
  untouched, the shared-Caddy route explicitly deferred to Runbook item 1 (not attempted here).
- **D3 (Option A):** `check-no-secrets.mjs` is a one-off script, run once, its result recorded above — **not**
  wired into `ci.yml` as a blocking or informational step.
- **D4 (Option A):** the local Lighthouse pass was run and is reported throughout this document with the
  explicit, repeated caveat that it is a workstation measurement — never production or staging evidence, per
  the owner's exact wording at the GO.
- **D5 (confirmed):** this report frames FS15 as the terminal frontend implementation stage (§8). It
  distinguishes implementation completion from Runtime Verification explicitly and repeatedly (§9), per the
  owner's binding requirement.
- **The four additional binding requirements, honoured:**
  1. No fabricated production verification anywhere in this report — every infra-gated item states its
     blocking dependency and is converted into a Runbook procedure, never a simulated pass.
  2. **FE-RV-3, FE-RV-4 and FE-RV-17 are NOT closed by this stage** (§9) — none was executed on real
     infrastructure; each stays open with its Runbook entry.
  3. No new frontend functionality — confirmed by §6's complete file list containing zero `src/` entries.
  4. No change to `app/`, contracts, `MASTER_SPEC.md`, `FRONTEND_MASTER_SPEC.md`, ADRs or ONYX tokens —
     confirmed by §4.5.
  5. No commit, tag or push was made — all changes remain in the working tree, exactly as every prior stage's
     standing instruction requires.

---

## 8. Invariants — reported, not re-worded

- **I1 — every route's First Load byte-identical to FS14.** HELD (§4.1) — `/chat` 180/180, ZERO headroom,
  proven by a manifest diff, not assumed.
- **I2 — shared commons stays 107 kB; `query-keys.ts`/`endpoints.ts` not opened at all.** HELD — neither file
  appears in §6's file list.
- **I3 — `pnpm size` stays 766.23/777 kB.** HELD, byte-for-byte.
- **I4 — ONYX untouched.** HELD — `styles/tokens.css` and every `shared/ui` file absent from §6.
- **I5 — no `src/` file modified anywhere.** HELD — the strongest guarantee any stage has made, proven by
  §4.5 and the complete file list in §6.
- **I6 — previous suites stay green without weakening.** HELD — Vitest 800/103 (794/102 + 1 new file),
  Playwright 400/0/17 across 3 viewports, axe 0, dependency-cruiser 0.
- **I7 — every FE-RV item this stage touches gets exactly one of three outcomes.** HELD — see §9; nothing is
  described as CLOSED without executed evidence in this environment.
- **I8 — no new dependency · no ADR · no token change · no threshold pre-raised · no `app/` change · no
  backend endpoint invented · no fixture row added.** HELD.

No invariant was missed, softened, or re-worded this stage.

---

## 9. FE-RV impact — the honest ceiling

**No FE-RV closes by this report.** Per binding requirement 2, FE-RV-3, FE-RV-4 and FE-RV-17 explicitly
require real execution on infrastructure this environment does not have (`docker`, `gh`, `act` all verified
"command not found" — plan §0). The same ceiling applies to FE-RV-6 (needs a `CHROMATIC_PROJECT_TOKEN`, never
supplied) and FE-RV-7…16 (each needs a live backend). Every one of these ten items now has a numbered,
mechanical procedure in `PRODUCTION_READINESS_RUNBOOK.md`, with its single adjustment point verified to still
exist at its stated path (Runbook §10's table) — closing them the day the infrastructure exists is execution,
not investigation, but **it has not happened, and this report does not claim it has.**

**No new FE-RV is opened.** FS15 introduced no new unverified assumption about the contract — it touched no
`/api/v1` call.

**What this stage genuinely closed instead:** two checklist items from `FS1_POSTMORTEM.md` §7 that were
executable on this workstation for the first time because the surfaces they check did not exist until FS5/FS11
shipped — "no secrets in the client bundle" (§4.3) and "gated data honesty" (the new cross-cutting audit test,
§1 item 5) — plus the CI E2E-matrix gap (§4.2), a real, source-level finding this stage discovered and fixed,
independent of whether CI itself has ever run.

---

## 10. Not done (and why)

Exactly what the plan's §8 named, unchanged: no `src/` production module of any kind · no CSP enforcement (the
header stays Report-Only; the swap is Runbook item 8, not code) · no reopening of the FS14 observability
ruling (`/api/telemetry` still has no client caller) · no Chromatic upload (no token supplied) · **no actual
Docker build, no actual CI execution, no actual live-backend round-trip of any kind** — this environment cannot
perform any of them, and this report does not pretend otherwise · no `/channels`/`/playground`/`/docs` screen
work · no edit to `MASTER_SPEC.md`, `FRONTEND_MASTER_SPEC.md`, `RUNTIME_VERIFICATION_REGISTRY.md`, or `app/`.

**What "frontend implementation complete" means, precisely (D5):** all fifteen FS implementation stages
(FS1–FS15) are delivered with every engineering gate green (modulo the one accepted legacy Prettier
carry-over), every protected-route budget held, and every architectural freeze intact. **It does not mean the
product has been verified on live infrastructure.** That is the same distinction the backend has drawn since
its own Stage 20: implementation complete and statically verified is one status; Runtime Verified against real
Postgres/Redis/Telegram/LLM (backend RV-1…18) or a real Docker/CI/staging/backend deployment (the ten frontend
FE-RV items above, plus FE-RV-3/4/17) is a separate, still-open status, with its own procedure now written
down in `PRODUCTION_READINESS_RUNBOOK.md`.

---

**STOP — FS15 implementation complete. All ten gates executed for real; nine green, one RED on the same
pre-existing accepted carry-over every stage since FS12 has reported. Every FE-RV item this stage could have
been tempted to fabricate a close for is reported open, with a runnable procedure in its place. Awaiting the
owner's acceptance.**

---

## 11. Acceptance addendum (2026-08-07)

**FS15 is ACCEPTED** by the owner. The acceptance instruction was explicit and narrow — "execute the
post-acceptance synchronization only" — so this addendum records exactly that: a re-confirmed measurement and
the owner's ruling on it, nothing else re-opened.

### Ruling — no threshold change required; 777 kB stands

`pnpm size` was re-run at the post-acceptance synchronization step, on the accepted state, with zero source
files touched between delivery (§1–§10 above) and this confirmation:

```
Size limit: 777 kB
Size:       766.23 kB gzipped
```

Identical to the number reported at delivery. `.size-limit.json` (777 kB, the ninth measured re-baseline, set
at the FS13 acceptance and reaffirmed unchanged at FS14) **was not modified** — confirmed by `git diff` before
and after the synchronization step. FS15 shipped zero `src/` production modules (§1, §6), so rule №33's
"measure → per-chunk analysis → evidence-based proposal" chain has nothing to trigger it: there is no growth to
analyze and no proposal to make. The full per-chunk record of this re-confirmation is filed in
`FS15_REPORT_SIZE_ADDENDUM.md` §2 (owner's ruling).

### FE-RV status, unchanged by acceptance

Acceptance of the stage does not retroactively close anything §9 reported open. **FE-RV-3 (Docker), FE-RV-4
(CI execution) and FE-RV-17 (CSP enforcement) remain OPEN** — none was executed on real infrastructure at any
point, including during this synchronization step, which touched documentation and one measurement command
only. The same holds for FE-RV-6 and FE-RV-7…16. `PRODUCTION_READINESS_RUNBOOK.md` is the standing procedure
for closing all of them; this addendum does not shorten that list.

### Final gate state at acceptance

| Gate | Result |
|---|---|
| ESLint · `tsc --noEmit` strict | clean · 0 errors, 0 unjustified `any` |
| Prettier | RED — `.size-limit.json` only, the same pre-existing legacy carry-over (FS12/FS13/FS14 precedent), confirmed untouched by this synchronization step |
| Vitest | **800 passed / 103 files** |
| Playwright ×3 viewports | **400 passed · 0 failed · 17 skipped** |
| axe | 0 violations (unchanged — FS15 touched no rendered surface) |
| dependency-cruiser | 0 violations (609 modules, 1578 dependencies) |
| Storybook · contract | built (54 stories) · no new `/api/v1` path |
| `pnpm budget` | PASS — 32 routes ≤ 180 kB · worst `/chat` **180** (headroom **0.0 kB**) |
| `pnpm size` | **766.23 / 777 kB — green, re-confirmed at this synchronization step** (headroom 10.77 kB) |

**Frontend implementation is now complete: FS1–FS15, all fifteen stages delivered and accepted.** This is a
statement about implementation and static verification, not about Runtime Verification — §10 above and
`PRODUCTION_READINESS_RUNBOOK.md` remain the accurate record of what still requires infrastructure this
environment has never had.
