/**
 * Entity `persona` — model (Stage 3 §4, FS8 Memory §R9.12). The wire is
 * *(assumed)* pending FE-RV-11; THESE mappers are the single adjustment point.
 *
 * Two disciplines are load-bearing here:
 *  1. **Style Memory is FEATURES, not texts** (§R9.12). `style_features` is a
 *     backend-defined jsonb; the mapper normalizes it into a flat, renderable
 *     list WITHOUT inventing labels, units or confidence — an unknown key
 *     surfaces honestly by its raw name (the `parseStatus` discipline applied
 *     to jsonb).
 *  2. **Nothing internal leaks.** Generation internals and vector fields are
 *     never mapped into a ViewModel.
 */
import { parseStatus, type Status } from '@/shared/types/status';
import type { PersonaWireDTO, StyleFeaturesWireDTO } from '@/shared/types';

export type { PersonaWireDTO, StyleFeaturesWireDTO };

export interface StyleFeatureVM {
  /** Raw backend key — kept so an unknown feature is still traceable. */
  readonly key: string;
  /** Humanised label when the key is known; the raw key otherwise. */
  readonly label: string;
  /** Always a display string — numbers are formatted, objects are JSON'd. */
  readonly value: string;
  /** True when the key is not in the known set (rendered honestly as raw). */
  readonly unknown: boolean;
}

export interface PersonaVM {
  readonly id: string;
  readonly channelId: string;
  readonly name: string;
  readonly biography: string | null;
  readonly character: string | null;
  readonly mannerOfSpeech: string | null;
  readonly favoriteWords: readonly string[];
  readonly forbiddenExpressions: readonly string[];
  readonly goals: string | null;
  readonly audienceRelationship: string | null;
  readonly greetingStyle: string | null;
  readonly farewellStyle: string | null;
  readonly storytellingStyle: string | null;
  /** Style Memory (§R9.12), normalized for display. Empty = none derived yet. */
  readonly styleFeatures: readonly StyleFeatureVM[];
  readonly rawStatus: string | null;
  readonly status: Status | null;
  readonly archived: boolean;
  /** Optimistic-lock token echoed on PATCH when the wire carries one (§R4.2). */
  readonly version: number | null;
}

/** Known Style-Memory keys (§R9.12 names the families; the backend owns the
 * exact keys — anything outside this map renders by its raw key). */
const STYLE_FEATURE_LABELS: Readonly<Record<string, string>> = {
  sentence_length_avg: 'Average sentence length',
  sentence_length_variance: 'Sentence-length variation',
  dialogue_frequency: 'Dialogue frequency',
  paragraph_structure: 'Paragraph structure',
  emotional_dynamics: 'Emotional dynamics',
  transitions: 'Transitions',
  figures_of_speech: 'Figures of speech',
  vocabulary_richness: 'Vocabulary richness',
};

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (Array.isArray(value)) return value.map(displayValue).join(', ');
  return JSON.stringify(value);
}

/** Flatten the backend jsonb into renderable rows — never inventing meaning. */
export function mapStyleFeatures(
  features: StyleFeaturesWireDTO | null | undefined,
): readonly StyleFeatureVM[] {
  if (!features || typeof features !== 'object') return [];
  return Object.entries(features).map(([key, value]) => {
    const label = STYLE_FEATURE_LABELS[key];
    return {
      key,
      label: label ?? key,
      value: displayValue(value),
      unknown: label === undefined,
    };
  });
}

export function mapPersona(wire: PersonaWireDTO): PersonaVM {
  const rawStatus = wire.status ?? null;
  return {
    id: wire.id,
    channelId: wire.channel_id,
    name: wire.name,
    biography: wire.biography ?? null,
    character: wire.character ?? null,
    mannerOfSpeech: wire.manner_of_speech ?? null,
    favoriteWords: wire.favorite_words ?? [],
    forbiddenExpressions: wire.forbidden_expressions ?? [],
    goals: wire.goals ?? null,
    audienceRelationship: wire.audience_relationship ?? null,
    greetingStyle: wire.greeting_style ?? null,
    farewellStyle: wire.farewell_style ?? null,
    storytellingStyle: wire.storytelling_style ?? null,
    styleFeatures: mapStyleFeatures(wire.style_features),
    rawStatus,
    status: rawStatus !== null ? parseStatus(rawStatus) : null,
    archived: rawStatus === 'archived',
    version: wire.version ?? null,
  };
}

/** Active personas first, archived last; stable by name inside each group. */
export function sortPersonas(personas: readonly PersonaVM[]): readonly PersonaVM[] {
  return [...personas].sort((a, b) => {
    if (a.archived !== b.archived) return a.archived ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
}

/** Client-side LIST filtering (name/voice contains) — presentation only,
 * honestly distinct from any backend search (plan §5.2 D1). */
export function filterPersonas(
  personas: readonly PersonaVM[],
  query: string,
): readonly PersonaVM[] {
  const q = query.trim().toLowerCase();
  if (q === '') return personas;
  return personas.filter(
    (persona) =>
      persona.name.toLowerCase().includes(q) ||
      (persona.mannerOfSpeech ?? '').toLowerCase().includes(q) ||
      (persona.biography ?? '').toLowerCase().includes(q),
  );
}
