/**
 * The FS9 fixture group (T-FS9.3) — contract semantics of the local/ci
 * stand-in: the §Images reads, the 202 regeneration intent with a
 * deterministic poll-to-terminal countdown (no clocks), the soft delete, the
 * §R6.1 reference upload — and the honesty rule that **no fixture invents an
 * image URL**.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  IMAGES,
  IMAGE_POLLS_TO_READY,
  resetFixtureImageState,
  resolveFixture,
} from '@/shared/lib/fixtures/dataset';
import type { ImageWireDTO } from '@/shared/types';

beforeEach(() => {
  resetFixtureImageState();
});

function get(path: string, scenario: 'default' | 'empty' = 'default') {
  return resolveFixture('GET', path, scenario);
}

describe('images fixture group (§R6)', () => {
  it('lists the active channel’s records and honours the empty scenario', () => {
    const hit = get('/api/v1/channels/ch_tech/images');
    expect(hit?.status).toBe(200);
    expect((hit?.body as readonly ImageWireDTO[]).map((image) => image.id)).toEqual([
      'img_tech_1',
      'img_tech_2',
      'img_tech_3',
    ]);
    expect(get('/api/v1/channels/ch_tech/images', 'empty')?.body).toEqual([]);
  });

  it('never carries an image URL — only an object-storage key (§R6.8)', () => {
    const serialized = JSON.stringify(IMAGES);
    expect(serialized).not.toMatch(/https?:\/\//);
    expect(serialized).not.toMatch(/data:image/);
    expect(serialized).not.toMatch(/"url"|"image_url"|"thumbnail"/);
    expect(IMAGES.every((image) => typeof image.storage_path === 'string')).toBe(true);
  });

  it('serves detail, history and the similarity report', () => {
    expect(get('/api/v1/images/img_tech_1')?.status).toBe(200);
    expect((get('/api/v1/images/img_tech_1/history')?.body as unknown[]).length).toBe(2);
    const report = get('/api/v1/images/img_tech_1/similarity')?.body as Record<string, unknown>;
    expect(report.clip_similarity).toBeDefined();
    expect(report.phash_distance).toBeDefined();
    // No safety field is fabricated anywhere in the report.
    expect(Object.keys(report).some((key) => key.includes('safety'))).toBe(false);
    expect(get('/api/v1/images/img_missing/similarity')?.status).toBe(404);
  });

  it('regeneration answers 202 and the record polls back to a terminal status', () => {
    const intent = resolveFixture('POST', '/api/v1/images/img_tech_1/regenerate', 'default');
    expect(intent?.status).toBe(202);
    expect((intent?.body as { task_id: string }).task_id).toContain('task_regen_');

    // Immediately after the intent the record is queued (the worker owns it).
    let detail = get('/api/v1/images/img_tech_1')?.body as ImageWireDTO;
    expect(detail.status).toBe('queued');

    // Deterministic countdown — poll-based, no timers.
    for (let i = 0; i < IMAGE_POLLS_TO_READY; i += 1) {
      detail = get('/api/v1/images/img_tech_1')?.body as ImageWireDTO;
    }
    expect(detail.status).toBe('verified');

    // The attempt was appended to the real history (§R6.5).
    const history = get('/api/v1/images/img_tech_1/history')?.body as readonly {
      attempt: number;
    }[];
    expect(history).toHaveLength(3);
    expect(history[2]?.attempt).toBe(3);
  });

  it('soft-deletes a record out of the list', () => {
    expect(resolveFixture('DELETE', '/api/v1/images/img_tech_2', 'default')?.status).toBe(204);
    const list = get('/api/v1/channels/ch_tech/images')?.body as readonly ImageWireDTO[];
    expect(list.map((image) => image.id)).not.toContain('img_tech_2');
  });

  it('accepts an actor reference upload (§R6.1) and serves locations (§R6.3)', () => {
    const upload = resolveFixture('POST', '/api/v1/actors/act_tech_1/references', 'default');
    expect(upload?.status).toBe(201);
    expect((upload?.body as { accepted: boolean }).accepted).toBe(true);

    const locations = get('/api/v1/channels/ch_tech/locations')?.body as readonly { id: string }[];
    expect(locations.map((location) => location.id)).toEqual([
      'loc_tech_studio',
      'loc_tech_rooftop',
    ]);
    expect(get('/api/v1/channels/ch_tech/locations', 'empty')?.body).toEqual([]);
  });

  it('leaves paths it does not model unanswered (nothing is silently invented)', () => {
    // There is no image-create endpoint in the contract (plan §5.2 D1).
    expect(resolveFixture('POST', '/api/v1/images', 'default')).toBeUndefined();
    expect(resolveFixture('POST', '/api/v1/channels/ch_tech/images', 'default')).toBeUndefined();
  });
});
