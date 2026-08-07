/**
 * THE deterministic dataset (FS5 T-FS5.1). One module feeds the server fetch
 * branch, the browser MSW worker and Vitest — typed by the SAME wire mirrors
 * the real client maps from, so fixture/real drift is a type error (FS4 §7 R2
 * discipline). Fixed timestamps only (no Date.now — determinism).
 * Engagement metrics honour §R10.3: gated ⇒ value null + availability flag.
 */
import './guard';
import type {
  ActorWireDTO,
  AnalyticsPanelWireDTO,
  AnalyticsSnapshotWireDTO,
  ApiKeySlotWireDTO,
  AuditRecordWireDTO,
  ChannelWireDTO,
  ConfigVersionWireDTO,
  HealthProbeWireDTO,
  PlatformUserWireDTO,
  TaskAdminWireDTO,
  CostEntryWireDTO,
  DocumentDetailWireDTO,
  DocumentVersionWireDTO,
  DocumentWireDTO,
  ImageHistoryEntryWireDTO,
  ImageSimilarityWireDTO,
  ImageWireDTO,
  LocationWireDTO,
  PersonaWireDTO,
  PostHistoryEntryWireDTO,
  PostWireDTO,
  PromptCreateRequestWireDTO,
  PromptWireDTO,
  TaskWireDTO,
} from '@/shared/types';
import type { FixtureScenario } from './guard';

export const FIXTURE_TODAY = '2026-07-30';

export const CHANNELS: readonly ChannelWireDTO[] = [
  { id: 'ch_tech', name: 'Tech Digest', status: 'active', description: 'Daily engineering brief' },
  { id: 'ch_daily', name: 'Daily Brief', status: 'active', description: 'Morning highlights' },
  { id: 'ch_art', name: 'Art Curator', status: 'paused', description: 'Weekly visual culture' },
];

export const POSTS: readonly PostWireDTO[] = [
  {
    id: 'post_nr_1',
    channel_id: 'ch_tech',
    status: 'needs_review',
    title: 'Quantum-safe TLS moves to procurement',
    body_preview: 'Three vendors now ship hybrid TLS by default…',
    created_at: `${FIXTURE_TODAY}T08:12:00Z`,
  },
  {
    id: 'post_nr_2',
    channel_id: 'ch_tech',
    status: 'needs_review',
    title: 'The quiet return of on-prem inference',
    body_preview: 'Cost curves crossed for mid-size fleets…',
    created_at: `${FIXTURE_TODAY}T07:40:00Z`,
  },
  {
    id: 'post_pub_1',
    channel_id: 'ch_tech',
    status: 'published',
    title: 'Morning digest №214',
    body_preview: 'Five stories worth your coffee…',
    created_at: `${FIXTURE_TODAY}T06:00:00Z`,
  },
];

export const POST_HISTORY: Record<string, readonly PostHistoryEntryWireDTO[]> = {
  post_nr_1: [
    {
      status: 'needs_review',
      at: `${FIXTURE_TODAY}T08:12:00Z`,
      detail: 'Image phash near-duplicate',
    },
    { status: 'verified', at: `${FIXTURE_TODAY}T08:10:00Z`, detail: '6 gates · humanness 0.93' },
    { status: 'draft', at: `${FIXTURE_TODAY}T08:05:00Z`, detail: null },
  ],
  post_nr_2: [
    { status: 'needs_review', at: `${FIXTURE_TODAY}T07:40:00Z`, detail: 'Approval mode is on' },
    { status: 'draft', at: `${FIXTURE_TODAY}T07:31:00Z`, detail: null },
  ],
};

export const TASKS: readonly TaskWireDTO[] = [
  {
    id: 'task_pub_9',
    type: 'publish',
    status: 'queued',
    channel_id: 'ch_tech',
    attempts: 0,
    run_at: `${FIXTURE_TODAY}T15:00:00Z`,
    created_at: `${FIXTURE_TODAY}T08:00:00Z`,
    error: null,
  },
  {
    id: 'task_pub_10',
    type: 'publish',
    status: 'queued',
    channel_id: 'ch_tech',
    attempts: 0,
    run_at: `${FIXTURE_TODAY}T19:00:00Z`,
    created_at: `${FIXTURE_TODAY}T08:00:00Z`,
    error: null,
  },
  {
    id: 'task_gen_7',
    type: 'generate_text',
    status: 'completed',
    channel_id: 'ch_tech',
    attempts: 1,
    run_at: null,
    created_at: `${FIXTURE_TODAY}T07:30:00Z`,
    error: null,
  },
  {
    id: 'task_img_3',
    type: 'generate_image',
    status: 'failed',
    channel_id: 'ch_daily',
    attempts: 3,
    run_at: null,
    created_at: `${FIXTURE_TODAY}T07:10:00Z`,
    error: 'Safety check rejected the output',
  },
];

export const ANALYTICS: Record<string, AnalyticsSnapshotWireDTO> = {
  ch_tech: {
    channel_id: 'ch_tech',
    date: FIXTURE_TODAY,
    cost_today: { value: 4.82, availability: 'available' },
    published_today: { value: 3, availability: 'available' },
    // Engagement is GATED without the stats adapter (§R7.3/§R10.3).
    views: { value: null, availability: 'gated' },
    reactions: { value: null, availability: 'gated' },
  },
  ch_daily: {
    channel_id: 'ch_daily',
    date: FIXTURE_TODAY,
    cost_today: { value: 2.11, availability: 'available' },
    published_today: { value: 1, availability: 'available' },
    views: { value: null, availability: 'gated' },
    reactions: { value: null, availability: 'gated' },
  },
  ch_art: {
    channel_id: 'ch_art',
    date: FIXTURE_TODAY,
    cost_today: { value: 0, availability: 'available' },
    published_today: { value: 0, availability: 'available' },
    views: { value: null, availability: 'gated' },
    reactions: { value: null, availability: 'gated' },
  },
};

export const COST_BY_DAY: readonly CostEntryWireDTO[] = [
  { key: '2026-07-24', amount_usd: 5.4 },
  { key: '2026-07-25', amount_usd: 4.9 },
  { key: '2026-07-26', amount_usd: 6.2 },
  { key: '2026-07-27', amount_usd: 5.1 },
  { key: '2026-07-28', amount_usd: 7.3 },
  { key: '2026-07-29', amount_usd: 6.8 },
  { key: FIXTURE_TODAY, amount_usd: 6.93 },
];

/* ------------------------------------------------------------------------- *
 * FS11 — the rest of the §Analytics & Cost group (five READ calls). Stand-in
 * only; the real client path is plain fetches against the live contract
 * (FE-RV-14). Deterministic and CLOCK-FREE (the FS7 rule).
 *
 * The data is deliberately shaped to exercise every honesty path the mapper
 * owns: an unrecognised key that must survive by RAW name, a **gated field that
 * carries a number** (which must still render as Gated, never as the number),
 * a **gated series** (which must plot nothing), and a panel with **no
 * algorithm version** (§R11.9 — the console must say so rather than invent one).
 * ------------------------------------------------------------------------- */

export const COST_BY_FACET: Readonly<Record<string, readonly CostEntryWireDTO[]>> = {
  channel: [
    { key: 'Tech Digest', amount_usd: 24.18 },
    { key: 'Daily Brief', amount_usd: 11.42 },
    { key: 'Art House', amount_usd: 2.05 },
  ],
  model: [
    { key: 'claude-opus-4-8', amount_usd: 27.6 },
    { key: 'claude-haiku-4-5', amount_usd: 6.35 },
    { key: 'image-provider', amount_usd: 3.7 },
  ],
  provider: [
    { key: 'anthropic', amount_usd: 33.95 },
    { key: 'nano-banana', amount_usd: 3.7 },
  ],
};

export const QUALITY_PANEL: AnalyticsPanelWireDTO = {
  metrics: {
    quality_score: { value: 82.4, unit: '/100' },
    humanness: { value: 78, unit: '/100' },
    duplicate_score: { value: 0.21 },
    regen_count: 4,
    // An unrecognised key: the console has no vocabulary for it, so it must be
    // rendered by its RAW name rather than dropped or renamed.
    style_drift_index: { value: 0.13 },
    // A GATED field that carries a number — the value must NOT reach the UI.
    er: { value: 0.071, availability: 'gated' },
  },
  algorithm_version: 'quality-v3',
  computed_at: `${FIXTURE_TODAY}T06:00:00Z`,
};

