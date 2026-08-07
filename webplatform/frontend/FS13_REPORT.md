# FS13 — Settings / Profile / Notification preferences (Report)

**Stage:** FS13 · **Plan:** `STAGE_FS13_PLAN.md` (approved, with the owner's rulings on D4-A, D5-B, D6, D9
and D10, plus the mid-stage ruling on the I2 deviation in §4) · **Date:** 2026-08-05 ·
**Status:** **ACCEPTED 2026-08-05** — see the acceptance addendum (§9) for the two rulings and the final gate
state.

> §§1–8 are the **delivery record** and are deliberately left as measured, including the gate that ended RED
> and the two protected routes that moved. §9 records what the owner ruled. Nothing measured is re-worded
> after the fact.

---

## 1. What was delivered

The **Account surface** — the two routes of the `(account)` group that had real screens to build. Both stop
being stubs; both are honest about the fact that most of what D3 asks for has no endpoint behind it.

| Route | What it is now | Backed by |
|---|---|---|
| `/settings/[[...section]]` | six sections — **Appearance** (real: theme + density) · **Account** (read-only identity) · **Security** (seams + an owner cross-link) · **Notifications** (real: browser-local toast preferences) · **Experience** (real: progressive disclosure) · **Advanced** (real reset + seams) | `GET /auth/me` (via the shipped FS4 session) · **no other call exists** |
| `/profile` | header + three tabs — **Overview** (identity) · **Sessions** (a verified absence) · **Activity** (the stage's one real read, actor-scoped, with the one AI surface) | `GET /audit-log?actor=` (via FS12's `entities/audit`) |

**New slices:** 2 widgets (`settings`, `profile`) · 2 features (`change-settings`, `explain-activity`).

**Deliberately NOT created — and this is a finding, not an omission:** **no entity slice at all.** Every
resource FS13 reads is already owned — identity by `entities/session` (FS4), activity records by
`entities/audit` (FS12) — and neither was opened. An `entities/preference` would have modelled a resource the
contract does not have, which is the FS12 rule that *an empty entity would be the lie*. A test asserts
`entities/{account,preference,notification-preference}` do not exist.

**FS13 declares no query key, no endpoint path and no fetcher of its own — a first for this project.**
`shared/config/query-keys.ts` and `shared/lib/api/endpoints.ts` were not opened at all, not even for the
pointer comment FS9–FS12 added.

---

## 2. Gate results — executed for real

| Gate | Result |
|---|---|
| ESLint | ✅ clean |
| Prettier | ✅ clean (repo-wide) |
| `tsc --noEmit` strict | ✅ **0 errors, 0 unjustified `any`** |
| Vitest (unit + component) | ✅ **784 passed / 101 files** (was 692 / 93) |
| Playwright E2E ×3 viewports | ✅ **356 passed · 0 failed · 16 skipped** (was 317 / 16) |
| axe | ✅ **0 violations** — Settings, the notification preferences, and all three Profile tabs, on every viewport |
| dependency-cruiser | ✅ **0 violations** (606 modules, 1574 dependencies) |
| Storybook build | ✅ built (54 story files, unchanged) |
| Contract | ✅ FS13 declares **no path of its own**; the two calls it reaches (`GET /auth/me`, `GET /audit-log?entity=&actor=`) appear **verbatim** in `API_SPEC.md` |
| `pnpm budget` | ✅ **PASS — 31 routes ≤ 180 kB** |
| `pnpm size` | ❌ **RED 765.23 / 756 kB** — threshold **untouched**, addendum filed (rule №33) |

**Per-route First Load (final build):**

`/chat` **180** · `/admin` 179 · `/knowledge` 176 · `/audit` **175** · `/providers` **154** · `/jobs` 172 ·
`/dashboard` 168 · `/studio` 165 · `/memory` **150** · `/prompts` 150 · `/analytics` 148 · `/billing` 144 ·
`/health` 139 · `/settings` **121** · `/profile` **121** · seams 111 · stubs 107 · shared commons **107**.

---

## 3. The gate that ended RED, reported RED

