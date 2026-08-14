# PROJECT_HANDOFF — PART 4 · Method, Environment, Registers, Backlog, Readiness, Git

*Read after PART3. Covers the working method and FS stage-transition rules, code style, known environment
limitations and problems, the full Runtime Verification registers (backend RV + frontend FE-RV), the
post-FS2 backlog, the current freeze status, the open ADRs, readiness criteria for FS3–FS15, git state and
next steps.*

> **Provenance.** This part was written 2026-07-29 on the owner's instruction, closing a documentation gap:
> the master handoff referenced PART4 before it existed. Nothing here is new decision-making — every statement
> is consolidated from documents that already exist in the repo (`FS1_REPORT.md`, `FS1_POSTMORTEM.md`,
> `FS2_REPORT.md`, `RUNTIME_VERIFICATION_REGISTRY.md`, `TECHNICAL_BACKLOG.md`, Stage 2 §14/§15,
> `DESIGN_FREEZE_AND_ROADMAP.md` §4, `webplatform/frontend/README.md`) or from the owner's recorded
> instructions (PART1 §4).

---

## 1. Working method *(the project's methodology — sacred, unchanged since backend Stage 1)*

### 1.1 The stage ritual

Every stage — backend stage or frontend FS stage — follows exactly this sequence:

```
1. Owner says "GO on <stage>".
2. Produce ONLY the plan (STAGE_FS<N>_PLAN.md / TASK_BREAKDOWN_STAGE<N>.md). No code.
3. STOP. Wait for the owner's approval of the plan.
4. Implement strictly within the approved plan's scope. Never exceed it.
5. Run ALL engineering gates for real (frontend: the ten gates of Stage 2 §14; backend: ruff/mypy/pytest).
6. Write the report (FS<N>_REPORT.md; backend: STAGE<N>_REPORT + CODE_AUDIT + RELEASE_NOTES).
7. STOP. Wait for the owner's acceptance. Never begin the next stage automatically.
```

### 1.2 Binding process rules (owner's accumulated instructions — full list in PART1 §4)

1. **Never start a stage without an explicit "GO"** — even when the next stage is obvious.
2. **Plan first, always.** No code before the plan is approved.
3. **If a required input document does not exist, STOP and say so** — do not invent the stage scope.
   *Precedent:* at FS2 the owner said "GO, work strictly within `STAGE_FS2_PLAN.md`" but that file did not
   exist; implementation was refused, the gap was reported, the plan was written and approved first. The owner
   explicitly confirmed that stopping was correct.
4. **Honesty rule (three statuses):** *Implemented & Verified* (executed green) · *Statically Verified*
   (typechecks/lints, not executed) · *Runtime Verification Pending (RV / FE-RV)*. A check that could not be
   executed is **never** reported as a pass. The owner has praised and re-confirmed this rule twice.
5. **Open RV/FE-RV only for genuinely unverifiable items** — not as an escape hatch.
6. **Reports are reports; postmortems are postmortems.** The owner distinguishes them sharply: a report states
   what was delivered and gate results; a postmortem states what the implementation taught
   (symptom → root cause → fix → prevention).
7. **Commit only when instructed. Never push to remote.** All work is local by design.
8. **Never create an ADR automatically** — prepare proposals with options + recommendation + rationale, and the
   owner decides.
9. **Do not re-plan or rebuild finished work; do not revisit accepted architectural decisions; do not propose
   architecture changes unless asked.**
10. **Change categories (both tracks):** PATCH (fix, no contract change) · MINOR (additive, no break) ·
    MAJOR (breaking ⇒ new spec version + ADR).
11. **Budgets/thresholds are never pre-raised (rule №33, FS5 GO ruling):** implement → gates → MEASURE;
    only if a threshold truly blocks, deliver a per-chunk growth analysis and propose a value from
    evidence. Applied **nine times**: FS5 → 485 kB · FS6 → 560 kB · FS7 → 598 kB · FS8 → 628 kB ·
    FS9 → 655 kB · FS10 → 677 kB · FS11 → 696 kB · FS12 → 756 kB · **FS13 → 777 kB**, each only after a
    DEDICATED addendum and an owner ruling, and the last six only after a **full evidence pack**. Every
    ruling used the same reproducible derivation: **measured + the headroom granted at the previous ruling,
    rounded up to the next whole kB.** Expect that bar every time — raw gate logs, per-chunk tables and
    manifest proofs before acceptance. The **First Load 180 kB budget is authoritative and non-revisable**
    (owner, FS6 → FS13); its binding reference is
    **/chat = 180 / 180 kB with ZERO headroom**, and the FS8 commons-offload lever remains spent — the proven
    replacement mechanism is **entity-local query keys** (FS9 T-FS9.1, re-applied at FS10, FS11 and FS12 with
    zero commons rows added). **At zero headroom this stops being a target and becomes a wall.**
