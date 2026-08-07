# FS13 — Settings / Profile / Notification preferences (Plan)

**Track:** Web Platform implementation · **SoT:** `FRONTEND_MASTER_SPEC.md` · implements the **Account
surface** (D1 §5.2 surface 3 / §5.3 — **D3 §23 Settings · §24 User Profile**, plus the **preferences half of
D3 §22 Notifications**, which the owner's FS12 D1 sub-ruling assigned to this stage) through Stage 2 §5
(rendering group *"Settings / Profile: RSC + client forms; theme/density applied SSR (cookie) to avoid
FOUC"*), §7 (six state owners), §9 (budgets), and the Stage 3 inventories (§1 route group
`(account)/{settings,profile,docs}` · §5 routing rows `/settings/*` *"personal/all, instant, inline error"*
and `/profile` *"self, skeleton, session"* · §3 feature `change-settings` — *"theme/density/experience/
security"* · §6 hooks `useExperienceLevel` / `useDensity` / `useTheme` / `useThemePreference`).

**This is a PLAN. No code yet.**

**The headline finding of the contract check.** D4 §4 row 23 marks the Settings screen's API as
***"user prefs (assumed)"***. That assumption is refuted: **the frozen `/api/v1` carries no preferences
resource of any kind** — no `GET/PUT /preferences`, no per-user settings object, no notification-preference
call — and the frozen 25 tables carry **no preferences column on `users`** (`id · email · role ·
password_hash · mfa_secret_ref · status`, DATABASE_SPEC §users). Nor is there a self-service account write:
**no `PATCH /users/me`**, no password change, no avatar upload, no e-mail change; `PATCH /users/{id}` is
owner-only and documented for **role** alone (FS12 D7). This is the FS9/FS12 precedent again — D4 §4's
*(assumed)* `POST /images` did not exist either — and it is decided the same way.

**The consequence is not that Settings cannot be built. It is that Settings is REAL but BROWSER-LOCAL.**
Theme, density, sidebar state and active channel have persisted to **cookies** since FS1 and are applied
**server-side with no FOUC**; that machinery is genuine, shipped, and today has no screen. FS13 gives it one.
What FS13 must never do is let a browser-local preference look like an account setting, or render a control
that changes nothing — the §R10.3 honesty rule applied to preferences (a preference that does nothing is a
fabricated capability, exactly like a fabricated metric).

**Goal of FS13:** give the operator the **account surface** — how the console looks and behaves for them,
who they are, and what they have done — on **exactly the calls the contract carries** (`GET /auth/me`,
`GET /audit-log?actor=`), with every absent capability stated as fact · reason · what would change it, on
every viewport. Two routes stop being stubs (`/settings`, `/profile`). **No `app/` / Protocol /
MASTER_SPEC change · no endpoint invented · no ONYX token-value change · no new dependency · no threshold
pre-raised · and — the governing constraint — ZERO commons bytes.**

**Entry conditions — satisfied.** FS12 accepted 2026-08-04 (size-limit re-baselined to **756 kB** after a
dedicated addendum; the Prettier legacy carry-over ruled; **invariants I1 and I2 reported MISSED by 1 kB
each with two control builds, and acceptance did not re-word them**; FE-RV-15 opened). Post-FS12 standing
references: **`/chat` 180 / 180 — ZERO headroom** · `/admin` 179 · `/knowledge` 176 · `/audit` 174 ·
`/jobs` 172 · `/dashboard` 168 · `/studio` 165 · `/providers` 153 · `/memory` 150 · `/prompts` 150 ·
`/analytics` 148 · `/billing` 144 · `/health` 139 · seams 111 · stubs 107 · shared commons 107. This plan is
FS13's first deliverable. Frozen FS13 entry duties (handoff PART4 §8.2): the account surfaces per D3 §23/§24
and the preferences half of §22 · **theme/density applied SSR from the cookie with NO FOUC preserved** · the
**seven fixed artefacts** (PART1 §4.5/§4.6 → §3.1–§3.7 below) · **ZERO commons bytes — at 180 / 180 this is a
wall, not a target** · a named primary protected route checked twice (rule 52) · a pre-declared fallback for
every first-consumer or commons-touching gate (rule 58).

---

## 1. Scope

**IN:**

- **T-FS13.1 — the ZERO-commons lock, the protected-route baseline, and THREE pre-declared decision gates
  (FIRST, before any account screen exists).** Nothing in FS13 is more important than this task, because
  `/chat` has **0.0 kB** of headroom and every commons byte fails `pnpm budget`:
  1. **Zero commons rows — and this stage aims lower: zero commons EDITS.** FS13 introduces no server
     resource, therefore **no query key and no endpoint path at all**: `shared/config/query-keys.ts` and
     `shared/lib/api/endpoints.ts` are **not opened** — not even for the pointer comment FS9–FS12 added.
     Activity reads reuse `entities/audit`'s existing FS12 hooks and keys verbatim; identity reuses the FS4
     `['session']` query. Locked by a grep test asserting that no FS13 module declares a query key, a path
     builder or an `apiFetch` call of its own.
  2. **The `entities/session` commons trap — verified, then avoided.** `AuthProvider` sits in the frozen
     seven-provider tree, so `entities/session` is **already in every route's First Load**. Extending its
     barrel with a profile projection would tax all 31 routes — the FS12 `entities/job` lesson in its most
     expensive form (R1f). T-FS13.1 verifies the exposure against `app-build-manifest.json` and **declares
     `entities/session` frozen**; the profile's identity projection is a pure widget-level module (the FS9
     precedent, where `entities/image` never imported a sibling entity and the scene was resolved in the
     widget).
  3. **The `⌘,` DECISION GATE with a pre-declared fallback.** D3 §23 lists `⌘,` as a Settings entry point.
     A **global** chord is a row in `shared/config/shortcuts.ts`, which is **commons** (the T-FS8.1 split put
     handlers in commons and the catalogue in the lazy cheat-sheet chunk). T-FS13.1 measures the webpack
     runtime chunk and the full 31-route table before and after adding it. **Pre-declared outcome rule — no
     argument, no hypothesis:** if `/chat` and every other protected route are unmoved, `⌘,` ships; **if any
     protected route moves, `⌘,` is abandoned** and its absence is recorded honestly — the palette `@` mode
     already reaches `/settings` through the FS1 route registry at zero cost, and the cheat-sheet says so.
  4. **The R1c first-consumer check.** `shared/ui/data-table` and `shared/ui/code-block` **still have zero
     product consumers** (FS12 refused DataTable on measurement; TanStack Table reaches no bundle). FS13
     needs neither — the settings panels are ONYX form primitives and the activity list is the
     `DocumentList`/`PromptTypeList`/`ImageGrid` pattern. The check is executed as a **task**, not asserted:
     the module-consumer scan is recorded, and if any FS13 module would become the first consumer of an
     unreferenced heavy `shared/ui` module, the runtime chunk is measured before/after with the same
     pre-declared fallback (build it from ONYX primitives).
  5. **The protected-route baseline.** `pnpm budget` + `app-build-manifest.json` captured **before any FS13
     code**, so every later movement is a byte comparison rather than a recollection (rule 52).
  6. **Route-permission verification (D14).** The `/settings` and `/profile` rows in `shared/config/routes.ts`
     are read and compared against D3 §23/§24 (*personal settings for all roles*); a correction, if needed,
     is a **string swap with no row added**, measured like FS12's D11 package.
- **No new entity slice (T-FS13.2) — deliberately, and this is a finding, not an omission.** Every resource
  FS13 reads is already owned: **identity** by `entities/session` (FS4, and frozen — see above) and
  **activity records** by `entities/audit` (FS12, read-only by construction, already carrying the contract's
  own `?actor=` facet). Creating an `entities/account` would duplicate two shipped slices for no capability;
  creating an `entities/preference` would model a resource **the contract does not have** — the FS12 rule
  that *an empty entity would be the lie*. Pure projections (initials from an e-mail, role label, the
  activity view-model) live at **widget level**, the FS9 precedent. A test asserts `entities/account`,
  `entities/preference` and `entities/notification-preference` do not exist.
- **The preferences module (T-FS13.3) — ONE storage toucher.**
  `features/change-settings/model/preferences.ts` is the **only** module in FS13 that touches storage (the
  `ConversationRepository` discipline at feature scale — FS6 — re-applied at FS10 by `promptDraft.ts`).
  It owns a **versioned** payload over the FS6 `shared/lib/persist` primitive, defaults for every field, and
  graceful degradation of an unknown or corrupt payload to defaults. **Theme and density are NOT moved into
  it** — they keep their existing cookie mechanism untouched (§3.3), because that is what makes SSR-with-no-
  FOUC work and because moving them would edit commons.
- **`/settings` (T-FS13.4–T-FS13.7):** `app/(account)/settings/[[...section]]/page.tsx` (RSC) +
  `widgets/settings` with the D3 §23 nav — **Appearance · Account · Security · Notifications · Experience ·
  Advanced** — as a two-pane layout on desktop/tablet and top tabs on mobile, the section living in the
  **path** (Back-reversible, §3.5):
  - **Appearance — REAL.** Theme (dark/light) and density (comfortable/compact) written through the
    **existing** FS1/FS2 store actions and cookies; applied optimistically, persisted per browser, and
    **stated as browser-local**, not account-synced (D1). Accent is an honest absence (D7).
  - **Account — READ-ONLY.** E-mail and role from `GET /auth/me` (the shipped FS4 session), avatar as
    deterministic initials (D2 §22 — the contract carries no name and no image), with a stated absence for
    editing identity, changing the password and uploading an avatar (D2 deviation).
  - **Security — SEAMS + one cross-link.** No MFA endpoint, no login journal, no session inventory, and a
    revoke that the frozen matrix gives to the **owner alone** (D3). Rendered per the D4 ruling.
  - **Notifications — per the D5 ruling** (verified absence, or console-local toast preferences with the
    danger kind never mutable).
  - **Experience — REAL and CONSUMED** (D6): Beginner / Advanced / Power, persisted locally, and **actually
    changing what the FS13 surfaces reveal**, with copy that factually names where it applies today.
  - **Advanced — reset preferences to defaults (real, local), plus stated absences** for data export and SSO,
    and an explicit pointer that channel/pipeline parameters (`LEAD_TIME`, `SIMILARITY_THRESHOLD`, the rest of
    MASTER_SPEC §Appendix B) are **channel-scoped** (`channel_settings`, `GET|PUT /channels/{id}/settings`)
    and therefore live on the Channels screen (D3 §13) — not here, and not invented here.
- **`/profile` (T-FS13.8–T-FS13.9):** `app/(account)/profile/page.tsx` (RSC) + `widgets/profile` — the D3 §24
  header (avatar · e-mail · role) and three tabs in the URL: **Overview** (identity, read-only) ·
  **Sessions** (the honest absence, per D4) · **Activity** — the stage's one real read:
  `GET /audit-log?actor=<me>` through **FS12's existing `entities/audit` hooks**, gated by the same permission
  that gates `/audit`, with a **permission state inside the screen** for the roles the frozen matrix excludes
  (editor, viewer — the FS12 rule-64 pattern), an ONYX ActivityFeed/Timeline rendering, `j/k/↵`, and
  `?inspect=audit:<id>` opening **FS12's already-registered `audit` Inspector view** (D9: zero new registry
  rows). If the session wire carries no user id, the panel renders an **honest absence** and never falls back
  to the platform-wide log (D11).
