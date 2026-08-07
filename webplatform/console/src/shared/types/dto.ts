/**
 * DTO mirrors (contract stubs). These mirror the FROZEN backend public DTO
 * shapes (API_SPEC.md); the frontend is a pure client (§F3.2) and never
 * re-implements backend logic. FS1 ships only the minimal contract surface
 * needed by the infrastructure (session bootstrap + health smoke-check);
 * per-entity DTOs arrive with their slices in FS4+.
 *
 * NOTE: secrets are write-only (§F7.4) — no secret field is ever part of a
 * response ViewModel.
 */
import type { Role } from '@/shared/config/rbac';

/** POST /auth/login request — exactly the API_SPEC §Auth shape (`otp?` incl.). */
export interface LoginRequestDTO {
  readonly email: string;
  readonly password: string;
  readonly otp?: string;
}

/**
 * Wire mirror of GET /auth/me → `{user, role}` (API_SPEC §Auth). Field casing
 * inside `user` is *(assumed)* pending FE-RV-7 wire confirmation; the mapper
 * (`shared/lib/auth-gateway/map`) is the single place to adjust.
 */
export interface AuthUserWireDTO {
  readonly id: string;
  readonly email: string;
  readonly display_name?: string;
  readonly mfa_enabled?: boolean;
}

export interface AuthMeWireDTO {
  readonly user: AuthUserWireDTO;
  readonly role: string;
}

/** GET /auth/me — read-only session projection (no tokens, §F7.1). */
export interface SessionDTO {
  readonly userId: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: Role;
  readonly mfaEnabled: boolean;
}

/** GET /health — probe projection (§R12, gated data honest, never faked). */
export interface HealthProbeDTO {
  readonly name: string;
  readonly state: 'healthy' | 'degraded' | 'down' | 'unknown';
  readonly detail?: string;
}

export interface HealthReportDTO {
  readonly overall: 'healthy' | 'degraded' | 'down' | 'unknown';
  readonly probes: readonly HealthProbeDTO[];
}

/* ------------------------------------------------------------------------- *
 * FS5 wire mirrors (Channels / Posts / Tasks / Analytics / Cost).
 * Field casing is *(assumed)* snake_case pending FE-RV-8 wire confirmation;
 * entity `api.ts` mappers are the single adjustment points. Engagement
 * metrics carry the §R10.3 availability flag — gated values are null + flag,
 * NEVER invented numbers.
 * ------------------------------------------------------------------------- */

export interface ChannelWireDTO {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly description?: string | null;
}

export interface PostWireDTO {
  readonly id: string;
  readonly channel_id: string;
  readonly status: string;
  readonly title?: string | null;
  readonly body_preview?: string | null;
  readonly created_at: string;
}

export interface PostHistoryEntryWireDTO {
  readonly status: string;
  readonly at: string;
  readonly detail?: string | null;
}

export interface TaskWireDTO {
  readonly id: string;
  readonly type: string;
  readonly status: string;
  readonly channel_id?: string | null;
  readonly attempts: number;
  readonly run_at?: string | null;
  readonly created_at: string;
  readonly error?: string | null;
}

export interface MetricWireDTO {
  readonly value: number | null;
  readonly availability: 'available' | 'gated';
}

export interface AnalyticsSnapshotWireDTO {
  readonly channel_id: string;
  readonly date: string;
  readonly cost_today: MetricWireDTO;
  readonly published_today: MetricWireDTO;
  readonly views: MetricWireDTO;
  readonly reactions: MetricWireDTO;
}

export interface CostEntryWireDTO {
  readonly key: string;
  readonly amount_usd: number;
}

/* ------------------------------------------------------------------------- *
 * FS11 wire mirrors — the §Analytics & Cost group beyond the FS5 snapshot.
 *
 * `API_SPEC.md` names the calls but documents no response schema for
 * `/analytics/quality`, `/analytics/trends` or `/analytics/reports/{period}`,
 * so these mirrors are *(assumed)* and deliberately SHAPE-TOLERANT: every panel
 * is a bag of named metrics and/or named series, and the mapper surfaces an
 * unrecognised key by its RAW name rather than dropping it (the FS8
 * `style_features` / FS9 similarity-report discipline). A wire change degrades
 * into an honestly-labelled row instead of silent data loss. FE-RV-14 carries
 * every open question; `entities/analytics/report-model.ts` is the single
 * adjustment point.
 *
 * §R10.3/§R7.3 is load-bearing here: `availability` may appear on any metric or
 * series, and `'gated'` means the value is NOT shown — even when a number sits
 * next to the flag.
 * ------------------------------------------------------------------------- */