export const TRENDS_PANEL: AnalyticsPanelWireDTO = {
  series: [
    {
      key: 'quality_score',
      unit: '/100',
      points: [
        { key: '2026-07-24', value: 74 },
        { key: '2026-07-25', value: 77 },
        { key: '2026-07-26', value: 76 },
        { key: '2026-07-27', value: 80 },
        { key: '2026-07-28', value: 81 },
        { key: '2026-07-29', value: 83 },
        { key: FIXTURE_TODAY, value: 82 },
      ],
    },
    {
      key: 'published',
      points: [
        { key: '2026-07-24', value: 3 },
        { key: '2026-07-25', value: 2 },
        { key: '2026-07-26', value: 3 },
        { key: '2026-07-27', value: 4 },
        { key: '2026-07-28', value: 2 },
        { key: '2026-07-29', value: 3 },
        { key: FIXTURE_TODAY, value: 3 },
      ],
    },
    {
      // A GATED series: values on the wire, but nothing may be plotted (§R7.3).
      key: 'views',
      availability: 'gated',
      points: [
        { key: '2026-07-28', value: 1200 },
        { key: '2026-07-29', value: 1310 },
      ],
    },
  ],
  // Deliberately NO algorithm_version — the §R11.9 honest-absence path.
  computed_at: `${FIXTURE_TODAY}T06:05:00Z`,
};

export const REPORTS: Readonly<Record<string, AnalyticsPanelWireDTO>> = {
  daily: {
    period: 'daily',
    metrics: {
      published: 3,
      cost_usd: { value: 6.93, unit: 'USD' },
      quality_score: { value: 82.4, unit: '/100' },
      views: { value: null, availability: 'gated' },
    },
    algorithm_version: 'report-v2',
    computed_at: `${FIXTURE_TODAY}T06:10:00Z`,
  },
  weekly: {
    period: 'weekly',
    metrics: {
      published: 20,
      cost_usd: { value: 42.63, unit: 'USD' },
      quality_score: { value: 79.1, unit: '/100' },
      rewrites: 11,
      views: { value: null, availability: 'gated' },
    },
    algorithm_version: 'report-v2',
    computed_at: `${FIXTURE_TODAY}T06:10:00Z`,
  },
  monthly: {
    period: 'monthly',
    metrics: {
      published: 74,
      cost_usd: { value: 168.2, unit: 'USD' },
      quality_score: { value: 77.8, unit: '/100' },
      views: { value: null, availability: 'gated' },
    },
    algorithm_version: 'report-v2',
    computed_at: `${FIXTURE_TODAY}T06:10:00Z`,
  },
};

/** Inclusive ISO-date window filter — the `?from=&to=` the contract documents. */
function withinRange(
  entries: readonly CostEntryWireDTO[],
  from: string | null,
  to: string | null,
): readonly CostEntryWireDTO[] {
  return entries.filter(
    (entry) => (from === null || entry.key >= from) && (to === null || entry.key <= to),
  );
}

/* ------------------------------------------------------------------------- *
 * FS7 — Knowledge documents (§R9.3). Base documents are immutable wire DTOs;
 * the /documents group additionally keeps DETERMINISTIC session state in this
 * module (uploads, deletes, re-ingest countdowns) so E2E can exercise
 * upload→ingesting→ready with no live backend. The countdown is POLL-BASED
 * (status flips after a fixed number of list/detail GETs), never clock-based —
 * no Date.now anywhere (determinism rule). Stand-in only; the real client
 * path is plain fetches against the live contract (FE-RV-10).
 * ------------------------------------------------------------------------- */

export const DOCUMENTS: readonly DocumentWireDTO[] = [
  {
    id: 'doc_style',
    title: 'Voice and style guide',
    source: 'style-guide.md',
    size_bytes: 18_432,
    status: 'completed',
    channel_id: 'ch_tech',
    version: 3,
    created_at: '2026-07-20T10:00:00Z',
    updated_at: '2026-07-28T09:15:00Z',
  },
  {
    id: 'doc_glossary',
    title: 'Product glossary',
    source: 'glossary.md',
    size_bytes: 9_812,
    status: 'completed',
    channel_id: 'ch_tech',
    version: 1,
    created_at: '2026-07-22T08:30:00Z',
    updated_at: '2026-07-22T08:31:00Z',
  },
  {
    id: 'doc_failed',
    title: 'Q3 vendor sheet',
    source: 'vendors-q3.pdf',
    size_bytes: 402_133,
    status: 'failed',
    channel_id: 'ch_tech',
    version: 1,
    created_at: `${FIXTURE_TODAY}T07:55:00Z`,
    updated_at: `${FIXTURE_TODAY}T07:56:00Z`,
  },
  {
    id: 'doc_daily_tone',
    title: 'Morning tone notes',
    source: 'tone-notes.md',
    size_bytes: 4_120,
    status: 'completed',
    channel_id: 'ch_daily',
    version: 2,
    created_at: '2026-07-25T06:40:00Z',
    updated_at: '2026-07-27T06:10:00Z',
  },
];

const DOCUMENT_CONTENT: Readonly<Record<string, string>> = {
  doc_style: [
    '# Voice and style guide',
    '',
    'Tech Digest writes like a calm senior engineer: short sentences, concrete numbers, no hype.',
    '',
    '- Lead with the change, then the impact.',
    '- One metric per claim; never estimate a number that is not in the source.',
    '- Close every digest with a single practical takeaway.',
  ].join('\n'),
  doc_glossary: [
    '# Product glossary',
    '',
    '- **Slot** — a scheduled publish window materialized by the scheduler.',
    '- **Dry-run** — an isolated generation with no publication and no memory write.',
    '- **Gate** — a validation rule that must pass before a post may publish.',
  ].join('\n'),
  doc_daily_tone: [
    '# Morning tone notes',
    '',
    'Daily Brief opens warm and fast: greet, then three highlights, each one sentence.',
  ].join('\n'),
};

export const DOCUMENT_VERSIONS: Readonly<Record<string, readonly DocumentVersionWireDTO[]>> = {
  doc_style: [
    { version: 3, size_bytes: 18_432, created_at: '2026-07-28T09:15:00Z' },
    { version: 2, size_bytes: 17_020, created_at: '2026-07-24T11:00:00Z' },
    { version: 1, size_bytes: 12_940, created_at: '2026-07-20T10:00:00Z' },
  ],
  doc_glossary: [{ version: 1, size_bytes: 9_812, created_at: '2026-07-22T08:30:00Z' }],
  doc_failed: [{ version: 1, size_bytes: 402_133, created_at: `${FIXTURE_TODAY}T07:55:00Z` }],
  doc_daily_tone: [
    { version: 2, size_bytes: 4_120, created_at: '2026-07-27T06:10:00Z' },
    { version: 1, size_bytes: 3_802, created_at: '2026-07-25T06:40:00Z' },
  ],
};

/** How many list/detail GET polls an ingest takes to complete (deterministic). */
export const INGEST_POLLS_TO_READY = 2;

const UPLOADED_CONTENT = 'Uploaded fixture document body. Ingested by the local/ci stand-in.';

interface DocumentMutationState {
  created: DocumentWireDTO[];
  deleted: Set<string>;
  overrides: Map<string, Partial<DocumentWireDTO>>;
  /** id → remaining GET polls until the ingest flips to `completed`. */
  countdown: Map<string, number>;
  uploadSeq: number;
}

const docState: DocumentMutationState = {
  created: [],
  deleted: new Set(),
  overrides: new Map(),
  countdown: new Map(),
  uploadSeq: 0,
};

/** Test hook: restore the pristine document state (unit tests only). */
export function resetFixtureDocumentState(): void {
  docState.created = [];
  docState.deleted = new Set();
  docState.overrides = new Map();
  docState.countdown = new Map();
  docState.uploadSeq = 0;
}

/** Optional request metadata the worker/handlers extract from bodies the pure
 * resolver cannot see (multipart filename/size, assign channel_id). */
export interface FixtureRequestMeta {
  readonly filename?: string | null;
  readonly sizeBytes?: number | null;
  readonly channelId?: string | null;
  /** FS8: the parsed JSON body for mutations the resolver must echo (persona
   * PATCH). The resolver never parses bodies itself — the worker extracts. */
  readonly body?: unknown;
}

function tickCountdowns(): void {
  for (const [id, polls] of docState.countdown) {
    if (polls <= 1) {
      docState.countdown.delete(id);
      docState.overrides.set(id, { ...docState.overrides.get(id), status: 'completed' });
    } else {
      docState.countdown.set(id, polls - 1);
    }
  }
}

function materializeDocuments(scenario: FixtureScenario): readonly DocumentWireDTO[] {
  const base = scenario === 'empty' ? [] : DOCUMENTS;
  return [...base, ...docState.created]
    .filter((doc) => !docState.deleted.has(doc.id))
    .map((doc) => ({ ...doc, ...docState.overrides.get(doc.id) }));
}

function documentBody(id: string, scenario: FixtureScenario): DocumentDetailWireDTO | undefined {
  const doc = materializeDocuments(scenario).find((entry) => entry.id === id);
  if (!doc) return undefined;
  const isUpload = docState.created.some((entry) => entry.id === id);
  const content =
    doc.status === 'completed'
      ? (DOCUMENT_CONTENT[id] ?? (isUpload ? UPLOADED_CONTENT : null))
      : null;
  return { ...doc, content, content_type: content !== null ? 'text/markdown' : null };
}

