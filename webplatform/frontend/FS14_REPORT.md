# FS14 — Integration & Polish (Report)

**Stage:** FS14 · **Plan:** `STAGE_FS14_PLAN.md` (approved, with the owner's rulings **D1 → Option A**,
**D6 → Option A**, **D7 → Option A**, and confirmation of **D9**, **D10**, **D13**) · **Date:** 2026-08-06 ·
**Status:** **ACCEPTED 2026-08-06** — see the acceptance addendum (§11) for the owner's two rulings and the
final gate state.

> §§1–10 are the delivery record and are deliberately left as measured, including the gate that ended RED and
> every gate decision that went against the plan's expectation. §11 records what the owner ruled. Nothing
> measured is re-worded after the fact.

---

## 1. What was delivered

The first stage whose subject is **the space between screens**. Five cross-screen journeys are proved end to
end, three engineering duties the roadmap attached to this stage are executed, and the progressive-disclosure
promise FS13 made in shipped copy is honoured on the screens where a higher tier reveals something real.

| Deliverable | What it is now |
|---|---|
| **D3 Part C journeys** | `tests/e2e/journeys.spec.ts` — 11 tests ×3 viewports (**32 passed, 1 mobile skip**) covering J1 Compose → Pipeline · J2 Cite → Source · J3 Alert → Triage · J4 Explain-this · J5 Everything ⌘K, plus an axe pass over the hand-off screens |
| **Cross-link integration** | three hops that did not exist: Dashboard → Jobs (where a queued intent goes), Health → Jobs + Audit (D1 §7.10 triage), Jobs → Dashboard + Chat + Audit (how work arrives, and what changed) |
| **Observability (FE-ADR-3, D6-A)** | **server-side seam only** — `src/instrumentation.ts` (process record + `onRequestError`, allowlisted to error NAME and digest) and the first-party BFF sink `app/api/telemetry`. **The client sink was measured and refused** (§4.1). No vendor SDK, no dependency, no ADR |
| **Root error boundary (D13)** | `app/global-error.tsx` — Stage 2 §11 named it, the console never had one. Shipped on measurement (+8 B gz in the runtime map, no route moved) |
| **Font pin (D7-A) — FE-RV-5 CLOSED** | the two latin variable binaries are committed under `public/fonts/`, `fonts.ts` uses `next/font/local`, and the build now emits **2** font files instead of 13. Offline builds; no route moved |
| **CSP promotion package (T-FS14.11)** | the enforced header authored and **deliberately not enabled**, every directive justified from source, the nonce-vs-`unsafe-inline` cost written down, and the finding that report-only has always reported **nowhere** (§6) |
| **Progressive disclosure (D10)** | shipped on `/jobs` and `/audit` (Advanced/Power reveal the raw record and the raw jsonb sides the console already holds); **refused on three screens** where the tier would reveal nothing (§7) |
| **The three unexercised D4 §3 checks** | `tests/e2e/polish.spec.ts` — 320px reflow across **15 screens**, 200% zoom, `prefers-reduced-motion`, plus an axe scan of the two overlays no scan had ever opened |

**No new screen, no new entity, no new query key, no new endpoint path, no new fetcher, no new Inspector row,
no new palette group, no new fixture row, no new dependency, no ADR, no token-value change.**

---

## 2. Gate results — executed for real

| Gate | Result |
|---|---|
| ESLint | ✅ clean |
| Prettier | ❌ **RED on one pre-existing file** — `.size-limit.json` (§3). Every FS14 file is formatted |
| `tsc --noEmit` strict | ✅ **0 errors, 0 unjustified `any`** |
| Vitest (unit + component) | ✅ **794 passed / 102 files** (was 784 / 101) |
| Playwright E2E ×3 viewports | ✅ **400 passed · 0 failed · 17 skipped** (was 356 / 0 / 16) |
| axe | ✅ **0 violations** — including the avatar menu and the command palette, **scanned for the first time in the project** |
| dependency-cruiser | ✅ **0 violations** (609 modules, 1578 dependencies) |
| Storybook build | ✅ built (54 story files, unchanged) |
| Contract | ✅ **FS14 introduces no `/api/v1` path.** Every call a journey traverses already exists verbatim in `API_SPEC.md`; `/api/telemetry` is a first-party console route, so `endpoints.ts` and `query-keys.ts` were never opened |
| `pnpm budget` | ✅ **PASS — 32 routes ≤ 180 kB** |
| `pnpm size` | ✅ **766.23 / 777 kB — GREEN**, headroom 10.77 kB. **No threshold change is requested** (§ addendum) |

