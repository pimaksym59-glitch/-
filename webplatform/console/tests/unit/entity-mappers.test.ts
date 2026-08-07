/**
 * Entity VM mappers (FS5 T-FS5.2–5.5). The load-bearing rules: gated metrics
 * stay `null` + flag (§R10.3 — zeros are never invented); secrets/token refs
 * never reach a VM (§F7.4); unknown wire statuses parse to null and stay
 * visible as raw text (registry rule, never coerced).
 */
import { describe, expect, it } from 'vitest';
import { mapAnalytics, mapCost } from '@/entities/analytics';
import { mapChannel } from '@/entities/channel';
import { mapJob, selectUpcomingPublish } from '@/entities/job';
import { mapPost, mapPostHistory } from '@/entities/post';
import type { AnalyticsSnapshotWireDTO, ChannelWireDTO, TaskWireDTO } from '@/shared/types';

describe('mapChannel (T-FS5.2)', () => {
  it('maps the wire shape and derives paused', () => {
    const vm = mapChannel({
      id: 'ch_1',
      name: 'Tech',
      status: 'paused',
      description: null,
    });
    expect(vm).toEqual({
      id: 'ch_1',
      name: 'Tech',
      status: 'paused',
      paused: true,
      description: null,
    });
  });

  it('provably drops every non-modelled wire field (no secret/token ref survives)', () => {
    // A hostile/extended wire payload — extra fields must NOT leak into the VM.
    const wire = {
      id: 'ch_1',
      name: 'Tech',
      status: 'active',
      description: 'x',
      bot_token_ref: 'secret-ref-123',
    } as ChannelWireDTO;
    const vm = mapChannel(wire);
    expect(Object.keys(vm).sort()).toEqual(['description', 'id', 'name', 'paused', 'status']);
    expect(JSON.stringify(vm)).not.toContain('secret-ref-123');
  });
});

describe('mapAnalytics / mapCost (T-FS5.3 — §R10.3)', () => {
  const snapshot: AnalyticsSnapshotWireDTO = {
    channel_id: 'ch_1',
    date: '2026-07-30',
    cost_today: { value: 4.82, availability: 'available' },
    published_today: { value: 3, availability: 'available' },
    views: { value: null, availability: 'gated' },
    reactions: { value: null, availability: 'gated' },
  };

  it('gated ⇒ value null + gated flag; available passes the value through', () => {
    const vm = mapAnalytics(snapshot);
    expect(vm.costToday).toEqual({ value: 4.82, gated: false });
    expect(vm.views).toEqual({ value: null, gated: true });
    expect(vm.reactions).toEqual({ value: null, gated: true });
  });

  it('a gated metric NEVER surfaces a number, even if the wire carried one', () => {
    const vm = mapAnalytics({
      ...snapshot,
      views: { value: 12345, availability: 'gated' },
    });
    expect(vm.views).toEqual({ value: null, gated: true });
  });

  it('maps cost entries to labelled points', () => {
    expect(mapCost([{ key: '2026-07-30', amount_usd: 6.93 }])).toEqual([
      { label: '07-30', amountUsd: 6.93 },
    ]);
  });
});

describe('mapJob / selectUpcomingPublish (T-FS5.4)', () => {
  const base: TaskWireDTO = {
    id: 't1',
    type: 'publish',
    status: 'queued',
    channel_id: 'ch_1',
    attempts: 0,
    run_at: '2026-07-30T15:00:00Z',
    created_at: '2026-07-30T08:00:00Z',
    error: null,
  };

  it('parses vocabulary statuses and keeps unknown wire statuses raw + null', () => {
    expect(mapJob(base).status).toBe('queued');
    const unknown = mapJob({ ...base, status: 'weird_new_state' });
    expect(unknown.status).toBeNull();
    expect(unknown.rawStatus).toBe('weird_new_state');
  });

  it('selects only queued publish slots with a run time, ordered by run time', () => {
    const jobs = [
      mapJob({ ...base, id: 'later', run_at: '2026-07-30T19:00:00Z' }),
      mapJob({ ...base, id: 'sooner', run_at: '2026-07-30T15:00:00Z' }),
      mapJob({ ...base, id: 'not-publish', type: 'generate_text' }),
      mapJob({ ...base, id: 'not-queued', status: 'completed' }),
      mapJob({ ...base, id: 'no-run-at', run_at: null }),
    ];
    expect(selectUpcomingPublish(jobs).map((j) => j.id)).toEqual(['sooner', 'later']);
  });
});

describe('mapPost / mapPostHistory (T-FS5.5)', () => {
  it('maps the needs-review subset with an honest untitled fallback', () => {
    const vm = mapPost({
      id: 'p1',
      channel_id: 'ch_1',
      status: 'needs_review',
      title: null,
      body_preview: null,
      created_at: '2026-07-30T08:00:00Z',
    });
    expect(vm.title).toBe('(untitled draft)');
    expect(vm.status).toBe('needs_review');
    expect(vm.preview).toBeNull();
  });

  it('history entries parse through the registry — unknowns stay raw', () => {
    const known = mapPostHistory({ status: 'verified', at: '2026-07-30T08:10:00Z', detail: 'ok' });
    expect(known.status).toBe('verified');
    const unknown = mapPostHistory({ status: 'mystery', at: '2026-07-30T08:10:00Z' });
    expect(unknown.status).toBeNull();
    expect(unknown.rawStatus).toBe('mystery');
    expect(unknown.detail).toBeNull();
  });
});