function resolveDocuments(
  method: string,
  p: string,
  url: URL,
  scenario: FixtureScenario,
  meta?: FixtureRequestMeta,
): FixtureResponse | undefined {
  if (p === '/documents' && method === 'GET') {
    tickCountdowns();
    const channelId = url.searchParams.get('channel_id');
    const items = materializeDocuments(scenario).filter(
      (doc) => !channelId || doc.channel_id === channelId,
    );
    return { status: 200, body: items };
  }

  if (p === '/documents' && method === 'POST') {
    // Upload → ingestion (§R9.4): 201 with the created document, still working.
    docState.uploadSeq += 1;
    const filename = meta?.filename ?? `upload-${docState.uploadSeq}.md`;
    const created: DocumentWireDTO = {
      id: `doc_up_${docState.uploadSeq}`,
      title: filename.replace(/\.[^.]+$/, ''),
      source: filename,
      size_bytes: meta?.sizeBytes ?? 1_024,
      status: 'running',
      channel_id: null,
      version: 1,
      created_at: `${FIXTURE_TODAY}T09:30:00Z`,
      updated_at: `${FIXTURE_TODAY}T09:30:00Z`,
    };
    docState.created.push(created);
    docState.countdown.set(created.id, INGEST_POLLS_TO_READY);
    return { status: 201, body: created };
  }

  const docMatch = /^\/documents\/([^/]+)$/.exec(p);
  if (docMatch) {
    const id = docMatch[1] ?? '';
    if (method === 'GET') {
      tickCountdowns();
      const body = documentBody(id, scenario);
      return body ? { status: 200, body } : { status: 404, body: { message: 'Not found' } };
    }
    if (method === 'PUT') {
      // New version (§R9.10): re-ingests.
      const current = materializeDocuments(scenario).find((doc) => doc.id === id);
      if (!current) return { status: 404, body: { message: 'Not found' } };
      docState.overrides.set(id, {
        ...docState.overrides.get(id),
        version: current.version + 1,
        size_bytes: meta?.sizeBytes ?? current.size_bytes,
        status: 'running',
        updated_at: `${FIXTURE_TODAY}T09:45:00Z`,
      });
      docState.countdown.set(id, INGEST_POLLS_TO_READY);
      return { status: 200, body: documentBody(id, scenario) };
    }
    if (method === 'DELETE') {
      docState.deleted.add(id);
      return { status: 204, body: null };
    }
  }

  const versionsMatch = /^\/documents\/([^/]+)\/versions$/.exec(p);
  if (method === 'GET' && versionsMatch) {
    const id = versionsMatch[1] ?? '';
    const doc = materializeDocuments(scenario).find((entry) => entry.id === id);
    if (!doc) return { status: 404, body: { message: 'Not found' } };
    const base = DOCUMENT_VERSIONS[id];
    const body: readonly DocumentVersionWireDTO[] =
      base && base.length >= doc.version
        ? base
        : Array.from({ length: doc.version }, (_, i) => ({
            version: doc.version - i,
            size_bytes: doc.size_bytes,
            created_at: doc.updated_at,
          }));
    return { status: 200, body };
  }

  const reindexMatch = /^\/documents\/([^/]+)\/reindex$/.exec(p);
  if (method === 'POST' && reindexMatch) {
    const id = reindexMatch[1] ?? '';
    if (!materializeDocuments(scenario).some((doc) => doc.id === id)) {
      return { status: 404, body: { message: 'Not found' } };
    }
    // Queue intent (§R10.1): acknowledged, executed by the worker — 202.
    docState.overrides.set(id, { ...docState.overrides.get(id), status: 'queued' });
    docState.countdown.set(id, INGEST_POLLS_TO_READY);
    return { status: 202, body: { task_id: `task_reindex_${id}` } };
  }

  const assignMatch = /^\/documents\/([^/]+)\/assign$/.exec(p);
  if (method === 'POST' && assignMatch) {
    const id = assignMatch[1] ?? '';
    if (!materializeDocuments(scenario).some((doc) => doc.id === id)) {
      return { status: 404, body: { message: 'Not found' } };
    }
    docState.overrides.set(id, {
      ...docState.overrides.get(id),
      channel_id: meta?.channelId ?? null,
    });
    return { status: 200, body: documentBody(id, scenario) };
  }

  return undefined;
}

/* ------------------------------------------------------------------------- *
 * FS8 — Memory (§R9): personas (the writing identity, incl. Style Memory
 * §R9.12) and actors (the visual identity). Persona edits are deterministic
 * session state exactly like the FS7 documents group — no clocks, no Date.now.
 * `style_features` are FEATURES, never texts (§R9.12), and deliberately
 * include one key OUTSIDE the UI's known set so the honest raw-key rendering
 * path is exercised by real fixtures.
 * ------------------------------------------------------------------------- */

export const PERSONAS: readonly PersonaWireDTO[] = [
  {
    id: 'persona_tech',
    channel_id: 'ch_tech',
    name: 'The calm senior engineer',
    biography: 'Fifteen years shipping infrastructure; explains without condescending.',
    character: 'Measured, precise, allergic to hype.',
    manner_of_speech: 'Short declarative sentences. One number per claim.',
    favorite_words: ['concretely', 'in practice', 'trade-off'],
    forbidden_expressions: ['game-changer', 'revolutionary', 'mind-blowing'],
    goals: 'Make a busy engineer smarter in ninety seconds.',
    audience_relationship: 'A peer who respects the reader’s time.',
    greeting_style: 'Straight into the change — no throat-clearing.',
    farewell_style: 'One practical takeaway, then stop.',
    storytelling_style: 'Problem → measurement → consequence.',
    style_features: {
      sentence_length_avg: 14.2,
      sentence_length_variance: 4.1,
      dialogue_frequency: 0.05,
      paragraph_structure: 'short-blocks',
      emotional_dynamics: 'flat-calm',
      transitions: ['therefore', 'in practice', 'the result'],
      // Deliberately unknown to the UI's label map — must render as a raw key.
      hedging_ratio: 0.08,
    },
    status: 'active',
    version: 3,
  },
  {
    id: 'persona_tech_archived',
    channel_id: 'ch_tech',
    name: 'Early enthusiast voice',
    biography: 'The channel’s first, louder voice — retired after the tone reset.',
    character: 'Excitable, exclamation-heavy.',
    manner_of_speech: 'Long enthusiastic sentences.',
    favorite_words: ['huge', 'incredible'],
    forbidden_expressions: [],
    goals: 'Drive early growth.',
    audience_relationship: 'Cheerleader.',
    greeting_style: 'Big hello.',
    farewell_style: 'Call to action.',
    storytelling_style: 'Hype → detail.',
    style_features: { sentence_length_avg: 24.7, emotional_dynamics: 'high-amplitude' },
    status: 'archived',
    version: 5,
  },
  {
    id: 'persona_daily',
    channel_id: 'ch_daily',
    name: 'Morning briefer',
    biography: 'Warm, fast, three highlights and out.',
    character: 'Friendly and brisk.',
    manner_of_speech: 'Greets, then three one-sentence highlights.',
    favorite_words: ['this morning', 'quick one'],
    forbidden_expressions: ['as we all know'],
    goals: 'Start the day informed in thirty seconds.',
    audience_relationship: 'A familiar morning voice.',
    greeting_style: 'Warm one-liner.',
    farewell_style: 'See you tomorrow.',
    storytelling_style: 'Highlight list.',
    style_features: { sentence_length_avg: 11.4, dialogue_frequency: 0.12 },
    status: 'active',
    version: 1,
  },
];

export const ACTORS: readonly ActorWireDTO[] = [
  {
    id: 'actor_tech',
    channel_id: 'ch_tech',
    name: 'Nadia, the systems lead',
    gender: 'female',
    age: 38,
    build: 'athletic',
    hair: 'short',
    hair_color: 'dark brown',
    eyes: 'hazel',
    clothing_style: 'technical minimal — merino, no logos',
    appearance_description: 'Calm posture, workshop lighting, muted palette.',
    prompt_description: 'A 38-year-old female systems engineer, short dark hair, muted workshop.',
    status: 'active',
  },
  {
    id: 'actor_daily',
    channel_id: 'ch_daily',
    name: 'Ilya, the morning host',
    gender: 'male',
    age: 31,
    build: 'slim',
    hair: 'wavy',
    hair_color: 'light brown',
    eyes: 'grey',
    clothing_style: 'soft casual — knitwear',
    appearance_description: 'Bright kitchen light, relaxed shoulders.',
    prompt_description: 'A 31-year-old male presenter, wavy light-brown hair, bright kitchen.',
    status: 'active',
  },
];

interface PersonaMutationState {
  overrides: Map<string, Partial<PersonaWireDTO>>;
}