**Per-route First Load (final build) — every protected route at its FS13 baseline:**

`/chat` **180** · `/admin` 179 · `/knowledge` 176 · `/audit` **175** · `/jobs` 172 · `/dashboard` 168 ·
`/studio` 165 · `/providers` **154** · `/memory` 150 · `/prompts` 150 · `/analytics` 148 · `/billing` 144 ·
`/health` 139 · `/settings` 121 · `/profile` 121 · seams 111 · stubs 107 · shared commons **107**.

*(32 routes rather than 31: the new server-only `/api/telemetry` handler appears in Next's table at the
107 kB shared baseline and ships no client chunk.)*

---

## 3. The gate that ended RED, reported RED

`pnpm format:check` fails on **exactly one file: `.size-limit.json`**, which FS14 never opened.

- **Evidence:** mtime **2026-08-05 21:04:56**, i.e. the moment the FS13 **acceptance** rewrote the threshold
  to 777 kB — after that stage's Prettier gate had already run. `file` reports the content is JSON; `od -c`
  shows **CRLF** terminators (`\r\n`), the only such file in the repo. Prettier's configured ending is LF.
- **It was left untouched**, per the FS12 precedent (rule 65: a pre-existing gate failure is reported, not
  silently absorbed and not silently fixed) and because it sits outside FS14's declared edit set (plan §3.3).
- Nineteen other files failed the check mid-stage; every one was FS14's own and all were formatted.

This is a **legacy carry-over awaiting the owner's ruling**, identical in shape to FS12's. The fix, if ruled,
is formatting-only and provable: stripping the CRs leaves the file byte-identical.

---

## 4. Measurement record — every gate, every control build

Requirement 5 and 6 of the GO were absolute: measure before explaining, never hypothesise. **Ten clean builds**
were run. No cause below is inferred.

### 4.1 Gate A — the observability sink, measured and REFUSED

The plan pre-declared three shapes and a fallback ladder. Shape (ii) — a no-op stub in `shared/` with the
transport dynamically imported at idle — was built and measured.

| Build | /billing | /dashboard | /jobs | /chat | /memory | runtime gz |
|---|---|---|---|---|---|---|
| **A** baseline (pre-FS14) | 144 | 168 | 172 | **180** | **150** | 2940 |
| **B** sink imported by the 3 route-group boundaries | **145** | **169** | **173** | 180 | 150 | 2983 |
| **C** control — only the client sink removed, server half kept | **144** | **168** | **172** | 180 | 150 | **2940 — byte-identical** |
| **D** shape variant — sink imported ONLY by `global-error.tsx` | **145** | **169** | **173** | 180 | 150 | 2992 |
| **E** `global-error.tsx` alone, no sink import | **144** | **168** | **172** | 180 | 150 | 2948 |

- **Control C isolates the cause**: with the client sink gone and the server half present, every route returns
  to baseline and the runtime chunk is byte-identical to the pre-stage build.
- **Build D is the shape variant** (the FS13 C+D technique): moving the sink to a single root-boundary import
  — a file that only loads after the document has already broken — costs **exactly the same three routes**.
  So the cost is inherent to the module entering the shared client graph, not to where it is imported.
- **Build E separates Gate B from Gate A**: the root boundary *without* the sink costs +8 B gz and moves
  nothing.