`pnpm size` measures **765.23 kB** against an **unchanged 756 kB**. Per rule №33 and the owner's standing
instruction, no threshold was moved, no value is proposed here and no code was un-split to flatter the
number. The dedicated per-chunk evidence is in **`FS13_REPORT_SIZE_ADDENDUM.md`**.

**Prettier is clean.** Nineteen files failed the check mid-stage; every one was authored or edited by FS13,
so all nineteen were formatted. Unlike FS12, there is **no legacy carry-over** — nothing outside this stage's
own surface was touched to make the gate pass.

---

## 4. The I2 deviation — measured, isolated by a control build, ruled by the owner mid-stage

Two protected routes moved by 1 kB each: **`/audit` 174 → 175** and **`/providers` 153 → 154**. Both are
named in plan invariant I2. Implementation **stopped** when this was found, and the owner ruled Option 1 —
keep the mechanism, report the deviation exactly as measured.

**The cause, established by four clean builds rather than by argument:**

| Build | /audit | /providers | /chat | /memory | commons | runtime gz |
|---|---|---|---|---|---|---|
| **A** baseline, pre-FS13 | 174 | 153 | **180** | **150** | 107 | 2894 |
| **B** full FS13, D5-B read side as a `shared/` module | **175** | **154** | **180** | **150** | 107 | 2940 |
| **C** control — *only* the D5-B read side removed, all other FS13 code present | **174** | **153** | **180** | **150** | 107 | 2942 |
| **D** D5-B inlined in the provider, no new module | **175** | **154** | **180** | **150** | 107 | 2939 |

- **Control C isolates it.** Removing only the toast-mute read side returns both routes to baseline.
- **Build D proves the cost is inherent, not incidental.** Inlining six lines instead of adding a module
  costs exactly the same, so this is not a module-boundary artefact that a tidier shape would avoid.
- **It is not the chunk-id map.** The runtime chunk is *smaller* in build B than in control C (2940 vs 2942).
  The growth is `NotificationProvider` itself getting larger inside the shared graph, which re-partitions two
  routes that were sitting just under a rounding boundary.
- **Build B was reproduced on a second clean build** before any cause was written down, to rule out noise.

**Why the second commons edit was unavoidable.** The plan asserted `⌘,` would be *"the stage's ONLY commons
edit"*. That assertion was wrong, and the reason is structural: a toast preference has to be consulted where
toasts are **emitted** — `NotificationProvider`, one of the frozen seven — and FSD forbids a provider
importing a feature. The read side therefore cannot live in `features/change-settings`. It is a cookie read
with no storage primitive and no imports, deliberately the smallest thing that closes the gap.

**Invariant status, reported not re-worded (rule 44):**

- **I1 — `/chat` stays 180 and the budget passes: HELD.** Byte-stable across all four builds; headroom 0.0 kB.
- **I2 — `/memory` 150 · `/dashboard` 168 · `/knowledge` 176 · `/studio` 165 · `/prompts` 150 ·
  `/analytics` 148 · `/jobs` 172 · `/billing` 144 · `/health` 139 · seams 111: HELD exactly.
  `/audit` 174 and `/providers` 153: **MISSED by 1 kB each**, attributed to control build C.
- **I3 — commons stays 107 kB; `query-keys.ts` and `endpoints.ts` gain zero rows: HELD** (both files were
  never opened).
- **I4 — `/settings` and `/profile` ≤ 180: HELD** (121 and 121, from the 107 stub baseline).
- **I5 — ONYX untouched: HELD.** No token value, no component contract, no new D2 §11 status, no ONYX MINOR.
- **I6 — no FS1–FS12 surface modified** except the declared set: **HELD**, with one addition to the declared
  list — `shared/providers/NotificationProvider.tsx` and the new `shared/lib/notifications/`, both covered by
  the owner's Option 1 ruling.
- **I7 — previous suites green without weakening: HELD.** One existing-spec update, made **stronger** (§4.3).
- **I8 — no dependency, no ADR, no token change, no threshold pre-raised, no `app/` change: HELD.**

---

## 4.1 Decision gates, executed as tasks

Three gates ran before any feature code, each with its outcome written down with its numbers.

