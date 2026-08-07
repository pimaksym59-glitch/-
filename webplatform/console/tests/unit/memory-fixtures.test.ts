/**
 * Memory fixture contract (FS8 T-FS8.3): the deterministic stand-in obeys the
 * frozen §Personas/§Actors surface — channel-scoped lists, PATCH with the
 * §R4.2 optimistic lock (409 on a stale version), archive, and the `empty`
 * scenario. Stand-in semantics only; the live wire is FE-RV-11.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { PERSONAS, resetFixturePersonaState, resolveFixture } from '@/shared/lib/fixtures/dataset';
import type { PersonaWireDTO, ActorWireDTO } from '@/shared/types';

function personas(channelId: string, scenario: 'default' | 'empty' = 'default') {
  const hit = resolveFixture('GET', `/api/v1/channels/${channelId}/personas`, scenario);
  expect(hit?.status).toBe(200);
  return hit?.body as readonly PersonaWireDTO[];
}

beforeEach(() => {
  resetFixturePersonaState();
});

describe('personas/actors fixture group (FS8 T-FS8.3)', () => {
  it('lists channel-scoped personas incl. the archived one (history stays visible)', () => {
    const tech = personas('ch_tech');
    expect(tech.map((p) => p.id)).toEqual(['persona_tech', 'persona_tech_archived']);
    expect(personas('ch_daily').map((p) => p.id)).toEqual(['persona_daily']);
    expect(personas('ch_tech', 'empty')).toEqual([]);
  });

  it('lists channel-scoped actors', () => {
    const hit = resolveFixture('GET', '/api/v1/channels/ch_tech/actors', 'default');
    expect((hit?.body as readonly ActorWireDTO[]).map((a) => a.id)).toEqual(['actor_tech']);
    expect(resolveFixture('GET', '/api/v1/channels/ch_tech/actors', 'empty')?.body).toEqual([]);
  });

  it('serves persona detail with style features incl. one UNKNOWN key', () => {
    const persona = resolveFixture('GET', '/api/v1/personas/persona_tech', 'default')
      ?.body as PersonaWireDTO;
    expect(persona.name).toBe('The calm senior engineer');
    // The fixture deliberately exercises the honest raw-key rendering path.
    expect(Object.keys(persona.style_features ?? {})).toContain('hedging_ratio');
    expect(resolveFixture('GET', '/api/v1/personas/nope', 'default')?.status).toBe(404);
  });

  it('PATCH updates the voice and bumps the optimistic-lock version', () => {
    const before = resolveFixture('GET', '/api/v1/personas/persona_tech', 'default')
      ?.body as PersonaWireDTO;
    const patched = resolveFixture('PATCH', '/api/v1/personas/persona_tech', 'default', {
      body: { manner_of_speech: 'Even shorter.', version: before.version },
    });
    expect(patched?.status).toBe(200);
    const body = patched?.body as PersonaWireDTO;
    expect(body.manner_of_speech).toBe('Even shorter.');
    expect(body.version).toBe((before.version ?? 0) + 1);
    // The change persists for subsequent reads (session state, no clocks).
    const after = resolveFixture('GET', '/api/v1/personas/persona_tech', 'default')
      ?.body as PersonaWireDTO;
    expect(after.manner_of_speech).toBe('Even shorter.');
  });

  it('PATCH with a STALE version answers 409 (§R4.2) — never a silent overwrite', () => {
    const conflict = resolveFixture('PATCH', '/api/v1/personas/persona_tech', 'default', {
      body: { manner_of_speech: 'Hijack', version: 1 },
    });
    expect(conflict?.status).toBe(409);
    const after = resolveFixture('GET', '/api/v1/personas/persona_tech', 'default')
      ?.body as PersonaWireDTO;
    expect(after.manner_of_speech).not.toBe('Hijack');
  });

  it('archive flips the status and keeps the persona listed', () => {
    const archived = resolveFixture('POST', '/api/v1/personas/persona_daily/archive', 'default');
    expect(archived?.status).toBe(200);
    const list = personas('ch_daily');
    expect(list).toHaveLength(1);
    expect(list[0]?.status).toBe('archived');
  });

  it('published posts are readable through the existing posts endpoint (§R9.1)', () => {
    const hit = resolveFixture('GET', '/api/v1/channels/ch_tech/posts?status=published', 'default');
    expect(hit?.status).toBe(200);
    const items = hit?.body as readonly { id: string; status: string }[];
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((p) => p.status === 'published')).toBe(true);
  });

  it('base PERSONAS stay pristine across mutations (state is an overlay)', () => {
    resolveFixture('POST', '/api/v1/personas/persona_tech/archive', 'default');
    resetFixturePersonaState();
    expect(personas('ch_tech')[0]?.status).toBe('active');
    expect(PERSONAS.find((p) => p.id === 'persona_tech')?.status).toBe('active');
  });
});