**The pre-declared fallback executed without debate: the stage ships shape (i), server-only.** The
client-side gap is reported rather than paid for — **client render errors and web-vitals are not collected**.
Two consequences are stated plainly rather than softened:

1. `/api/telemetry` currently has **no client caller**. It is the declared vendor ingress of D6 Option A,
   covered by a source-level test, while the live producer is the server hook in `instrumentation.ts`.
   If the owner would rather not ship an endpoint nothing calls, deleting it is a one-file change.
2. **Client web-vitals were not attempted at all**, and the reason is structural rather than budgetary:
   `useReportWebVitals` must be mounted in a layout or provider, and `app/layout.tsx` and `app/providers.tsx`
   are inside the plan's own no-touch set (§3.3). This is the R1i lesson holding in the other direction — the
   consumer's layer decided the outcome before a byte was written.

### 4.2 Gate B — the root error boundary: SHIPS

`app/global-error.tsx` costs **+8 B gz** in the webpack runtime chunk-id map (2940 → 2948) and moves **no**
route (build E). Shipped.

### 4.3 Gate C — the font pin (FE-RV-5): SHIPS

`next/font/local` over two committed binaries. **Every protected route at baseline**; runtime chunk 2946 gz;
the build emits **2** `.woff2` files instead of 13. The no-FOUC duty was re-proved by the existing FS13
assertion against the **initial HTML document** (`account.spec.ts` — *"theme and density are applied by the
SERVER on the next load"*), which passed in the final matrix.

**What the pin narrows, stated rather than glossed:** the committed files are the **latin** subsets — the ones
this module has always requested and the only ones Next preloaded. The Google stylesheet also declared
Cyrillic, Greek, Vietnamese and latin-ext faces behind `unicode-range`, which `next/font/local` cannot
express. Those ranges now fall back to the system stack in `--font-sans` / `--font-mono`. English UI copy is
unaffected; **non-Latin channel content renders in the fallback face rather than in Inter's own Cyrillic.**
That is the cost of pinning, it is reversible in one file, and it is the owner's to weigh.

### 4.4 The cross-links — one movement, isolated and then avoided

| Build | /dashboard | /health | /jobs | Note |
|---|---|---|---|---|
| baseline | 168 | 139 | 172 | — |
| all three cross-links, dashboard hop as `next/link` | **172** | 139 | 172 | +4 kB |
| control — only the dashboard `next/link` removed | **168** | 139 | 172 | isolates it |
| shape variant — the hop reuses the router the view already holds | **168** | 139 | 172 | **zero cost, shipped** |

The two server-rendered strips (Health, Jobs) cost **nothing** — static markup in a Server Component never
enters a client bundle (rule 60).

**The same measurement then settled an ESLint finding.** `@next/next/no-html-link-for-pages` flagged the
`<a href="/chat">` in the Jobs strip. Converting the seam anchors to `<Link>` measured **`/jobs` 172 → 176**
and **`/health` 139 → 143**. The rule exists to avoid a full reload on primary navigation; these are
explanatory footers whose destinations are also reachable from the sidebar and the palette. The anchors were
kept with a **per-line disable carrying that measurement as its justification** — the project's suppression
policy (per-line, written reason), with the reason being a number rather than a preference.

### 4.5 R1c first-consumer scan — a fourth pass

`shared/ui/data-table` and `shared/ui/code-block` still have **zero real import statements** anywhere in
`src/`. The only textual match is FS12's *comment* in `widgets/jobs/TaskList.tsx` explaining why DataTable is
not used — the same false positive FS13 recorded, reproduced by scanning with comments stripped.
**TanStack Table remains in no bundle.** FS14 imported neither module.

### 4.6 Progressive disclosure — measured, zero cost

Both consumers live inside the already-lazy `PlatformInspectors` chunk. Every route stayed at baseline
(`/jobs` 172, `/audit` 175, `/chat` 180, `/memory` 150) and the runtime chunk read 2945 gz.

---

## 5. Defects found and fixed

1. **A REAL a11y defect, found by the audit and confirmed by computation.** The avatar menu renders the
   user's role at **11px in `text.tertiary`**. On the overlay surface that measures **3.6 : 1 in the dark
   theme** — below the 4.5 : 1 AA threshold for small text (light theme: 4.83 : 1, passing). Fixed the way
   this project has fixed it five times before — **by changing which token the call site uses**
   (`tertiary` → `secondary`, 6.83 : 1), never the token value. The command palette's placeholder, 14px in
   the same token on a glass overlay, was corrected identically.
   **Why five audits missed it:** both surfaces only exist in the DOM once *opened*, and no axe scan in the
   suite had ever opened them. That is now a test (`polish.spec.ts`), scoped to the overlay itself.
2. **A REAL honesty gap: a seam that was authored but rendered nowhere.** `StudioHonesty`'s **`attach`**
   variant — "attaching an image to a post is a backend operation" — has existed since FS9 and appears in
   **no** component tree (`generation`, `preview` and `safety` all render; `attach` never did). So the
   absence that makes D3 Part C's "single Review surface with text + image" impossible was never stated on
   screen. It now renders in `ImageDetail`, where the affordance would have been (the FS9 rule that a seam
   belongs where the missing thing would be), inside a lazy chunk at zero First Load cost.
3. **A latent race in an FS4-era spec, diagnosed by measurement, fixed as a strictly stronger assertion.**
   `shell.spec.ts`'s register→login axe scan began failing with four page-structure violations. **Three
   control builds excluded every FS14 file with global reach** — `global-error.tsx`, the font pin, and
   `instrumentation.ts` — each removed individually, each leaving the failure in place. A DOM probe then
   showed the truth: immediately after the URL changes the page has **0** of (h1 / main / form) and 1.5 s
   later it has all three with the form visible. The page is correct; the assertion ran before the client
   navigation painted. It now waits for a real element first — axe always sees the fully rendered form, which
   is a stronger check than the one that was passing by luck (I7-legal, declared in plan §3.7).
4. **A missing seam sentence, found by writing the journey.** J1 asserts the steps the contract cannot back;
   the "no per-post validation report" absence had no home. It is now stated in the Jobs honesty block
   (server-rendered, zero client bytes) — `POST /posts/{id}/validate` exists and answers 202, but nothing
   reads a validation result, so no surface shows pass/fail gate chips.
5. **Windows/pnpm `next` corruption — 1 occurrence** (`Cannot find module './impl'`), reproduced directly
   rather than inferred from an exit code, auto-recovered by the unpiped habit. **Project total: 28.**
   No stale-webServer incident; port 3000 was killed before every build and E2E, and the artifact was rebuilt
   after every control build.

---

## 6. The engineering duties, as built

### CSP promotion (T-FS14.11)

**The finding that shaped the task: the report-only policy has always reported NOWHERE.** `next.config.ts`
sends ten directives with **no `report-uri` and no `report-to`**, so "prepare the promotion from the
report-only data" had no data to read, and none can be produced in this environment (no deployment, no
browser fleet). Delivered instead:

- **The enforced header is authored in `next.config.ts` and deliberately not enabled**, with the swap
  documented as a one-line change once FE-RV-17 answers. A source-level test asserts the key is still
  `Content-Security-Policy-Report-Only` — a future contributor cannot silently promote it.
- **The one open decision, written down with its cost:** `script-src` keeps `'unsafe-inline'` because Next's
  App Router emits inline bootstrap and streaming-payload scripts on every RSC response. Removing it means
  nonces, and a nonce must be generated per request — which opts every static/ISR route into dynamic
  rendering. That is a real cost against §F8.1 and must be measured on staging, not guessed here.
- **Directives verified from source:** `default-src 'self'` · `base-uri 'self'` · `object-src 'none'` ·
  `frame-ancestors 'none'` · `form-action 'self'` · `connect-src 'self'` (the SSE relay and the BFF are
  same-origin) · `font-src 'self'` (now literally true — the binaries are in the repo) · **no external host
  in any directive**, asserted by test.
- **`img-src` still allows `data:` and `blob:`** although the console renders no image source at all today
  (§R6.8). Both are promotion candidates, and both become relevant again the day FE-RV-12 says a media URL
  exists. **Not tightened here**: removing a directive on the strength of "we think nothing uses it" is the
  same class of guess this stage exists to avoid.
