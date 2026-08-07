/**
 * FS10 T-FS10.10 — the §Prompts fixture group. The stand-in must answer
 * exactly the three calls the contract carries and nothing more: list (with the
 * contract's own `?type=` filter), the version chain, and a POST that creates a
 * NEW VERSION with a server-assigned number (§R10.6).
 *
 * It also proves the absences: no channel scoping anywhere in the group, and no
 * activation/delete/update route to call.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  PROMPTS,
  resetFixturePromptState,
  resolveFixture,
  type FixtureResponse,
} from '@/shared/lib/fixtures/dataset';
import type { PromptWireDTO } from '@/shared/types';

const rows = (hit: FixtureResponse | undefined): readonly PromptWireDTO[] =>
  (hit?.body ?? []) as readonly PromptWireDTO[];

beforeEach(() => {
  resetFixturePromptState();
});

describe('GET /prompts', () => {
  it('returns every version row, platform-wide (no channel in the path)', () => {
    const hit = resolveFixture('GET', '/api/v1/prompts', 'default');
    expect(hit?.status).toBe(200);
    expect(rows(hit).length).toBe(PROMPTS.length);
  });

  it('honours the contract filter `?type=`', () => {
    const hit = resolveFixture('GET', '/api/v1/prompts?type=system', 'default');
    const list = rows(hit);
    expect(list.length).toBeGreaterThan(1);
    expect(list.every((row) => row.type === 'system')).toBe(true);
  });

  it('carries a row whose type is NOT in the known enum (the raw-value path)', () => {
    const list = rows(resolveFixture('GET', '/api/v1/prompts', 'default'));
    expect(list.some((row) => row.type === 'weekly_digest')).toBe(true);
  });

  it('carries rows with and without `model`/`result`, so both paths are exercised', () => {
    const list = rows(resolveFixture('GET', '/api/v1/prompts', 'default'));
    expect(list.some((row) => row.model !== null && row.model !== undefined)).toBe(true);
    expect(list.some((row) => (row.model ?? null) === null)).toBe(true);
    expect(list.some((row) => (row.result ?? null) !== null)).toBe(true);
  });

  it('the empty scenario returns an empty library', () => {
    expect(rows(resolveFixture('GET', '/api/v1/prompts', 'empty'))).toEqual([]);
  });

  it('no fixture row carries a channel, an active flag or variables', () => {
    for (const row of PROMPTS) {
      expect(row).not.toHaveProperty('channel_id');
      expect(row).not.toHaveProperty('is_active');
      expect(row).not.toHaveProperty('active');
      expect(row).not.toHaveProperty('variables');
      expect(row).not.toHaveProperty('name');
    }
  });
});

describe('GET /prompts/{id}/versions', () => {
  it('returns the sibling rows of the same type (the chain)', () => {
    const hit = resolveFixture('GET', '/api/v1/prompts/prm_system_2/versions', 'default');
    expect(hit?.status).toBe(200);
    const chain = rows(hit);
    expect(chain.every((row) => row.type === 'system')).toBe(true);
    expect(chain.map((row) => row.version).sort()).toEqual([1, 2, 3]);
  });

  it('404s for an unknown row rather than inventing an empty chain', () => {
    expect(resolveFixture('GET', '/api/v1/prompts/nope/versions', 'default')?.status).toBe(404);
  });
});

describe('POST /prompts (a new version — §R10.6)', () => {
  it('creates the NEXT version of that type and answers 201, never 202', () => {
    const hit = resolveFixture('POST', '/api/v1/prompts', 'default', {
      body: { type: 'system', text: 'a fourth revision' },
    });
    expect(hit?.status).toBe(201);
    const created = hit?.body as PromptWireDTO;
    expect(created.version).toBe(4);
    expect(created.type).toBe('system');
    expect(created.text).toBe('a fourth revision');
    // The server assigns author/date — the client never sends them.
    expect(created.author).toBe('usr_owner');
    expect(created.created_at).toMatch(/^2026-07-30T12:\d\d:00Z$/);
  });

  it('appends to the chain, leaving earlier versions untouched (append-only)', () => {
    resolveFixture('POST', '/api/v1/prompts', 'default', {
      body: { type: 'image', text: 'v3 of the image prompt' },
    });
    const chain = rows(resolveFixture('GET', '/api/v1/prompts/prm_image_1/versions', 'default'));
    expect(chain.map((row) => row.version).sort()).toEqual([1, 2, 3]);
    expect(chain.find((row) => row.version === 1)?.text).toBe(PROMPTS[3]?.text);
  });

  it('starts a chain at v1 for a type that has none yet', () => {
    const hit = resolveFixture('POST', '/api/v1/prompts', 'default', {
      body: { type: 'evening', text: 'wind-down copy' },
    });
    expect((hit?.body as PromptWireDTO).version).toBe(1);
  });

  it('rejects an empty body with 400 instead of writing a blank version', () => {
    expect(
      resolveFixture('POST', '/api/v1/prompts', 'default', { body: { type: 'system', text: '  ' } })
        ?.status,
    ).toBe(400);
    expect(resolveFixture('POST', '/api/v1/prompts', 'default')?.status).toBe(400);
  });
});

describe('the group carries nothing the contract does not', () => {
  it('has no update, delete or promote route', () => {
    expect(resolveFixture('PATCH', '/api/v1/prompts/prm_system_1', 'default')).toBeUndefined();
    expect(resolveFixture('DELETE', '/api/v1/prompts/prm_system_1', 'default')).toBeUndefined();
    expect(
      resolveFixture('POST', '/api/v1/prompts/prm_system_1/promote', 'default'),
    ).toBeUndefined();
    expect(resolveFixture('GET', '/api/v1/prompts/prm_system_1', 'default')).toBeUndefined();
  });

  it('is not reachable under a channel path', () => {
    expect(resolveFixture('GET', '/api/v1/channels/ch_tech/prompts', 'default')).toBeUndefined();
  });
});