- **AI (T-FS13.10) — exactly ONE surface: `features/explain-activity`.** D3 §24's *"AI summarizes your recent
  activity"*, user-invoked, over the **loaded, actor-filtered** records only, through the **UNCHANGED** FS6
  relay, with `buildActivityPrompt` unit-proven to carry only those records and to **forbid** security advice
  or "tips" (a recommendation with no data), any claim about actions outside the loaded slice, any claim of
  completeness, intent attribution, and risk scoring. Trust + Explainability per D3 A6/A7, **confidence
  honestly absent**, wire cost only. D3 §23's *"AI explains each parameter"* is a **seam** (D12).
- **Fixtures (T-FS13.11):** deterministic, additive-only — audit rows whose `actor` is the fixture user, so
  the activity panel has real data for the roles that may read it, and an empty-activity scenario. Plus the
  **negative locks** (the FS12 first): a test asserting the fixture resolver answers **nothing** for
  `/users/me`, any preferences path, any password or MFA path, any session inventory, any avatar upload and
  any notification-preference path — so a future contributor cannot quietly invent one.
- **Navigation, shortcuts, seams (T-FS13.12):** **no new palette group and no new Inspector registry row**
  (D9); the existing `@` Go-to mode already resolves `/settings` and `/profile` from the FS1 route registry.
  `⌘⇧L` / `⌘⇧D` / `⌘\` are reused unchanged. `⌘,` ships only if T-FS13.1's gate says it fits. Catalogue rows
  ship inside the lazy cheat-sheet chunk. Every seam renders on **every viewport** (the FS9 rule) and carries
  real navigation so a text-only pane cannot reproduce FS12's `scrollable-region-focusable` violation.
- **Tests + gates + report (T-FS13.13–T-FS13.14):** unit / component / E2E ×3 viewports / axe / the ten gates
  / the §6.3 budget verification / `FS13_REPORT.md` → **STOP**.

**OUT (explicit):** everything in §8.

---

## 2. The contract reality of the Account surface (a first-class constraint, not a note)

`API_SPEC.md` is frozen and wins over D3/D4 wherever they disagree. This is the full audit — **the source of
every deviation in §5.2**:

| D3 §23/§24 section | What the frozen contract carries | Verdict |
|---|---|---|
| **§23 Appearance** — theme · density | **nothing** — but the console's own cookie mechanism has shipped since FS1 and is SSR-applied | **REAL, browser-local** (D1) |
| **§23 Appearance** — accent | nothing; ONYX defines **one** accent (D1 §3.2, D2 §1.2) and a new map is a D4 §12/§13 design change | **HONEST ABSENCE** (D7) |
| **§23 Account** — name · e-mail · avatar | `GET /auth/me → {user, role}` only. **No `PATCH /users/me`**, no password change, no avatar upload; `users` has no name column | **READ-ONLY + seams** (D2) |
| **§23 Security** — sessions · MFA · login journal | `POST /auth/sessions/revoke {user_id}` — **owner only** per the frozen matrix (*Users/Roles, API keys, Security: owner ✓, all others –*). No inventory (FS12 D6), no MFA write (`mfa_secret_ref` is a column, not an endpoint), no login-journal read (§R10.4 names it; the contract exposes none) | **SEAMS + a ruling** (D3/D4) |
| **§23 Notifications (preferences)** | **nothing** — no endpoint and no table (FS12 D5, re-verified) | **RULING REQUIRED** (D5) |
| **§23 Experience level** | nothing — the store field exists (Stage 2 §7), no screen reads it yet | **REAL, local, must be CONSUMED** (D6) |
| **§23 Advanced** — reset · export · SSO | reset of local prefs is real; **no export endpoint**, no SSO endpoint. Appendix-B parameters are **channel-scoped** (`GET\|PUT /channels/{id}/settings`) → D3 §13, not this screen | **PART REAL, part seam** (D8) |
| **§24 Overview** — identity | `GET /auth/me` | **REAL, thin** |
| **§24 Sessions** | revoke exists, enumeration does not | **SEAM** (D3/D4) |
| **§24 Activity** | `GET /audit-log?entity=&actor=` — and audit read is **owner/admin/analyst** only | **REAL for three roles; permission state for two** (D11) |
| **§24 Edit profile · change avatar** | **nothing** | **HONEST ABSENCE** (D2) |
| **§24 AI activity summary** | the records are real and loaded | **REAL** (D12) |
| **§23 AI parameter explainer** | no docs corpus, no docs endpoint; the parameters it names are not on this screen | **SEAM** (D12) |

Backend truth this stage renders: **§R10.4** — *"защищённый вход, MFA (опц.), сессии, журнал входов,
принудительное завершение; секреты — write-only поля, никогда не отображаются"*: FS13 renders the parts the
API exposes and **names the parts it does not**, rather than mocking an MFA or session UI. **§R10.5** — RBAC
is enforced in `services`; the UI only reflects it, and an excluded role meets a permission state, never a
crash. **§R10.8** — `audit_log` is what makes a personal activity record possible at all. **§R12.2** —
nothing secret is fetched or rendered; FS13 writes no secret and displays none. Design language: D2 §13.3
(Inputs), §13.4 (Select), §13.6 (Tabs), §13.10 (Dialogs — destructive separated and confirmed), §13.22
(Avatar), §13.24 (Activity feed), §15 (four-part empty states), §16 (loading/error scopes), §17
(a11y), D3 A1–A8, D4 §2 (responsive), §3 (a11y checklist), §7 (state), §8 (error recovery), §9 (notification
strategy).

---

## 3. Deliverables, matrices and guarantees

### 3.1 Rendering & loading matrix (fixed at approval — every new UI module)

| Module | Layer | S/C | Eager/Lazy | Touches First Load? |
|---|---|---|---|---|
| `app/(account)/settings/[[...section]]/page.tsx` | app | **S** | eager | route only (RSC shell; **no server fetch** — there is no preferences resource) |
| `widgets/settings/SettingsView` (nav + Appearance panel) | widget | C | eager (route) | `/settings` only |
| `widgets/settings/SecondaryPanels` — Account · Security · Notifications · Experience · Advanced, **ONE lazy module** | widget | C | **LAZY** | no |
| `widgets/settings/SettingsHonesty` (static seam copy) | widget | **S** | eager, rendered by the **RSC page** | `/settings` only — and it leaves the client bundle entirely (FS12 lesson 60) |
| `app/(account)/profile/page.tsx` | app | **S** | eager | route only (RSC seed: the session already re-checked by the layout) |
| `widgets/profile/ProfileView` (header + tabs + Overview) | widget | C | eager (route) | `/profile` only |
| `widgets/profile/ActivityPanel` **+ `features/explain-activity` panel — ONE lazy module** | widget | C | **LAZY** | no |
| `widgets/profile/ProfileHonesty` (Sessions seam, static) | widget | **S** | eager, rendered by the **RSC page** | `/profile` only |
| `features/change-settings/*` (controls + the ONE preferences module) | feature | C | imported by `/settings` only | `/settings` only |
| `features/explain-activity/buildActivityPrompt` (pure) | feature | S-safe | inside the lazy activity module | no |
| widget-level pure projections (initials, role label, activity VM) | widget | S-safe | with their route | route only |

**Two rules restated, both learned by measurement:** (a) **N lazy `dynamic()` rows of one screen family
become ONE chunk** — six settings panels behind six `dynamic()` boundaries would add six entries to the
global webpack runtime chunk-id map, which lives in commons, and that is precisely what rounded two protected
routes up at FS12 (rule 61). FS13 therefore ships **one** lazy module per screen. (b) **Static honesty markup
belongs in the RSC page**, not inside a `'use client'` widget (rule 60). No FS13 module is imported by any
pre-existing screen.

### 3.2 Query keys & invalidate graph (fixed at approval)

**FS13 declares no new query key and no new endpoint path — a first for this project.** There is no FS13
resource to key: the account surface is a projection of two shipped slices.

| Read | Key | Owner | Added by FS13 |
|---|---|---|---|
| Identity (`GET /auth/me`) | `['session']` | `entities/session` (FS4) — **frozen** | nothing |
| Personal activity (`GET /audit-log?actor=<me>`) | `entities/audit`'s existing `auditKeys` (FS12) | `entities/audit` | nothing |

**Invalidate graph.**

| Writer | Invalidates | Deliberately does NOT invalidate |
|---|---|---|
| Appearance · Experience · Notification preferences | **nothing** — a preference is not server state and never enters the Query cache | everything |
| Reset to defaults | **nothing** | everything |
| `explain-activity` | **nothing** — a pure projection of loaded records | everything |
| *(only if the owner rules D4 Option B)* revoke my sessions | **nothing** — there is no session query to refresh (FS12 D6) | everything |

**Locked by test:** (a) no FS13 module declares a query key, a path builder or an `apiFetch` call;
(b) **FS13 contains no `useMutation`, no `invalidateQueries` and no `setQueryData` at all** (the FS11
analytics-ownership lock, re-applied) — unless the owner rules D4 Option B, in which case exactly one
confirmed mutation exists and invalidates nothing; (c) the personal activity query **always** carries an
actor argument, asserted by function shape rather than by call (the FS10 arity technique) — a privacy lock,
not a style preference; (d) `entities/session` and `entities/audit` are byte-identical to their shipped form.

### 3.3 FS1–FS12 no-touch guarantee (protects `/chat` **180/180** · `/memory` 150 · `/knowledge` 176 · `/dashboard` 168 · `/studio` 165 · `/prompts` 150 · `/analytics` 148 · `/admin` 179 · `/audit` 174 · `/jobs` 172 · `/providers` 153 · `/billing` 144 · `/health` 139 · seams 111)

**Not touched, file by file** (proved at acceptance by mtime + content grep + First-Load manifest, the
FS7–FS12 method): all of `widgets/{dashboard,chat,knowledge,memory,studio,prompts,analytics,admin,jobs,audit,
health,providers,billing,platform-seams}/**` · all of `features/**` (every one of the 22 shipped slices) ·
all of `entities/**` (every one of the 20 shipped slices) — **including `entities/session` and
`entities/audit`, which FS13 consumes but does not open** · `widgets/inspector/**` (**no new registry row** —
D9) · `widgets/command-palette/**` (**no new group** — D9) · `shared/ui/**` · `styles/tokens.css` ·
`shared/config/{query-keys.ts,endpoints.ts,rbac.ts,theme.ts,shell.ts,status.ts}` ·
`shared/lib/{api,ai-gateway,auth-gateway,stream,persist,rbac,format,store}/**` · `app/layout.tsx` ·
`app/providers.tsx` · `app/api/**` · `app/(workspace)/**` · `app/(platform)/**` · `middleware.ts` · the
seven-provider tree.

**`app/layout.tsx` + `shared/config/theme.ts` are frozen for a specific reason.** They are what applies
theme and density **server-side from the cookie with no FOUC** — the stage's own entry duty. FS13 *writes*
those cookies through the existing store actions and **never re-implements or relocates the read**, so the
duty is preserved by construction and then **proved** (an E2E assertion that the initial HTML document
carries the theme/density attributes before any client JS runs).

**Files FS13 DOES edit, with the reason each cannot move a protected route's budget:**

| File | Edit | Why it is safe |
|---|---|---|
| `app/(account)/settings/**`, `app/(account)/profile/page.tsx` | stub → real page | route-local; these two routes are not in any other route's graph |
| `shared/config/routes.ts` | at most two `permission` **string swaps** (D14) | no row added; the FS12 D11 precedent; measured in T-FS13.1 |
| `shared/config/shortcuts.ts` | **`⌘,` only if T-FS13.1's gate passes** | commons — therefore a **measured decision gate with a pre-declared fallback**, not an assumption |
| `shared/config/shortcuts-catalog.ts` | new rows | ships **only** inside the lazy cheat-sheet chunk (the T-FS8.1 lock) |
| `shared/lib/fixtures/dataset.ts` + `browser.ts` | additive audit rows + the negative locks | fixture chunk only; never in a First Load; local/ci only, triple kill-switch intact |

Existing fixture rows stay **byte-identical**: FS13 adds **new** audit rows with new ids rather than editing
FS12's, so every `/audit` assertion keeps its exact inputs.

### 3.4 State-ownership matrix (fixed at approval)

| State | Owner | Persistence | Invalidated by | S/C | Lifetime | Replacement seam |
|---|---|---|---|---|---|---|
| Theme, density | the existing Zustand UI store (FS1/FS2) | **cookie** (unchanged mechanism) | — | S+C | per browser | unchanged `shared/config/theme.ts` |
| Experience level | the existing Zustand UI store field | **localStorage**, via the ONE preferences module | — | C | per browser | `features/change-settings/model/preferences.ts` |
| Notification/toast preferences *(D5 Option B only)* | the same store + the same module | localStorage | — | C | per browser | the same module |
| Settings section · profile tab · `?inspect=` | **URL (nuqs)** | the URL | — | C | the URL | §3.5 |
| Identity (user, role) | the FS4 read-only session store + `['session']` | cookie session | `/auth/me` | S+C | session | unchanged FS4 arrangement |
| Personal activity records | **TanStack Query** via `entities/audit` | memory | nothing (read-only) | C | 30 s list | `entities/audit` (FS12) |
| The `explain-activity` stream | the FS6 transient assistant store | none | reconcile on done | C | the turn | unchanged FS6 seam |
| Form focus, disclosure open, confirm state | component `useState` | none | — | C | unmount | — |

**The hard rule holds: nothing is owned by TanStack Query *and* Zustand.** Preferences are Zustand +
localStorage and **provably never enter the Query cache**; server data is Query-only; the FS4 session
arrangement is unchanged and FS13 adds no owner to it. Enforced by source-level tests, not review.

### 3.5 Navigation contract (URL is the state; every transition is reversible)

| Transition | URL | History |
|---|---|---|
| Settings section | `/settings/{appearance\|account\|security\|notifications\|experience\|advanced}` | **push** (a section is a place — the FS8 `?scope=` lesson) |
| Settings root | `/settings` → renders **Appearance**, canonical, no redirect loop | — |
| Profile tab | `/profile?tab=overview\|sessions\|activity` | **push** |
| Open an activity record | `?inspect=audit:<id>` appended — **FS12's existing view** | **push**; `esc` / Back closes and restores focus |
| Change theme / density / experience level | **not in the URL** | — (a preference is not a shareable view, D4 §7) |
| Open a help disclosure, focus a field | not in the URL | — (ephemeral by design) |

Every account view is a **shareable link that Back reverses**, restored on paste and re-checked against the
viewer's RBAC (D1 §6.8). **FS13 registers no new Inspector type** — the activity record *is* an audit record,
so it opens the type FS12 already registered, at zero commons cost (D9).

### 3.6 Bundle ownership (per-chunk architecture)

| New chunk | Single importer | First-load trigger | Could it reach commons? | Mechanical proof |
|---|---|---|---|---|
| `settings-view` (nav + Appearance + the preferences module) | `/settings` page | route entry | no — no other route imports `widgets/settings` | manifest: absent from all 30 other routes |
| `settings-secondary` (**one** chunk for five panels) | `SettingsView` | first non-Appearance section | no | one `dynamic()` boundary, **not five** (FS12 rule 61) |
| `profile-view` | `/profile` page | route entry | no | manifest |
| `profile-activity` (**one** chunk: activity list + explain panel + prompt) | `ProfileView` | Activity tab / Ask AI | no | one `dynamic()` boundary |
| *(none)* Inspector row | — | — | **would be commons** | **not created** — FS12's `audit` view is reused (D9) |
| *(none)* palette group | — | — | **would be commons** | **not created** — `@` Go-to already resolves both routes (D9) |
| `⌘,` handler row | `shared/config/shortcuts.ts` | app entry | **YES — this is the one commons candidate** | the T-FS13.1 before/after runtime-chunk measurement, with the pre-declared abandon fallback |

### 3.7 Regression invariants (checkable, not intentions)

- **I1 — `/chat` First Load stays 180 kB and `pnpm budget` PASSES.** `/chat` is the **primary protected
  route** and it has **0.0 kB of headroom**: any commons byte fails the gate, so this invariant is the stage's
  pass/fail condition, not a target. Byte-compared **twice** (immediately after T-FS13.1's `⌘,` decision — the
  stage's first and only risky commons artefact — and again before acceptance), per rule 52.
- **I2 — `/memory` 150 · `/dashboard` 168 · `/knowledge` 176 · `/studio` 165 · `/prompts` 150 ·
  `/analytics` 148 · `/admin` 179 · `/audit` 174 · `/jobs` 172 · `/providers` 153 · `/billing` 144 ·
  `/health` 139 · seam routes 111 unchanged.** `/memory` is the **co-primary** protected route: it sits on
  the rounding boundary and has moved on ±28 B of commons in three separate stages (FS9, FS11, FS12). It is
  checked at the same two moments. A ±1 kB movement is **reported as a deviation with a control build**,
  never re-worded (rule 44).
- **I3 — shared commons stays 107 kB.** `shared/config/query-keys.ts` and `shared/lib/api/endpoints.ts` are
  **not opened at all** (zero rows *and* zero edits).
- **I4 — `/settings` and `/profile` each stay ≤ 180 kB** (baseline 107 as stubs). Reported per route.
- **I5 — ONYX untouched:** `styles/tokens.css` and every `shared/ui` component contract byte-identical. **No
  ONYX MINOR is requested** and **no new D2 §11 status is registered.**
- **I6 — no FS1–FS12 surface file modified** except the five files listed in §3.3, each with its measured
  justification.
- **I7 — previous suites stay green without weakening.** One class of existing-spec update is **declared in
  advance as I7-legal**: if T-FS13.1 finds a `/settings` or `/profile` route permission that contradicts
  D3 §23/§24 (D14), the corrected value makes existing RBAC expectations factually wrong and they are updated
  — strengthened to the corrected matrix, never loosened.
- **I8 — no new dependency · no ADR · no token change · no threshold pre-raised · no `app/` change · no
  backend endpoint invented.**

### 3.8 File-level deliverables (maps to Stage 3 §1/§3–§5)

```
app/(account)/settings/[[...section]]/page.tsx        ← real RSC page (+ loading/error scopes)
app/(account)/profile/page.tsx                        ← real RSC page (+ loading/error scopes)
widgets/settings/{SettingsView,SettingsNav,AppearancePanel,SecondaryPanels,SettingsHonesty}.tsx
widgets/profile/{ProfileView,ProfileHeader,ActivityPanel,ProfileHonesty,identity.ts}
features/change-settings/{model/preferences.ts,ui/*}  ← THE single storage toucher
features/explain-activity/{model/buildActivityPrompt.ts,ui/ExplainActivityPanel.tsx}
tests/unit/{settings-commons,preferences-store,account-absence,activity-scope,
            activity-prompt,settings-ownership}.test.ts
tests/component/{SettingsView,ProfileView,ExplainActivityPanel,AccountHonesty}.test.tsx
tests/e2e/account.spec.ts
```

---

## 4. Task sequence (each with a completion criterion)

| # | Task | Done when |
|---|---|---|
| T-FS13.1 | Zero-commons lock · protected-route baseline · **`⌘,` decision gate** · R1c first-consumer scan · route-permission verification | grep lock green; the 31-route table and runtime-chunk gz recorded before/after; the `⌘,` ship/abandon decision is **written down with its numbers**; `entities/session`'s commons exposure confirmed from the manifest |
| T-FS13.2 | Confirm **no new entity** is needed; wire the widget-level projections | `tsc` clean; a test asserts `entities/{account,preference,notification-preference}` do not exist; `entities/{session,audit}` byte-identical |
| T-FS13.3 | `features/change-settings/model/preferences.ts` — the ONE storage toucher | versioned payload; defaults for every field; corrupt/unknown payload degrades to defaults; unit-proven that no component touches storage directly |
| T-FS13.4 | `/settings` RSC page + `SettingsView` + nav + **Appearance** panel | theme/density change through the **existing** store actions; persisted per browser; **stated as browser-local**; no commons file re-implemented |
| T-FS13.5 | **Account** + **Security** panels (read-only identity + seams) | e-mail/role/initials from the shipped session; every absent capability states fact · reason · what would change it, on **every** viewport |
| T-FS13.6 | **Experience** panel (D6) | the level is persisted **and** provably changes what the FS13 surfaces reveal; copy factually names where it applies today; a test asserts a real behavioural difference per level |
| T-FS13.7 | **Notifications** + **Advanced** panels (per the D5 ruling) | preferences behave exactly as ruled; reset-to-defaults is real and confirmed; the Appendix-B pointer names the Channels screen without implying a control here |
| T-FS13.8 | `/profile` RSC page + `ProfileView` (header, Overview, Sessions seam) | identity renders for all five roles; the Sessions tab carries real navigation (no `scrollable-region-focusable`) |
| T-FS13.9 | **Activity** tab over `GET /audit-log?actor=` | actor-scoped by construction (arity-locked); `j/k/↵` → the **FS12 `audit`** Inspector; permission state inside the screen for editor/viewer; honest absence if the wire carries no user id |
| T-FS13.10 | `features/explain-activity` | `buildActivityPrompt` byte-exact unit proof; no auto-run; Trust + Explainability; **no security tips, no completeness claim**; wire cost only |
| T-FS13.11 | Fixtures: actor-scoped audit rows, an empty scenario, and the **negative locks** | the group resolves; a test proves `/users/me`, any preferences, password, MFA, avatar-upload, session-inventory and notification-preference path **404** |
| T-FS13.12 | Shortcuts + seams + responsive pass | catalogue rows ship only in the lazy chunk; every seam renders on all three viewports; mobile nav is top tabs per D3 §23 |
| T-FS13.13 | Full test suite (unit · component · E2E ×3 viewports · axe) | all green; axe **0** on both new screens; the **no-FOUC** assertion passes on the initial HTML document |
| T-FS13.14 | Ten gates + §6.3 budget verification + `FS13_REPORT.md` | executed for real; every number recorded → **STOP for acceptance** |

---

## 5. Gates, contract truth & honesty

### 5.1 Engineering gates

All ten, executed for real (Stage 2 §14): ESLint · Prettier · `tsc --noEmit` strict (0 errors, 0 unjustified
`any`) · Vitest · Playwright ×3 viewports · **axe 0** · dependency-cruiser 0 · Storybook build · contract
(every endpoint used exists **verbatim** in `API_SPEC.md` — FS13 uses `GET /auth/me` and
`GET /audit-log?actor=`, plus `POST /auth/sessions/revoke` only if D4 Option B is ruled) · `pnpm budget`
(31 routes ≤ 180 kB) · `pnpm size`. **A gate that ends RED is reported RED with the threshold untouched**
(rule №33).

### 5.2 Contract truth & deviations (decided by approving this plan)

- **D1 — There is no user-preferences resource; Settings is REAL but BROWSER-LOCAL.** D4 §4's *"user prefs
  (assumed)"* is refuted by the frozen contract and by the frozen 25 tables. Theme, density, sidebar and
  active channel persist to **cookies**; experience level and (if ruled) notification preferences persist to
  **localStorage**. Every panel states this plainly — *these preferences live in this browser, not in your
  account* — because a browser-local setting presented as an account setting is the same class of lie as a
  fabricated metric. **No preferences endpoint is requested or implied**; if one ever appears it is an
  optional future backend MINOR (§F2.4), and the single swap point is the ONE preferences module.
- **D2 — There is no self-service account write.** No `PATCH /users/me`, no password change, no e-mail
  change, no avatar upload, and no name field anywhere in `users`. The Account panel is **read-only
  identity** — e-mail, role, and deterministic initials (D2 §13.22) — with each absent action named. D3 §24's
  *"Edit profile"* and *"change avatar"* are therefore **honest absences, not deferred work**.
- **D3 — Security is three absences and one owner-only action.** MFA: `mfa_secret_ref` is a column with no
  endpoint. Login journal: §R10.4 names it; the contract exposes no read. Session inventory: none (FS12 D6,
  re-verified). Revocation: `POST /auth/sessions/revoke {user_id}` exists but the frozen matrix gives
  *Users/Roles, API keys, Security* to the **owner alone**. Each is stated as fact · reason · what would
  change it.
- **D4 — "Sign out other sessions": OWNER RULING REQUESTED.** D3 §23 lists it as a primary action and §24 as
  a secondary one.
  **Option A (recommended):** the account screens **do not duplicate the mutation**; for an owner they
  cross-link to the guarded revoke FS12 already ships on `/admin`, and for every other role they state the
  absence. Rationale: the action is owner-only, destructive, and already lives in a governance surface with
  its confirmation; a second call site adds a second place to get a destructive mutation wrong without adding
  capability, and it keeps FS13 with **zero mutations**.
  **Option B:** a new `features/revoke-my-sessions` calling the same contract path through
  `entities/platform-user`, scoped to the signed-in owner, confirmed and destructive-variant styled. Costs
  one small lazy chunk on `/profile` (zero commons) and makes FS13's mutation count 1.
  *Recommendation: A.*
- **D5 — Notification preferences: OWNER RULING REQUESTED (the FS12 D1 sub-ruling lands here).** There is no
  notifications endpoint, no `notifications` table, and therefore **no delivery to configure and no per-kind
  record to mute** — FS12 established this and `/notifications` already ships as a verified absence.
  **Option A:** the Notifications section is a **verified absence** — it states that the console has no
  notification delivery, no stored notifications and thus no preferences to keep, and points at
  `/notifications`. Purest; but it makes the section empty of function.
  **Option B (recommended, tightly scoped):** the section configures **what the console itself emits in this
  browser** — the D4 §9 toast channel that has shipped since FS1 — per kind (success · info · warning · AI),
  with **`danger` never mutable** because D4 §9 forbids a critical outcome resting on a suppressible channel,
  and with copy that says exactly what it governs: *in-session toasts in this browser; there is no
  notification delivery and no notification centre — see /notifications*. Real, verifiable, and it invents
  nothing.
  *Recommendation: B, on the strict condition that the copy never implies server-side delivery and that the
  danger kind cannot be muted. Under Option A the section still ships — as a seam.*
- **D6 — Experience level must be CONSUMED, not merely stored.** Stage 2 §7 puts `experienceLevel` in the
  global store; **no shipped screen reads it**. Shipping a control that changes nothing would be a fabricated
  capability by this project's own standard. FS13 therefore ships the control **and makes the FS13 surfaces
  respond to it** (Beginner hides advanced disclosures; Advanced reveals the exact storage keys, cookie names
  and raw preference payload; Power additionally surfaces the keyboard-only path for every control), with
  copy that factually names where it applies **today** and a test asserting a real behavioural difference per
  level. Extending progressive disclosure to the other screens is **FS14 work, named as such** (D3 A2), not
  claimed here.
- **D7 — Accent is not selectable.** D3 §23 lists accent under Appearance. ONYX defines **one** accent
  (D1 §3.2, D2 §1.2) and an alternative is a new primitive→semantic map — a **design** change under D4
  §12/§13, not an implementation choice, and token *values* are frozen. `/settings` states this rather than
  offering a picker. **No ONYX change is requested.**
- **D8 — "Advanced" contains no platform parameters.** MASTER_SPEC §Appendix B (`LEAD_TIME`,
  `SIMILARITY_THRESHOLD`, `MAX_REWRITES`, `HUMANNESS_MIN`, `IMAGE_MAX_REGEN`, …) is **channel-scoped**
  (`channel_settings`; `GET|PUT /channels/{id}/settings`) and belongs to D3 §13 Channels. The Advanced panel
  offers **reset local preferences to defaults** (real, confirmed) and states where the pipeline parameters
  actually live. Data export and SSO are named absences.
- **D9 — No new Inspector registry row and no new palette group, and that is a budget decision made in the
  open.** FS12 measured a **single lazy Inspector-registry reference at +28 B gz in commons**, which was
  enough to round `/memory` 149 → 150. With `/chat` at **0.0 kB**, a new registry row or palette group is not
  a small cost — it is the gate. FS13 therefore: opens activity records in **FS12's already-registered
  `audit` view** (the same resource, so this is reuse rather than substitution — the `queryKeys.health()`
  precedent), and renders D3 §23's *"Inspector for contextual help"* as an **inline disclosure inside the
  settings panel**. This is a stated deviation from D3 §23's Inspector column, taken for a measured reason,
  and it is revisited when headroom exists (FS14/FS15 structural levers, backlog R1).
- **D10 — `⌘,` is a measured decision gate, not a promise.** D3 §23 lists it; `shared/config/shortcuts.ts` is
  commons. T-FS13.1 measures and the pre-declared fallback executes without debate: if any protected route
  moves, `⌘,` is dropped and its absence is recorded. The palette `@` mode already reaches both routes at
  zero cost. `⌘⇧L`, `⌘⇧D`, `⌘\`, `⌘K`, `esc` are reused unchanged; `⌘s` is **not** registered because
  Settings auto-saves (D3 §23's own preference), so the generic `detail-save` catalogue row stays inactive
  (the FS10 precedent); `e` *edit* is **not** registered on `/profile` because there is nothing to edit.
- **D11 — Personal activity is the audit log, actor-filtered, and it is privacy-locked.** `GET
  /audit-log?actor=` is the only contract call that can answer *"what have I done"*. Two consequences, both
  binding: (a) the frozen matrix gives audit read to **owner/admin/analyst** only, so **editor and viewer
  meet a permission state inside `/profile`** — the FS12 rule-64 pattern, one level below the route guard,
  and better than an affordance the server would refuse; (b) if `/auth/me` carries no stable user id, the
  panel renders an **honest absence** and **never** falls back to the unfiltered platform-wide log. The
  actor argument is asserted by function shape, not by call site (the FS10 arity technique).
- **D12 — One AI surface, not two.** D3 §24's *"AI summarizes your recent activity"* is backable: the records
  are real, loaded, and actor-scoped. It ships as `explain-activity` — user-invoked, provenance-only, over
  the **unchanged** FS6 relay, forbidden by construction from claiming completeness, inferring intent,
  scoring risk, or giving the *"security tips"* D3 also asks for (a recommendation with no data — the FS11
  ruling on recommendations, and the FS12 ruling on destructive advice, both apply). D3 §23's *"AI explains
  each parameter"* is a **seam**: its cited source would be Documentation (§25, not built, no docs endpoint),
  and the parameters it names are the channel-scoped ones from D8 — simulating retrieval over a corpus that
  does not exist is exactly what FS7 refused.
- **D13 — FS13 writes no secret and displays none.** There is no password field, no MFA secret and no key on
  these screens, because there is no endpoint for any of them; the FS12 SEC-6 machinery is not extended and
  not needed. The one sensitive value present is the user's **e-mail**, which is rendered but never logged,
  never placed in a query string, never sent to the AI relay unless it appears in a record the user already
  loaded, and never persisted by the preferences module.
- **D14 — Route permissions must match D3's "personal settings for all".** `/settings` and `/profile` are
  personal surfaces and must be reachable by **all five roles**, with org/security affordances gated **at the
  call site**, never by hiding the route. T-FS13.1 verifies the shipped registry values; if either
  contradicts D3 §23/§24 the correction is a **string swap with no row added** (the FS7–FS10 route-PATCH
  precedent and the FS12 D11 method), measured, and any affected existing expectation is updated as
  **I7-legal**.
- **D15 — *(assumed)* wire shapes → FE-RV-16** (§5.3).

### 5.3 FE-RV impact

**FE-RV-16 opens — "live account round-trip"** (one item, per the register's burn-down discipline), covering:
**whether `GET /auth/me` carries a stable user `id`** — the single fact that decides whether a personal
activity feed is possible at all (today the panel degrades to an honest absence without it) · whether `/auth/me`
carries anything beyond `{user, role}` (a display name? a status? a created-at? — the console renders initials
from the e-mail precisely because no name is documented) · whether `GET /audit-log?actor=` accepts the caller's
own id, how it paginates, and whether it is ordered newest-first · whether the audit record's `action`
vocabulary is stable enough to label (unknown actions already render by **raw name**, the FS8/FS9/FS11/FS12
discipline) · whether `POST /auth/sessions/revoke` may target the caller (D4 Option B) and what it returns ·
whether the backend ever exposes MFA enrolment, a login journal or a session inventory (§R10.4 names all
three; the contract exposes none) · whether a preferences resource ever appears — the swap point being the ONE
preferences module.
**Single adjustment points:** `widgets/profile/identity.ts`, the actor-scoped call in
`widgets/profile/ActivityPanel`, and `features/change-settings/model/preferences.ts`. Identity mapping itself
stays where FS4 put it (`mapAuthMe`, the FE-RV-7 adjustment point) and is **not** duplicated.
**No FE-RV is opened for notification preferences, MFA, password change, avatar upload, session inventory or
account self-edit** — those are not unverified assumptions but **verified absences** in a frozen contract, and
each would be optional future backend MINOR work (§F2.4). A negative-lock test protects every one of them.

---

## 6. Budget strategy (First Load 180 kB · size-limit 756 kB)

### 6.1 Per-route First Load (authoritative, non-revisable)

**`/chat` = 180 / 180 — headroom 0.0 kB.** This is the tightest constraint in the project and FS13's pass/fail
condition. The stage is designed so that the *only* commons candidate in it is a single optional keyboard row
(D10), and even that is gated on measurement. Everything else is structurally route-local: no new query key,
no new endpoint path, no new entity, no new Inspector row, no new palette group, no new dependency, no
extension of any slice that another screen imports. `/memory` = 150 is **co-primary** because it has moved on
±28 B of commons three times. Both are byte-compared **twice** (rule 52): immediately after T-FS13.1's `⌘,`
decision — the stage's first and only risky artefact — and again before acceptance. The FS12 levers are the
toolkit if either new route runs over: a `useMutation` hook never in an eager view (R1g), dialogs behind
`dynamic()`, static markup in the RSC page (rule 60), and N lazy rows consolidated into ONE chunk (rule 61) —
all four are already designed into §3.1 and §3.6 rather than held in reserve.

### 6.2 size-limit aggregate (detector 756 kB; measured 744.70 — headroom 11.30 kB)

FS13 is a **two-route** stage with no new dependency and no heavy module, so the detector is expected to stay
green. That expectation is **not** a plan: rule №33 is followed exactly either way — the threshold is not
pre-raised, not now and not mid-stage; if the gate goes red it is reported RED with its measured number, a
dedicated `FS13_REPORT_SIZE_ADDENDUM.md` is filed with per-chunk attribution, the eager/lazy split and a
manifest proof that every new lazy chunk is absent from every First Load, and the owner rules separately after
the evidence pack.

### 6.3 Lazy-loading & commons verification checklist (executed at T-FS13.14, recorded in the report)

1. `pnpm budget` — all 31 routes, before/after table vs the T-FS13.1 baseline.
2. `app-build-manifest.json` — every FS13 chunk proved **absent** from every route's First Load list.
3. The **webpack runtime chunk** gz size before/after (the `⌘,` decision record, whichever way it went).
4. Zero-marker scan across every First Load chunk of `/chat` and `/memory`.
5. mtime + import scan proving the §3.3 no-touch set is untouched — with `query-keys.ts`, `endpoints.ts`,
   `Inspector.tsx`, the command palette, `app/layout.tsx` and `shared/config/theme.ts` called out explicitly,
   because this stage claims **zero edits** to all six.
6. Commons delta attributed **per file** for the (at most) two edited commons files.
7. Any contested movement settled with a **control build** before a single word is written about its cause —
   both forms available (remove the addition; revert the new routes to stubs) — and the artifact **rebuilt
   afterwards** (the FS11 stale-artifact lesson).
8. The **no-FOUC proof**: the initial HTML document for a protected route carries the theme and density
   attributes before any client JS executes, asserted in E2E after a theme change and a reload.

---

## 7. Risks

| # | Risk | Mitigation |
|---|---|---|
| **R1** | **`/chat` has 0.0 kB of headroom** — one commons byte fails `pnpm budget`, and unlike FS12 there is no slack to absorb a rounding tip | the stage is designed to touch commons **at most once** (D10), and that once is a measured gate with a pre-declared abandon fallback; no key, path, entity, Inspector row or palette group is added |
| **R2** | **A preference that changes nothing is a fabricated capability** — the honest-data rule applied to controls (experience level is stored today but read by no screen) | D6: the control ships **consumed**, with a test asserting a real behavioural difference per level and copy that factually names where it applies today |
| **R3** | **A personal activity feed could leak the platform-wide audit log** if the actor filter is ever dropped | the actor argument is locked by function shape, not by call (the FS10 arity technique); a missing user id renders an **honest absence**, never an unfiltered list; E2E asserts an analyst sees only their own records |
| **R4** | **`entities/session` is already in shell commons** via `AuthProvider` — extending its barrel would tax all 31 routes | verified from the manifest in T-FS13.1 and declared frozen; the profile projection is a widget-level pure module (FS9 precedent) |
| **R5** | **Six settings sections invite six `dynamic()` boundaries**, each adding an entry to the global runtime chunk-id map that lives in commons (FS12 rounded two routes up on exactly this) | **one** lazy module per screen (§3.6), decided at plan time rather than after a red gate |
| **R6** | **Rounding volatility has moved a protected route ±1 kB in five consecutive stages**, and at FS12 it consumed the last of `/chat`'s headroom | diagnose from `app-build-manifest.json`; prove any contested movement with a control build **before** writing a cause; report a missed invariant, never re-word it (rule 44) |
| **R7** | **The account surface is dominated by absence** (MFA, password, avatar, sessions, preferences sync, accent) and a reviewer may read the stage as thin | each absence states fact · reason · what would change it on **every** viewport (the FS9 mobile lesson); the negative fixture locks make the absence provable rather than rhetorical; what *is* real — appearance, experience, identity, activity, the AI summary — is genuinely functional |
| **R8** | **A settings screen is form-dense**, the worst shape for axe (labels, `aria-describedby`, grouped radio semantics) and for the `text.tertiary` contrast rule that has needed five usage corrections | ONYX Field/Input/Select/Switch/SegmentedControl carry the semantics; the typed tone mechanism makes a small-text `tertiary` unrepresentable; one `h1` per screen with `h2` section headings (the FS11/FS12 `heading-order` fix applied pre-emptively); every seam pane carries real navigation so a text-only tab cannot reproduce FS12's `scrollable-region-focusable` |
| **R9** | **FE-RV-16's first question decides whether a whole panel exists** (does `/auth/me` carry a user id?) | the panel degrades to an honest absence with no rework; one adjustment point; the same live session closes FE-RV-7…16 together |
| **R10** | **The no-FOUC duty is easy to break silently** by re-implementing a cookie read closer to the new screen | `app/layout.tsx` and `shared/config/theme.ts` are in the frozen no-touch set; the duty is proved by an initial-document assertion, not by inspection |
| **R11** | **Muting a notification kind could silence a critical outcome** if D5 Option B is ruled | the `danger` kind is not mutable by construction (D4 §9); unit-locked, and the copy states exactly what the preference governs |

---

## 8. Not in FS13 (explicit)

Channels (D3 §13) · AI Playground (§11) · Chat History (§6) · Documentation (§25) · Landing (§1) — all remain
honest stubs. `/notifications` (FS12's verified absence) is **not reopened**; FS13 owns only the preferences
half, per the D1 sub-ruling. **No preferences endpoint, no account self-edit, no password change, no MFA
enrolment, no avatar upload, no session inventory, no login journal, no data export, no SSO connection, no
accent picker, no theme beyond the two ONYX ships, no per-kind notification delivery, no cross-device
preference sync, no progressive-disclosure rollout to the other screens (FS14), no security advice and no AI
authoring of any setting** — every one of these is a **visible honest seam**, because the frozen contract
carries no call for it or the frozen design carries no token for it. **No backend change is requested or
implied**, no ONYX token value changes, no ADR is created, no dependency is added, no threshold is pre-raised,
and `app/` is not touched.

---

**STOP — FS13 plan complete. No code has been written.** Awaiting the owner's approval of this plan, and
explicit rulings on **D4** (sign out other sessions: Option A cross-link, or Option B a scoped self-revoke
feature), **D5** (notification preferences: Option A verified absence, or Option B console-local toast
preferences with `danger` never mutable), and confirmation of **D6** (ship the Experience Level control only
because FS13 makes it genuinely consumed), **D9** (no new Inspector row and no new palette group, for the
measured budget reason) and **D10** (`⌘,` as a measured gate with a pre-declared abandon fallback).
Implementation begins only after that approval.