/** A metric inside a panel. `availability` is optional — absent ⇒ available. */
export interface AnalyticsMetricWireDTO {
  readonly value: number | null;
  readonly availability?: 'available' | 'gated';
  readonly unit?: string | null;
  readonly label?: string | null;
}

export interface AnalyticsPointWireDTO {
  readonly key: string;
  readonly value: number | null;
}

export interface AnalyticsSeriesWireDTO {
  readonly key: string;
  readonly label?: string | null;
  readonly unit?: string | null;
  readonly availability?: 'available' | 'gated';
  readonly points: readonly AnalyticsPointWireDTO[];
}

/**
 * The shared shape of `/analytics/quality`, `/analytics/trends` and
 * `/analytics/reports/{period}`. Every field is optional because the contract
 * documents none of them; §R11.9 asks for source/filters/algorithm version/time
 * and the console renders the algorithm version ONLY when the wire carries one.
 */
export interface AnalyticsPanelWireDTO {
  readonly metrics?: Readonly<Record<string, AnalyticsMetricWireDTO | number | null>>;
  readonly series?: readonly AnalyticsSeriesWireDTO[];
  readonly algorithm_version?: string | null;
  readonly computed_at?: string | null;
  readonly period?: string | null;
  readonly from?: string | null;
  readonly to?: string | null;
}

/** 202 queue-intent acknowledgement (§R10.1). */
export interface TaskIntentWireDTO {
  readonly task_id: string;
}

/* ------------------------------------------------------------------------- *
 * FS6 wire mirrors (AI Studio dry-run §R10.9 + manual post draft).
 * Field casing/shape is *(assumed)* pending FE-RV-9 wire confirmation; the
 * ai-gateway and the insert-to-channel feature are the single adjustment
 * points. The relay NEVER invents fields the contract does not carry.
 * ------------------------------------------------------------------------- */

/** POST /studio/dry-run request (contract: `{prompt|persona_id, model}`; FS6 uses prompt only). */
export interface StudioDryRunRequestWireDTO {
  readonly prompt: string;
  readonly model: string;
}

/** POST /studio/dry-run response — "ответ включает cost" (§R10.9); shape *(assumed)*. */
export interface StudioDryRunResponseWireDTO {
  readonly output: string;
  readonly model: string;
  readonly cost_usd: number;
}

/** POST /channels/{id}/posts manual-draft request body *(assumed shape)*. */
export interface PostCreateRequestWireDTO {
  readonly title: string;
  readonly body: string;
}

/* ------------------------------------------------------------------------- *
 * FS7 wire mirrors (Knowledge Base §R9.3 — the `/documents` group).
 * Field casing/shape is *(assumed)* pending FE-RV-10 wire confirmation; the
 * `entities/document` mappers and the add-source transport are the single
 * adjustment points. Ingestion statuses are *(assumed)* task-like (§R4.11:
 * queued|running|completed|failed) and map through the 12-status vocabulary —
 * unknown values surface honestly, never coerced. The contract carries NO
 * chunk/retrieval/search endpoints (plan §5.2 D1) — no DTO invents them.
 * ------------------------------------------------------------------------- */

export interface DocumentWireDTO {
  readonly id: string;
  readonly title: string;
  /** Origin label (original filename or source name). */
  readonly source: string;
  readonly size_bytes: number;
  /** Ingestion status *(assumed §R4.11 vocabulary)*. */
  readonly status: string;
  /** Channel assignment (§R2.6 isolation; null = unassigned). */
  readonly channel_id?: string | null;
  readonly version: number;
  readonly created_at: string;
  readonly updated_at: string;
}

/** GET /documents/{id} — detail *(assumed to carry the ingested text for
 * text-like sources; a metadata-only wire renders the honest reader fallback)*. */
export interface DocumentDetailWireDTO extends DocumentWireDTO {
  readonly content?: string | null;
  readonly content_type?: string | null;
}

/** GET /documents/{id}/versions entry *(assumed minimal shape §R9.10)*. */
export interface DocumentVersionWireDTO {
  readonly version: number;
  readonly size_bytes: number;
  readonly created_at: string;
}

/** POST /documents/{id}/assign request (API_SPEC §Knowledge Base, verbatim). */
export interface DocumentAssignRequestWireDTO {
  readonly channel_id: string;
}