12. **Plans must carry seven fixed artefacts since FS7/FS8** (owner's requirements — PART1 §4.5/§4.6):
    the rendering/loading matrix · the query-key invalidate graph · the file-by-file no-touch guarantee ·
    the **state-ownership matrix** (no state in Query *and* Zustand) · the **URL navigation contract**
    (every transition reversible by Back) · **per-chunk bundle ownership** · **numeric regression
    invariants**. Each is PROVED at acceptance, not asserted.
13. **Evidence beats narrative (FS8), and a control build settles it (FS9, twice at FS10, twice at FS11).**
    When a
    measurement contradicts an explanation — even one this project wrote — the measurement wins: fix the
    document, say so plainly, then proceed. When an invariant is missed, do not narrate a cause: build the
    control (the stage's own addition removed), measure it, and report the deviation with its proof. An
    invariant is never re-worded to make a stage look clean. **At FS10 the technique also found the fix:**
    the first control build both explained a route-budget failure and confirmed the structural remedy.
    **At FS11 the technique gained a second form:** besides removing a single addition, a control build that
    reverts the *new route* to a stub — leaving every other byte of the stage in place — returned all six
    protected routes to their exact baselines, proving a movement was shared-graph re-partition rather than
    stage code.
14. **A new surface proves its scope, in both directions (FS10, owner requirements A/B).** A screen whose
    records carry no `channel_id` must lock that structurally (no key/path/fetcher may accept a channel id
    — asserted by function arity) and must prove it neither influences nor depends on the channel-scoped
    screens (no imports either way; no foreign round-trip; every protected route byte-compared against the
    pre-stage baseline).
15. **A stage names a PRIMARY PROTECTED ROUTE and checks it twice (FS11, owner requirement).** The byte
    comparison runs **after the stage's first risky artefact lands** and **again before acceptance** — not
    only at the end. At FS11 the mid-stage check caught a real 2 kB regression on `/dashboard` while it was
    still cheap to fix structurally (a `'use client'` module re-exported from a shared entity barrel).

16. **A first-consumer gate must be able to REFUSE, and its fallback is pre-declared (FS12).** The plan
    said in advance what would happen if `shared/ui/data-table` moved a protected route; it did (+58 B gz in
    the webpack runtime chunk-id map, rounding `/memory` up, with a control build returning a byte-identical
    runtime chunk), so the structural fallback ran immediately and without debate. **Pre-declare the
    fallback; then the measurement decides.**
17. **A screen with no endpoint is DELIVERABLE as a verified absence, and it is finished (FS12).** It states
    fact · reason · what would change it on **every** viewport, ships **zero** fixture data, and is
    protected by a **negative-lock test** proving the fixture resolver answers nothing for it. **No FE-RV is
    opened** for such a screen: an FE-RV records an unverified assumption; this is a verified fact about a
    frozen contract.
18. **A pre-existing gate failure is reported, never silently absorbed and never silently fixed (FS12).**
    The Prettier gate went red on an FS11 file inside the no-touch set; the evidence (mtime, line
    terminators) went into the report, the file stayed untouched, and the owner ruled it a legacy
    carry-over — after which the fix was proved formatting-only.
19. **A plan cannot promise zero commons edits until it knows where the CONSUMER of the new state lives
    (FS13).** FSD forbids a provider importing a feature, so anything consulted inside the frozen seven has
    its read side in `shared/` by law. FS13's plan claimed `⌘,` would be its only commons edit; the D5-B
    toast preference needed a second one, and it cost `/audit` and `/providers` 1 kB each. **Trace the
    consumer to its layer before making the claim.**
20. **When a necessary deviation appears mid-stage, STOP and report it WITH measurements (FS13).** The
    owner's GO said so explicitly. FS13 stopped having already run four builds, a control isolating the
    cause and a shape variant proving the cost inherent — so the ruling took one message. Measuring before
    stopping is what makes the stop useful; choosing unilaterally spends the owner's authority.
21. **An accepted deviation is FROZEN WORDING (FS13).** The owner accepted `/audit` 174→175 and
    `/providers` 153→154 "exactly as reported" and forbade re-wording, reinterpreting or "improving" the
    explanation. Rule 44 gains a second half: **once ruled, later documents cite a deviation, they do not
    restate it.**
22. **A pre-declared fallback must be measured in every shape it could plausibly take before it is trusted
    (FS14).** The observability sink was tried as a boundary-level import AND as a single root-only import;
    both cost the same three routes 1 kB. One measurement showing a cost is a data point; two measurements
    in different shapes showing the SAME cost is what justifies "this module itself is the cost" rather than
    "this placement is the cost."
23. **A test failure is diagnosed with the same control-build discipline as a bundle movement (FS14).** Three
    control builds, each removing one stage file with global reach, excluded the stage's own changes as the
    cause of a failing axe assertion before a DOM probe (not a guess) found a pre-existing client-navigation
    race. Treat a stage's own suspected test breakage exactly like a suspected budget regression: isolate
    with controls before writing a cause.
24. **An owner ruling that names what NOT to do is as binding as one that names what to do (FS14).** "No
    client caller is to be added" and "`.size-limit.json` is not to be modified" are both prohibitions, not
    open questions — a later stage does not get to interpret silence as license to revisit them. This
    generalizes rule 21 (frozen wording) to rulings that are refusals rather than acceptances.
25. **A green measurement needs no ritual (FS14).** `pnpm size` passed with 10.77 kB of headroom, and the
    report said exactly that — no threshold action taken or needed — instead of manufacturing a re-baseline
    discussion the rule never asked for. Rule №33 governs raises; it was never a mandate to re-litigate a
    number that already fits.
26. **A stage that cannot execute real infrastructure verification says so, and converts the gap into a
    procedure, never a simulated pass (FS15, the terminal stage).** `docker`, `gh` and `act` were verified
    absent — not assumed — before a single task was drafted, and the roadmap's own entry duty ("FE-RV-3 +
    FE-RV-4 closed") was reported NOT achievable here rather than quietly marked done.
    `PRODUCTION_READINESS_RUNBOOK.md` is the mechanism: every blocked item gets an exact command sequence and
    a single adjustment point, so closing it later is execution, not investigation — but the Runbook existing
    is never itself the closure. This generalizes the honesty rule (§1.2 rule 4) to an entire *category* of
    work, not just individual checks.
27. **A brand-new tool's own bugs get the same investigate-before-fixing discipline as a bug in the shipped
    product (FS15).** A secrets scanner's first real run matched a credential-shaped pattern inside Next's
    own vendored WASM dependency; the match was traced to its exact binary context and confirmed a false
    positive before the pattern was scoped down — never weakened blind to make the gate green. The same
    standard applies to code written an hour ago as to code that shipped fourteen stages ago.
28. **A stage that ships zero application code still proves that claim with the same rigor as a stage that
    ships a lot (FS15).** "FS15 touched no `src/` file" was proved by a byte-for-byte diff of
    `route-budget.json` before and after, not asserted from the file list alone — the same standard every
    narrower no-touch guarantee since FS7 has been held to, here applied at its widest possible scope, and
    the last time this project's implementation track will need to prove it at all.

### 1.3 FS stage-transition rules *(what must be true to move between FS stages)*

A transition **FS(N) → FS(N+1)** is legal only when all of the following hold:

1. FS(N)'s ten gates are green, **executed for real** on the actual toolchain.
2. `FS<N>_REPORT.md` is written; any newly-pending items are honestly registered as FE-RV with an owner stage.
3. The owner has **accepted** FS(N) (a STOP happened and the owner responded).
4. Any **prerequisite decisions** the frozen plan attaches to FS(N+1) are made. Concretely: Stage 2 §15
   requires the three open frontend ADRs (chart library, styling depth, observability vendor) decided by the
   owner **before FS3** begins.
5. FS(N+1) has an approved plan document **before any code**. If the plan does not exist, writing it *is* the
   first deliverable (the FS2 precedent, rule 1.2.3).
6. FE-RV items with a deadline attached to the upcoming stage are resolved or explicitly re-accepted by the
   owner. *Precedent:* FE-RV-1 (Storybook build) carried the deadline "before FS3" and was closed inside FS2.

Standing constraints across every transition: `app/` untouched · ONYX token values untouched · SoT documents
untouched · no architecture change without MAJOR + ADR · no scope creep · stubs/placeholders are replaced,
never silently promoted to "done".

## 2. Code style & engineering conventions

### 2.1 Frontend (Console)

- **TypeScript strict** plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`,
  `verbatimModuleSyntax`; path alias `@/* → ./src/*`; **0 unjustified `any`** (`no-explicit-any: error`).
- **ESLint flat config:** typescript-eslint strict + stylistic, jsx-a11y, react-hooks, Next plugin; consistent
  type imports; relaxed only for config/test/story files. **Prettier:** 100 cols, 2 spaces, single quotes,
  trailing commas, LF.
- **FSD discipline:** one-way layers `app → widgets → features → entities → shared`; one public `index.ts`
  per slice; deep imports forbidden; no cross-feature or cross-entity imports; enforced by
  `dependency-cruiser.config.cjs` (0 violations is a gate).
- **Styling:** semantic ONYX tokens only — never a hard-coded colour, never a token *value* edit. Contrast
  problems are fixed by changing **which token a call site uses** (`text.tertiary` → `text.secondary`), never
  by editing a token. Global element rules must live inside `@layer base`.
- **Colour-usage rule (came from two real defects):** `text.tertiary` is permitted for ≥16px or decorative
  meta only; small UI text uses `text.secondary`. FS3 must encode this in the component API (§4 R2).
- **Registry-driven pattern:** one typed data source feeding many consumers — `routes.ts` (sidebar, palette,
  middleware, breadcrumbs, stubs), `shortcuts.ts` (handlers + the `⌘/` cheat-sheet), `status.ts` (the
  12-status vocabulary). Extend the registries; never hand-wire a parallel copy.
- **Auth discipline (FS4):** all auth cookies in BFF responses are RAW `set-cookie` appends — mixing
  `headers.append('set-cookie')` with `NextResponse.cookies.set()` silently drops appended values (learned
  from a 37-failure E2E incident; documented at `roleHintSetCookie`). The backend session value is never
  parsed; the `onyx-role` hint is reflection only; middleware = reflection, BFF = cookie handling, server
  layouts = truth via `/auth/me`, backend = boundary. The fixture gateway is legal in local/ci only (triple
  kill-switch, each lock unit-tested).
- **`shared/ui` import policy (FS3):** the public API is **component entrypoints** —
  `@/shared/ui/<component>` (AI set: `@/shared/ui/ai`); there is deliberately **no root barrel** (a full
  barrel measurably broke the route budget, FS3_REPORT §6.1); heavy components (data-table, markdown,
  code-block, chart) are consumed via their `lazy` entrypoints or route-level `dynamic()`; nothing deeper
  than a component's `index.ts`. Full convention: `console/src/shared/ui/README.md`.
- **Semantics conventions (FS2 §7):** landmarks `banner` / `navigation` ("Primary", "Primary mobile",
  "Breadcrumb") / `main` (`#main-content`, skip-link target) / `complementary` ("Inspector"); exactly one
  `h1` per screen; composed blocks use `h2`. **Test selectors:** role-based, role **+ level** for headings;
  accessible names are the contract; no `data-testid` so far.
  **Embedded user content (FS7):** markdown from the backend can carry its own `#` headings — demote them
  in the widget (never in the ONYX component) so the page keeps one `h1` and a monotone heading order; axe
  `heading-order` is what catches a violation.
- **Honest progress (FS7):** never render a percentage the transport cannot report. `fetch` exposes no
  upload progress, so an in-flight upload shows a *Queued* state, and server-side work (ingestion) is
  polled and labelled with the server's own status — the same discipline as gated metrics and 202 intents.
- **Backend-derived data is displayed, never authored (FS8):** Style Memory (`persona.style_features`,
  §R9.12) renders as derived *parameters*, is read-only in the UI, and an unknown backend key is shown by
  its **raw key** with a quiet marker rather than dropped or renamed — the `parseStatus` discipline applied
  to jsonb, so a wire change degrades gracefully instead of hiding data.
- **Optimistic locks are surfaced, never swallowed (FS8):** a `PATCH` carrying a stale `version` (§R4.2)
  answers 409 and the UI says "changed elsewhere" with a reload affordance. Mutations that shape future
  generations are confirmed, never optimistic.
- **Suppressions:** a lint rule is disabled only per-line **with a written justification** (the single
  `jsx-a11y/no-autofocus` case in the palette); never a blanket rule relaxation.
- **Commits** (when instructed): conventional `feat|test|docs(fs-N): …`, each ending with
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`; one tag per stage. LF→CRLF warnings on Windows
  are benign.

### 2.2 Backend (frozen — for reference only)

Python `>=3.13` (dev 3.14.6, prod 3.13-slim) · `from __future__ import annotations` · PEP 695 generics ·
`enum.StrEnum` · frozen slotted DTOs · **Protocols, not ABCs** · deterministic fakes · no `print` · no magic
strings/numbers · ruff (line-length 100; E,F,W,I,UP,B,C4,SIM,TID,RUF) · `mypy --strict` with **0
`type: ignore`** · gated integration tests behind `RUN_INTEGRATION=1`.

## 3. Known environment limitations and problems

### 3.1 The Windows/pnpm `next`-package corruption *(the #1 workstation hazard)*

- **Symptom:** `Cannot find module '…/node_modules/next/dist/bin/next'` — the `next` package directory exists
  but is empty. Recovery: **`pnpm install --force`**.
- **Root cause:** pnpm-on-Windows re-linking the large `next` package while another process touches the store —
  a build piped into a truncating filter (`| head` SIGPIPEs it), `pnpm add/remove` running near a build, or
  the dev server holding `.next` during a rebuild.
- **History:** **28 occurrences total, through FS15 (FS15 had none)** — 11 across FS1–FS5 (FS1 postmortem
  §3.5; FS2 report §6 defect 6; FS3 report §6.6 — once with **no pnpm operation adjacent at all**; FS4 report
  §6.7 — 3 more; FS5 report §6.6 — mid-`pnpm budget`), **0 in FS6**, **5 in FS7** (FS7_REPORT §12.1 — the
  count was corrected from 2 to 5 by a post-acceptance audit), **3 in FS8**, **0 in FS9**, **3 in FS10**,
  **0 in FS11**, **1 in FS12**, **4 in FS13**, **1 in FS14** and **0 in FS15** — where the signature was
  confirmed by REPRODUCING the failure (`Cannot find module './impl'`) rather than inferred from an exit
  code, every time since FS13. Every occurrence since FS7 was auto-recovered by the habit below, which is why
  they nearly vanish from the transcript. **This is the terminal count for the implementation track** — any
  future occurrence belongs to whatever new stage or Runtime Verification session encounters it.
  Treat it as *frequent*, not exotic. **FS10 added one sharp edge:** the recovery chain must be **UNPIPED** —
  `pnpm build | tail` makes the pipeline's exit status `tail`'s, so `|| (pnpm install --force && pnpm build)`
  never fires and the failure looks like a build error rather than the known corruption.
  The hazard is broader than "installs near builds": treat **any** unexplained
  `Cannot find module …next…` build failure as this problem first (an auto-recovery pattern —
  `pnpm build || (pnpm install --force && pnpm build)` — is now the working habit), and re-verify suspicious
  build numbers on a clean `.next` after recovery.
- **Prevention (the safe order — PART3 §7.4):**
  1. **kill anything listening on port 3000** (see §3.1b) — nothing may hold `.next`;
  2. `pnpm install / add / remove` — never during a build;
  3. `pnpm build` — **never piped into `head` or any truncating filter** (`tail` is safe);
  4. `pnpm start` in background → `pnpm e2e`;
  5. stop the server before the next build.
- This is a workstation hazard, not a product defect. **CI (Linux, frozen lockfile) is the authoritative
  environment** — once it runs (FE-RV-4).

### 3.1b The stale Playwright `webServer` hazard (**new in FS7 — cost 108 phantom failures**)

- **Symptom:** an entire E2E matrix fails at sign-in; the app renders but does not hydrate (form submits
  natively, the URL fills with `?email=…&password=…`). No server error, no console error.
- **Root cause:** Playwright's `webServer` process can SURVIVE its run on Windows. The next chain rebuilds
  `.next` under it; `reuseExistingServer: !CI` then re-attaches to the stale server, whose in-memory
  manifest points at chunk hashes that no longer exist on disk → zero client JS → zero hydration.
- **Fix / prevention:** before any build or E2E, kill the port:
  `netstat -ano | grep ":3000" | grep LISTEN | awk '{print $NF}' | sort -u | xargs -r -I{} taskkill //PID {} //F //T`
- **Diagnostic tell:** hydration-shaped failures across EVERY spec (including specs untouched by the
  stage) point at the environment, not the code. Verify by loading the built app in a browser and checking
  whether a service worker is controlling a stale page before touching any source file.

### 3.2 Toolchain-pinning rule *(learned from a real build breakage)*

Pin toolchain families together and **never float a package that ships a native binary**.
`resolution-mode=highest` in `.npmrc` floated `@tailwindcss/oxide` ahead of the JS plugin and broke the build
(`Missing field 'negated' on ScannerOptions.sources`). The hint was removed; the Tailwind family is pinned to
4.3.3 as a unit.

### 3.3 What this environment cannot execute (and therefore never claims)

| Limitation | Consequence | Register |
|---|---|---|
| No Docker engine exercised | frontend image build/healthcheck unproven; backend image/compose/caddy unproven | FE-RV-3 · RV-1…RV-3 |
| CI (GitHub Actions) never executed | "gates pass" currently means "on one workstation"; workflows are authored only | FE-RV-4 · RV-18 (CI part) |
| No live PostgreSQL / Redis | migrations, repositories, queue, scheduler, API readiness unproven at runtime | RV-4…RV-9 |
| No live LLM / Telegram / image APIs; `aiogram`/`aiohttp`/`anthropic`/`openai` declared but **not installed** | provider adapters and everything inheriting them unproven | RV-10…RV-17 |
| Chromatic needs a `CHROMATIC_PROJECT_TOKEN` (account credential unavailable here) | visual baseline not uploaded; the build that feeds it **is** green | FE-RV-6 |
| The 6 skipped backend tests need live services (`RUN_INTEGRATION=1`) | intentionally not counted as passing | — |

### 3.4 Other recorded quirks

- Per-route First Load JS is **machine-checked** since FS3 (`scripts/check-route-budget.mjs`, `pnpm
  budget`); both numbers (Next's table + the per-route chunk union) land in `.next/route-budget.json`.
- `size-limit` (**777 KB** since the FS13 acceptance — the ninth measured re-baseline, earned by
  `FS13_REPORT_SIZE_ADDENDUM.md`; **UNCHANGED through the FS14 acceptance**, the first stage since FS5 whose
  measurement needed no ruling at all) is an **architectural-regression detector**,
  *not* the UX budget; the authoritative budget is per-route First Load JS ≤ 180 KB (PART2 §5.3 —
  reaffirmed non-revisable at FS6 through FS14; measured **766.23 kB at the FS14 acceptance**, headroom
  10.77 kB). Do not "fix" the aggregate by un-splitting code. The detector deliberately COUNTS the
  local/ci-only msw worker chunk (owner's decision — strict control over a smaller number). **63.6%** of the
  measured aggregate is lazy chunks that never enter any First Load (**FS14 measurement: 279.26 kB eager /
  486.97 kB lazy**, essentially unchanged from FS13's 63.5%).
- **Commons bytes are the scarcest resource, and rounding is not causation.** `/chat` sits at **180/180**
  — **ZERO headroom since FS12** (it was 179 from FS7 through FS8, 178 at FS9, and 179 from FS10 to FS11).
  FS7 showed byte-level commons additions plus webpack re-partition can move a route's rounded First Load
  by 1 kB with zero edits to its files. **FS8 measured the same movement precisely and proved the cause is
  NOT stage code**: the T-FS8.1 registry split really moved `/chat` 179 → 178, and the return to 179 came
  from webpack's shared-graph re-partition + Next's rounding while the true chunk union *fell* 175.10 →
  174.74 kB — no FS8 string exists in any of the route's 16 First Load chunks. **FS9 repeated the lesson in
  the other direction:** `/chat` *fell* to 178 and `/memory` *rose* to 149 (stubs 106 → 107) with zero FS9
  markers in those routes' First Load chunks, and a **control build** proved the memory movement was not the
  stage's single byte-level addition. **FS10 repeated it a third time** (`/chat` 178 → 179, zero FS10
  markers in the route's 16 First Load chunks, a control build still reporting 179). **FS11 produced the
  strongest instance:** `/dashboard` 167 → 168, `/knowledge` 175 → 176, `/studio` 164 → 165 and commons
  106 → 107, with zero FS11 markers across all 59 First Load chunks of those routes, every pre-existing
  chunk byte-identical, and a control build that reverted the new route to a stub returning **every**
  protected route to its exact baseline. **FS14 produced the cleanest instance of REFUSAL rather than
  rounding:** a client observability sink moved `/billing`, `/dashboard` and `/jobs` 1 kB each in TWO
  independent placements, and both times a control build (the sink removed) returned a byte-identical
  runtime chunk — so the pre-declared fallback (server-only) executed and **every** protected route ended
  the stage at its exact FS13 baseline, the first stage since FS8 to hold every number without a single
  accepted deviation. **Diagnose budget movements from `app-build-manifest.json`, and
  prove a contested one with a control build — never from a plausible story.** Any stage touching `shared/` must re-measure `/chat` and be ready to offload
  structurally (entity-local paths → entity-local KEYS, lazy inspector rows, registry splits — the
  FS7/FS8/FS9/FS10 precedents; the registry lever is spent, the keys mechanism is the current default).
- **A route's First Load can move with its chunk SET unchanged (FS10).** The first FS10 build broke the
  budget at `/chat` 182 kB and lifted every route ~3–4 kB while each route's chunk list stayed name-for-name
  identical — the growth lived in the **webpack runtime's chunk-id map**, roughly doubled because the stage
  became the **first product consumer** of `shared/ui`'s CodeBlock and made Shiki's per-grammar chunk graph
  reachable from the app entry. Before consuming a heavy `shared/ui` module for the first time, check
  whether it is currently unreferenced and measure the runtime chunk before/after; fix structurally, never
  by threshold.
- The FS1/FS2 mock session cookie was deleted in FS4 under the triple kill-switch; auth AND data stand-ins
  are impossible in staging/production builds (env refusal · module-scope throw · grep tests).
- jsdom gaps are stubbed centrally in `tests/setup/vitest.setup.ts` (ResizeObserver, scrollIntoView,
  pointer-capture, `matchMedia` since FS5, **`Blob.stream/arrayBuffer/text` since FS7**) — guarded so a
  future jsdom wins. Without the Blob trio, undici hangs forever serializing a multipart body (FS7 §6.4);
  the companion rule: read fixture request bodies DIRECTLY (never `clone()`) on paths the resolver always
  answers, and duck-type parsed `File`s (undici `File` ≠ jsdom `File`).
- Backend `.venv` runs Python 3.14.6 while prod targets 3.13-slim — the version floor is an owner decision
  (never change the Python version).

## 4. Backlog after FS15 *(updated at FS15 acceptance, 2026-08-07 — the terminal update of the
implementation track; any future entry belongs to a new stage or a Runtime Verification session)*

**Closed by FS15:** two `FS1_POSTMORTEM.md` §7 checklist items, executable for the first time because the
surfaces they check did not exist before FS5/FS11 — **no secrets in the client bundle** (a new one-off script,
its first run correctly caught and triaged a false positive in Next's own vendored code) and **gated-data
honesty** (one cross-cutting test replacing what nine per-stage proofs established piecemeal) · a real,
source-verified **CI E2E-matrix gap** (one of three shipped Playwright projects was actually running; now all
three are) · the **environment ceiling itself made explicit**: no Docker engine, no CI runner, no live backend
exist here, verified directly rather than assumed, and every downstream FE-RV item now carries an exact
Runbook procedure instead of an open-ended "needs infra" note. **NOT closed by FS15, and explicitly reported as
such:** FE-RV-3 (Docker), FE-RV-4 (CI execution), FE-RV-17 (CSP enforcement) — none can be closed without the
infrastructure this environment does not have, and the owner's binding requirements forbade closing them from
assumption. **R1/R1b/R1c/R1i/R1f/R1g/R1h/R1j (§4.1 below) are frozen at their FS14 values** — FS15 shipped no
`src/` module, so none of them could move, and none did; they are now the terminal reference for any future
frontend work, not an active risk this stage carried.
**Closed by FS14:** FS13's **R1/R1b** are superseded by the FS14 numbers below — **every protected route
ended the stage at its exact FS13 baseline**, the first stage since FS8 with zero accepted deviations ·
**R1c is discharged a fourth time, by RE-CONFIRMED refusal** — `shared/ui/data-table` and `shared/ui/code-block`
still have zero real import statements (a comment is the only textual match, same false positive FS13
found) · **R1i is not discharged but PROVEN MANAGEABLE**: FS14 traced its one new cross-cutting candidate
(observability) to its commons-bound consumers *before* writing code, refused to promise zero commons for
it, built a measured gate with a pre-declared fallback ladder instead, and the fallback fired cleanly — R1i
stays open as a standing fact about FSD, but the working method for living with it is now proven twice ·
**FE-RV-5 CLOSED** (the font pin) · **FE-RV-17 OPENED** (CSP enforcement + client telemetry on real
infrastructure) · a **NEW discipline proven**: a test failure can be diagnosed with the same control-build
method as a bundle movement (three controls excluded every FS14 file with global reach before a DOM probe
found a pre-existing race) · the question "can a stage decline a component after building and measuring it"
is answered for the first time — FS14 built the observability client sink, measured it twice, and shipped
neither shape.
**Closed by FS13:** FS12's **R1/R1b** are superseded by the FS13 numbers below · **R1c is discharged a third
time, this time by ADOPTION** — `shared/ui/switch` and `shared/ui/avatar` were in no bundle, the probe moved
the runtime chunk 2894 → **2893** gz (raw identical), and both were taken · **R1f is discharged again by
avoidance** — no existing barrel was extended, and the sharpest case was handled deliberately:
`entities/session` is in **every** route's First Load via `AuthProvider`, so the profile projection went to
widget level instead · the question "can a stage add zero commons ROWS?" is answered a fifth time, and
FS13 answered a harder one: **can a stage declare no key, path or fetcher at all?** (yes) · **a NEW risk
replaces them: R1i below** — FSD placement can force a commons byte no plan can avoid.
**Closed by FS12:** FS11's **R1/R1b** are superseded by the FS12 numbers below · **R1c is discharged a
second time, and this time by REFUSAL** — `shared/ui/data-table` was measured as a first consumer, moved a
protected route, and was dropped (TanStack Table still reaches no bundle) · **R1f is discharged** — FS12
extended no existing barrel: the queue got its own slice and the six Inspector rows became one lazy chunk ·
the question "can a stage add zero commons rows for a fourth time?" is answered again (entity-local keys,
plus reusing the already-paid-for `queryKeys.health()` row).
**Closed by FS11:** FS10's **R1/R1b** are superseded by the FS11 numbers below · **R1c is discharged by
measurement** — becoming the visx family's second consumer moved the webpack runtime chunk only 2.58 → 2.70 kB
· the question "can a stage add zero commons rows for a third time?" is answered again (entity-local keys) ·
the D2 §14 AI component set has no data-starved member left that a contract endpoint could feed.
**Closed by FS10:** FS9's R2 in its "one mapper line" sense stays open (FE-RV-12), but FS9's **R1/R1b** are
superseded by the FS10 numbers below · the question "can a stage add zero commons bytes without a lever?" is
answered a second time (entity-local keys again, **+0.70 kB** eager) · **PromptCard is no longer
data-starved** — it renders real version chains, and the owner-approved MINOR made that possible without
fabrication · the ONYX library now has **no data-starved AI component left from D2 §14** except those whose
backing endpoints do not exist (ToolCall, and the retrieval-score half of KnowledgeCard).
**Closed by FS9:** FS8's R2 in its actor part (references are wired — actors are no longer read-only) ·
FS8's R5 (the "actors are read-only until FS9" note is retired exactly where the contract allows) · the
zero-commons question for a stage with no offload lever (answered structurally by entity-local query keys)
· ImageResult/VerificationBadge are no longer data-starved (they render real records and real §R6.4
metrics). **Closed by FS8:** FS7's R2-adjacent palette question (the `#` memory scope is real, and Knowledge/Memory
stay separate groups) · FS6's R6 in its memory part (**MemoryCard** is no longer data-starved — it renders
real persona provenance) · the "commons offload" idea proved and spent (T-FS8.1 measurably moved /chat and
/knowledge). **Closed by FS7:** FS6's R2 (the /chat headroom question) · FS6's R6 in its knowledge part ·
the palette `#` seam · the FS5-era hard-navigation fixture race (boot-gate). **Closed by FS6:** FS5's R9 in
its FS6 part. **Closed by FS5:** FS4's R3 · FS2 R6/R8. **Closed by FS4:** the mock-auth debt. **Closed by
FS3:** FS2's R1/R2/R3.

### 4.1 Frontend — risk register, now TERMINAL (frozen at their FS14 values; FS15 shipped zero `src/`
modules and moved none of them — this is the reference state for whatever frontend work the owner authorizes
next, not an active carry-forward list)

| # | Risk | Mitigation owner |
|---|---|---|
| **R1** | **/chat First Load headroom is ZERO** (180/180) and **the commons-offload lever is still spent**. FS14 proved the number can hold under real pressure — a client sink was built, measured, and refused rather than paid for. **FS15 held it unconditionally, by shipping no `src/` module at all** — the strongest possible proof, since there was nothing that could have moved it. This remains the single most binding number in the project: one commons byte fails `pnpm budget` | Any future frontend stage's plan must add ZERO commons bytes — not as a target but as a wall. Entity-local keys are mandatory (or, as FS13/FS14 proved possible, no key at all); the FS12/FS13/FS14 levers (mutation hooks inside lazy components, dialogs behind `dynamic()`, static markup in the RSC page, N lazy rows consolidated into ONE chunk, reusing a component's own router instead of a fresh `next/link`) are the proven toolkit when a route goes over; `pnpm budget` is the hard backstop; the 180 budget is non-revisable |
| **R1i** | **FSD placement can force a commons byte that no plan can design away (FS13).** State consulted inside one of the frozen seven providers cannot have its read side in a feature. FS13's toast-mute read side therefore lives in `shared/`, and it moved `/audit` 174→**175** and `/providers` 153→**154** — accepted as measured. **FS14 traced this risk for a NEW candidate (observability) before writing code**, refused to promise zero commons for it, and the measured gate found the SAME cost in two placements — the fallback shipped instead, so R1i stays open as a standing FSD fact but the coping method (trace first, measure in ≥2 shapes, pre-declare a fallback) is now proven twice | trace the CONSUMER of every new piece of state to its layer **before** promising where commons will not be touched; if the answer is a provider, budget for the byte and pre-declare a fallback, OR measure whether the fallback (removing the feature) is cheap enough to prefer, as FS14 did |
| **R1b** | **Rounding volatility is a recurring cost** — five stages in a row moved a protected route by ±1 kB with no code on it, and at FS12 it consumed the last of `/chat`'s headroom. **FS14 is the first stage since FS8 to end with EVERY protected route byte-identical to the prior acceptance** — no rounding movement occurred, because the one contested change (the observability sink) was refused rather than shipped | diagnose from `app-build-manifest.json`; prove a contested movement with a control build (FS9 once, FS10 twice, FS11 twice, FS14 twice — including the revert-the-route form) before writing a cause |
| **R1c** | ~~A first consumer of a heavy `shared/ui` module taxes every route~~ — **DISCHARGED FOUR TIMES**: at FS11 by measurement (visx, 2.58 → 2.70 kB), at FS12 **by refusal** (DataTable moved `/memory` up, so it was dropped), at FS13 **by adoption** (`switch`/`avatar` cost nothing), and at FS14 **by re-confirmed refusal** (the R1c re-scan found zero real imports of `data-table`/`code-block` — the only textual match is still FS12's own comment). `shared/ui/data-table` and `shared/ui/code-block` **still have zero product consumers** — the check applies again to whoever reaches for either | check whether the module is currently unreferenced and measure the runtime chunk before/after; fix structurally |
| **R1f** | ~~A `'use client'` module re-exported from a slice another screen imports enters that screen's First Load~~ — **DISCHARGED at FS12 by avoidance**: no existing barrel was extended. Note the sharper FS12 form — `entities/job` is in **every** route's First Load because FS5's `JobInspector` is a STATIC import in shell commons, so extending *that* barrel would have taxed all 31 routes. **FS14 added no barrel extension either** — its two Inspector edits (`TaskInspector`, `AuditInspector`) are already-lazy rows |
| **R1g** | **A `useMutation` hook in an EAGER view drags TanStack's mutation machinery + Next's `dynamic()` runtime into the route** (FS12: 8.5 kB; `/jobs` failed the budget at 183 kB) | move the hook into the lazy component that uses it; a per-row instance is also more accurate than one shared pending flag |
| **R1h** | **Every `dynamic()` anywhere adds an entry to the global webpack runtime chunk-id map, which lives in commons** (FS12: six Inspector rows rounded two protected routes up; **FS14 confirmed the SAME rule applies to a client sink's lazy transport, not just to `dynamic()` UI** — the runtime map moved regardless of which module triggered the extra entry) | consolidate the lazy rows of one screen family into ONE chunk; put new client modules in their own slice; byte-compare the consuming screen immediately |
| **R1j** | **A gate-passing lint fix can still fail the budget (FS14, NEW).** ESLint's `no-html-link-for-pages` correctly flagged two plain `<a>` seam anchors; converting them to `next/link` passed lint and cost `/jobs`/`/health` 4 kB each | measure a lint-suggested "fix" before accepting it near a protected route; a per-line suppression with the measurement as its written justification is legitimate when the alternative costs budget for no user-facing gain |
| R1d | **FE-RV-13 assumptions** — above all **whether `GET /prompts` returns every version row or only the newest per type**, the single fact that decides whether the list or the `/versions` call owns the chain | both sources are already wired; the grouping selector and `entities/prompt/{model,paths,keys}.ts` are the single adjustment points |
| R1e | **The PromptCard MINOR extension is now part of ONYX’s public API** (two additive optional props) | documented in the component, exercised by a story state and the library tests; any future caller may pass `active={null}` / omit `variablesCount` rather than fabricate |
| **R2** | **FE-RV-12 assumptions** — above all **whether any media URL exists** (the single switch that turns previews on, plus the SEC-5 `img-src` decision it implies — now doubly relevant since FS14's CSP `img-src` audit flagged it as the directive most likely to change), the §R6.4 report shape and the multipart reference transport | unknown report keys already render honestly by raw key; single adjustment points: `entities/image/{model,paths,keys}.ts`, `entities/location/*`, `entities/actor/paths.ts` + the upload transport; one live session closes FE-RV-7…12 together |
| R3 | **FE-RV-7/8/9/10/11/12/13/14/15/16 assumptions** (auth · data · AI wire · knowledge wire · memory wire · image wire · prompt wire · analytics wire · platform wire · account wire) | unchanged; single adjustment points per item (§6.2) |
| **R3a** | **FE-RV-17 (CSP enforcement + client telemetry) — OPENED at FS14, STILL OPEN after FS15.** Whether the enforced CSP survives real Caddy (nonce vs `unsafe-inline` cost), whether a report sink can be wired safely, whether client web-vitals can be mounted without editing the frozen provider tree. FS15 could not touch this — no Caddy, no staging exists here | `next.config.ts` (the header), `src/shared/lib/observability/*` (if D6 is revisited) and `src/app/api/telemetry/route.ts`; a live/staging session is the only way to answer any of it — procedure now in `PRODUCTION_READINESS_RUNBOOK.md` item 8 |
| R4 | Local-first thread limits (50 conversations / 200 messages, localStorage) are honest but real | stated in the UI; the ConversationRepository seam is the one-point upgrade when a backend API lands |
| R5 | The tone mechanism's `tertiary` allowance has needed **six** usage corrections (FS1/FS2/FS5 + FS6 pre-emptive; FS7 pre-empted again; **FS10 PromptCard; FS14 avatar-menu role label + palette placeholder**) | D4 §12/§13 candidate: define "decorative" (aria-hidden/duplicated info only) |
| R6 | E2E anchors on real copy; **five** Playwright pitfalls now recorded (substring `getByLabel`; transient-node replacement on stream done; **role+level near embedded markdown**; **`.first()` vs `display:none` panes on mobile**; **an axe scan run immediately after a client-navigation URL change can catch the page before it paints — wait for a real element, not the URL**, FS14) | chat.spec + knowledge.spec + shell.spec document them; role+name convention unchanged |
| R7 | First Load attribution shifted at FS3 (Next reports ~106–180 KB; total per-route union larger) | `.next/route-budget.json` records both numbers. **FS15 ran a LOCAL Lighthouse pass** (`scripts/lighthouse-local.mjs`) but that is a workstation measurement, not the staging field-metrics run this risk actually names — that run is `PRODUCTION_READINESS_RUNBOOK.md` item 9, still open |
| R8 | 54 story files still without a visual baseline (FE-RV-6) | `CHROMATIC_PROJECT_TOKEN` — config-only close |
| R9 | Visible honest seams awaiting future backend work: **retrieval preview / chunk inspection / retrieval scores** (FS7) · **the memory influence trace, Global scope and pin/exclude** (FS8) · chat knowledge-attach and in-thread citations (deferred at FS7 for the /chat budget) · tool-call cards · anomaly flags · **a per-post validation-result read and a post↔image link, both needed for D1 §7.2's single Review surface** (FS14) | never silently "done"; each would be optional backend MINOR work, and Citation/KnowledgeCard/MemoryCard already accept real data without rework |
| R10 | Ingest truth on live infra (long ingests, 429s, status vocabulary) may differ from the poll-based stand-in | polling lives in the entity hook; wire truth decides; FE-RV-10 |
| R11 | ~~Actors are read-only until FS9~~ — **CLOSED at FS9**: `POST /actors/{id}/references` is wired over the FS7 multipart seam with no invented progress | — |
| R13 | **The Image Studio shows no pixels** until the contract carries a media URL — a reviewer may read that as incompleteness | the honesty surface states the reason exactly where a preview would appear, on every viewport; one mapper line enables previews the day FE-RV-12 answers |
| R14 | The shared ONYX `FileUpload` module now has **two lazy owners** (knowledge add-source, studio references) | verified absent from every First Load at FS9; if webpack ever hoists it, the fix is a `dynamic()` boundary inside the studio dialog |
| R12 | A persona `PATCH` conflict (§R4.2 409) is real and easy to mishandle in later forms | the FS8 pattern is the precedent: confirmed mutation + honest "changed elsewhere" state + a reload affordance, MSW-tested |
| **R15** | **`/api/telemetry` has no client caller, by owner ruling (FS14, NEW).** The route exists, is tested, and is correct — but nothing in the shipped client calls it. A future contributor could read this as an oversight | it is a STANDING DECISION (PART1 rule 78/24), not a gap — re-adding a client caller requires a fresh measurement against the current `/chat` headroom and, given the ruling, an explicit new owner decision, not a unilateral "finish" |
| **R16** | **Non-Latin channel content renders in a fallback font face since the FS14 font pin (D7-A).** `next/font/local` cannot express the `unicode-range` subsetting the prior Google-hosted stylesheet used, so Cyrillic/Greek/Vietnamese/latin-ext content falls back to the system stack | reversible in one file (`shared/config/fonts.ts`); revisit if a channel operating in a non-Latin script becomes a real scenario |

### 4.2 Frontend — other open items

- **FE-RV-3/4/6/7/8/9/10/11/12/13/14/15/16/17 open** (see §6.2) — **every one has an exact procedure in
  `webplatform/frontend/PRODUCTION_READINESS_RUNBOOK.md`, none has been executed**. **FE-RV-5 CLOSED at
  FS14. No FE-RV closed at FS15** — FE-RV-3/4/17 explicitly cannot be, in an environment with no
  Docker/CI/live backend (verified directly).
- **Slices, terminal count (24 features / 20 entities — FS13, FS14 AND FS15 each created NO entity):**
  `features/{auth,review-post,send-message,insert-to-channel,add-source,ask-document,edit-persona,
  explain-style,regenerate-image,upload-references,explain-verification,manage-prompt,test-prompt,
  filter-analytics,export-analytics,explain-metrics,manage-users,rollback-config,requeue-job,export-audit,
  rotate-key,explain-job,change-settings,explain-activity}`,
  `entities/{session,channel,analytics,analytics-report,job,post,conversation,document,persona,actor,
  image,location,prompt,platform-user,config-version,audit,job-queue,probe,api-key,cost-report}`.
  *(assumed)* endpoints must be confirmed against `API_SPEC.md` when first wired (the FS5–FS12 waves were
  confirmed at their contract gates; **FS13, FS14 and FS15 each wired no new `/api/v1` endpoint at all** —
  `/api/telemetry` is a first-party console route, not a contract endpoint, and FS15 wired no route of any
  kind). **This is the terminal slice count of the implementation track.**
- **Still declared-but-not-installed** (would arrive with a stage that needs them, none currently scheduled):
  `date-fns`, Chromatic. *(Installed at FS3: visx 4.0.0, TanStack Table/Virtual, react-markdown + remark-gfm
  + rehype-sanitize, shiki, 10 Radix packages, axe-core. At FS4: react-hook-form 7.54.2. FS5–FS15 added
  NOTHING to `console/package.json`.)*
- **All frontend work is uncommitted** (see §9) — a standing operational risk until the owner instructs a
  commit. This did not change at FS15.

### 4.3 Backend — deferred backlog (from `TECHNICAL_BACKLOG.md`; all Deferred, none blocking)

- **Deferred improvements:** DI-1 (`__all__` for public module APIs) · DI-2 (single source for Appendix-B
  defaults) · DI-3 (remove the `storage_dir.mkdir` side-effect from config load).
- **Future architecture work:** FA-1 (DB channel-override config layer, §R3.4) · FA-3 (platform vs per-channel
  bot-token priority rule) · FA-4 (structured JSON logger + secret masking, §R12.9). *(FA-2 and FA-5 were
  implemented in code at Stages 11/5.)*
- **ADR candidates:** ADR-C1 (Python 3.13 vs 3.14 floor — conditional) · ADR-C3 = ADR-001 (MTProto) ·
  ADR-C4 = ADR-002 (deployment target) — owner decisions, defaults active (§7.2).
- **Operational risks still open:** OR-4 (`postgresql+asyncpg` scheme validator) · OR-5 (`get_settings()`
  cache fixes config at runtime). OR-1/2/3 addressed or mitigated at Stage 3.
- **Testing gaps:** TG-1…TG-6 (small coverage follow-ups, P2–P3).
- **Runtime verification:** RV-1…RV-18 (§6.1) — the agenda of the Production Readiness Review.
- **Optional analytics computation** §R11.4–R11.8 (bandit / experiments / report / forecast) — deferred by
  design; a future decision, not debt.

## 5. Current freeze status *(all four freezes ACTIVE and intact after FS2)*

| Freeze | Scope | Verified intact by | Legal change path |
|---|---|---|---|
| **Architecture Freeze (backend)** | the frozen backend architecture, since backend Stage 2 | FS1/FS2 reports §freeze-compliance: no `app/` file read-for-import or modified | new ADR |
| **Production Code Freeze (backend)** | `app/`, public Protocols, business logic, layering, 25-table meaning | same; gate unchanged (466 passed / 6 skipped, mypy 385 files) | MAJOR + ADR |
| **Design Freeze — ONYX v1.0** | token values, component contracts, 12-status vocabulary, screen spec, UI contract | FS1–FS15: **zero token-value changes** (six contrast fixes were *usage* changes; FS14's avatar-menu label + palette placeholder were the sixth; FS15 touched no `shared/ui` file, so the count stays at six — the terminal count). **One component-contract change exists:** FS10's PromptCard MINOR (two additive optional props), owner-approved in advance under D4 §13 because the alternative was fabricating data; every existing call site renders byte-identically. Aurora AI-only throughout | D4 §12 versioning + §13 evolution only |
| **Frontend Architecture Freeze v1.0** | FRONTEND_MASTER_SPEC, D1–D4, Stage 2, Stage 3, FSD layers, FE-ADR-1…11 | FS15 acceptance — **the terminal check of the implementation track**: 0 boundary violations (**609 modules, 1578 deps**, byte-identical to FS14 since FS15 shipped no `src/` module), incl. no cross-entity import between `analytics`, `analytics-report`, `prompt`, `image`, `location`, `actor`, `persona` and `document`; provider tree order unchanged (the FS14 root error boundary sits outside the seven-provider tree by design); the six state owners respected **and test-enforced** (no state in Query *and* Zustand — FS8 §3.4, re-locked at FS9–FS15; telemetry is owned by NEITHER, asserted by a source-level test); no ADR created; no dependency added at FS14 or FS15 | MAJOR + ADR |

## 6. Runtime Verification registers *(complete, both tracks)*

### 6.1 Backend — RV-1…RV-18 (all OPEN; source: `RUNTIME_VERIFICATION_REGISTRY.md`)

Implemented + Statically Verified; each needs live services/tooling to become Runtime Verified. **Not defects;
not counted as done.** The agenda of the Production Readiness Review.

| RV | Area | Requires | Origin stage |
|---|---|---|---|
| RV-1 | `docker build` + full-stack install (asyncpg/pgvector/aiogram/anthropic/openai/pillow) on `python:3.13-slim` | Docker | 3/4/16 |
| RV-2 | `docker compose config`, `caddy validate`, infra up, healthcheck transitions, `python -m app doctor` in container | Docker | 3 |
| RV-3 | §R12.3–R12.5 / §R4.1 runtime (pgvector/pg_trgm, least-exposure, non-root) | Docker | 3 |
| RV-4 | `alembic upgrade head` on live PostgreSQL (extensions/enums/25 tables/indexes) | PostgreSQL | 4 |
| RV-5 | Real repository CRUD + pgvector/HNSW/partial-unique/optimistic-lock | PostgreSQL | 4 |
| RV-6 | Redis runtime: SET/GET/EXPIRE/EVAL(Lua)/SUBSCRIBE, token-bucket atomicity, lock safe-release, pub/sub | Redis | 5 |
| RV-7 | Queue runtime: `FOR UPDATE SKIP LOCKED`, status persistence, enqueue/dequeue, N-worker concurrency | PG + Redis | 8 |
| RV-8 | Scheduler runtime: advisory lock, materialization, slot idempotency, N-instance concurrency | PostgreSQL | 9 |
| RV-9 | API runtime: readiness to live PG/Redis, uvicorn serving, lifespan against real connections | PG + Redis | 10 |
| RV-10 | Real provider adapters (OpenAI/Anthropic/aiogram) + install/import on 3.14; retry/timeout/CB under load | external APIs | 12/15/16 |
| RV-11 | AI Engine against live LLMs (routing/fallback/streaming/cost/latency) | live LLMs | 12 |
| RV-12 | RAG against live pgvector + embeddings; keyword/hybrid(RRF)/reranking | PG + embeddings | 13 |
| RV-13 | Validation live LLM-judge + vector-stage dedup | LLM + embeddings | 14 |
| RV-14 | Image against live providers + identity-conditioning + CLIP/face validation | image APIs | 15 |
| RV-15 | Telegram against live Bot API/webhook/polling + distributed rate-limit + at-least-once | Bot API | 16 |
| RV-16 | Analytics telemetry export (OTel/Prometheus) / persistence / engagement / external backends | telemetry/DB | 17 |
| RV-17 | Admin Web UI (HTMX/HTTP) / browser / cookie session / CSRF over wire / hasher/MFA/SSO / persistence / queue actions | Web UI/DB/SSO | 18 |
| RV-18 | Test-infra runtime: performance/stress/chaos/mutation/Hypothesis/pytest-xdist/CI-CD/coverage-enforcement/real integration | tools/CI/services | 19 |

**Inheritance:** RV-11…RV-17 inherit RV-10; RV-16/RV-17 inherit RV-9; RV-17 inherits RV-7; RV-18 inherits
RV-4…RV-17. Closing the infra RVs (RV-1…RV-9) unlocks most of the rest.

### 6.2 Frontend — FE-RV register (as of FS15 acceptance — the terminal register of the implementation
track; every item's procedure is now in `webplatform/frontend/PRODUCTION_READINESS_RUNBOOK.md`)

| ID | Item | Status | Owner stage / remediation |
|---|---|---|---|
| FE-RV-1 | Storybook static build + visual baseline | ✅ **CLOSED in FS2** — builds on the Vite builder (38 s) | — |
| FE-RV-2 | Full Playwright matrix (desktop-light, mobile) | ✅ **CLOSED in FS2** — all three projects executed (35 passed) | — |
| FE-RV-3 | Docker image build + container healthcheck | ⏳ open — **FS15 verified `docker` is absent from this environment and could not execute this**; `Dockerfile` authored (multi-stage, non-root, standalone, healthcheck), and a Compose overlay (`webplatform/docker-compose.console.yml`) now wires it into the deployment topology, itself unvalidated by a real `docker compose config` | Runbook item 1 — a real Docker engine, wherever the owner next has one |
| FE-RV-4 | CI pipeline execution (GitHub Actions) | ⏳ open — **FS15 verified `gh`/`act` are absent from this environment and could not execute this**; ten-gate workflow authored (build step is now `pnpm budget`) and its one real gap (E2E ran one of three projects) was fixed and verified locally, but the workflow itself has never run on a real GitHub Actions runner | Runbook item 2 — first PR / CI availability |
| FE-RV-5 | `next/font/local` binary pin | ✅ **CLOSED in FS14** — the two latin `.woff2` binaries are committed under `console/public/fonts/`, `shared/config/fonts.ts` uses `next/font/local`, the build needs no network. Narrowing recorded: only the LATIN subsets carried over (the prior Google stylesheet's Cyrillic/Greek/Vietnamese/latin-ext faces have no `next/font/local` equivalent), reversible in one file | — |
| FE-RV-6 | Chromatic visual baseline upload | ⏳ open — needs `CHROMATIC_PROJECT_TOKEN`; the full-library Storybook build (54 story files) is green; **the debt is now at its largest** (owner re-confirmed open at FS3 acceptance) | credential-only; closes without code changes |
| **FE-RV-17** | **CSP enforcement + client telemetry on real infrastructure** (FS14; registered per plan §5.3, opened at acceptance) | ⏳ open — needs the live/staging backend: whether the enforced CSP survives a real browser behind Caddy, above all whether Next's inline bootstrap needs `'unsafe-inline'` or a nonce and **what a nonce costs in rendering mode** (it forces dynamic rendering on routes that are currently static) · whether `report-to`/`report-uri` reaches a first-party sink through the proxy, and what scrubbing a CSP report body would require before it could be accepted (a CSP report can carry a pathname, which the telemetry allowlist is deliberately built to exclude) · whether `/api/telemetry` survives the deployment's routing and rate limits · what `img-src` must become the day FE-RV-12 answers whether a media URL exists · **whether client web-vitals can be mounted at all without editing `app/layout.tsx` or `app/providers.tsx`**, both in the FS3.3 no-touch set every stage since FS7 has protected. **The observability client sink itself is NOT part of this RV** — the owner ruled at the FS14 acceptance that it stays server-only; this RV is about the infrastructure question, not about whether to add a client caller | **Single adjustment points:** `next.config.ts` (the header), `src/shared/lib/observability/*` (only if the owner reopens D6), `src/app/api/telemetry/route.ts` |
| **FE-RV-7** | **Live auth round-trip** (FS4; owner accepted as RV, not a defect) | ⛔ BLOCKED — undelivered backend dependency (`/api/v1` route not implemented); needs the live backend: real `SESSION_COOKIE_NAME` + cookie flags/SameSite behind Caddy · `/auth/me` wire field casing (`mapAuthMe` is the single adjustment point) · real 401/429 + Retry-After · CSRF posture for `/api/v1` (§Auth defines none; an `apiFetch` header seam is reserved) · `Secure` over HTTPS | first live-backend session closes most of it; each assumption has one adjustment point |
| **FE-RV-8** | **Live `/api/v1` data round-trip** (FS5; registered per plan §5.2) | ⛔ BLOCKED — undelivered backend dependency (`/api/v1` route not implemented); needs the live backend: field casing of the FS5 wire mirrors in `shared/types/dto.ts` (snake_case *(assumed)*) · "Cost today"/"Published today" derivations from the analytics snapshot · "Scheduled" = queued `publish` tasks with `run_at` *(assumed)* · activity-from-tasks (no dedicated activity endpoint in the contract) · real 202 task follow-up semantics · availability-flag wire shape | `entities/*/model.ts` mappers are the single adjustment points; the same first live session closes most of FE-RV-7+8 |
| **FE-RV-9** | **Live AI round-trip** (FS6; registered per plan §5.2) | ⛔ BLOCKED — undelivered backend dependency (`/api/v1` route not implemented); needs the live backend: `POST /studio/dry-run` wire shape (`StudioDryRunResponseWireDTO {output, model, cost_usd}` *(assumed)*) · upstream streaming capability (*(assumed absent)* — the verbatim relay forwards SSE byte-for-byte if it ever appears; one branch to adapt) · real cost field semantics · real 429/limits behaviour · `POST /channels/{id}/posts` request body (*(assumed)* `{title, body}`) | `ai-gateway/real.ts` + the dto mappers are the single adjustment points; exercised end-to-end via the kill-switched fixture gateway |
| **FE-RV-10** | **Live knowledge round-trip** (FS7; registered per plan §5.3) | ⛔ BLOCKED — undelivered backend dependency (`/api/v1` route not implemented); needs the live backend: document wire casing/fields · whether `GET /documents/{id}` carries the ingested text (the reader's honest fallback covers a metadata-only wire) · upload transport (multipart/form-data *(assumed)*) + the 201 body · ingest status vocabulary → the 12-status mapping (*(assumed)* §R4.11-like) · `GET /documents/{id}/versions` shape · `assign` response semantics · reindex 202 follow-up · list channel filtering (`?channel_id=` *(assumed)*; else client-side scoping over the assignment field) | `entities/document/model.ts` + `paths.ts` + the `add-source` transport are the single adjustment points; exercised end-to-end via the kill-switched fixture group |

| **FE-RV-11** | **Live memory round-trip** (FS8; registered per plan §5.3) | ⛔ BLOCKED — undelivered backend dependency (`/api/v1` route not implemented); needs the live backend: persona/actor wire casing and fields · **the `style_features` jsonb SHAPE** (key naming, units, nesting — unknown keys already degrade gracefully by raw key) · `PATCH /personas/{id}` accepted body and the real `version`/**409** semantics (§R4.2) · the `POST /personas/{id}/archive` response · whether the persona list filters archived rows server-side · `?status=published` ordering/pagination for content memory · whether actors expose reference counts | `entities/persona/{model,paths}.ts`, `entities/actor/{model,paths}.ts` and the edit-persona mutation body are the single adjustment points; exercised end-to-end via the kill-switched fixture group |

| **FE-RV-12** | **Live image round-trip** (FS9; registered per plan §5.3) | ⛔ BLOCKED — undelivered backend dependency (`/api/v1` route not implemented); needs the live backend: image wire casing/fields · **whether ANY media URL or signed link exists** (the single switch that turns previews on — plus the SEC-5 `img-src` CSP decision it implies; today `storage_path` is an object KEY and nothing is rendered as an image source) · the `GET /images/{id}/similarity` report shape (§R6.4 phash/scene/CLIP — unknown keys already degrade gracefully by raw name) · the `GET /images/{id}/history` shape (§R6.5) · `POST /images/{id}/regenerate` accepted body, its 202 payload and **the response when `IMAGE_MAX_REGEN` is exhausted** · `DELETE` semantics · **the `POST /actors/{id}/references` transport (multipart *(assumed)*), its response, and whether actors expose a reference count** · the locations list shape · list channel filtering/pagination · whether analyst/viewer may read images at all (the D7 RBAC PATCH) | `entities/image/{model,paths,keys}.ts`, `entities/location/{model,paths}.ts`, `entities/actor/paths.ts` and the `upload-references` transport are the single adjustment points; exercised end-to-end via the kill-switched fixture group |

| **FE-RV-13** | **Live prompt round-trip** (FS10; registered per plan §5.3) | ⛔ BLOCKED — undelivered backend dependency (`/api/v1` route not implemented); needs the live backend: prompt wire casing/fields · **whether `GET /prompts` returns every version row or only the newest per type** (the single fact that decides whether the list or the `/versions` call owns the chain — both are already wired) · whether `?type=` accepts the eight `prompt_type` values verbatim and how an unknown value behaves · the **`POST /prompts` accepted body** (`{type, text}` *(assumed)*), its 201 payload and **who assigns `version`** · the `GET /prompts/{id}/versions` shape and ordering · the semantics of the `model` and `result` columns on a stored row · whether the backend exposes **any** notion of an active/selected version (today it does not — if that ever changes, the FS10 §5.2 D2 seam becomes a real surface) · pagination on `/prompts` · whether analyst/viewer may read prompts at all (the D9 RBAC PATCH). **Single adjustment points:** `entities/prompt/{model,paths,keys}.ts` and the `useCreatePromptVersion` request body |

| **FE-RV-14** | **Live analytics round-trip** (FS11; registered per plan §5.3) | ⛔ BLOCKED — undelivered backend dependency (`/api/v1` route not implemented); needs the live backend: analytics/cost wire casing and fields · **whether `GET /analytics/channels/{id}` honours `?from=&to=` and what it returns for a range with no data** (the single fact that decides whether the range is server-side or a client-side window — and whether the wire's `cost_today`/`published_today` naming survives a ranged call) · the shapes of `/analytics/quality`, `/analytics/trends` and `/analytics/reports/{daily\|weekly\|monthly}`, and whether those three accept a range at all · the `/cost` response shape per `group_by` value and **whether the channel/model/provider facets are channel-scoped or platform-wide** · **whether `availability` is per-field, per-panel or engagement-only**, and whether an engagement field ever arrives `available` (i.e. whether ADR-001's MTProto adapter was introduced) · whether any response carries an **algorithm version or computed-at** (§R11.9) · pagination and result caps · whether analyst/viewer may really read every panel. **Single adjustment points:** `entities/analytics-report/{report-model,report-hooks,paths,keys}.ts` |

| **FE-RV-15** | **Live platform & admin round-trip** (FS12; registered per plan §5.3) | ⛔ BLOCKED — undelivered backend dependency (`/api/v1` route not implemented); needs the live backend: users/config-version/audit/tasks/api-keys/health wire casing and fields · whether `POST /users` is a create or an invitation and what it returns · whether `PATCH /users/{id}` accepts anything besides `role` (the `users` table has a `status` column but the contract documents no write for it) · the `POST /auth/sessions/revoke` response, and whether any session inventory ever appears · **whether `GET /config-versions` carries the `snapshot` payload — the single fact that decides whether the client diff is possible at all** · the rollback response · the `audit-log` shape, its pagination, and whether it accepts any filter beyond `entity`/`actor` · the tasks wire vocabulary end-to-end (**`pending` vs `queued`** — shared with FE-RV-8) and the 202 payloads of `cancel`/`run`/`requeue` · **what `GET /api-keys` returns when values are withheld** (slot names? providers? presence flags?) and the accepted `PUT` body · **the `/health/ready` payload shape — above all whether it enumerates providers by name**, the single switch that turns the Providers health panel from a seam into real data · whether `/cost` facets are platform-wide or channel-scoped when called without a channel (shared with FE-RV-14). **Single adjustment points:** `entities/{platform-user,config-version,audit,job-queue,probe,api-key,cost-report}/{model,paths,keys}.ts` plus the `manage-users` and `rotate-key` request bodies |

| **FE-RV-16** | **Live account round-trip** (FS13; registered per plan §5.3) | ⛔ BLOCKED — undelivered backend dependency (`/api/v1` route not implemented); needs the live backend: **whether `GET /auth/me` carries a stable user `id`** — the single fact that decides whether a personal activity feed is possible at all (without it the panel renders an honest absence and never widens to the platform log) · whether `/auth/me` carries anything beyond `{user, role}` (a display name? a status?) · **whether `mfa_enabled` is a real wire field or an FS4 assumption** — today it is indistinguishable from absent, which is why **no MFA state is rendered at all** · whether `GET /audit-log?actor=` accepts the caller's own id, how it paginates and whether it is ordered newest-first · whether the audit `action` vocabulary is stable enough to label (unknown actions already render by RAW name) · whether `POST /auth/sessions/revoke` may target the caller · whether the backend ever exposes MFA enrolment, a login journal or a session inventory (§R10.4 names all three; the contract exposes none) · whether a preferences resource ever appears. **Single adjustment points:** `widgets/profile/identity.ts`, the actor-scoped call in `widgets/profile/ActivityPanel.tsx`, and `features/change-settings/model/preferences.ts` — identity mapping stays where FS4 put it (`mapAuthMe`) and was NOT duplicated |

**No FE-RV exists for logs, feature flags or notifications** — nor for user preferences, account self-edit,
password change, MFA enrolment, avatar upload, session inventory, sign-in history, data export or SSO (FS13);
nor for a per-post validation-result read, a post↔image link, chunk-level retrieval or a memory influence
trace inside a journey (FS14). Those are **verified absences** in a frozen contract, not unverified
assumptions. `/logs`, `/flags` and `/notifications` state the fact on screen and a
negative-lock test protects it. Do not open an RV for them, and do not "finish" them without an endpoint.

**Discipline:** the register is burned down, not accumulated — FS2 closed two items and opened one narrower
one; FS14 closed one item (FE-RV-5) and opened one narrower one (FE-RV-17, scoped to infrastructure
enforcement, explicitly excluding the client-sink question the owner already ruled on). Deadlines attached
to items are honoured (FE-RV-1 was due "before FS3" and closed in FS2; FE-RV-5 carried no hard deadline but
closed at FS14, the stage the roadmap named for it). **FS15, the roadmap's own entry-duty stage for
FE-RV-3/4, closed NEITHER** — verified, not assumed, that this environment has no Docker engine and no CI
runner to close them with — and opened none either; what it added instead is
`PRODUCTION_READINESS_RUNBOOK.md`, converting every open item's "needs infra" note into an exact, numbered
procedure. **This is the terminal state of the register for the implementation track**: **ten** live items
(FE-RV-7/8/9/10/11/12/13/14/15/16) still share one closing event — the first session against a real backend
— and **FE-RV-3, FE-RV-4 and FE-RV-17** each need their own distinct infrastructure (a Docker engine, a CI
runner, a real deployment behind Caddy respectively) that a live-backend session alone would not supply.
**That "real backend" does not yet exist as working code, separately from infrastructure: `/api/v1` mounts
only `health.router`, auth is an unwired seam (`current_principal()` always returns `ANONYMOUS`), and only a
fake in-memory `FakeUserStore` exists — no route file implements any endpoint from `API_SPEC.md`'s Auth or
resource sections. All ten items (FE-RV-7…16) are therefore BLOCKED on an undelivered backend dependency,
not merely OPEN pending infrastructure — see the FE-RV-7 Blocker Report. No backend stage is authorized by
this note.**

## 7. Open ADRs *(owner decisions — never decided by the assistant)*

### 7.1 Frontend — ✅ **DECIDED by the owner 2026-07-29** (`webplatform/frontend/FE_ADR_DECISIONS.md`)

The Stage 2 §15 gating condition for FS3 is **satisfied**. Changing any of these now requires a new ADR.

| ADR | Owner's decision |
|---|---|
| **ADR-FE-1 Chart library** | **visx** approved; all heavy graphics modules load only via `dynamic()`; no alternatives without a new ADR |
| **ADR-FE-2 Styling depth** | current strategy **kept: Tailwind v4 + CSS Modules**; CSS-in-JS is not to be used |
| **ADR-FE-3 Observability** | implementation **deferred to FS14/FS15**; early stages keep only the provided architectural seams. **Executed at FS14** (Option A: a vendor-agnostic seam, server-side only, no SDK bound) — this executes the deferred option and does not amend the ADR-FE-3 decision itself; a vendor binding remains undecided and open to a future stage |

### 7.2 Backend — open with active defaults

| ADR | Question | Default in force |
|---|---|---|
| **ADR-001** | MTProto stats adapter (§R12.14) | *not introduced* |
| **ADR-002** | Deployment environment | *VM + Compose + Caddy* |

*(Conditional candidate: ADR-C1 — the Python 3.13/3.14 floor — raised only if the owner ever changes the
version, which is currently forbidden.)*

## 8. Readiness criteria — FS3…FS15

### 8.1 Universal Definition of Done (every FS stage; no exceptions)

1. An **approved plan existed before any code**; scope was not exceeded.
2. **All ten gates green, executed for real** (Stage 2 §14): ESLint · Prettier · `tsc` strict 0 errors /
   0 unjustified `any` · tests (unit/component/integration + E2E incl. all three Playwright projects) ·
   axe 0 violations · size-limit within the detector budget · **per-route First Load JS ≤ 180 KB** ·
   dependency-cruiser 0 violations · Storybook builds (+ Chromatic diff once FE-RV-6 closes) · contract types
   match `API_SPEC.md`. *A gate that ends RED is reported RED with the threshold untouched (FS7 precedent) —
   never "fixed" by moving the number.*
3. **No `app/` change · no ONYX token-value change · no SoT edit · no architecture change** (else MAJOR + ADR).
4. Anything unexecutable is honestly registered FE-RV; nothing fabricated.
5. `FS<N>_REPORT.md` written; living docs updated; **STOP for acceptance**.

Detailed per-stage acceptance criteria are fixed **in each stage's plan at plan time** (the plan-first
method); the per-screen source is D3 (17-field screen maps) + the D4 QA/handoff checklists. The table below
records the scope and the entry/exit conditions already established by the frozen documents.

### 8.2 Per-stage scope, entry conditions, exit criteria

| Stage | Scope (frozen roadmap) | Entry conditions | Stage-specific exit criteria (beyond §8.1) |
|---|---|---|---|
| **FS3** | ✅ **delivered & accepted 2026-07-29** — all exit criteria met (`FS3_REPORT.md`); visual debt FE-RV-6 explicitly accepted open | — | — |
| **FS4** | ✅ **delivered & accepted 2026-07-30** — all exit criteria met (`FS4_REPORT.md`); mock seam deleted under the triple kill-switch; FE-RV-7 opened and owner-accepted as RV | — | — |
| **FS5** | ✅ **delivered & accepted 2026-08-01** — all exit criteria met (`FS5_REPORT.md`); size-limit re-baselined to 485 kB at acceptance (§11); FE-RV-8 opened and owner-accepted as RV | — | — |
| **FS6** | ✅ **delivered & accepted 2026-08-01** — all exit criteria met (`FS6_REPORT.md` + the size addendum); size-limit re-baselined to 560 kB at acceptance (§11); FE-RV-9 opened and owner-accepted as RV; the six binding owner conditions (verbatim relay · one ConversationRepository · no invented AI fields · user-invoked summary · frozen arch/deps · lazy+№33) each test-locked | — | — |
| **FS7** | ✅ **delivered & accepted 2026-08-01** — all exit criteria met (`FS7_REPORT.md` + the size addendum); size-limit re-baselined to 598 kB at acceptance (§12); `/chat` reference fixed at 179 kB; FE-RV-10 opened and owner-accepted as RV; the plan's three owner-required tables (§3.1 rendering matrix · §3.2 invalidate graph · §3.3 no-touch guarantee) were each PROVED at acceptance | — | — |
| **FS8** | ✅ **delivered & accepted 2026-08-02** — all exit criteria met (`FS8_REPORT.md` + the size addendum); size-limit re-baselined to 628 kB at acceptance (§12) after a **full evidence pack**; `/chat` = 179 kB re-confirmed as the standing reference; FE-RV-11 opened and owner-accepted as RV; the plan's four owner-required sections (§3.4 ownership matrix · §3.5 navigation contract · §3.6 bundle ownership · §3.7 invariants I1–I8) were each PROVED at acceptance | — | — |
| **FS9** | ✅ **delivered & accepted 2026-08-02** — all exit criteria met (`FS9_REPORT.md` + the size addendum); size-limit re-baselined to 655 kB at acceptance (§12) after a **full evidence pack**; the I2 rounding deviation ruled resolved and the post-FS9 reference numbers fixed (`/chat` 178 · `/studio` 164 · `/memory` 149 · stubs 107); FE-RV-12 opened and owner-accepted as RV; the entry duty (the §R6.1 actor reference upload) delivered; T-FS9.1 established **entity-local query keys** as the zero-commons mechanism | — | — |
| **FS10** | ✅ **delivered & accepted 2026-08-03** — all exit criteria met (`FS10_REPORT.md` + the size addendum); size-limit re-baselined to 677 kB at acceptance (§12) after a **full evidence pack**; the I1 rounding deviation ruled resolved and the post-FS10 reference numbers fixed (`/chat` 179 · `/prompts` 150 · `/studio` 164 · `/memory` 149 · `/knowledge` 175 · `/dashboard` 167 · stubs 107); FE-RV-13 opened and owner-accepted as RV; the owner's requirements **A** (channel-free lock) and **B** (no cross-scope ownership) were each PROVED; the D6 PromptCard MINOR was approved in advance and is the only ONYX component-API change in the project | — | — |
| **FS11** | ✅ **delivered & accepted 2026-08-03** — all exit criteria met (`FS11_REPORT.md` + the size addendum); size-limit re-baselined to **696 kB** at acceptance (§12) after a **full evidence pack**; the I2 re-partition deviation ruled resolved and the post-FS11 reference numbers fixed (`/chat` 179 · `/knowledge` 176 · `/dashboard` 168 · `/studio` 165 · `/prompts` 150 · `/memory` 149 · `/analytics` **148** · stubs 107 · commons 107); FE-RV-14 opened and owner-accepted as RV; the owner's five approval requirements (primary protected route checked twice · mandatory entity-local keys · measurement-not-hypothesis · lazy-first charts · rule №33 exactly) were each honoured; **no RBAC PATCH was needed** — a first since FS6 | — | — |
| **FS12** | ✅ **delivered & accepted 2026-08-04** — all exit criteria met (`FS12_REPORT.md` + the size addendum); size-limit re-baselined to **756 kB** at acceptance (§10) and the Prettier failure on a pre-existing FS11 file ruled a **legacy carry-over** (formatting-only, proved); invariants **I1 and I2 reported MISSED by 1 kB each** (`/chat` 179 → **180 — ZERO headroom**, `/memory` 149 → **150**) with **two control builds** attached, and acceptance did not re-word them; the owner's five approval requirements each honoured — T-FS12.1 as a mandatory gateway that **refused** `shared/ui/data-table` on measurement, `entities/job-queue` isolated, queue keys rooted away from `['jobs']`, every movement explained by measurement, rule №33 exactly; FE-RV-15 opened and owner-accepted as RV; **three routes delivered as verified ABSENCES** with a negative-lock test | — | — |
| **FS13** | ✅ **delivered & accepted 2026-08-05** — all exit criteria met (`FS13_REPORT.md` + the size addendum); size-limit re-baselined to **777 kB** at acceptance (§9) and **Prettier was clean with no legacy carry-over**; invariant **I2 reported MISSED on `/audit` 174→175 and `/providers` 153→154**, isolated by **control build C** and shown inherent by **build D**, and the owner accepted it exactly as measured while forbidding any re-wording; the owner's five approval rulings each honoured (D4-A cross-link · D5-B with `danger` immutable · D6 consumed-or-not-shipped · D9 no new Inspector row or palette group · D10 `⌘,` as a measured gate); FE-RV-16 opened; **no entity slice, no query key, no endpoint path and no fetcher declared — a first** | — | — |
| **FS14** | **Integration & Polish** | ✅ **delivered & accepted 2026-08-06** — all exit criteria met (`FS14_REPORT.md` + the size addendum); size-limit **UNCHANGED at 777 kB at acceptance (§11)** — measured 766.23 kB, the first stage since FS5 needing no re-baseline ruling; **Prettier RED on one pre-existing file, `.size-limit.json`, ruled a legacy carry-over per the FS12 precedent** (file not modified); every invariant HELD — no deviation, the first time since FS8; five D3 Part C journeys proved green E2E (32 passed / 1 mobile skip); the observability vendor decision executed (ADR-FE-3 §7.1, Option A, server-only after the client half was measured and refused — **owner ruling: stays that way, no client caller to be added**); FE-RV-5 closed; FE-RV-17 opened; CSP promotion package authored and left disabled; the D9/D10/D13 rulings each honoured; **no entity slice, no query key, no endpoint path and no fetcher declared — the second stage in a row** | — | — |
| **FS15** | **Production Readiness — THE TERMINAL STAGE** | ✅ **delivered & accepted 2026-08-07** — all exit criteria met (`FS15_REPORT.md` + the size addendum); size-limit **UNCHANGED at 777 kB at acceptance (§11)** — re-confirmed 766.23 kB with zero movement, since FS15 shipped zero `src/` modules; **Prettier RED on the same one pre-existing file, `.size-limit.json`, reaffirmed a legacy carry-over**; every invariant HELD (trivially, by shipping nothing that could move one); the FS1-postmortem §7 live-infra checklist executed **to the extent this environment allows** — verified NO Docker/CI/live backend exists here (`docker`/`gh`/`act` all absent), so FE-RV-3/4/17 were **explicitly NOT closed**, each converted into an exact Runbook procedure instead; **two checklist items DID close for real** (no secrets in bundle; gated-data honesty, now one cross-cutting test); a local-only Lighthouse pass run and labelled as such throughout; the FS14 owner ruling that `/api/telemetry` has no client caller stands, unreopened; `PRODUCTION_READINESS_RUNBOOK.md` created as the standing procedure for the entire remaining FE-RV register. **The roadmap has no FS16** | — |

## 9. Git state *(critical — read before any commit)*

```
Branch    master          HEAD a8224ec (backend Stage 20, tag stage-20-docs)
Tags      19 backend tags: stage-1-baseline … stage-20-docs   (no FS tags exist)
Untracked ?? PROJECT_HANDOFF.md  ?? PROJECT_HANDOFF_PART1..4.md  ?? webplatform/
```

- **The entire frontend track is uncommitted** — the design phase, Stage 2/3, **FS1–FS15 (the complete,
  terminal implementation track)** and this handoff set exist only in the working tree. Backend commits/tags
  are intact and clean. FS15 added `webplatform/docker-compose.console.yml` (root-level, still inside the
  untracked `webplatform/` tree — root `docker-compose.yml` and `docker/Caddyfile` themselves remain tracked
  and byte-identical, confirmed by `git diff --stat` returning nothing for either at the FS15 sync).
- **Do not commit unprompted.** The standing rules are "commit only when instructed" and "never push to
  remote". When the owner instructs a commit, it is a large, careful first commit for `webplatform/` —
  follow the conventions in §2.1 (conventional commits, per-stage structure if the owner wants history
  reconstructed, one tag per accepted stage). This did not change at FS15.
- `.env` / `.venv` / `.claude` / caches are gitignored; `legacy/` is archived — do not touch.

## 10. Next steps *(in order; updated POST-FS15 acceptance, 2026-08-07 — THE FRONTEND IMPLEMENTATION
TRACK IS COMPLETE; there is no more "next FS stage" by default)*

1. ~~ADRs · FS3 … FS14 · FS15~~ — ✅ decided/delivered/accepted (§7.1; the FS reports; `FS15_REPORT.md` §11 +
   `FS15_REPORT_SIZE_ADDENDUM.md` §5 — size-limit **unchanged** at 777 kB, re-confirmed with zero movement;
   FE-RV-3/4/17 explicitly NOT closed — no Docker/CI/live backend exists in this environment, verified
   directly; two `FS1_POSTMORTEM.md` §7 items closed for real (secrets scan, gated-data audit); every
   protected route held unconditionally, since FS15 shipped zero `src/` modules;
   `PRODUCTION_READINESS_RUNBOOK.md` created as the standing procedure for everything still open).
2. **THERE IS NO STEP 2 BY DEFAULT.** The roadmap that has driven every "next step" since FS1 names no
   FS16. Do not infer a next stage, do not treat Runtime Verification as automatically authorized, and do
   not start planning anything without the owner's explicit new instruction. Two categories of legitimate
   future work exist, and a new Claude picking up this handoff should recognize which one it is being asked
   for, not assume either by default:
   - **(a) Runtime Verification**, when the owner opens it: follow
     `webplatform/frontend/PRODUCTION_READINESS_RUNBOOK.md`'s ten numbered items in order. Each needs its own
     infrastructure (a Docker engine for FE-RV-3, a CI runner for FE-RV-4, a live backend for FE-RV-7…16, a
     real deployment behind Caddy for FE-RV-17) — closing any of them still requires that infrastructure to
     actually exist and the owner's go-ahead to use it, and each closure must show real executed evidence
     (binding rule, PART1 §4.13 rule 85 / PART4 §1.2 rule 26).
   - **(b) A new frontend stage** (a hypothetical "FS16" or any other new scope): this is a new decision, not
     a continuation of the FS1–FS15 sequence. Run it through the exact same ritual as every prior stage —
     plan first, STOP for approval, implement, ten gates, report, STOP for acceptance (§1.1) — and do not
     borrow FS15's "production readiness" scope or entry duties for it; those were fixed to FS15 specifically
     by the now-completed roadmap.
   `/chat` 180/180 kB with zero headroom remains a wall for whichever kind of work comes next, not a target
   to re-earn — it held unconditionally through FS15 by shipping nothing that could move it.
3. *(Optional, unchanged in priority)* `CHROMATIC_PROJECT_TOKEN` closes FE-RV-6; a first live-backend session
   closes most of FE-RV-7/8/9/10/11/12/13/14/15/16 together (Runbook item 10); a first staging deployment
   behind Caddy is needed separately for FE-RV-17 (Runbook item 8); a Docker engine closes FE-RV-3 (Runbook
   item 1); a real GitHub Actions run closes FE-RV-4 (Runbook item 2).
4. *(Owner's discretion, unchanged)* first `webplatform/` commit (§9); backend Production Readiness Review
   (RV-1…RV-18) when live infrastructure exists. Both tracks now wait on the same category of missing
   thing — real infrastructure — not on further development.

## 10.1a-7 Lessons learned — FS15 *(the terminal stage — the ones that change how ANY future frontend work
is run, whether that is Runtime Verification or a new stage)*

1. **Verify an environment's missing infrastructure before scoping a stage around it, the same way a wire
   assumption is verified against the contract.** `docker --version`, `gh --version` and `act --version` were
   run before a single task was drafted and returned "command not found" for all three — a fact, not an
   inference from "it probably isn't installed." Every task in the plan was built around that verified
   ceiling. Do the same check again before assuming this environment has changed.
2. **When real verification is impossible, the honest deliverable is a procedure, not a narrower promise.**
   `PRODUCTION_READINESS_RUNBOOK.md` exists because "FE-RV-3 stays open" is true but unhelpful on its own —
   the useful artifact is the exact command sequence and single adjustment point for the day infrastructure
   exists, so closing it becomes execution instead of re-deriving the plan from scratch.
3. **A brand-new tool earns the same investigate-before-fixing discipline as the shipped product.** The
   secrets scanner's first real run found a plausible hit; the instinct to loosen the regex was resisted in
   favor of tracing the exact byte context, which showed a WASM blob inside a vendored dependency. A gate
   that passes because the check was weakened is worse than one that stays red with the real cause attached.
4. **A local measurement's caveat must travel with the number, not just accompany its first mention.**
   Lighthouse's workstation numbers are genuinely useful signal, but every place they are repeated — the
   report, the addendum, this handoff — restates that they are not the staging measurement a target actually
   names. A caveat stated once and omitted the second time reads, to a future skimmer, as if it never existed.
5. **Building a small tool can surface real bugs even when the "product" itself is untouched.** FS15 found
   and fixed two genuine defects (an event-loop-starvation bug, a shell-quoting bug) in code it wrote this
   same stage, not in `src/`. "We didn't touch the product" and "nothing went wrong" are different claims;
   only the first one was true, and the report said so rather than implying the second.
6. **The strongest no-touch guarantee is proved the same way the narrowest one is.** "FS15 touched no `src/`
   file" could have been asserted from the file list alone; instead a byte-for-byte `route-budget.json` diff
   proved it, because this project's standing rule is that a claim about what didn't move is checked, not
   assumed, regardless of how large or small the claim is.
7. **A terminal stage's report must distinguish "implementation complete" from "verified working" as sharply
   as the backend has since its own Stage 20.** The frontend now carries the identical shape of unfinished
   business the backend has carried for RV-1…18 — this is not a new kind of gap, and describing it as
   anything other than "the same category of work, now open on both tracks" would misstate what changed.

## 10.1a-6 Lessons learned — FS14 *(the ones that change how the next stage is run)*

1. **Measure a candidate in every shape it could plausibly take before trusting a refusal.** The
   observability sink was tried as three route-group imports AND as one root-only import; both cost the
   same three routes 1 kB each, and both control builds (sink removed) returned a byte-identical runtime
   chunk. Two shapes agreeing is what makes "the module itself is the cost" a fact rather than a guess about
   placement.
2. **A test failure earns the same control-build discipline as a bundle movement.** Three builds, each
   removing one stage file with global reach, excluded the stage's own changes as the cause of a failing axe
   assertion — and still didn't explain it. A DOM probe (not a fourth guess) found a pre-existing
   client-navigation race. When a stage's own changes are suspected of breaking something, isolate with
   controls exactly as for a kilobyte, and be willing to conclude the stage did NOT cause it.
3. **A journey audit finds dead honesty surfaces a screen-level test never would.** `StudioHonesty`'s
   `attach` seam existed since FS9 and was mounted nowhere — no per-screen test caught it, because writing
   the seam's own component test doesn't prove it's ever rendered. Composing a cross-screen journey exercises
   composition, which is a different failure surface than a unit or component test.
4. **An overlay that mounts on interaction can hide a defect through every prior axe run.** The avatar menu
   and command palette exist in the DOM only once opened; five stages of axe scans never opened them, and an
   11px `text.tertiary` label sat at 3.6:1 in dark the whole time. A scan that never triggers an interactive
   overlay has not verified that overlay — the absence of a red result is not the same as a green one.
5. **A gate-passing fix can still be the wrong call if it costs the budget.** ESLint correctly flagged two
   plain-anchor seam links; the "fix" (`next/link`) passed lint and cost two protected routes 4 kB each. The
   right response was a per-line suppression whose justification is the measurement, not blind compliance
   with a linter that cannot see the budget gate.
6. **Check what a component already holds before reaching for a fresh import.** A dashboard cross-link
   imported `next/link` from scratch and cost 4 kB; the same destination via the `useRouter()` the component
   already held cost zero. The cheapest navigation primitive is often already in scope.
7. **A ruling that says "do not add X" is exactly as binding as one that says "add Y".** The owner's two
   acceptance rulings were both refusals — no client caller, no file edit — and both are standing decisions
   for FS15 to inherit, not questions left open by the absence of a "yes."
8. **A green budget measurement deserves a plain "no ruling needed," not a manufactured ritual.** FS14 is the
   first stage since FS5 where `pnpm size` passed with room to spare, and the report says exactly that. Rule
   №33 governs raising a threshold; it does not require inventing a re-baseline discussion every time.

## 10.1a-5 Lessons learned — FS13 *(the ones that change how the next stage is run)*

1. **A zero-commons promise is only as good as your map of where the CONSUMER lives.** FS13's plan asserted
   `⌘,` would be its only commons edit. It was wrong for a reason no care would have caught at planning time:
   a toast preference must be read where toasts are *emitted*, which is one of the frozen seven providers,
   and **FSD forbids a provider importing a feature**. The read side had to sit in `shared/`, and it cost
   `/audit` and `/providers` 1 kB each. Before writing "zero commons", trace every new piece of state to the
   layer that consults it.
2. **A control build answers "what caused it"; a SHAPE variant answers "could it be cheaper".** Control C
   (the addition removed) proved the cause. Build D (the same six lines inlined, no new module) proved the
   cost was inherent rather than packaging — and that second measurement is what turned a debate into a
   one-message ruling. When a cost looks avoidable, measure the alternative shape before proposing to pay it.
3. **Stop early, but stop with numbers.** The owner's GO said to stop on a structural deviation. FS13 stopped
   having already run four builds and costed three options, so the decision came back immediately. Measuring
   before stopping is what makes the stop useful; deciding alone would have spent the owner's authority.
4. **A control that changes nothing is a fabricated capability.** Experience Level had sat in the global
   store since FS1 with no screen reading it. Shipping the switch alone would have been the §R10.3 honesty
   rule violated on *controls* rather than on data. It shipped only once consumed — and the copy names which
   screens respond **today** rather than promising all of them.
5. **When "off" and "unreported" are indistinguishable, render neither.** `mfa_enabled` arrives optional and
   `mapAuthMe` defaults it to `false`. Showing "MFA: disabled" would have been a claim the wire cannot
   support, so the screen shows no MFA state and says why. This is FS12's "unknown stays grey, never green"
   applied to a boolean.
6. **Scope a personal view by TYPE, not by care.** `auditPaths.list` drops a falsy actor, so a blank user id
   would have widened a personal feed into the platform-wide audit log — a privacy leak that looks like a
   working feature. A component test caught it; the fix made the id non-nullable at the hook and pushed the
   absence to the component boundary. **A missing scope is an absence, never "no filter".**
7. **Additive-by-id is not enough when ORDER is an input.** FS13's new fixture rows were newer than FS12's,
   the audit list renders newest-first, and an FS12 journey that clicks the first diff broke on three
   viewports. The no-touch guarantee has to consider *rendered order*, and the fix belongs in the new
   fixture, never in the older stage's spec.
8. **A lock test that can be satisfied by a comment is not a lock.** Three FS13 source assertions matched the
   prose in doc comments rather than the code — every file in this project explains the rule it follows. Strip
   comments before asserting.
9. **Reproduce the failure signature; do not infer it from an exit code.** The `next` corruption struck four
   times. Rather than assume it from a non-zero exit, FS13 ran the bare build once to see
   `Cannot find module './impl'` in full — which is also what distinguishes the known hazard from a real
   build error.

## 10.1a-4 Lessons learned — FS12 *(the ones that change how the next stage is run)*

1. **A first-consumer check is worth having only if it can say NO.** FS12's plan pre-declared the fallback
   before the measurement existed, so when `shared/ui/data-table` moved a protected route (+58 B gz in the
   webpack runtime chunk-id map, rounding `/memory` up, with a control build returning a byte-identical
   runtime chunk), the decision took minutes rather than a debate. **Write the fallback into the plan; let
   the measurement pull the trigger.** TanStack Table is installed and still reaches no bundle.
2. **The eager view is where weight leaks in — and mutation hooks are the worst offender.** `/jobs` failed
   the budget at 183 kB because an eager list view called `useQueueIntents`: that alone dragged TanStack
   Query's mutation machinery *and* Next's `dynamic()` client runtime in as an 8.5 kB route-only chunk.
   Moving the hook into the lazy component that uses it took the route to 172 kB. Related, both measured:
   static markup belongs in the **RSC page** (it leaves the client bundle entirely), and **N lazy
   `dynamic()` rows of one screen family should be ONE chunk** — every `dynamic()` anywhere adds an entry to
   the global runtime map that lives in commons.
3. **A screen with no endpoint is finished, not pending.** Three FS12 routes have no contract call at all.
   They state fact · reason · what would change it on every viewport, ship **zero** fixture data, and are
   protected by a **negative-lock test** asserting the resolver answers nothing for them. No FE-RV was
   opened: an FE-RV records an unverified assumption, and these are verified facts about a frozen contract.
   Treat "we could not build it" and "the contract says it does not exist" as different outcomes.
4. **A11y defects follow the same rule as everything else — fix them where they are caused.** axe found
   `scrollable-region-focusable` on the seam screens: a page with zero interactive elements leaves the
   scrollable `#main-content` unreachable by keyboard. The tempting fix was the shell; the correct one was
   the content, and giving each seam real navigation to the screens with the nearest real data improved the
   page as well as the gate.
5. **A UI RBAC mirror that contradicts the contract is a defect.** The FS1 seed had granted `admin` user and
   key management; `API_SPEC` gives them to the owner alone. Correcting it means an admin now meets a
   permission state **inside** a screen they may otherwise use — which is exactly the entry duty applied one
   level below the route guard, and it is better than an affordance the server would refuse.
6. **Two controls beat one when two routes move for different reasons.** `/chat` returned to 179 when the
   nine new routes became stubs; `/memory` stayed at 150 in that control *and* in a second control that
   removed the palette group — which located its +1 in a single lazy registry reference (+28 B gz in
   commons). One control would have answered half the question and invited a guess about the other half.
7. **Report a pre-existing failure; do not absorb it and do not quietly fix it.** The Prettier gate went red
   on an FS11 file with CRLF terminators that FS12 never opened. It stayed untouched inside the no-touch
   set, the mtime and terminator evidence went into the report, and the owner ruled. The fix then took one
   command and was proved formatting-only.
8. **Report flakes as flakes.** An FS3-era component suite timed out on a *different* test in two of three
   full-suite runs and passed in isolation every time. Saying so is cheaper than a green claim that would
   not reproduce.

## 10.1a-3 Lessons learned — FS11 *(the ones that change how the next stage is run)*

1. **A barrel is a boundary, and `'use client'` makes it a hard one.** Re-exporting the FS11 hooks from the
   FS5 `entities/analytics` barrel put a 5.23 kB chunk into `/dashboard`'s First Load: a client module reached
   through a barrel is bundled whole. The FS3 lesson about `shared/ui` applies to *every* slice another screen
   imports. The fix is a separate slice — and the consuming screen is byte-compared immediately, not at the
   end.
2. **Check the primary protected route mid-stage, not only at the gate.** The owner's requirement to
   byte-compare `/dashboard` right after the first chart is what turned a 2 kB regression into a cheap
   structural fix instead of an acceptance-time argument.
3. **A control build can remove the ROUTE, not just an addition.** Reverting `/analytics` to a stub while
   leaving every other FS11 byte in place returned all six protected routes to their exact baselines — the
   cleanest possible proof that a movement is shared-graph re-partition. Keep both control forms in the
   toolkit.
4. **Enforce gating in the mapper, not the view.** `availability: 'gated'` wins over any value the wire
   carries, so the number cannot leak into a card, a prompt or an export. Fixtures deliberately carry a gated
   field *with* a number so the rule is exercised rather than assumed.
5. **Absence extends to freshness and to derivation.** With no analytics stream in the contract, "live
   counters" became SWR + an explicit fetched-at whisper; with no system-analytics endpoint, the System panel
   became a named seam rather than a metric derived from `/tasks`. A made-up number is worse than a stated
   absence — and the owner ruled exactly that way.
6. **A control build leaves a stale artifact.** An E2E run against the leftover control build failed 14 of 15
   journeys for reasons unrelated to the code. Rebuild after every control build, the same way port 3000 is
   killed before every E2E.

## 10.1a-2 Lessons learned — FS10 *(the ones that change how the next stage is run)*

1. **A route's First Load can grow with its chunk SET unchanged.** The first FS10 build failed the budget at
   `/chat` 182 kB and lifted every route ~3–4 kB, yet each route's chunk list was name-for-name identical.
   The growth was in the **webpack runtime's chunk-id map**, because the stage became the **first product
   consumer** of a heavy `shared/ui` module (CodeBlock → Shiki). Diagnose from the manifest, then check
   whether the module you are about to import is currently unreferenced.
2. **The cheapest fix is often removing the dependency, not splitting it.** The diff never needed a syntax
   highlighter — `language="diff"` was not even in CodeBlock's language list — so rendering the +/- lines in
   the widget both fixed the budget and kept the D2 §13.18 semantics. Removing a heavy import *lowered*
   every route; that is the opposite of the FS3 anti-pattern and worth recognising.
3. **A data-starved ONYX component may need a MINOR before it can be fed honestly.** PromptCard required a
   variables count and an activation badge that the contract cannot supply. The owner approved two additive
   optional props *in advance*; the alternative would have been a fabricated zero and a false badge. Ask
   before the stage starts, never during.
4. **Scope is proved, not stated.** The Prompt Library is the first platform-wide surface; requirement A
   (no key may accept a `channelId`, asserted by function **arity**) and requirement B (no cross-scope
   ownership, checked in **both** directions) turned "prompts are not channel-scoped" from a sentence into a
   structural fact. Any future platform-wide surface inherits this standard.
5. **A `truncate` next to an `ml-auto shrink-0` sibling can collapse to zero width.** An over-long `source`
   made the provenance card's title invisible at 1280px — caught by E2E, fixed at the call site. When
   feeding a frozen component, the *length* of what you pass is part of the contract.
6. **Recovery habits must be exit-status-correct.** `pnpm build | tail` breaks `||` recovery because a
   pipeline's status is the last command's. The documented habit is unpiped.

## 10.1a Lessons learned — FS9 *(the ones that change how the next stage is run)*

1. **When an invariant is missed, build the control.** FS9's I2 (`/memory` ≤148) was missed by 1 kB. Rather
   than explain it, the stage built a control artifact with its single byte-level addition to that graph
   removed — the number did not move. That is what converted a deviation into an owner-rulable fact.
2. **Zero-commons has a reusable mechanism now.** With the FS8 registry lever spent, entity-local QUERY
   KEYS delivered a stage with **zero added rows** in `shared/config/query-keys.ts`. Any future entity
   starts there.
3. **A contract can refuse a screen's premise, and the screen is still deliverable.** The Image Studio has
   no create endpoint, no media URL and no attach call — yet the record workspace, the §R6.4 report and the
   §R6.1 references made it the most verification-honest screen in the product.
4. **Never wrap an ONYX component that owns interactive parts.** `ImageResult` has its own disclosure
   button; wrapping the card in `role="button"` produced a real `nested-interactive` violation. Compose
   affordances beside a card, never around it.
5. **An honesty surface must survive the responsive collapse.** The "generation lives in the pipeline"
   explanation was `xl`-only; mobile users saw an absence with no reason. Seams belong wherever the thing
   they explain would have been.
6. **Sorting is part of the contract a test asserts.** The grid renders newest-first; a spec written from
   the fixture's wire order failed for the right reason. Assert against the rendered order, not the source.

## 10.1 Lessons learned — FS8 *(the ones that change how the next stage is run)*

1. **Measure the cause, don't narrate it.** FS8's report explained a 1 kB budget movement with a plausible
   story (its own commons additions). The owner's evidence pack disproved it from
   `app-build-manifest.json`: no FS8 byte was on the route at all; webpack re-partition plus Next's
   rounding did it, and the true union *fell*. Both documents were corrected before acceptance. **Budget
   forensics = manifest + per-chunk gzip, never inference.**
2. **Do the commons offload FIRST, and expect it to be spent.** Ordering T-FS8.1 before any feature code
   produced a measured 1 kB on `/chat` and `/knowledge` — but the lever exists once. Future stages start
   from 179/180 with no cheap structural win left.
3. **A URL contract catches real defects.** Writing §3.5 as a *contract* (every transition reversible by
   Back) is what made the `?scope=` `replace`-vs-`push` bug a test failure instead of a shipped annoyance.
4. **Ownership matrices are cheap to state and cheap to enforce.** Four small source-level tests now
   guarantee no state lives in Query *and* Zustand — far cheaper than discovering a duplicated cache later.
5. **When the contract has no endpoint, the screen is still deliverable.** Memory had no `/memory` API;
   building it from the levels the contract *does* expose (personas, actors, published posts) delivered the
   screen's stated purpose while leaving trace/global/pin as visible honest seams.
6. **`instanceof` across realms and jsdom gaps keep biting** — duck-type parsed `File`s, keep the guarded
   Blob polyfills, and read fixture bodies directly on paths that never pass through.

## 11. FS5 transfer — RESOLVED *(historical note)*

The mid-FS5 in-progress snapshot that previously occupied this section is **fully resolved**: the session
transfer worked exactly as designed — the successor session read the kit, executed the §11.2 resume
checklist verbatim (dashboard page → Inspector views → tests → gates → report), and the owner accepted FS5
on 2026-08-01 with the size-limit decision (Option A, 485 kB). The authoritative record of what was built,
what broke and what was decided is **`webplatform/frontend/FS5_REPORT.md`** (§5 decisions · §6 defects ·
§7 size analysis · §11 acceptance addendum). Sharp edges worth keeping from that stage (now also in §2.1
and PART2 §5.4): `useInspector` exposes `inspect({type,id})`/`close`; `Kbd keys={[...]}`; review permission
is `content.publish`; MSW node matchers are path-only; auth cookies are RAW `set-cookie` appends;
channel-scoped initialData must carry `forChannelId`; `msw/browser` is server-pass-aliased; the fixture
modules may only be reached via dynamic `import()` from outside their slice.

---

**End of PROJECT_HANDOFF_PART4.md — the handoff set (master + PART1–PART4) is complete and current as of
the FS15 ACCEPTANCE (2026-08-07). ALL FIFTEEN stages are delivered and accepted — the frontend
implementation track is COMPLETE, and the roadmap names no FS16. The size-limit detector stands at 777 kB,
**unchanged since the FS13 re-baseline** — neither the FS14 nor the FS15 acceptance needed a tenth ruling,
both measuring 766.23 kB with room to spare — and the per-route First Load budget of 180 kB remains
authoritative with `/chat` = **180 kB and ZERO headroom** as its standing, now TERMINAL, reference, proven
to hold under real measured pressure at FS14 and unconditionally at FS15 (which shipped zero `src/` modules)
(`/admin` 179 · `/knowledge` 176 · `/audit` **175** · `/jobs` 172 · `/dashboard` 168 · `/studio` 165 ·
`/providers` **154** · `/memory` 150 · `/prompts` 150 · `/analytics` 148 · `/billing` 144 · `/health` 139 ·
`/settings` **121** · `/profile` **121** · seam routes 111 · stubs 107 · shared commons 107 ·
`/api/telemetry` 107 server-only). **The FS13 I2 deviation on `/audit` and `/providers` is accepted exactly
as measured and its wording is frozen** — later documents cite it, they do not restate it. **The FS14 owner
rulings are equally frozen**: `/api/telemetry` ships with no client caller by decision, and the Prettier
`.size-limit.json` RED is a legacy carry-over per the FS12 precedent, reaffirmed at the FS15 sync — neither
is a gap for any later work to silently close. **FS15 itself is now frozen wording too**: FE-RV-3, FE-RV-4
and FE-RV-17 were verified NOT closeable in this environment (no Docker, no CI runner, no live backend) and
were reported open, with an exact procedure in `PRODUCTION_READINESS_RUNBOOK.md` in place of any fabricated
closure. **The next action is NOT a stage GO — it is whatever the owner separately decides**: opening Runtime
Verification against real infrastructure (follow the Runbook), authorizing a new frontend stage beyond FS15
(plan first, exactly like every prior one), or neither, for now. Both tracks — backend and frontend — now
wait on the same category of missing thing: infrastructure this project has never had, not further
development.**
