/**
 * FS11 T-FS11.11 — the §Analytics & Cost fixture group.
 *
 * The stand-in must model the CONTRACT, not a convenience: five reads, the
 * range honoured where the data has a time axis, all four documented `group_by`
 * facets, the three documented report periods — and nothing else callable.
 *
 * It also carries the honesty fixtures the mappers are proven against: a gated
 * field WITH a number, an unrecognised key, and a response with no algorithm
 * version.
 */
import { describe, expect, it } from 'vitest';
import { resolveFixture } from '@/shared/lib/fixtures/dataset';
import type { AnalyticsPanelWireDTO, CostEntryWireDTO } from '@/shared/types';

const GET = (path: string, scenario: 'default' | 'empty' = 'default') =>
  resolveFixture('GET', path, scenario);

describe('cost — the contract facets and the real range filter', () => {
  it('honours ?from=&to= on the day facet (the one with a time axis)', () => {
    const all = GET('/api/v1/cost?group_by=day');
    expect((all?.body as readonly CostEntryWireDTO[]).length).toBe(7);

    const narrowed = GET('/api/v1/cost?group_by=day&from=2026-07-28&to=2026-07-30');
    const keys = (narrowed?.body as readonly CostEntryWireDTO[]).map((entry) => entry.key);
    expect(keys).toEqual(['2026-07-28', '2026-07-29', '2026-07-30']);
  });

  it('returns an honest EMPTY series for a range with no data — never zeros', () => {
    const none = GET('/api/v1/cost?group_by=day&from=2020-01-01&to=2020-01-31');
    expect(none?.status).toBe(200);
    expect(none?.body).toEqual([]);
  });

  it('serves the other three documented facets', () => {
    for (const facet of ['channel', 'model', 'provider']) {
      const res = GET(`/api/v1/cost?group_by=${facet}`);
      expect(res?.status).toBe(200);
      expect((res?.body as readonly CostEntryWireDTO[]).length).toBeGreaterThan(0);
    }
  });

  it('rejects a facet the contract does not document', () => {
    expect(GET('/api/v1/cost?group_by=persona')?.status).toBe(400);
  });
});

describe('quality / trends / reports', () => {
  it('serves quality with a gated field that CARRIES a number (the mapper must drop it)', () => {
    const body = GET('/api/v1/analytics/quality')?.body as AnalyticsPanelWireDTO;
    const er = body.metrics?.['er'];
    expect(typeof er).toBe('object');
    expect(er).toMatchObject({ availability: 'gated' });
    expect((er as { value: number }).value).toBeGreaterThan(0);
  });

  it('carries an unrecognised key and an algorithm version', () => {
    const body = GET('/api/v1/analytics/quality')?.body as AnalyticsPanelWireDTO;
    expect(Object.keys(body.metrics ?? {})).toContain('style_drift_index');
    expect(body.algorithm_version).toBe('quality-v3');
  });

  it('serves trends with a GATED series and NO algorithm version (§R11.9 absence path)', () => {
    const body = GET('/api/v1/analytics/trends')?.body as AnalyticsPanelWireDTO;
    const gated = body.series?.find((entry) => entry.key === 'views');
    expect(gated?.availability).toBe('gated');
    expect((gated?.points ?? []).length).toBeGreaterThan(0);
    expect(body.algorithm_version).toBeUndefined();
  });

  it('serves only the three documented report periods', () => {
    for (const period of ['daily', 'weekly', 'monthly']) {
      expect(GET(`/api/v1/analytics/reports/${period}`)?.status).toBe(200);
    }
    expect(GET('/api/v1/analytics/reports/hourly')?.status).toBe(404);
  });
});

describe('the empty scenario is empty, not zeroed', () => {
  it('returns empty payloads across the group', () => {
    expect(GET('/api/v1/cost?group_by=day', 'empty')?.body).toEqual([]);
    expect(GET('/api/v1/analytics/quality', 'empty')?.body).toEqual({});
    expect(GET('/api/v1/analytics/trends', 'empty')?.body).toEqual({});
    expect(GET('/api/v1/analytics/reports/daily', 'empty')?.body).toEqual({});
  });
});

describe('nothing outside the frozen group is modelled', () => {
  it('has no forecast, anomaly, recommendation, experiment or export endpoint', () => {
    for (const path of [
      '/api/v1/analytics/forecast',
      '/api/v1/analytics/anomalies',
      '/api/v1/analytics/recommendations',
      '/api/v1/analytics/experiments',
      '/api/v1/analytics/export',
      '/api/v1/analytics/system',
      '/api/v1/analytics/diversity',
    ]) {
      expect(GET(path)).toBeUndefined();
    }
  });

  it('exposes no write on the analytics group', () => {
    expect(resolveFixture('POST', '/api/v1/analytics/quality', 'default')).toBeUndefined();
    expect(resolveFixture('POST', '/api/v1/cost', 'default')).toBeUndefined();
    expect(resolveFixture('DELETE', '/api/v1/analytics/trends', 'default')).toBeUndefined();
  });

  it('never invents an engagement VALUE anywhere in the dataset', () => {
    const snapshot = GET('/api/v1/analytics/channels/ch_tech')?.body as {
      views: { value: number | null; availability: string };
      reactions: { value: number | null; availability: string };
    };
    expect(snapshot.views).toEqual({ value: null, availability: 'gated' });
    expect(snapshot.reactions).toEqual({ value: null, availability: 'gated' });
  });
});