/* ------------------------------------------------------------------------- *
 * FS8 wire mirrors (Memory §R9 — the `/personas` and `/actors` groups).
 * Field casing/shape is *(assumed)* pending FE-RV-11 wire confirmation; the
 * `entities/persona` and `entities/actor` mappers are the single adjustment
 * points. Shapes follow DATABASE_SPEC (§R4.7 personas/actors, §R9.12 Style
 * Memory). The contract exposes NO `/memory` endpoint (plan §5.2 D1) — no DTO
 * here invents memory entries, traces, weights or embeddings. Generation
 * internals (`face_embedding`, `reference_images_folder`) are NEVER mapped
 * into a ViewModel (§F7.4 discipline: nothing sensitive or internal leaks).
 * ------------------------------------------------------------------------- */

/** Style Memory (§R9.12) — FEATURES, never texts. Keys are backend-defined; the
 * UI renders unknown keys honestly by their raw name. */
export type StyleFeaturesWireDTO = Readonly<Record<string, unknown>>;

export interface PersonaWireDTO {
  readonly id: string;
  readonly channel_id: string;
  readonly name: string;
  readonly biography?: string | null;
  readonly character?: string | null;
  readonly manner_of_speech?: string | null;
  readonly favorite_words?: readonly string[] | null;
  readonly forbidden_expressions?: readonly string[] | null;
  readonly goals?: string | null;
  readonly audience_relationship?: string | null;
  readonly greeting_style?: string | null;
  readonly farewell_style?: string | null;
  readonly storytelling_style?: string | null;
  /** Style Memory §R9.12 — derived by the backend, never hand-edited here. */
  readonly style_features?: StyleFeaturesWireDTO | null;
  readonly status?: string | null;
  /** Optimistic lock (§R4.2) — PATCH must echo it; a mismatch answers 409. */
  readonly version?: number | null;
}

/** PATCH /personas/{id} — the editable voice fields only (§R4.7). */
export interface PersonaUpdateRequestWireDTO {
  readonly name?: string;
  readonly biography?: string;
  readonly manner_of_speech?: string;
  readonly greeting_style?: string;
  readonly farewell_style?: string;
  readonly storytelling_style?: string;
  /** Echoed for the optimistic lock when the wire carries one (§R4.2). */
  readonly version?: number;
}

export interface ActorWireDTO {
  readonly id: string;
  readonly channel_id: string;
  readonly name: string;
  readonly gender?: string | null;
  readonly age?: number | null;
  readonly build?: string | null;
  readonly hair?: string | null;
  readonly hair_color?: string | null;
  readonly eyes?: string | null;
  readonly clothing_style?: string | null;
  readonly appearance_description?: string | null;
  readonly prompt_description?: string | null;
  readonly status?: string | null;
  /** FS9: present ONLY if the live wire carries it (FE-RV-12). Absent ⇒ the UI
   * says nothing about how many references exist — it never renders a zero. */
  readonly reference_count?: number | null;
}

/* ---------------------------------------------------------------------------
 * FS9 wire mirrors (Image Studio §R6 — the `/images` group, `/locations`, and
 * the actor reference upload). Field casing/shape is *(assumed)* pending
 * FE-RV-12 wire confirmation; the `entities/image` and `entities/location`
 * mappers are the single adjustment points. Shapes follow DATABASE_SPEC
 * (§images, §image_history, §locations).
 *
 * Two disciplines are load-bearing here:
 *  1. **`storage_path` is an object KEY (§R6.8), not a URL.** The frozen
 *     contract exposes no endpoint that serves the binary, so no field here is
 *     ever treated as an image `src` (plan §5.2 D2). If a live wire turns out
 *     to carry a URL, `mapImage` is the ONE place that changes.
 *  2. **No safety verdict exists in the contract** (§R6.7 is a backend-side
 *     validator) — there is deliberately no `safety_*` field to map, and the
 *     UI never renders a safety chip (plan §5.2 D5).
 * ------------------------------------------------------------------------- */

export interface ImageWireDTO {
  readonly id: string;
  readonly channel_id: string;
  readonly actor_id?: string | null;
  readonly location_id?: string | null;
  readonly prompt?: string | null;
  readonly negative_prompt?: string | null;
  readonly provider?: string | null;
  readonly seed?: number | null;
  readonly resolution?: string | null;
  readonly style?: string | null;
  readonly camera?: string | null;
  readonly lighting?: string | null;
  readonly composition?: string | null;
  /** Object-storage key (§R6.8) — never a URL, never an `<img src>`. */
  readonly storage_path?: string | null;
  readonly phash?: string | null;
  readonly quality_score?: number | null;
  readonly status?: string | null;
  readonly published_at?: string | null;
  readonly created_at?: string | null;
}