- **CSP reporting is deliberately NOT wired to the telemetry sink.** A CSP report is browser-authored JSON
  carrying `blocked-uri` and `document-uri` — i.e. it can contain a pathname with a record id. Accepting it
  into the allowlisted sink would break the property that makes that sink safe. Enabling reporting therefore
  needs a scrubbing decision at deploy time (FE-RV-17).

### Progressive disclosure (D10) — shipped where it reveals fact, refused where it would not

| Screen | Outcome |
|---|---|
| **`/jobs`** (task Inspector) | **SHIPPED** — Advanced/Power reveal the raw mapped task record the console already holds; no request is made for it |
| **`/audit`** (record Inspector) | **SHIPPED** — Advanced/Power reveal the raw before/after jsonb sides the diff above is derived from |
| `/analytics` | **REFUSED** — `PanelFrame` already renders endpoint · filters · fetched-at · algorithm version to every role, and unknown metric keys already render by raw name. A tier that reveals nothing is the FS13 fabricated-control defect |
| `/studio` | **REFUSED** — the record detail already shows generation parameters and the §R6.4 report with unknown keys raw |
| `/knowledge` | **REFUSED** — the reader already shows ingest status and the version timeline |

The three refusals are the D10 rule working as written: **a control that would change nothing is not
shipped.** Each is recorded here rather than left as an unexplained absence. The Settings copy naming which
screens respond was left factual; extending disclosure further would require those screens to gain a raw
layer they do not have.

---

## 7. Contract truth as built (the rulings)

- **D1 → Option A, as ruled.** FS14 wires **no pipeline mutation**. J1 runs Compose → streamed draft →
  **201** insert + **202** generate → the queue → **202** approve → Analytics, entirely on calls that exist.
  The three steps the contract cannot back are **named**: no per-post validation report (§5.4), no
  attach-to-post (§5.2), and no image binary at all. `publish`/`schedule` exist as calls but the screen that
  owns them (D3 §13 Channels) is not built, and FS14 did not build it.
- **D6 → Option A, as ruled** — and the ruling's own gate refused its client half (§4.1). No vendor SDK, no
  dependency, no ADR. The vendor binding remains an environment decision behind one server file.
- **D7 → Option A, as ruled.** FE-RV-5 is **closed**: the binaries are in the tree, the build uses them, and
  the narrowing is recorded (§4.3).
- **D9 → confirmed.** `/channels`, `/playground` and `/docs` remain honest stubs at 107 kB. No stage was
  invented for them.
- **D10 → confirmed** (§6). **D13 → confirmed** (§4.2).
- **The fixture dataset gained not a single row** (D14), so no rendered order shifted anywhere — the FS13
  ordering lesson applied by avoidance.

---

## 8. Invariants — reported, not re-worded

- **I1 — `/chat` stays 180 kB and `pnpm budget` PASSES: HELD.** Byte-stable across all ten builds; headroom
  0.0 kB. Checked twice as required (immediately after Gate A, and on the final build).
- **I2 — `/memory` 150 · `/dashboard` 168 · `/knowledge` 176 · `/studio` 165 · `/prompts` 150 ·
  `/analytics` 148 · `/admin` 179 · `/audit` 175 · `/jobs` 172 · `/providers` 154 · `/billing` 144 ·
  `/health` 139 · `/settings` 121 · `/profile` 121 · seams 111 · stubs 107: **HELD exactly.** Three routes
  moved during the stage (`/billing`, `/dashboard`, `/jobs`) and every one was returned to baseline by
  executing a pre-declared fallback rather than by explaining the movement away.