| Gate | Measurement | Verdict |
|---|---|---|
| **`⌘,` (D10)** — a global chord is a commons row | runtime chunk **2894 gz / 5311 raw → byte-identical**; `/chat` 180, `/memory` 150, all protected routes unmoved | **SHIPS** |
| **R1c first-consumer** — FS13 would be the first product consumer of `shared/ui/switch` and `shared/ui/avatar` (both Radix packages were in **no bundle**) | probe build: runtime **2894 → 2893 gz**, raw identical; no protected route moved | **ADOPT** |
| **D14 route permissions** | `settings.manage` is already granted to **all five roles** in the shipped matrix | **no change needed** — `routes.ts` was never opened |

The first-consumer scan also produced a correction worth recording: a naive grep reported
`shared/ui/data-table` as having a consumer. It does not — the match was FS12's **comment** in
`widgets/jobs/TaskList.tsx` explaining why DataTable is *not* used. Re-scanning by real import statements
confirmed FS12's finding stands: **TanStack Table is still in no bundle.**

---

## 4.2 Defects found and fixed

1. **A REAL privacy defect, found by a component test.** `ActivityPanel` read `session?.userId` directly and
   guarded on `null`. An **empty-string** id passes that guard, and `auditPaths.list` drops a falsy actor from
   the query string — so a blank id would have silently turned a personal activity feed into the
   **platform-wide audit log**. Fixed by routing the id through `toIdentity`, which normalises `''` to `null`,
   so the two call sites cannot disagree. Locked afterwards by a source-level assertion in
   `activity-scope.test.ts` as well as the component test that caught it.
2. **A REAL fixture-ordering defect, found by the full E2E matrix.** FS13's new audit rows were dated *newer*
   than FS12's, and the audit list renders newest-first — so `/audit`'s first row changed and an FS12 journey
   that clicks the first diff failed on all three viewports. The plan had promised FS12's audit assertions
   would keep their exact inputs; additive-by-id is **not sufficient when order is itself an input** (the FS9
   lesson that sorting is part of the contract a test asserts). Fixed **in the fixture, not the spec**: the
   FS13 rows are now dated older than every FS12 row, which leaves `/audit` byte-identical while `/profile` is
   unaffected because it filters by actor.
3. **Four test-side corrections.** Three source-level assertions matched the *prose* in doc comments rather
   than the code (every FS13 file documents the rule it follows), fixed with a comment-stripping helper; and
   an E2E assertion used `getByRole('status')`, which always matches the announcer's persistent live region —
   the recorded FS5 pitfall. It now asserts the toast **copy**, which is stronger: a muted kind is neither
   shown nor announced, so the text must appear nowhere.
4. **One finding about `/users/me`.** It is not a 404-free path: `PATCH /users/{id}` exists (the owner-only
   role change), so a request for `me` reaches it and is honestly refused because `me` is not a user id. The
   negative lock asserts it can never **succeed**, rather than that no route exists.
5. **Windows/pnpm `next` corruption — 4 occurrences** (`Cannot find module './impl'`), every one
   auto-recovered by the unpiped habit. The signature was confirmed by reproducing it directly rather than
   inferred from a failing exit code. Project total: **27**.

---

## 4.3 The one existing-spec update, made stronger

`tests/unit/platform-fixtures.test.ts` asserted `expect(all.length).toBe(5)` — an exhaustive count of audit
rows. FS13 adds three, so the count is factually wrong. It was replaced with a **strictly stronger**
assertion (the FS12 precedent for exactly this situation): all five FS12 rows must still be present by id,
and each facet must now be proved both **sound** (every row returned matches the filter) and **complete** (no
matching row is withheld) — neither of which the old count checked.

---

## 5. The owner's rulings, as built

- **D4-A — cross-link only.** The Security panel links an owner to `/admin?tab=sessions`; every other role
  gets the stated absence. **No self-revoke feature exists**, and FS13 contains **no mutation at all** —
  lock-tested (no `useMutation`, no `invalidateQueries`, no `setQueryData`, no `queryClient` anywhere).