const personaState: PersonaMutationState = { overrides: new Map() };

/** Test hook: restore the pristine persona state (unit tests only). */
export function resetFixturePersonaState(): void {
  personaState.overrides = new Map();
}

function materializePersonas(scenario: FixtureScenario): readonly PersonaWireDTO[] {
  if (scenario === 'empty') return [];
  return PERSONAS.map((persona) => ({ ...persona, ...personaState.overrides.get(persona.id) }));
}

function resolvePersonasAndActors(
  method: string,
  p: string,
  scenario: FixtureScenario,
  meta?: FixtureRequestMeta,
): FixtureResponse | undefined {
  const channelPersonas = /^\/channels\/([^/]+)\/personas$/.exec(p);
  if (method === 'GET' && channelPersonas) {
    const channelId = channelPersonas[1];
    return {
      status: 200,
      body: materializePersonas(scenario).filter((persona) => persona.channel_id === channelId),
    };
  }

  const channelActors = /^\/channels\/([^/]+)\/actors$/.exec(p);
  if (method === 'GET' && channelActors) {
    const channelId = channelActors[1];
    const items = scenario === 'empty' ? [] : ACTORS.filter((a) => a.channel_id === channelId);
    return { status: 200, body: items };
  }

  const personaMatch = /^\/personas\/([^/]+)$/.exec(p);
  if (personaMatch) {
    const id = personaMatch[1] ?? '';
    const current = materializePersonas(scenario).find((persona) => persona.id === id);
    if (method === 'GET') {
      return current
        ? { status: 200, body: current }
        : { status: 404, body: { message: 'Not found' } };
    }
    if (method === 'PATCH') {
      if (!current) return { status: 404, body: { message: 'Not found' } };
      // Optimistic lock (§R4.2): a stale `version` answers 409, never a silent
      // overwrite — the honest conflict path the UI must handle.
      const sent = meta?.body as Partial<PersonaWireDTO> | undefined;
      if (
        sent?.version !== undefined &&
        current.version !== null &&
        current.version !== undefined &&
        sent.version !== current.version
      ) {
        return { status: 409, body: { message: 'This persona changed in another session.' } };
      }
      const next: Partial<PersonaWireDTO> = {
        ...personaState.overrides.get(id),
        ...(sent ?? {}),
        version: (current.version ?? 0) + 1,
      };
      personaState.overrides.set(id, next);
      return { status: 200, body: { ...current, ...next } };
    }
  }

  const archiveMatch = /^\/personas\/([^/]+)\/archive$/.exec(p);
  if (method === 'POST' && archiveMatch) {
    const id = archiveMatch[1] ?? '';
    const current = materializePersonas(scenario).find((persona) => persona.id === id);
    if (!current) return { status: 404, body: { message: 'Not found' } };
    personaState.overrides.set(id, {
      ...personaState.overrides.get(id),
      status: 'archived',
      version: (current.version ?? 0) + 1,
    });
    return { status: 200, body: { ...current, status: 'archived' } };
  }

  const actorMatch = /^\/actors\/([^/]+)$/.exec(p);
  if (method === 'GET' && actorMatch) {
    const actor = ACTORS.find((entry) => entry.id === actorMatch[1]);
    return actor ? { status: 200, body: actor } : { status: 404, body: { message: 'Not found' } };
  }

  return undefined;
}

/* ---------------------------------------------------------------------------
 * FS9 — Image Studio (§R6). Records ONLY: the contract serves no binary, so no
 * fixture invents an image URL, a thumbnail or a data URI (plan §5.2 D2). No
 * safety field exists in the contract, so none is fabricated here (§5.2 D5).
 * `storage_path` is an object-storage KEY (§R6.8), exactly like the real wire.
 * ------------------------------------------------------------------------- */

export const IMAGES: readonly ImageWireDTO[] = [
  {
    id: 'img_tech_1',
    channel_id: 'ch_tech',
    actor_id: 'act_tech_1',
    location_id: 'loc_tech_studio',
    prompt: 'Editorial portrait of the host at a standing desk, warm rim light, shallow depth.',
    negative_prompt: 'text, watermark, extra fingers',
    provider: 'fake-image',
    seed: 812_004,
    resolution: '1024x1024',
    style: 'editorial',
    camera: '35mm',
    lighting: 'warm rim',
    composition: 'medium close-up',
    storage_path: 'channels/ch_tech/images/img_tech_1.png',
    phash: 'f0e1d2c3b4a59687',
    quality_score: 0.86,
    status: 'verified',
    published_at: `${FIXTURE_TODAY}T08:10:00Z`,
    created_at: `${FIXTURE_TODAY}T08:02:00Z`,
  },
  {
    id: 'img_tech_2',
    channel_id: 'ch_tech',
    actor_id: 'act_tech_1',
    location_id: 'loc_tech_rooftop',
    prompt: 'Rooftop skyline at dusk, host in profile, city bokeh behind.',
    negative_prompt: 'blurry, distorted hands',
    provider: 'fake-image',
    seed: 44_119,
    resolution: '1024x1024',
    style: 'cinematic',
    camera: '85mm',
    lighting: 'dusk ambient',
    composition: 'wide',
    storage_path: 'channels/ch_tech/images/img_tech_2.png',
    phash: 'f0e1d2c3b4a59611',
    quality_score: 0.71,
    status: 'needs_review',
    published_at: null,
    created_at: `${FIXTURE_TODAY}T09:15:00Z`,
  },
  {
    id: 'img_tech_3',
    channel_id: 'ch_tech',
    actor_id: null,
    location_id: 'loc_unknown_seed',
    prompt: 'Abstract cover for the weekly recap, no people.',
    negative_prompt: null,
    provider: 'fake-image',
    seed: 7,
    resolution: '1024x1024',
    style: null,
    camera: null,
    lighting: null,
    composition: null,
    storage_path: 'channels/ch_tech/images/img_tech_3.png',
    phash: null,
    quality_score: null,
    // Deliberately OUTSIDE the 12-status vocabulary: proves an unknown wire
    // status is surfaced raw and starts NO polling (plan §3.2 / §6.3).
    status: 'post_processing',
    published_at: null,
    created_at: `${FIXTURE_TODAY}T10:40:00Z`,
  },
  {
    id: 'img_daily_1',
    channel_id: 'ch_daily',
    actor_id: 'act_daily_1',
    location_id: null,
    prompt: 'Morning brief cover, minimal typography plate.',
    negative_prompt: null,
    provider: 'fake-image',
    seed: 90_210,
    resolution: '1024x1024',
    style: 'minimal',
    camera: null,
    lighting: 'soft daylight',
    composition: 'flat lay',
    storage_path: 'channels/ch_daily/images/img_daily_1.png',
    phash: 'aa11bb22cc33dd44',
    quality_score: 0.79,
    status: 'verified',
    published_at: `${FIXTURE_TODAY}T06:30:00Z`,
    created_at: `${FIXTURE_TODAY}T06:20:00Z`,
  },
];

/** Every generation attempt (§R6.5) — the honest regen truth. */
export const IMAGE_HISTORY: Readonly<Record<string, readonly ImageHistoryEntryWireDTO[]>> = {
  img_tech_1: [
    {
      id: 'ih_tech_1_1',
      image_id: 'img_tech_1',
      attempt: 1,
      prompt: 'Editorial portrait of the host at a standing desk.',
      seed: 811_001,
      provider: 'fake-image',
      result: 'failed',
      created_at: `${FIXTURE_TODAY}T07:58:00Z`,
    },
    {
      id: 'ih_tech_1_2',
      image_id: 'img_tech_1',
      attempt: 2,
      prompt: 'Editorial portrait of the host at a standing desk, warm rim light, shallow depth.',
      seed: 812_004,
      provider: 'fake-image',
      result: 'verified',
      created_at: `${FIXTURE_TODAY}T08:02:00Z`,
    },
  ],
  img_tech_2: [
    {
      id: 'ih_tech_2_1',
      image_id: 'img_tech_2',
      attempt: 1,
      prompt: 'Rooftop skyline at dusk, host in profile, city bokeh behind.',
      seed: 44_119,
      provider: 'fake-image',
      result: 'needs_review',
      created_at: `${FIXTURE_TODAY}T09:15:00Z`,
    },
  ],
};

/**
 * The §R6.4 report — three DIFFERENT mechanisms (phash ≠ scene ≠ CLIP), plus
 * one deliberately unknown key so the "unknown keys render by raw name" rule
 * is provable end-to-end (the §R9.12 discipline).
 */
export const IMAGE_SIMILARITY: Readonly<Record<string, ImageSimilarityWireDTO>> = {
  img_tech_1: {
    image_id: 'img_tech_1',
    phash: 'f0e1d2c3b4a59687',
    phash_distance: 18,
    nearest_image_id: 'img_tech_2',
    clip_similarity: 0.412,
    scene_repeats: 0,
    composition: 'medium close-up',
    camera: '35mm',
    face_match_distance: 0.21,
  },
  img_tech_2: {
    image_id: 'img_tech_2',
    phash: 'f0e1d2c3b4a59611',
    phash_distance: 3,
    nearest_image_id: 'img_tech_1',
    clip_similarity: 0.913,
    scene_repeats: 2,
    composition: 'wide',
    camera: '85mm',
  },
};