- **I3 — commons stays 107 kB; `query-keys.ts` and `endpoints.ts` gain zero rows: HELD.** Both files were
  never opened (mtime 2026-08-04, predating this stage). **Gate A's permitted commons exception was not
  used** — the module it would have paid for was refused.
- **I4 — every route reported, none regressed: HELD.** The three stub routes stay 107.
- **I5 — ONYX untouched: HELD.** `styles/tokens.css` byte-identical (mtime 2026-07-27); no component
  contract changed; no ONYX MINOR requested; no new D2 §11 status. The two contrast fixes were **usage**
  changes at call sites.
- **I6 — no FS1–FS13 surface file modified except the declared set: HELD.** Edited: `next.config.ts` ·
  `shared/config/fonts.ts` · `widgets/dashboard/DashboardView.tsx` · `widgets/jobs/JobsHonesty.tsx` ·
  `widgets/health/HealthHonesty.tsx` · `widgets/studio/ImageDetail.tsx` · `widgets/inspector/TaskInspector.tsx`
  · `widgets/inspector/AuditInspector.tsx` · `widgets/topbar/AvatarMenu.tsx` ·
  `widgets/command-palette/CommandPalette.tsx` · `tests/e2e/shell.spec.ts`. Each is route-local or
  server-rendered, each was byte-measured, and the last two are the a11y fixes of §5.1 and the race fix of
  §5.3. **Frozen and untouched:** `app/layout.tsx`, `app/providers.tsx`, `middleware.ts`, `routes.ts`,
  `shortcuts.ts`, `theme.ts`, `tokens.css`, `query-keys.ts`, `endpoints.ts`, all 24 features, all 20
  entities, `widgets/inspector/Inspector.tsx` (no registry row), the command palette's groups (none added),
  and the seven-provider tree and its order.
- **I7 — previous suites green without weakening: HELD.** 794 unit (from 784) and 400 E2E (from 356), all
  green. **One existing-spec change**, made strictly stronger (§5.3).
- **I8 — no dependency · no ADR · no token change · no threshold pre-raised · no `app/` change · no endpoint
  invented · no fixture row added: HELD.**

---

## 9. FE-RV impact

**FE-RV-5 — CLOSED.** `next/font/local` over binaries committed in `public/fonts/`; the build emits only
those two files; offline builds no longer contact a font host. The latin-only narrowing is recorded in §4.3.

**FE-RV-17 — OPENED: "CSP enforcement and client telemetry on real infrastructure."** Whether the enforced
policy survives a real browser behind Caddy — above all whether Next's inline bootstrap needs
`'unsafe-inline'` or a nonce, and what the nonce costs in rendering mode · whether `report-to` / `report-uri`
reaches a first-party sink through the proxy, and what scrubbing a CSP report body requires before it may be
accepted · whether the telemetry route survives the deployment's routing and rate limits · what `img-src`
must become the day FE-RV-12 says a media URL exists · whether client web-vitals can be mounted at all
without editing the frozen provider tree, and what they measure against §F8.1 in the field.
**Single adjustment points:** `next.config.ts`, `src/instrumentation.ts`, `src/app/api/telemetry/route.ts`.

**No FE-RV was opened** for the Part C steps the contract cannot back — validation-result reads, a post↔image
link, chunk-level citations, log entries, notification delivery or an influence trace. Those are **verified
absences** in a frozen contract. Nor for `/channels`, `/playground` and `/docs`: those are **unbuilt screens
with an existing contract**, which is a scope question for the owner (D9), not an unverified assumption.

---

## 10. Not done (and why)

`/channels`, `/playground` and `/docs` remain honest stubs (D9, confirmed). No publish/schedule mutation
(D1-A). No validation-result UI, no post↔image link, no image preview, no chunk-level citation, no in-thread
chat citation, no memory influence trace, no log line, no notification delivery, no runbook content — each a
visible honest seam. **No client-side telemetry and no web-vitals collection** (§4.1 — measured refusal plus
a frozen-file constraint, both stated). **No enforced CSP** (authored, disabled). No Chromatic upload
(FE-RV-6 stays credential-blocked). No Docker or CI execution (FE-RV-3 / FE-RV-4 are FS15). No Lighthouse run
(FS15). No `app/` change, no ONYX token-value change, no ADR, no dependency, no threshold pre-raised.

