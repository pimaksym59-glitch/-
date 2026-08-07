/**
 * Entity `persona`/`actor` mapper semantics (FS8 T-FS8.2) + the Style Memory
 * (§R9.12) normalization rules: features are rendered, never invented; unknown
 * backend keys survive honestly; generation internals never reach a ViewModel.
 */
import { describe, expect, it } from 'vitest';
import { filterActors, mapActor } from '@/entities/actor';
import { filterPersonas, mapPersona, mapStyleFeatures, sortPersonas } from '@/entities/persona';
import type { ActorWireDTO, PersonaWireDTO } from '@/shared/types';

const PERSONA: PersonaWireDTO = {
  id: 'p1',
  channel_id: 'ch_tech',
  name: 'The calm senior engineer',
  biography: 'Fifteen years shipping infrastructure.',
  character: 'Measured, precise.',
  manner_of_speech: 'Short declarative sentences.',
  favorite_words: ['concretely'],
  forbidden_expressions: ['game-changer'],
  goals: 'Make a busy engineer smarter.',
  audience_relationship: 'A peer.',
  greeting_style: 'Straight in.',
  farewell_style: 'One takeaway.',
  storytelling_style: 'Problem → measurement.',
  style_features: { sentence_length_avg: 14.2, hedging_ratio: 0.08 },
  status: 'active',
  version: 3,
};

const ACTOR: ActorWireDTO = {
  id: 'a1',
  channel_id: 'ch_tech',
  name: 'Nadia',
  gender: 'female',
  age: 38,
  build: 'athletic',
  hair: 'short',
  hair_color: 'dark brown',
  eyes: 'hazel',
  clothing_style: 'technical minimal',
  appearance_description: 'Calm posture.',
  prompt_description: 'A 38-year-old engineer.',
  status: 'active',
};

describe('persona mapper (FS8)', () => {
  it('maps the voice fields and the optimistic-lock version', () => {
    const vm = mapPersona(PERSONA);
    expect(vm).toMatchObject({
      id: 'p1',
      channelId: 'ch_tech',
      name: 'The calm senior engineer',
      mannerOfSpeech: 'Short declarative sentences.',
      favoriteWords: ['concretely'],
      forbiddenExpressions: ['game-changer'],
      archived: false,
      version: 3,
    });
  });

  it('flags archived personas (history stays visible, never hidden)', () => {
    expect(mapPersona({ ...PERSONA, status: 'archived' }).archived).toBe(true);
  });

  it('tolerates a wire with only the required fields', () => {
    const minimal: PersonaWireDTO = { id: 'p2', channel_id: 'ch', name: 'Bare' };
    const vm = mapPersona(minimal);
    expect(vm.biography).toBeNull();
    expect(vm.favoriteWords).toEqual([]);
    expect(vm.styleFeatures).toEqual([]);
    expect(vm.version).toBeNull();
    expect(vm.archived).toBe(false);
  });

  it('sorts active personas before archived ones', () => {
    const list = [
      mapPersona({ ...PERSONA, id: 'z', name: 'Zed', status: 'archived' }),
      mapPersona({ ...PERSONA, id: 'a', name: 'Ann' }),
    ];
    expect(sortPersonas(list).map((p) => p.id)).toEqual(['a', 'z']);
  });

  it('filters by name/voice, case-insensitively', () => {
    const list = [
      mapPersona(PERSONA),
      mapPersona({ ...PERSONA, id: 'p3', name: 'Morning briefer' }),
    ];
    expect(filterPersonas(list, 'MORNING').map((p) => p.id)).toEqual(['p3']);
    expect(filterPersonas(list, 'declarative').map((p) => p.id)).toEqual(['p1', 'p3']);
    expect(filterPersonas(list, '')).toHaveLength(2);
  });
});

describe('style memory normalization (§R9.12)', () => {
  it('labels known keys and keeps unknown keys honest', () => {
    const rows = mapStyleFeatures({ sentence_length_avg: 14.2, hedging_ratio: 0.08 });
    const known = rows.find((r) => r.key === 'sentence_length_avg');
    const unknown = rows.find((r) => r.key === 'hedging_ratio');
    expect(known).toMatchObject({
      label: 'Average sentence length',
      value: '14.20',
      unknown: false,
    });
    expect(unknown).toMatchObject({ label: 'hedging_ratio', unknown: true });
  });

  it('renders every value type as a display string — never a crash, never invention', () => {
    const rows = mapStyleFeatures({
      count: 3,
      ratio: 0.125,
      label: 'short-blocks',
      flag: true,
      list: ['therefore', 'in practice'],
      nested: { a: 1 },
      missing: null,
    });
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    expect(byKey['count']).toBe('3');
    expect(byKey['ratio']).toBe('0.13');
    expect(byKey['label']).toBe('short-blocks');
    expect(byKey['flag']).toBe('yes');
    expect(byKey['list']).toBe('therefore, in practice');
    expect(byKey['nested']).toBe('{"a":1}');
    expect(byKey['missing']).toBe('—');
  });

  it('an absent or malformed jsonb yields no rows (honest emptiness)', () => {
    expect(mapStyleFeatures(null)).toEqual([]);
    expect(mapStyleFeatures(undefined)).toEqual([]);
    expect(mapStyleFeatures({})).toEqual([]);
  });
});

describe('actor mapper (Persona ≠ Actor)', () => {
  it('maps the visual identity only', () => {
    const vm = mapActor(ACTOR);
    expect(vm).toMatchObject({
      id: 'a1',
      name: 'Nadia',
      gender: 'female',
      age: 38,
      promptDescription: 'A 38-year-old engineer.',
      archived: false,
    });
  });

  it('never exposes generation internals in the ViewModel', () => {
    const withInternals = {
      ...ACTOR,
      face_embedding: [0.1, 0.2],
      reference_images_folder: '/secret/refs',
    } as ActorWireDTO;
    const vm = mapActor(withInternals);
    const serialized = JSON.stringify(vm);
    expect(serialized).not.toContain('face_embedding');
    expect(serialized).not.toContain('reference_images_folder');
    expect(serialized).not.toContain('/secret/refs');
    // And no voice field leaked into the actor VM (Persona ≠ Actor).
    expect(serialized).not.toContain('manner');
  });

  it('filters by name/appearance', () => {
    const list = [mapActor(ACTOR), mapActor({ ...ACTOR, id: 'a2', name: 'Ilya' })];
    expect(filterActors(list, 'ilya').map((a) => a.id)).toEqual(['a2']);
    expect(filterActors(list, '')).toHaveLength(2);
  });
});