/** Scene inputs (§R6.3) — read-only in FS9; `loc_unknown_seed` is intentionally
 * absent so an unresolved id renders raw instead of vanishing. */
export const LOCATIONS: readonly LocationWireDTO[] = [
  {
    id: 'loc_tech_studio',
    channel_id: 'ch_tech',
    name: 'Home studio',
    description: 'Standing desk, warm practicals, bookshelf backdrop.',
  },
  {
    id: 'loc_tech_rooftop',
    channel_id: 'ch_tech',
    name: 'Rooftop terrace',
    description: 'City skyline, dusk-only usage.',
  },
];

/** Polls before a regenerated image flips back to a terminal status (no clocks). */
export const IMAGE_POLLS_TO_READY = 2;

interface ImageMutationState {
  deleted: Set<string>;
  overrides: Map<string, Partial<ImageWireDTO>>;
  extraAttempts: Map<string, ImageHistoryEntryWireDTO[]>;
  countdown: Map<string, number>;
  regenSeq: number;
  references: Map<string, string[]>;
}

const imageState: ImageMutationState = {
  deleted: new Set(),
  overrides: new Map(),
  extraAttempts: new Map(),
  countdown: new Map(),
  regenSeq: 0,
  references: new Map(),
};

/** Test hook: restore the pristine image state (unit tests only). */
export function resetFixtureImageState(): void {
  imageState.deleted = new Set();
  imageState.overrides = new Map();
  imageState.extraAttempts = new Map();
  imageState.countdown = new Map();
  imageState.regenSeq = 0;
  imageState.references = new Map();
}

function tickImageCountdowns(): void {
  for (const [id, polls] of imageState.countdown) {
    if (polls <= 1) {
      imageState.countdown.delete(id);
      imageState.overrides.set(id, { ...imageState.overrides.get(id), status: 'verified' });
      const attempts = imageState.extraAttempts.get(id) ?? [];
      const last = attempts[attempts.length - 1];
      if (last) {
        imageState.extraAttempts.set(id, [
          ...attempts.slice(0, -1),
          { ...last, result: 'verified' },
        ]);
      }
    } else {
      imageState.countdown.set(id, polls - 1);
    }
  }
}

function materializeImages(scenario: FixtureScenario): readonly ImageWireDTO[] {
  const base = scenario === 'empty' ? [] : IMAGES;
  return base
    .filter((image) => !imageState.deleted.has(image.id))
    .map((image) => ({ ...image, ...imageState.overrides.get(image.id) }));
}

function imageAttempts(id: string): readonly ImageHistoryEntryWireDTO[] {
  return [...(IMAGE_HISTORY[id] ?? []), ...(imageState.extraAttempts.get(id) ?? [])];
}

function resolveImagesAndLocations(
  method: string,
  p: string,
  scenario: FixtureScenario,
): FixtureResponse | undefined {
  const channelImages = /^\/channels\/([^/]+)\/images$/.exec(p);
  if (method === 'GET' && channelImages) {
    tickImageCountdowns();
    const channelId = channelImages[1];
    return {
      status: 200,
      body: materializeImages(scenario).filter((image) => image.channel_id === channelId),
    };
  }

  const channelLocations = /^\/channels\/([^/]+)\/locations$/.exec(p);
  if (method === 'GET' && channelLocations) {
    const channelId = channelLocations[1];
    const items =
      scenario === 'empty' ? [] : LOCATIONS.filter((entry) => entry.channel_id === channelId);
    return { status: 200, body: items };
  }

  const historyMatch = /^\/images\/([^/]+)\/history$/.exec(p);
  if (method === 'GET' && historyMatch) {
    return { status: 200, body: imageAttempts(historyMatch[1] ?? '') };
  }

  const similarityMatch = /^\/images\/([^/]+)\/similarity$/.exec(p);
  if (method === 'GET' && similarityMatch) {
    const report = IMAGE_SIMILARITY[similarityMatch[1] ?? ''];
    return report
      ? { status: 200, body: report }
      : { status: 404, body: { message: 'No similarity report' } };
  }

  const regenerateMatch = /^\/images\/([^/]+)\/regenerate$/.exec(p);
  if (method === 'POST' && regenerateMatch) {
    const id = regenerateMatch[1] ?? '';
    const current = materializeImages(scenario).find((image) => image.id === id);
    if (!current) return { status: 404, body: { message: 'Not found' } };
    imageState.regenSeq += 1;
    const attempts = imageAttempts(id);
    imageState.extraAttempts.set(id, [
      ...(imageState.extraAttempts.get(id) ?? []),
      {
        id: `ih_regen_${imageState.regenSeq}`,
        image_id: id,
        attempt: attempts.length + 1,
        prompt: current.prompt ?? null,
        seed: (current.seed ?? 0) + imageState.regenSeq,
        provider: current.provider ?? null,
        result: 'queued',
        created_at: `${FIXTURE_TODAY}T11:00:00Z`,
      },
    ]);
    // The worker owns the work — the record enters a queued state and the list
    // polls it to a terminal one (deterministic countdown, no clocks).
    imageState.overrides.set(id, { ...imageState.overrides.get(id), status: 'queued' });
    imageState.countdown.set(id, IMAGE_POLLS_TO_READY);
    return { status: 202, body: { task_id: `task_regen_${id}` } };
  }

  const imageMatch = /^\/images\/([^/]+)$/.exec(p);
  if (imageMatch) {
    const id = imageMatch[1] ?? '';
    if (method === 'GET') {
      tickImageCountdowns();
      const image = materializeImages(scenario).find((entry) => entry.id === id);
      return image ? { status: 200, body: image } : { status: 404, body: { message: 'Not found' } };
    }
    if (method === 'DELETE') {
      imageState.deleted.add(id);
      return { status: 204, body: null };
    }
  }

  const referencesMatch = /^\/actors\/([^/]+)\/references$/.exec(p);
  if (method === 'POST' && referencesMatch) {
    const actorId = referencesMatch[1] ?? '';
    const uploaded = imageState.references.get(actorId) ?? [];
    imageState.references.set(actorId, [...uploaded, `ref_${uploaded.length + 1}`]);
    // *(assumed)* 201 body — FE-RV-12. The feature only needs "accepted".
    return { status: 201, body: { actor_id: actorId, accepted: true } };
  }

  return undefined;
}

/* ---------------------------------------------------------------------------
 * FS10 — Prompt Library (§R10.6). Versioned rows, exactly as DATABASE_SPEC
 * describes them: `id · type · text · version · author · model · result ·
 * created_at`. Note what is NOT here, because the contract does not carry it:
 * no `name`, no `channel_id`, no `is_active`, no `variables` (plan §5.2
 * D1/D2/D5). One row deliberately carries an UNRECOGNISED type so the raw-value
 * path is exercised, and `model`/`result` are present on some rows and absent
 * on others so the UI must handle both.
 * ------------------------------------------------------------------------- */

export const PROMPTS: readonly PromptWireDTO[] = [
  {
    id: 'prm_system_1',
    type: 'system',
    text: 'You write posts for a Telegram channel.\nKeep sentences short.\nNever repeat an opening you used before.',
    version: 1,
    author: 'usr_owner',
    model: null,
    result: null,
    created_at: '2026-07-11T09:00:00Z',
  },
  {
    id: 'prm_system_2',
    type: 'system',
    text: 'You write posts for a Telegram channel.\nKeep sentences short.\nVary structure, opening and closing between posts.\nNever repeat an opening you used before.',
    version: 2,
    author: 'usr_owner',
    model: 'claude-opus-4-8',
    result: null,
    created_at: '2026-07-19T14:30:00Z',
  },
  {
    id: 'prm_system_3',
    type: 'system',
    text: 'You write posts for a Telegram channel.\nKeep sentences short and concrete.\nVary structure, opening and closing between posts.\nAvoid stock AI phrasing.\nNever repeat an opening you used before.',
    version: 3,
    author: 'usr_admin',
    model: 'claude-opus-4-8',
    result: null,
    created_at: `${FIXTURE_TODAY}T08:15:00Z`,
  },
  {
    id: 'prm_image_1',
    type: 'image',
    text: 'Photorealistic editorial photograph.\nNatural light, shallow depth of field.',
    version: 1,
    author: 'usr_editor',
    model: null,
    result: null,
    created_at: '2026-07-14T11:05:00Z',
  },
  {
    id: 'prm_image_2',
    type: 'image',
    text: 'Photorealistic editorial photograph.\nNatural light, shallow depth of field.\nNo text, no watermarks, no logos.',
    version: 2,
    author: 'usr_editor',
    model: null,
    result: null,
    created_at: '2026-07-26T16:40:00Z',
  },
  {
    id: 'prm_negative_1',
    type: 'negative',
    text: 'lowres, deformed hands, extra fingers, watermark, text overlay',
    version: 1,
    author: 'usr_editor',
    model: null,
    result: null,
    created_at: '2026-07-14T11:12:00Z',
  },
  {
    id: 'prm_morning_1',
    type: 'morning',
    text: 'Open with one concrete observation from the last 24 hours.\nEnd with a question the reader can answer in one line.',
    version: 1,
    author: 'usr_admin',
    model: 'claude-haiku-4-5',
    // The backend recorded the output of the run that produced this row.
    result: 'Accepted after 1 rewrite (quality gate passed).',
    created_at: '2026-07-22T06:00:00Z',
  },
  {
    // An UNRECOGNISED `prompt_type`: the UI must render the raw value, not hide
    // the row and not coerce it into a known label (the parseStatus rule).
    id: 'prm_unknown_1',
    type: 'weekly_digest',
    text: 'Summarise the week in five bullets.',
    version: 1,
    author: 'usr_owner',
    model: null,
    result: null,
    created_at: '2026-07-28T07:30:00Z',
  },
];

