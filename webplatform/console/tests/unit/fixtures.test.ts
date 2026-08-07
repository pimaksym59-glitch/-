/**
 * The deterministic dataset resolver (FS5 T-FS5.1). One pure function feeds
 * the server branch, the browser worker and node MSW — these tests lock its
 * contract semantics: scenarios, 202 queue intents, honest 404s, §R10.3 gating.
 */
import { describe, expect, it } from 'vitest';
import {
  CHANNELS,
  COST_BY_DAY,
  FIXTURE_TODAY,
  resolveFixture,
} from '@/shared/lib/fixtures/dataset';
import type { AnalyticsSnapshotWireDTO, PostWireDTO, TaskWireDTO } from '@/shared/types';

describe('resolveFixture (FS5 T-FS5.1)', () => {
  it('serves the channel list; the empty scenario serves an empty list', () => {
    const hit = resolveFixture('GET', '/api/v1/channels', 'default');
    expect(hit?.status).toBe(200);
    expect(hit?.body).toEqual(CHANNELS);

    const empty = resolveFixture('GET', '/api/v1/channels', 'empty');
    expect(empty?.status).toBe(200);
    expect(empty?.body).toEqual([]);
  });

  it('filters channel posts by the status query (needs_review subset)', () => {
    const hit = resolveFixture(
      'GET',
      '/api/v1/channels/ch_tech/posts?status=needs_review',
      'default',
    );
    expect(hit?.status).toBe(200);
    const posts = hit?.body as readonly PostWireDTO[];
    expect(posts.map((p) => p.id)).toEqual(['post_nr_1', 'post_nr_2']);
    expect(posts.every((p) => p.status === 'needs_review')).toBe(true);
  });

  it('serves a single post and answers an unknown id with an honest 404', () => {
    const hit = resolveFixture('GET', '/api/v1/posts/post_nr_1', 'default');
    expect(hit?.status).toBe(200);
    expect((hit?.body as PostWireDTO).channel_id).toBe('ch_tech');

    const missing = resolveFixture('GET', '/api/v1/posts/post_ghost', 'default');
    expect(missing?.status).toBe(404);
  });

  it('serves post history newest-first with detail lines', () => {
    const hit = resolveFixture('GET', '/api/v1/posts/post_nr_1/history', 'default');
    expect(hit?.status).toBe(200);
    const entries = hit?.body as readonly { status: string }[];
    expect(entries).toHaveLength(3);
    expect(entries[0]?.status).toBe('needs_review');
  });

  it('answers approve/reject with a 202 queue intent, never instant success', () => {
    for (const action of ['approve', 'reject'] as const) {
      const hit = resolveFixture('POST', `/api/v1/posts/post_nr_1/${action}`, 'default');
      expect(hit?.status).toBe(202);
      expect(hit?.body).toEqual({ task_id: `task_intent_post_nr_1_${action}` });
    }
  });

  it('filters tasks by channel_id / status / type', () => {
    // FS12 note (I7-legal, declared at plan time): the `/tasks` dataset now also
    // carries admin-scope rows in the contract's own `task_status` vocabulary,
    // so an EXHAUSTIVE id list is no longer the right assertion. The stronger
    // property is asserted instead — every returned row matches the filter —
    // plus the FS5 rows' continued presence, which is what the dashboard reads.
    const byChannel = resolveFixture('GET', '/api/v1/tasks?channel_id=ch_tech', 'default');
    const tasks = byChannel?.body as readonly TaskWireDTO[];
    expect(tasks.every((t) => t.channel_id === 'ch_tech')).toBe(true);
    expect(tasks.map((t) => t.id)).toEqual(
      expect.arrayContaining(['task_pub_9', 'task_pub_10', 'task_gen_7']),
    );

    const failed = resolveFixture('GET', '/api/v1/tasks?status=failed', 'default');
    const failedRows = failed?.body as readonly TaskWireDTO[];
    expect(failedRows.every((t) => t.status === 'failed')).toBe(true);
    expect(failedRows.map((t) => t.id)).toContain('task_img_3');

    const publish = resolveFixture('GET', '/api/v1/tasks?type=publish', 'default');
    expect((publish?.body as readonly TaskWireDTO[]).every((t) => t.type === 'publish')).toBe(true);
  });

  it('serves a single task incl. its error class', () => {
    const hit = resolveFixture('GET', '/api/v1/tasks/task_img_3', 'default');
    expect(hit?.status).toBe(200);
    expect((hit?.body as TaskWireDTO).error).toBe('Safety check rejected the output');
  });

  it('analytics snapshots keep engagement GATED (§R10.3): value null + flag, never zeros', () => {
    const hit = resolveFixture('GET', '/api/v1/analytics/channels/ch_tech', 'default');
    expect(hit?.status).toBe(200);
    const snapshot = hit?.body as AnalyticsSnapshotWireDTO;
    expect(snapshot.date).toBe(FIXTURE_TODAY);
    expect(snapshot.cost_today).toEqual({ value: 4.82, availability: 'available' });
    expect(snapshot.views).toEqual({ value: null, availability: 'gated' });
    expect(snapshot.reactions).toEqual({ value: null, availability: 'gated' });
  });

  it('serves cost-by-day and returns undefined for unmodeled paths (nothing invented)', () => {
    const hit = resolveFixture('GET', '/api/v1/cost?group_by=day', 'default');
    expect(hit?.body).toEqual(COST_BY_DAY);

    expect(resolveFixture('GET', '/api/v1/does-not-exist', 'default')).toBeUndefined();
    expect(resolveFixture('DELETE', '/api/v1/channels', 'default')).toBeUndefined();
  });
});