- **D5-B — browser-local notification preferences, `danger` immutable.** Four switches (success · info ·
  warning · AI). `danger` is refused three independent times: it is absent from the writable union, stripped
  by `sanitize()` on read and on write, and refused by the emitter before it reads the cookie. The E2E
  journey mutes a kind, triggers a **real** 202 intent that emits that kind, asserts the copy appears
  nowhere, then un-mutes and proves the same action **does** surface — so the first assertion cannot pass for
  the wrong reason. A muted kind is neither shown **nor announced**.
- **D6 — Experience Level ships because it is consumed.** Beginner hides advanced detail; Advanced reveals the
  cookie names, the storage key and the raw stored payload; Power adds the keyboard path. Proven by a
  component test asserting a real behavioural difference per level, and by an E2E journey that sets Advanced,
  reloads, and finds Appearance now naming `onyx-theme, onyx-density`. The copy names **which screens respond
  today** rather than promising all of them.
- **D9 — no new Inspector row, no new palette group.** An activity record *is* an audit record, so it opens
  **FS12's already-registered `audit` view** (`?inspect=audit:<id>`, E2E-proved). Settings' contextual help is
  an inline disclosure. Lock-tested.
- **D10 — `⌘,` shipped on measurement**, not on intent (§4.1).

---

## 6. Contract truth as built

- **D1 — there is no preferences resource.** D4 §4's *"user prefs (assumed)"* is refuted. Theme and density
  are cookies; experience level and muted toast kinds are local storage plus a cookie mirror. Every panel
  says so, and the RSC page carries a standing statement that nothing here is stored on the account.
- **D2 — no self-service account write.** No `PATCH /users/me`, no password change, no avatar upload, no name
  column. Identity is read-only; initials are drawn from the email. **No password input exists anywhere on
  the surface** — asserted by a component test.
- **D3 — Security is three absences and one owner-only action.** No MFA call, no login journal, no session
  inventory. **No MFA state is rendered at all**, because `mfa_enabled` arrives as an optional wire field
  that `mapAuthMe` defaults to `false` — the console cannot distinguish "MFA is off" from "the response did
  not mention MFA", and rendering "disabled" would be a fabrication. This is recorded in FE-RV-16.
- **D7 — accent is not selectable.** ONYX ships one accent; an alternative is a D4 §12/§13 design change. The
  screen states this instead of offering a one-option picker.
- **D8 — Advanced holds no platform parameters.** Appendix-B values are channel-scoped and belong to the
  Channels screen; the panel points there rather than showing a second copy.
- **D11 — activity is actor-scoped or absent**, and the roles the frozen matrix excludes (editor, viewer)
  meet a **permission state inside the screen**.
- **D12 — one AI surface.** `explain-activity`, user-invoked, over loaded records only, through the
  **unchanged** FS6 relay, with a prompt unit-proven to forbid security advice, completeness claims, intent,
  risk and anomaly — and to carry field **names** but not field **values**. D3 §23's parameter explainer is a
  seam: its cited source would be Documentation, which is not built and has no endpoint.

---

## 7. FE-RV-16 opened

**Live account round-trip.** Above all: **whether `GET /auth/me` carries a stable user `id`** — the single
fact that decides whether a personal activity feed is possible at all (without it the panel renders an honest
absence and never widens to the platform log) · whether it carries anything beyond `{user, role}` · **whether
`mfa_enabled` is a real wire field or an FS4 assumption** (today it is indistinguishable from absent, so no
MFA state is shown) · whether `GET /audit-log?actor=` accepts the caller's own id, how it paginates and
whether it is ordered newest-first · whether a preferences resource ever appears.
**Single adjustment points:** `widgets/profile/identity.ts`, the actor-scoped call in
`widgets/profile/ActivityPanel.tsx`, and `features/change-settings/model/preferences.ts`. Identity mapping
stays where FS4 put it (`mapAuthMe`, the FE-RV-7 adjustment point) and was not duplicated.

**No FE-RV was opened for notification delivery, MFA enrolment, password change, avatar upload, session
inventory, sign-in history, data export or SSO** — those are **verified absences** in a frozen contract, each
protected by the negative-lock test.

---

## 8. Not done (and why)