/** GET /images/{id}/history — every generation attempt (§R6.5). */
export interface ImageHistoryEntryWireDTO {
  readonly id: string;
  readonly image_id: string;
  readonly attempt: number;
  readonly prompt?: string | null;
  readonly seed?: number | null;
  readonly provider?: string | null;
  readonly result?: string | null;
  readonly created_at: string;
}

/**
 * GET /images/{id}/similarity — the §R6.4 three-mechanism report (phash ≠
 * scene metadata ≠ CLIP). The backend owns the exact keys, so this is an open
 * record and the mapper renders unknown keys honestly by their raw name (the
 * §R9.12 `style_features` discipline applied again).
 */
export type ImageSimilarityWireDTO = Readonly<Record<string, unknown>>;

/** GET /channels/{id}/locations — scene inputs (§R6.3), read-only in FS9. */
export interface LocationWireDTO {
  readonly id: string;
  readonly channel_id?: string | null;
  readonly name: string;
  readonly description?: string | null;
}

/* ---------------------------------------------------------------------------
 * FS10 wire mirrors (Prompt Library §R10.6 — the `/prompts` group). Field
 * casing/shape is *(assumed)* pending FE-RV-13; `entities/prompt/model.ts` is
 * the single adjustment point. The shape follows DATABASE_SPEC §prompts:
 * `id · type · text · version · author · model · result · created_at`.
 *
 * Four absences are load-bearing and deliberate:
 *  1. **No `name`.** A prompt's identity is its `type` (the only filter the
 *     contract accepts is `?type=`), so the UI groups by type and never invents
 *     a display name (plan §5.2 D1).
 *  2. **No `channel_id`.** Prompts are platform-wide; nothing in this file or
 *     its mappers may introduce a channel dimension (owner requirement A).
 *  3. **No `is_active`.** The contract exposes no activation state, so there is
 *     no field to map and no Active/Draft badge is ever rendered (plan §5.2 D2).
 *  4. **No `variables`.** There is no variables field and no documented
 *     templating syntax; §R5.3 says the BACKEND prompt-builder assembles the
 *     runtime prompt. The UI therefore makes no variable claims (plan §5.2 D5).
 * ------------------------------------------------------------------------- */

export interface PromptWireDTO {
  readonly id: string;
  /** `prompt_type` enum value; an unrecognised value is rendered raw. */
  readonly type: string;
  readonly text: string;
  readonly version: number;
  /** `author uuid FK→users`. `/users` is owner-only, so this stays an id. */
  readonly author?: string | null;
  readonly model?: string | null;
  readonly result?: string | null;
  readonly created_at?: string | null;
}

/** POST /prompts — creates a NEW VERSION (§R10.6 "Правка = новая версия").
 *  Body shape *(assumed)* — FE-RV-13; `version` is assigned server-side. */
export interface PromptCreateRequestWireDTO {
  readonly type: string;
  readonly text: string;
  readonly model?: string | null;
}

/* ------------------------------------------------------------------------- *
 * FS12 wire mirrors — the Platform & Admin groups.
 *
 * `API_SPEC.md` names these calls but documents no response schema for any of
 * them, so every mirror below is *(assumed)* and deliberately SHAPE-TOLERANT in
 * the same way the FS8 `style_features` and FS11 panel mirrors are: an
 * unrecognised key is surfaced by its RAW name rather than dropped or renamed.
 * FE-RV-15 carries the open questions; these interfaces are the single
 * adjustment points. Types are erased at build ⇒ zero runtime bytes.
 *
 * What is NOT here, and why it will never be: there is no providers, logs,
 * feature-flag, notification, session-inventory or invoice mirror, because the
 * frozen contract carries no call that could fill one (plan §5.2 D2–D6). An
 * empty interface would be the lie.
 * ------------------------------------------------------------------------- */

/** `GET /users` — the `users` table (§R10.5). `password_hash`/`mfa_secret_ref`
 *  are secrets and are NEVER mirrored: a field the UI cannot legally render
 *  does not exist in the mirror (SEC-6). */
