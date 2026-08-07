# FS12 — Platform & Admin (Report)

**Stage:** FS12 · **Plan:** `STAGE_FS12_PLAN.md` (approved, with the owner's rulings on D9-A, D12-A,
D14-B and the D1 sub-ruling) · **Date:** 2026-08-04 · **Status:** **ACCEPTED 2026-08-04** — see the
acceptance addendum (§10) for the two rulings and the final gate state.

> §§1–9 are the **delivery record** and are deliberately left as measured, including the two gates that
> ended RED. §10 records what the owner ruled. Nothing measured is re-worded after the fact.

---

## 1. What was delivered

The **Platform & Admin surface** — all nine routes of the `(platform)` group. Six of them now read the
frozen contract for real; three are honest, specific absence surfaces because the contract carries no call
for them at all.

| Route | What it is now | Backed by |
|---|---|---|
| `/admin` | Users & Roles · Sessions · Config Versions, with a **real client-side snapshot diff** and a guarded rollback | `GET\|POST /users` · `PATCH /users/{id}` · `POST /auth/sessions/revoke` · `GET /config-versions` · `POST /config-versions/{id}/rollback` |
| `/jobs` | the Task Monitor: contract filters in the URL, attention-first ordering, three confirmed **202 queue intents** | `GET /tasks?status=&type=&channel_id=` · `GET /tasks/{id}` · `POST /tasks/{id}/{cancel,run,requeue}` |
| `/audit` | the immutable record with a **real before→after diff** and a client-side CSV | `GET /audit-log?entity=&actor=` |
| `/health` | liveness ≠ readiness, probes rendered **only** as readiness names them, unknown stays grey | `GET /health/live` · `GET /health/ready` |
| `/providers` | the **write-only key surface**: slot presence, rotation, provider health only where readiness names it | `GET\|PUT /api-keys` · `GET /health/ready` |
| `/billing` | the platform-wide cost view on the contract's own facet (owner-ruled **D9 Option A**) | `GET /cost?group_by=` |
| `/logs` · `/flags` · `/notifications` | honest seams: fact · reason · what would change it, on every viewport | **nothing — no endpoint exists** |

**New slices:** 7 entities (`platform-user`, `config-version`, `audit`, `job-queue`, `probe`, `api-key`,
`cost-report`) · 6 features (`manage-users`, `rollback-config`, `requeue-job`, `export-audit`, `rotate-key`,
`explain-job`) · 7 widgets · 6 Inspector views behind **one** lazy chunk · a palette `#` **Platform** group
(the fifth distinct group) · type-only `platform` shortcut scope.

**Deliberately NOT created:** `entities/flag`, `entities/log`, `entities/notification`,
`entities/provider`, `entities/session`. Stage 3 §4 planned all five; the frozen contract models nothing for
them, and an empty entity would have been the lie. A test asserts they do not exist.

---

## 2. Gate results — executed for real

| Gate | Result |
|---|---|
| ESLint | ✅ clean |
| Prettier | ❌ **RED on ONE pre-existing FS11 file** — see §3.1. Every FS12 file is clean. |
| `tsc --noEmit` strict | ✅ **0 errors, 0 unjustified `any`** |
| Vitest (unit + component) | ✅ **692 passed / 93 files** (was 542 / 86) |
| Playwright E2E ×3 viewports | ✅ **317 passed · 0 failed · 16 skipped** (was 261 / 15) |
| axe | ✅ **0 violations** — **two REAL defects were caught by the gate and fixed** (§4) |
| dependency-cruiser | ✅ **0 violations** (585 modules, 1517 dependencies) |
| Storybook build | ✅ built (54 story files, unchanged) |
| Contract | ✅ every path used appears **verbatim** in `API_SPEC.md`; no path is written down that the contract lacks |
| `pnpm budget` | ✅ **PASS — 31 routes ≤ 180 kB** |
| `pnpm size` | ❌ **RED 744.7 / 696 kB** — threshold **untouched**, addendum filed (rule №33) |

**Per-route First Load (final build):**

`/chat` **180** · `/admin` **179** · `/knowledge` 176 · `/audit` **174** · `/jobs` **172** · `/dashboard` 168 ·
`/studio` 165 · `/providers` **153** · `/memory` **150** · `/prompts` 150 · `/analytics` 148 ·
`/billing` **144** · `/health` **139** · seam routes **111** · stubs 107 · shared commons **107**.

---

## 3. Gates that ended RED, reported RED

### 3.1 Prettier — one file, and it is not FS12's

`tests/e2e/analytics.spec.ts` fails `prettier --check`. Measured, not assumed:

```
mtime            2026-08-03 17:09   (FS11's day; FS12's own spec is 2026-08-04 20:10)
line terminators CRLF               (the only file in the repo with them)
```