interface PromptMutationState {
  created: PromptWireDTO[];
  seq: number;
}

const promptState: PromptMutationState = { created: [], seq: 0 };

/** Test hook: restore the pristine prompt state (unit tests only). */
export function resetFixturePromptState(): void {
  promptState.created = [];
  promptState.seq = 0;
}

function materializePrompts(scenario: FixtureScenario): readonly PromptWireDTO[] {
  if (scenario === 'empty') return promptState.created;
  return [...PROMPTS, ...promptState.created];
}

/**
 * The §Prompts group — three calls, nothing else. `POST /prompts` is a NEW
 * VERSION (§R10.6 "Правка = новая версия"): the server assigns `version`, so
 * the stand-in does too. 201, never 202 — this write is not a queue intent.
 */
function resolvePrompts(
  method: string,
  p: string,
  url: URL,
  scenario: FixtureScenario,
  meta?: FixtureRequestMeta,
): FixtureResponse | undefined {
  if (p === '/prompts' && method === 'GET') {
    const type = url.searchParams.get('type');
    const items = materializePrompts(scenario).filter((row) => !type || row.type === type);
    return { status: 200, body: items };
  }

  if (p === '/prompts' && method === 'POST') {
    const sent = meta?.body as Partial<PromptCreateRequestWireDTO> | undefined;
    const type = typeof sent?.type === 'string' ? sent.type : '';
    const text = typeof sent?.text === 'string' ? sent.text : '';
    if (type === '' || text.trim() === '') {
      return { status: 400, body: { message: 'A prompt type and text are required.' } };
    }
    const siblings = materializePrompts(scenario).filter((row) => row.type === type);
    const nextVersion = siblings.reduce((max, row) => Math.max(max, row.version), 0) + 1;
    promptState.seq += 1;
    const created: PromptWireDTO = {
      id: `prm_${type}_new_${promptState.seq}`,
      type,
      text,
      version: nextVersion,
      author: 'usr_owner',
      model: typeof sent?.model === 'string' ? sent.model : null,
      result: null,
      // Deterministic clock (no Date.now anywhere in the dataset).
      created_at: `${FIXTURE_TODAY}T12:${String(promptState.seq).padStart(2, '0')}:00Z`,
    };
    promptState.created = [...promptState.created, created];
    return { status: 201, body: created };
  }

  const versionsMatch = /^\/prompts\/([^/]+)\/versions$/.exec(p);
  if (method === 'GET' && versionsMatch) {
    const id = versionsMatch[1] ?? '';
    const all = materializePrompts(scenario);
    const row = all.find((entry) => entry.id === id);
    if (!row) return { status: 404, body: { message: 'Not found' } };
    // The chain is the sibling rows of the same type (§R10.6 — an edit is a new
    // version of that type). Whether the live wire agrees is FE-RV-13.
    return { status: 200, body: all.filter((entry) => entry.type === row.type) };
  }

  return undefined;
}

export interface FixtureResponse {
  readonly status: number;
  readonly body: unknown;
}

/**
 * /api/v1 resolver shared by the server branch and the MSW worker. Returns
 * undefined for paths the dataset does not model (callers surface an honest
 * error — nothing is silently invented). Read paths are pure; the /documents
 * group additionally consults the deterministic session state above (FS7 —
 * stand-in only). `meta` carries body-derived facts the worker extracted
 * (multipart filename/size, assign channel_id) — the resolver never parses
 * bodies itself.
 */
export function resolveFixture(
  method: string,
  path: string,
  scenario: FixtureScenario,
  meta?: FixtureRequestMeta,
): FixtureResponse | undefined {
  const url = new URL(path, 'http://fixture.local');
  const p = url.pathname.replace(/^\/api\/v1/, '');
  const empty = scenario === 'empty';

  if (p.startsWith('/documents')) {
    return resolveDocuments(method, p, url, scenario, meta);
  }

  if (p.startsWith('/personas') || p.startsWith('/actors') || /\/(personas|actors)$/.test(p)) {
    const hit = resolvePersonasAndActors(method, p, scenario, meta);
    if (hit) return hit;
  }

  // FS9 — the §Images group, the actor reference upload and §Locations.
  if (p.startsWith('/images') || /\/(images|locations|references)$/.test(p)) {
    const hit = resolveImagesAndLocations(method, p, scenario);
    if (hit) return hit;
  }

  // FS10 — the §Prompts group (three calls; platform-wide, no channel scope).
  if (p.startsWith('/prompts')) {
    const hit = resolvePrompts(method, p, url, scenario, meta);
    if (hit) return hit;
  }

  // FS12 — the Platform & Admin groups (users, sessions revoke, config
  // versions, audit log, api-keys, health probes). Anything this does not
  // model falls through to the resolver's own 404, which is what keeps the
  // absent screens' honest seams testable (plan §5.2 D2–D6).
  {
    const hit = resolvePlatform(method, p, url, scenario);
    if (hit) return hit;
  }

  if (method === 'GET' && p === '/channels') {
    return { status: 200, body: empty ? [] : CHANNELS };
  }

  const postsMatch = /^\/channels\/([^/]+)\/posts$/.exec(p);
  if (method === 'POST' && postsMatch) {
    // Manual draft (§API Posts) — 201 with the created post (FS6 chat bridge).
    const created: PostWireDTO = {
      id: `post_draft_${postsMatch[1] ?? 'unknown'}`,
      channel_id: postsMatch[1] ?? 'unknown',
      status: 'draft',
      title: 'Draft from chat',
      body_preview: 'Deterministic fixture reply…',
      created_at: `${FIXTURE_TODAY}T09:00:00Z`,
    };
    return { status: 201, body: created };
  }
  if (method === 'GET' && postsMatch) {
    const channelId = postsMatch[1];
    const status = url.searchParams.get('status');
    const items = empty
      ? []
      : POSTS.filter(
          (post) => post.channel_id === channelId && (!status || post.status === status),
        );
    return { status: 200, body: items };
  }

  const postMatch = /^\/posts\/([^/]+)$/.exec(p);
  if (method === 'GET' && postMatch) {
    const post = POSTS.find((entry) => entry.id === postMatch[1]);
    return post ? { status: 200, body: post } : { status: 404, body: { message: 'Not found' } };
  }

  const historyMatch = /^\/posts\/([^/]+)\/history$/.exec(p);
  if (method === 'GET' && historyMatch) {
    return { status: 200, body: POST_HISTORY[historyMatch[1] ?? ''] ?? [] };
  }

  const intentMatch = /^\/posts\/([^/]+)\/(approve|reject|generate)$/.exec(p);
  if (method === 'POST' && intentMatch) {
    // Queue intent (§R10.1): acknowledged, executed by the worker — 202.
    return { status: 202, body: { task_id: `task_intent_${intentMatch[1]}_${intentMatch[2]}` } };
  }

  if (method === 'GET' && p === '/tasks') {
    const status = url.searchParams.get('status');
    const type = url.searchParams.get('type');
    const channelId = url.searchParams.get('channel_id');
    // FS12 appends the admin-scope rows (contract `task_status` vocabulary).
    // The FS5 rows are untouched and still answer the dashboard exactly as
    // before — none of the new rows is a queued `publish`, so the schedule
    // timeline's selector cannot pick them up (plan §3.3).
    const all: readonly TaskAdminWireDTO[] = [...TASKS, ...PLATFORM_TASKS];
    const items = empty
      ? []
      : all.filter(
          (task) =>
            (!status || task.status === status) &&
            (!type || task.type === type) &&
            (!channelId || task.channel_id === channelId),
        );
    return { status: 200, body: items };
  }

  // POST /tasks/{id}/{cancel|run|requeue} — queue intents (§R10.1/§R8.11).
  const taskIntentMatch = /^\/tasks\/([^/]+)\/(cancel|run|requeue)$/.exec(p);
  if (method === 'POST' && taskIntentMatch) {
    return {
      status: 202,
      body: {
        task_id: taskIntentMatch[1] ?? null,
        status: taskIntentMatch[2] === 'cancel' ? 'cancelled' : 'pending',
      },
    };
  }

  const taskMatch = /^\/tasks\/([^/]+)$/.exec(p);
  if (method === 'GET' && taskMatch) {
    const task =
      TASKS.find((entry) => entry.id === taskMatch[1]) ??
      PLATFORM_TASKS.find((entry) => entry.id === taskMatch[1]);
    return task ? { status: 200, body: task } : { status: 404, body: { message: 'Not found' } };
  }

  const analyticsMatch = /^\/analytics\/channels\/([^/]+)$/.exec(p);
  if (method === 'GET' && analyticsMatch) {
    const snapshot = ANALYTICS[analyticsMatch[1] ?? ''];
    return snapshot && !empty
      ? { status: 200, body: snapshot }
      : { status: 404, body: { message: 'No snapshot' } };
  }

  if (method === 'GET' && p === '/cost') {
    const groupBy = url.searchParams.get('group_by') ?? 'day';
    if (empty) return { status: 200, body: [] };
    if (groupBy === 'day') {
      // The one facet whose keys ARE dates, so the contract's `?from=&to=` can
      // be honoured for real. A range outside the data returns an honest empty
      // series — never zeros (the whole point of §R10.3 discipline).
      return {
        status: 200,
        body: withinRange(COST_BY_DAY, url.searchParams.get('from'), url.searchParams.get('to')),
      };
    }
    const facet = COST_BY_FACET[groupBy];
    return facet
      ? { status: 200, body: facet }
      : { status: 400, body: { message: 'Unsupported group_by' } };
  }

  // FS11 — quality / trends / period reports (§R11.7). Undocumented shapes:
  // the mirrors are *(assumed)* and the mapper degrades unknown keys by raw
  // name, so a live correction is a mapper-level change (FE-RV-14).
  if (method === 'GET' && p === '/analytics/quality') {
    return { status: 200, body: empty ? {} : QUALITY_PANEL };
  }

  if (method === 'GET' && p === '/analytics/trends') {
    return { status: 200, body: empty ? {} : TRENDS_PANEL };
  }

  const reportMatch = /^\/analytics\/reports\/([^/]+)$/.exec(p);
  if (method === 'GET' && reportMatch) {
    if (empty) return { status: 200, body: {} };
    const report = REPORTS[reportMatch[1] ?? ''];
    return report
      ? { status: 200, body: report }
      : { status: 404, body: { message: 'Unknown report period' } };
  }

  return undefined;
}