---

**STOP — FS14 is delivered and awaits acceptance.** Ten gates were executed for real; **nine are green** and
one is RED and reported RED with its file untouched: **Prettier on `.size-limit.json`**, a pre-existing
CRLF carry-over written by the FS13 acceptance (§3), awaiting the owner's ruling exactly as FS12's was.
`pnpm size` is **766.23 / 777 kB — green**, and **no threshold change is requested**; the per-chunk evidence
is in `FS14_REPORT_SIZE_ADDENDUM.md`. Two items need the owner's word: the **Prettier carry-over**, and
whether `/api/telemetry` should ship with **no client caller** (§4.1). No README, handoff, tag or commit was
touched.

---

## 11. Acceptance addendum (2026-08-06)

**FS14 is ACCEPTED** by the owner, with two rulings.

### Ruling 1 — server-only telemetry is approved exactly as measured

The Gate A outcome (§4.1) stands as reported: the client sink was measured in two independent placements,
cost `/billing`, `/dashboard` and `/jobs` 1 kB each in both, and control build C returned a byte-identical
runtime chunk once it was removed. The pre-declared fallback — server-only — is the shipped shape, and the
owner ruled it **stays that way**: **no client caller is to be added** to `/api/telemetry`. The endpoint
**intentionally remains without a frontend producer** until a future stage judges the trade differently
(candidate: FS15, once staging exists to weigh the 1 kB against real telemetry value). This is not a gap to
be quietly closed — it is the accepted shape of the seam, and later documents cite it rather than reopening
the measurement.

### Ruling 2 — the Prettier RED is accepted as a legacy carry-over

`.size-limit.json` fails `pnpm format:check` on CRLF terminators written by the **FS13 acceptance** itself
(the threshold edit to 777 kB, mtime 2026-08-05 21:04:56 — after FS13's own Prettier gate had already run).
FS14 never opened the file. The owner ruled this the same way FS12's Prettier carry-over was ruled: **a
legacy carry-over, not a defect of this stage**, and directed that **`.size-limit.json` is not to be
modified** as part of this or any adjacent synchronization step. The RED stands in the gate table (§2) as
delivered; this addendum does not soften or reinterpret it.

### Final gate state at acceptance

| Gate | Result |
|---|---|
| ESLint · `tsc --noEmit` strict | clean · 0 errors, 0 unjustified `any` |
| Prettier | **RED — `.size-limit.json` only, accepted as a legacy carry-over (Ruling 2), file untouched** |
| Vitest | **794 passed / 102 files** |
| Playwright ×3 viewports | **400 passed · 0 failed · 17 skipped** |
| axe | **0 violations**, including the avatar menu and command palette (scanned for the first time) |
| dependency-cruiser | **0 violations** (609 modules, 1578 dependencies) |
| Storybook · contract | built (54 stories) · no new `/api/v1` path |
| `pnpm budget` | **PASS — 32 routes ≤ 180 kB** · worst `/chat` **180** (headroom **0.0 kB**) |
| `pnpm size` | **766.23 / 777 kB — green, re-confirmed at acceptance sync** (headroom 10.77 kB) |

**The 180 kB per-route First Load budget was neither revisited nor touched.** It remains the authoritative,
non-revisable UX gate, and it passed at acceptance with `/chat` at **180 / 180 — 0.0 kB of headroom**, the
tightest constraint in the project and the governing number for FS15.

**FE-RV-5 stays CLOSED. FE-RV-17 stays open**, and Ruling 1 fixes its scope going forward: the client half of
the observability seam (error boundaries, web-vitals) is not merely unimplemented but **deliberately
unimplemented until a later stage rules otherwise** — FS15 inherits that as a named decision, not an
oversight.