export interface PlatformUserWireDTO {
  readonly id: string;
  readonly email: string;
  /** `user_role` enum; an unrecognised value renders raw. */
  readonly role: string;
  /** The table has a `status` column; no documented write (FE-RV-15). */
  readonly status?: string | null;
  readonly created_at?: string | null;
}

/** POST /users — a CREATE, not an invitation: the contract has no invite or
 *  email flow (plan §5.2 D7). Body *(assumed)* — FE-RV-15. */
export interface PlatformUserCreateRequestWireDTO {
  readonly email: string;
  readonly role: string;
}

/** PATCH /users/{id} — documented as the ROLE change (plan §5.2 D7). */
export interface PlatformUserRoleRequestWireDTO {
  readonly role: string;
}

/** POST /auth/sessions/revoke — the ONLY session call the contract carries.
 *  There is no session inventory endpoint and no `sessions` table, so no
 *  session mirror exists (plan §5.2 D6). */
export interface RevokeSessionsRequestWireDTO {
  readonly user_id: string;
}

/** `GET /config-versions` (§R10.8). `snapshot` is the jsonb the client diff
 *  needs; whether the LIST carries it is the single fact that decides whether
 *  comparison is possible at all (FE-RV-15). */
export interface ConfigVersionWireDTO {
  readonly id: string;
  readonly author?: string | null;
  readonly description?: string | null;
  readonly snapshot?: Record<string, unknown> | null;
  readonly created_at?: string | null;
}

/** `GET /audit-log?entity=&actor=` (§R10.8). `before`/`after` are jsonb; a null
 *  `before` is an honest CREATE, never an invented empty object. */
export interface AuditRecordWireDTO {
  readonly id: string;
  readonly actor_user_id?: string | null;
  readonly action: string;
  readonly entity: string;
  readonly entity_id?: string | null;
  readonly before?: Record<string, unknown> | null;
  readonly after?: Record<string, unknown> | null;
  readonly created_at?: string | null;
}

/** `GET /tasks` in its ADMIN projection — the same resource FS5 reads, with the
 *  queue columns the Jobs dashboard needs. Declared SEPARATELY from
 *  `TaskWireDTO` so the FS5 mirror stays byte-identical (plan §3.3). */
export interface TaskAdminWireDTO {
  readonly id: string;
  readonly type: string;
  /** `task_status` (§R4.11): pending·running·succeeded·failed·deferred·
   *  needs_review·cancelled·dead. Only the five with an exact ONYX equivalent
   *  are mapped; the rest render as explicit RAW labels (plan §5.2 D14). */
  readonly status: string;
  readonly channel_id?: string | null;
  readonly attempts: number;
  readonly priority?: number | null;
  readonly run_at?: string | null;
  readonly created_at: string;
  /** DATABASE_SPEC calls it `last_error`; FS5's mirror calls it `error`.
   *  Both are accepted and neither is invented (FE-RV-15). */
  readonly last_error?: string | null;
  readonly error?: string | null;
}

/** The 202 body of `POST /tasks/{id}/{cancel|run|requeue}` (§R10.1). */
export interface TaskIntentResponseWireDTO {
  readonly task_id?: string | null;
  readonly status?: string | null;
}

/** `GET /api-keys` — write-only group (§R10.4/§R12.2): "значения не
 *  возвращаются". The mirror therefore has NO field capable of holding a
 *  value, which is what makes leaking one a type error (plan §5.2 D13). */
export interface ApiKeySlotWireDTO {
  /** Slot identity — provider/name/kind, whichever the wire uses (FE-RV-15). */
  readonly name?: string | null;
  readonly provider?: string | null;
  readonly kind?: string | null;
  /** Whether a secret is stored for the slot. Presence only, never the value. */
  readonly configured?: boolean | null;
  readonly updated_at?: string | null;
}

/** `PUT /api-keys` — the ONLY place a secret value legally exists in this
 *  codebase: a request body, never a VM, cache, store, log or fixture. */
export interface ApiKeyWriteRequestWireDTO {
  readonly name: string;
  readonly value: string;
}

/** `GET /health/live` · `GET /health/ready` (§R12.10 — liveness ≠ readiness).
 *  Shape-tolerant: dependencies may arrive as a named map or a list, and an
 *  unrecognised dependency renders by its RAW name (FE-RV-15). */
export interface HealthProbeWireDTO {
  readonly status?: string | null;
  readonly checks?: Record<string, unknown> | null;
  readonly dependencies?: Record<string, unknown> | null;
}