/* ------------------------------------------------------------------------- *
 * FS12 — the Platform & Admin groups (deterministic, no clocks).
 *
 * Six sets of rows exist here because the frozen contract carries six sets of
 * calls: users, session revocation, config versions, the audit log, the tasks
 * queue in its admin projection, api-keys and health probes.
 *
 * What is deliberately ABSENT and asserted absent by
 * `tests/unit/platform-fixtures.test.ts`: any `/providers`, `/logs`, `/flags`,
 * `/notifications`, session-inventory, invoice or export path. Those screens
 * have no contract call, so the fixture answers 404 exactly as a real backend
 * would — a stand-in that invented them would make the honest seams untestable
 * (the FS9 "no placeholder art, fixtures included" rule applied to platform
 * data).
 *
 * NOTE on secrets: `API_KEY_SLOTS` carries NO key value, and `PUT /api-keys`
 * answers 204 and stores NOTHING. There is no code path in this file capable of
 * echoing a submitted secret (plan §5.2 D13).
 * ------------------------------------------------------------------------- */

export const PLATFORM_USERS: readonly PlatformUserWireDTO[] = [
  {
    id: 'usr_owner',
    email: 'owner@console.local',
    role: 'owner',
    status: 'active',
    created_at: '2026-01-04T09:00:00Z',
  },
  {
    id: 'usr_admin',
    email: 'admin@console.local',
    role: 'admin',
    status: 'active',
    created_at: '2026-02-11T09:00:00Z',
  },
  {
    id: 'usr_editor',
    email: 'editor@console.local',
    role: 'editor',
    status: 'active',
    created_at: '2026-03-02T09:00:00Z',
  },
  {
    id: 'usr_analyst',
    email: 'analyst@console.local',
    role: 'analyst',
    status: 'active',
    created_at: '2026-04-21T09:00:00Z',
  },
  {
    id: 'usr_viewer',
    email: 'viewer@console.local',
    role: 'viewer',
    status: 'active',
    created_at: '2026-05-19T09:00:00Z',
  },
  {
    // An unrecognised role — proves the RAW-value path (never coerced).
    id: 'usr_legacy',
    email: 'legacy@console.local',
    role: 'superuser',
    status: 'disabled',
    created_at: '2025-11-30T09:00:00Z',
  },
];

export const CONFIG_VERSIONS: readonly ConfigVersionWireDTO[] = [
  {
    id: 'cfg_3',
    author: 'usr_owner',
    description: 'Raise similarity threshold for Tech Digest',
    created_at: `${FIXTURE_TODAY}T07:10:00Z`,
    snapshot: {
      similarity_threshold: 0.88,
      humanness_min: 75,
      posts_per_day: 3,
      max_rewrites: 3,
      lead_time_minutes: 45,
    },
  },
  {
    id: 'cfg_2',
    author: 'usr_admin',
    description: 'Lower posting cadence after the holiday window',
    created_at: '2026-07-24T11:20:00Z',
    snapshot: {
      similarity_threshold: 0.85,
      humanness_min: 75,
      posts_per_day: 3,
      max_rewrites: 3,
      lead_time_minutes: 30,
    },
  },
  {
    // No snapshot on the wire — proves the honest "cannot compare" path.
    id: 'cfg_1',
    author: 'usr_owner',
    description: 'Initial configuration',
    created_at: '2026-01-04T09:05:00Z',
    snapshot: null,
  },
];

export const AUDIT_RECORDS: readonly AuditRecordWireDTO[] = [
  {
    id: 'aud_5',
    actor_user_id: 'usr_owner',
    action: 'user.role_changed',
    entity: 'user',
    entity_id: 'usr_editor',
    before: { role: 'viewer' },
    after: { role: 'editor' },
    created_at: `${FIXTURE_TODAY}T08:40:00Z`,
  },
  {
    id: 'aud_4',
    actor_user_id: 'usr_owner',
    action: 'api_key.rotated',
    entity: 'api_key',
    entity_id: 'openai',
    // Deliberately carries NO value on either side: the backend masks secrets
    // (§R12.2), and the console must render a rotation without one.
    before: { configured: true },
    after: { configured: true, rotated_at: `${FIXTURE_TODAY}T08:12:00Z` },
    created_at: `${FIXTURE_TODAY}T08:12:00Z`,
  },
  {
    // A CREATE: `before` is null and stays null — never padded into {}.
    id: 'aud_3',
    actor_user_id: 'usr_admin',
    action: 'channel.created',
    entity: 'channel',
    entity_id: 'ch_art',
    before: null,
    after: { title: 'Art Curator', status: 'active', language: 'en' },
    created_at: '2026-07-28T15:02:00Z',
  },
  {
    // An unrecognised key on both sides — proves the RAW-name path.
    id: 'aud_2',
    actor_user_id: 'usr_admin',
    action: 'config.updated',
    entity: 'config',
    entity_id: 'cfg_2',
    before: { posts_per_day: 4, experimental_reranker: 'v1' },
    after: { posts_per_day: 3, experimental_reranker: 'v2' },
    created_at: '2026-07-24T11:20:00Z',
  },
  {
    // A DELETE: `after` is null.
    id: 'aud_1',
    actor_user_id: 'usr_owner',
    action: 'document.deleted',
    entity: 'document',
    entity_id: 'doc_legacy',
    before: { title: 'Legacy brand guide', source: 'upload' },
    after: null,
    created_at: '2026-07-20T10:00:00Z',
  },

  /* FS13 — records whose actor is a SIGNED-IN fixture user, so `/profile`'s
   * activity tab has real data to scope. The FS12 rows above are BYTE-IDENTICAL
   * and keep their own `usr_owner`/`usr_admin` actors: adding new ids rather
   * than editing existing ones keeps every `/audit` assertion on its exact
   * inputs (the FS12 rule about additive fixtures).
   *
   * Only the OWNER and ANALYST fixture users get rows. That is deliberate: the
   * frozen matrix lets owner, admin and analyst read the audit log, and leaving
   * the admin without records exercises the honest empty state on a role that
   * IS permitted — a different path from the permission state that editor and
   * viewer meet.
   *
   * **They are dated OLDER than every FS12 row, and that is load-bearing.**
   * The list renders newest-first, so newer rows would have changed which
   * record `/audit` shows first — silently breaking an FS12 journey that clicks
   * the first diff. Additive-by-id is not sufficient when ORDER is an input to
   * an existing assertion (the FS9 lesson that sorting is part of the contract
   * a test asserts). Dating them earliest keeps `/audit` byte-identical while
   * `/profile` is unaffected, because it filters by actor rather than by date. */
  {
    id: 'aud_self_3',
    actor_user_id: 'usr_fixture_owner',
    action: 'prompt.version_created',
    entity: 'prompt',
    entity_id: 'pr_system',
    before: null,
    after: { type: 'system', version: 4 },
    created_at: '2026-07-18T09:15:00Z',
  },
  {
    id: 'aud_self_2',
    actor_user_id: 'usr_fixture_owner',
    action: 'channel.paused',
    entity: 'channel',
    entity_id: 'ch_tech',
    before: { status: 'active' },
    after: { status: 'paused' },
    created_at: '2026-07-17T07:02:00Z',
  },
  {
    // No field-level detail on either side — proves the "no detail recorded"
    // path renders without inventing a change set.
    id: 'aud_self_1',
    actor_user_id: 'usr_fixture_analyst',
    action: 'report.viewed',
    entity: 'analytics',
    entity_id: null,
    before: null,
    after: null,
    created_at: '2026-07-16T16:40:00Z',
  },
];