Everything in the plan §8 holds. Channels, Playground, Chat History, Documentation and Landing remain honest
stubs. `/notifications` (FS12's verified absence) was not reopened. No preferences endpoint, no account
self-edit, no password change, no MFA enrolment, no avatar upload, no session inventory, no login journal, no
data export, no SSO, no accent picker, no cross-device sync, and **no rollout of progressive disclosure to
the other screens** — that is FS14 work and the UI says so rather than implying it. Each is a visible honest
seam, because the frozen contract carries no call for it or the frozen design carries no token for it.

---

**STOP — FS13 is delivered and awaits acceptance.** One gate ended RED and is reported RED with its threshold
untouched: **size-limit** (765.23 / 756 kB, `FS13_REPORT_SIZE_ADDENDUM.md`). Invariant **I2 is reported
MISSED on two routes** with control build C attached, exactly as measured and as ruled mid-stage. No README,
handoff, tag or commit was touched.

---

## 9. Acceptance addendum (2026-08-05)

**FS13 is ACCEPTED** by the owner, with two rulings.

### Ruling 1 — the I2 deviation is accepted exactly as measured

`/audit` 174 → **175** and `/providers` 153 → **154** stand as reported. The owner accepted the evidence pack
as sufficient — four clean builds, control build C, build D, byte-stable `/chat` and `/memory`, and a
reproducible attribution to the D5-B toast-mute read side — and directed that the deviation **not be
re-worded, reinterpreted or "improved"**. §4 is therefore unchanged, and this addendum adds no new
explanation of it.

The accepted interpretation, in the owner's terms:

- `/chat` (180) and `/memory` (150), the two primary protected routes, remain byte-stable.
- `pnpm budget` still passes — 31 routes ≤ 180 kB.
- The movement is limited to `/audit` 174→175 and `/providers` 153→154.
- The cause is isolated by control build C.
- The behaviour is real, reproducible and architecture-driven, not hypothetical.

**Invariants I1 and I2 remain reported as they were measured.** Acceptance does not re-write them.

### Ruling 2 — size-limit accepted under rule №33

The detector is re-baselined **from the measurement, after it** — the ninth such ruling in the project
(FS5 → 485 · FS6 → 560 · FS7 → 598 · FS8 → 628 · FS9 → 655 · FS10 → 677 · FS11 → 696 · FS12 → 756 ·
**FS13 → 777**). Derivation and confirmation are in `FS13_REPORT_SIZE_ADDENDUM.md` §7.

```
Size limit: 777 kB
Size:       765.23 kB gzipped      pnpm size exit 0 — headroom 11.77 kB
```

**The 180 kB per-route First Load budget was neither revisited nor touched.** It remains the authoritative,
non-revisable UX gate, and it passed on delivery with `/chat` at **180 / 180 — 0.0 kB of headroom**, the
tightest constraint in the project and the governing number for FS14.

### Final gate state at acceptance

| Gate | Result |
|---|---|
| ESLint · Prettier · `tsc --noEmit` strict | clean · clean (repo-wide) · 0 errors, 0 unjustified `any` |
| Vitest | **784 passed / 101 files** |
| Playwright ×3 viewports | **356 passed · 0 failed · 16 skipped** |
| axe | **0 violations** |
| dependency-cruiser | **0 violations** (606 modules, 1574 dependencies) |
| Storybook · contract | built (54 stories) · every path verbatim in `API_SPEC.md` |
| `pnpm budget` | **PASS — 31 routes ≤ 180 kB** · worst `/chat` **180** (headroom **0.0 kB**) |
| `pnpm size` | **765.23 / 777 kB** (ninth measured re-baseline) |

**Post-FS13 standing reference numbers:** `/chat` **180** · `/admin` 179 · `/knowledge` 176 · `/audit` **175**
· `/jobs` 172 · `/dashboard` 168 · `/studio` 165 · `/providers` **154** · `/memory` 150 · `/prompts` 150 ·
`/analytics` 148 · `/billing` 144 · `/health` 139 · `/settings` **121** · `/profile` **121** · seam routes 111
· stubs 107 · shared commons 107.

**FE-RV-16 opened and owner-accepted as Runtime Verification, not a defect.**