FS12 never opened this file, and it is inside the §3.3 no-touch set. Fixing it is a whitespace-only
`prettier --write`, but it would modify an FS11 surface, so **it was not touched**. The owner's call; the fix
is one command and changes no semantics.

### 3.2 size-limit — 744.7 / 696 kB

Reported RED with the threshold untouched, per rule №33 and the owner's requirement 5. The dedicated
per-chunk evidence is in **`FS12_REPORT_SIZE_ADDENDUM.md`**; no decision is assumed here.

---

## 4. Defects found and fixed

1. **REAL budget/architecture defect (the stage's headline).** The first full build put `/jobs` at
   **183 kB** and `/admin` at **181 kB**, over the 180 budget. Diagnosed from `app-build-manifest.json`
   before any claim was written: `/jobs` carried an 8.5 kB route-only chunk containing **TanStack Query's
   mutation machinery and Next's `dynamic()` client runtime**, pulled in because the eager list view called
   `useQueueIntents`. Fixed **structurally**: the lazy `QueueIntentActions` now owns its own mutation hook,
   the platform dialogs (`CreateUserDialog`, `RotateKeyDialog`) became `dynamic()`, and the Jobs honesty
   block moved out of the client view into the RSC page. `/jobs` 183 → **172**, `/admin` 181 → **179**,
   `/providers` 162 → **153**. No threshold was moved.
2. **REAL a11y defect — `heading-order`** (axe, all viewports): the config Comparison heading was an `h3`
   directly under the page `h1`. Fixed by promoting the platform panel headings to `h2` (one `h1` per
   screen; composed blocks use `h2` — the FS11 fix applied again).
3. **REAL a11y defect — `scrollable-region-focusable`** (axe): the seam screens have zero interactive
   elements, which left the scrollable `#main-content` region unreachable by keyboard. Fixed **in the
   content, never in the shell** (the FS7 rule): each seam now carries real navigation to the screens with
   the nearest real data — which the reader needed anyway.
4. **Test-side corrections (5).** Strict-mode collisions on repeated copy (`Dead (DLQ)` also appears in the
   honesty prose; `owner@console.local` also appears in a Select's `sr-only` label; `Key stored` collides
   with the announcer — the recorded FS5 pitfall); the `/403` state renders an EmptyState title, not a
   heading; the billing comparison raced the lazily-rendered chart axis, so it now compares the row list.
5. **One I7-legal existing-spec update.** `tests/unit/fixtures.test.ts` asserted an exhaustive task-id list;
   FS12 adds admin-scope rows, so the assertion was made **stronger, not weaker** — every returned row must
   match the filter, and the FS5 rows must still be present.
6. **An observed flake, reported not hidden.** `tests/component/AiComponents.test.tsx` (an FS3-era suite)
   timed out on a *different* disclosure test in two of three full-suite runs and passed in isolation every
   time; run #3 and every run since were fully green (692/692). It is concurrency-sensitive, not an FS12
   regression, and it is recorded here rather than smoothed over.
7. **Windows/pnpm `next` corruption — 1 occurrence** (`Cannot find module './impl'`, #23), auto-recovered by
   the unpiped habit.

---

## 5. The owner's five requirements

1. **T-FS12.1 as the mandatory gateway — honoured, and it changed the stage.** `shared/ui/data-table` had
   **zero product consumers**; a probe consumer moved the webpack runtime chunk 2761 → 2819 B gz, which
   rounded `/memory` 149 → **150**. A control build with the probe removed returned the runtime chunk to a
   **byte-identical** 2761 and `/memory` to 149. Protected route moved ⇒ the plan's pre-declared structural
   fallback was executed immediately: **DataTable is not used in FS12**; the four tables are ONYX-primitive
   lists with the same interaction contract.
2. **`entities/job-queue` isolated — proved.** It imports nothing from `entities/job`; `entities/job`'s
   barrel gained nothing. Lock-tested (anchored so `@/entities/job` cannot match `@/entities/job-queue`).
3. **Queue keys independent — proved in both directions.** Rooted at `['queue', …]`, never `'jobs'`,
   because three shipped features already invalidate the bare prefix `['jobs']`. The lock test asserts that
   prefix cannot match any queue key and that no queue filter can match the FS5 dashboard keys.
4. **Every protected-route movement explained by measurement.** Three builds plus two controls — §6.
5. **Rule №33 followed exactly.** size-limit is RED at its **unchanged** 696 kB; the addendum is filed and no
   decision is presumed.

---

## 6. Protected-route movements — measured, with two control builds

| Build | /chat | /memory | /dashboard | /knowledge | /studio | /prompts | /analytics | commons | runtime (gz) |
|---|---|---|---|---|---|---|---|---|---|
| **A** baseline (pre-FS12) | **179** | **149** | 168 | 176 | 165 | 150 | 148 | 107 | **2761** |
| **B** full FS12 | **180** | **150** | 168 | 176 | 165 | 150 | 148 | 107 | **2895** |
| **C** control — FS12 routes reverted to stubs, all other FS12 code present | **179** | **150** | 168 | 176 | 165 | 150 | 148 | 107 | **2789** |
| **D** control — routes present, palette Platform group removed | **180** | **150** | 168 | — | — | — | — | 107 | **2895** |

**What the measurements establish, without a hypothesis:**

- **`/chat` 179 → 180 is caused by the FS12 ROUTE SET.** Control C removes only the nine routes and returns
  `/chat` to 179 with the runtime chunk falling 2895 → 2789. Nine new real routes and their chunk-id entries
  grow the webpack runtime map, which lives in "First Load JS shared by all".
- **`/memory` 149 → 150 is NOT the routes and NOT the palette.** It reads 150 in control C (routes gone) and
  150 in control D (palette group gone). The remaining FS12 code reachable from commons is the Inspector
  registry's single lazy `PlatformInspector` reference: control C's runtime chunk is 2789 vs the 2761
  baseline — **+28 B gz in commons**, which is enough to tip a route sitting just under the rounding
  boundary. `/memory` has moved on exactly this kind of change twice before (148 → 149 at FS9, 149 at FS11).
- **Four protected routes did not move at all:** `/dashboard` 168, `/knowledge` 176, `/studio` 165,
  `/prompts` 150, `/analytics` 148, and shared commons stayed 107.

**Invariant status, reported not re-worded (rule 44):**

- **I1 — `/chat` stays 179: MISSED by 1 kB** (now 180/180). The authoritative 180 kB UX budget **holds** and
  the gate passes, but headroom is now **0.0 kB**.
- **I2 — `/memory` stays 149: MISSED by 1 kB** (now 150). Every other protected route in I2 held exactly.
- **I3 — commons 107 kB, zero rows in either commons module: HELD.**
- **I4 — every platform route ≤ 180: HELD** (worst new route `/admin` 179).
- **I5 — ONYX untouched: HELD.** No token value, no component contract, no new D2 §11 status (D14-B).
- **I6 — no FS5–FS11 surface modified** except the eight declared files: **HELD**.
- **I7 — previous suites green without weakening: HELD** (the one update is strictly stronger).
- **I8 — no dependency, no ADR, no threshold pre-raised, no `app/` change: HELD.**

The `/chat` movement leaves the tightest constraint in the project at **zero headroom**. FS13 cannot add a
single commons byte without moving it over, and that is the most important number in this report.

---

## 7. Contract truth as built (the deviations, realised)

- **D2 Providers · D3 Logs · D4 Flags · D5 Notifications** — no endpoint exists; each is an honest seam that
  names the fact, the reason and the remedy, on every viewport. **No fixture carries a log line, a flag row,
  a notification or an invoice**, and a negative-lock test asserts the resolver answers nothing for
  `/providers`, `/logs`, `/flags`, `/notifications`, a session inventory or an export path.
- **D6 Sessions** — revocation exists, enumeration does not: a guarded per-user revoke plus a stated absence.
- **D7 Admin writes** — *Create user*, never *Invite*; no deactivate (the column exists, the write does not);
  the config comparison is a pure client-side diff of two **served** snapshots, and a version whose payload
  the wire omitted says so instead of comparing nothing. Role changes are **confirmed, never optimistic**.
- **D8 Audit** — only `?entity=` and `?actor=` are sent; export is a client-side CSV of loaded rows.
- **D9-A Billing** — the platform-wide cost view; plan, invoices, budgets and **forecast** are named seams.
- **D10/D11 RBAC** — `admin` lost `admin.users.manage` and `admin.providers.manage` (the frozen matrix gives
  them to the owner alone); `/jobs` and `/providers` moved to `platform.manage`. An admin on Admin now sees a
  **permission state inside the screen**, not an affordance the server would refuse.
- **D12-A AI** — one surface: `explain-job`, single-record, `content.edit`-gated, over the **unchanged** FS6
  relay, with a prompt unit-proven to forbid invented log lines, root causes the record does not state,
  retry predictions and destructive recommendations.
- **D13 Secrets** — the key value exists only as a request body: no draft, store, cache, query key, cookie,
  toast, error or fixture holds it; the VM has **no field able to hold one**; the field is `type="password"`,
  never pre-filled, cleared on submit and close. Locked by `secret-writeonly.test.ts` (18 assertions) and by
  an E2E journey that types a key and asserts it appears nowhere afterwards.
- **D14-B Statuses** — the five with an exact D2 §11 equivalent are mapped; `deferred`, `cancelled` and
  `dead` render as **explicit raw labels**. No ONYX status was registered and no token added.

---

## 8. FE-RV-15 opened

**Live platform & admin round-trip.** The open questions and their single adjustment points are listed in
the plan §5.3 — above all **whether `GET /config-versions` carries the `snapshot` payload** (the fact that
decides whether the client diff is possible at all), **what `GET /api-keys` returns when values are
withheld**, and **whether `/health/ready` enumerates providers by name** (the switch that turns the Providers
health panel from a seam into real data). Adjustment points:
`entities/{platform-user,config-version,audit,job-queue,probe,api-key,cost-report}/{model,paths,keys}.ts`
plus the `manage-users` and `rotate-key` request bodies.

**No FE-RV was opened for logs, flags or notifications** — those are not unverified assumptions but
**verified absences** in a frozen contract.

---

## 9. Not done (and why)

Everything in the plan §8 holds. Nothing was added beyond scope. In particular: no bulk job actions, no log
tail, no flag toggle, no notification record, no invoice, no forecast, no probe history, no provider
capability matrix, no "test connection", no session inventory, no user deactivation — **each because the
frozen contract carries no call for it**, and each stated on screen rather than approximated.

---

**STOP — FS12 is delivered and awaits acceptance.** Two gates ended RED and are reported RED with their
evidence and thresholds untouched: **Prettier** (one pre-existing FS11 file, §3.1) and **size-limit**
(744.7 / 696 kB, `FS12_REPORT_SIZE_ADDENDUM.md`). No README, handoff, tag or commit was touched.

---

## 10. Acceptance addendum (2026-08-04)

**FS12 is ACCEPTED** by the owner, with two rulings.

### Ruling 1 — size-limit: Option A

The detector is re-baselined **from the measurement, after it**, exactly as rule №33 requires — the eighth
such ruling in the project (FS5 → 485 · FS6 → 560 · FS7 → 598 · FS8 → 628 · FS9 → 655 · FS10 → 677 ·
FS11 → 696 · **FS12 → 756**).

```
Size limit: 756 kB
Size:       744.7 kB gzipped      pnpm size exit 0 — headroom 11.30 kB
```

The value is derived, not chosen: **744.70 measured + 10.92 kB**, the exact headroom the owner granted at the
FS11 ruling, rounded up to the next whole kB. `.size-limit.json` changed on one line and nothing else.

**The 180 kB per-route First Load budget was neither revisited nor touched.** It remains the authoritative,
non-revisable UX gate, and it passed on delivery with `/chat` at **180 / 180 — 0.0 kB of headroom**, the
tightest constraint in the project and the governing number for FS13.

### Ruling 2 — Prettier: legacy carry-over, formatting only

`tests/e2e/analytics.spec.ts` (an FS11 file FS12 never opened) was formatted. The change is **line endings
only**, proved rather than asserted:

```
diff of both files with CR stripped   ->  IDENTICAL
byte delta                            ->  12545 - 12267 = 278 = exactly the 278 CR characters removed
file(1) after                         ->  no CRLF terminators
```

No semantic change, no selector change, no assertion change, no logic change. Verified two ways:
`pnpm format:check` is clean across the whole repository (exit 0), and the spec re-runs green
(**15 passed**, desktop-dark).

### Final gate state at acceptance

| Gate | Result |
|---|---|
| ESLint · Prettier · `tsc --noEmit` strict | clean · **clean (repo-wide)** · 0 errors, 0 unjustified `any` |
| Vitest | **692 passed / 93 files** |
| Playwright x3 viewports | **317 passed · 0 failed · 16 skipped** |
| axe | **0 violations** |
| dependency-cruiser | **0 violations** (585 modules, 1517 dependencies) |
| Storybook · contract | built (54 stories) · every path verbatim in `API_SPEC.md` |
| `pnpm budget` | **PASS — 31 routes <= 180 kB** · worst `/chat` **180** (headroom **0.0 kB**) |
| `pnpm size` | **744.7 / 756 kB** (eighth measured re-baseline) |

**Post-FS12 standing reference numbers:** `/chat` **180** · `/admin` 179 · `/knowledge` 176 · `/audit` 174 ·
`/jobs` 172 · `/dashboard` 168 · `/studio` 165 · `/providers` 153 · `/memory` **150** · `/prompts` 150 ·
`/analytics` 148 · `/billing` 144 · `/health` 139 · seam routes 111 · stubs 107 · shared commons 107.

**Invariants I1 and I2 remain reported as MISSED by 1 kB each** (`/chat` 179 -> 180, `/memory` 149 -> 150),
with their two control builds on record (§6). Acceptance does not re-write them.

**FE-RV-15 opened and owner-accepted as Runtime Verification, not a defect.**