/**
 * Admin-scope queue rows in the CONTRACT's own `task_status` vocabulary
 * (§R4.11) — pending / succeeded / deferred / cancelled / dead — so the D14
 * mapping and the three RAW labels are exercised on real data. The FS5 rows
 * above are BYTE-IDENTICAL and still use their own wire words: reconciling them
 * is an FE-RV-8 question about the live backend, not an FS12 edit (plan §3.3).
 */
export const PLATFORM_TASKS: readonly TaskAdminWireDTO[] = [
  {
    id: 'task_dead_1',
    type: 'publish',
    status: 'dead',
    channel_id: 'ch_tech',
    attempts: 5,
    priority: 100,
    run_at: `${FIXTURE_TODAY}T05:00:00Z`,
    created_at: `${FIXTURE_TODAY}T04:00:00Z`,
    last_error: 'TelegramForbidden: bot was kicked from the channel',
  },
  {
    id: 'task_nr_2',
    type: 'validate',
    status: 'needs_review',
    channel_id: 'ch_tech',
    attempts: 1,
    priority: 100,
    run_at: `${FIXTURE_TODAY}T06:15:00Z`,
    created_at: `${FIXTURE_TODAY}T06:00:00Z`,
    last_error: 'Humanness score 71 below configured minimum 75',
  },
  {
    id: 'task_fail_3',
    type: 'generate_image',
    status: 'failed',
    channel_id: 'ch_daily',
    attempts: 2,
    priority: 100,
    run_at: `${FIXTURE_TODAY}T06:40:00Z`,
    created_at: `${FIXTURE_TODAY}T06:30:00Z`,
    last_error: 'ProviderTimeout after 60s',
  },
  {
    id: 'task_run_4',
    type: 'generate_text',
    status: 'running',
    channel_id: 'ch_tech',
    attempts: 1,
    priority: 50,
    run_at: `${FIXTURE_TODAY}T09:00:00Z`,
    created_at: `${FIXTURE_TODAY}T08:55:00Z`,
    last_error: null,
  },
  {
    id: 'task_pend_5',
    type: 'collect_metrics',
    status: 'pending',
    channel_id: 'ch_daily',
    attempts: 0,
    priority: 200,
    run_at: `${FIXTURE_TODAY}T12:00:00Z`,
    created_at: `${FIXTURE_TODAY}T08:00:00Z`,
    last_error: null,
  },
  {
    id: 'task_defer_6',
    type: 'publish',
    status: 'deferred',
    channel_id: 'ch_art',
    attempts: 1,
    priority: 100,
    run_at: `${FIXTURE_TODAY}T21:00:00Z`,
    created_at: `${FIXTURE_TODAY}T07:00:00Z`,
    last_error: 'Outside the channel publication window',
  },
  {
    id: 'task_cancel_7',
    type: 'reindex',
    status: 'cancelled',
    channel_id: 'ch_tech',
    attempts: 0,
    priority: 300,
    run_at: null,
    created_at: `${FIXTURE_TODAY}T05:30:00Z`,
    last_error: null,
  },
  {
    id: 'task_ok_8',
    type: 'backup',
    status: 'succeeded',
    channel_id: null,
    attempts: 1,
    priority: 300,
    run_at: `${FIXTURE_TODAY}T03:00:00Z`,
    created_at: `${FIXTURE_TODAY}T03:00:00Z`,
    last_error: null,
  },
];

/** Slot inventory — identity and PRESENCE only. No value field exists. */
export const API_KEY_SLOTS: readonly ApiKeySlotWireDTO[] = [
  { name: 'openai', kind: 'llm', configured: false, updated_at: null },
  { name: 'anthropic', kind: 'llm', configured: false, updated_at: null },
  { name: 'replicate', kind: 'image', configured: false, updated_at: null },
  // Presence unknown on the wire — renders as "unknown", never as "configured".
  { name: 'telegram', kind: 'telegram', configured: null, updated_at: null },
];

/** §R12.10 — readiness enumerates dependencies; liveness only says the process
 *  is up. One dependency is degraded and one carries an UNRECOGNISED state, so
 *  the grey "unknown" path is exercised rather than assumed. */
export const HEALTH_READY: HealthProbeWireDTO = {
  status: 'degraded',
  checks: {
    postgres: { status: 'ok' },
    redis: { status: 'degraded', detail: 'Replica lag 4.2s' },
    queue: { status: 'ok' },
    scheduler: { status: 'ok' },
    // Providers run on deterministic fakes until keys are added (§R2.10).
    llm_provider: { status: 'fake', detail: 'Deterministic fake, no key configured' },
  },
};

export const HEALTH_LIVE: HealthProbeWireDTO = { status: 'ok' };

/**
 * The FS12 groups. Returns undefined for anything it does not model, so
 * `resolveFixture` falls through to its own 404 — which is exactly what makes
 * the absent screens' seams testable.
 */
export function resolvePlatform(
  method: string,
  p: string,
  url: URL,
  scenario: FixtureScenario,
): FixtureResponse | undefined {
  const empty = scenario === 'empty';

  if (p === '/users' && method === 'GET') {
    return { status: 200, body: empty ? [] : PLATFORM_USERS };
  }
  if (p === '/users' && method === 'POST') {
    // A CREATE (§Users) — 201 with the created row. Not an invitation: the
    // contract has no invite flow, so nothing here pretends to send one.
    return {
      status: 201,
      body: {
        id: 'usr_created',
        email: 'new.member@console.local',
        role: 'viewer',
        status: 'active',
        created_at: `${FIXTURE_TODAY}T10:00:00Z`,
      },
    };
  }
  const userMatch = /^\/users\/([^/]+)$/.exec(p);
  if (userMatch && method === 'PATCH') {
    const user = PLATFORM_USERS.find((entry) => entry.id === userMatch[1]);
    return user ? { status: 200, body: user } : { status: 404, body: { message: 'Not found' } };
  }

  if (p === '/auth/sessions/revoke' && method === 'POST') {
    return { status: 204, body: null };
  }

  if (p === '/config-versions' && method === 'GET') {
    return { status: 200, body: empty ? [] : CONFIG_VERSIONS };
  }
  const rollbackMatch = /^\/config-versions\/([^/]+)\/rollback$/.exec(p);
  if (rollbackMatch && method === 'POST') {
    return { status: 202, body: { task_id: `task_rollback_${rollbackMatch[1] ?? 'x'}` } };
  }

  if (p === '/audit-log' && method === 'GET') {
    if (empty) return { status: 200, body: [] };
    const entity = url.searchParams.get('entity');
    const actor = url.searchParams.get('actor');
    return {
      status: 200,
      body: AUDIT_RECORDS.filter(
        (record) =>
          (!entity || record.entity === entity) && (!actor || record.actor_user_id === actor),
      ),
    };
  }

  if (p === '/api-keys' && method === 'GET') {
    return { status: 200, body: empty ? [] : API_KEY_SLOTS };
  }
  if (p === '/api-keys' && method === 'PUT') {
    // Write-only: 204, no body, nothing stored, nothing echoed (§R10.4/§R12.2).
    return { status: 204, body: null };
  }

  if (p === '/health/ready' && method === 'GET') {
    return { status: 200, body: empty ? { status: 'ok' } : HEALTH_READY };
  }
  if (p === '/health/live' && method === 'GET') {
    return { status: 200, body: HEALTH_LIVE };
  }

  return undefined;
}
