/**
 * FS11 T-FS11.11 — the analytics mappers, where the screen's honesty is decided.
 *
 * Three properties are proven here because the UI cannot be trusted to remember
 * them: a gated field never yields a value (even when the wire sends one), an
 * unrecognised key survives by its RAW name, and an algorithm version is never
 * invented (§R10.3/§R7.3/§R11.9).
 */
import { describe, expect, it } from 'vitest';
import {
  describeFilters,
  isPanelEmpty,
  labelFor,
  mapCostSeries,
  mapMetricEntry,
  mapPanel,
  mapSeries,
  mapSnapshotEntries,
} from '@/entities/analytics-report';
import type { AnalyticsPanelWireDTO, AnalyticsSnapshotWireDTO } from '@/shared/types';

const PROV = { endpoint: '/analytics/quality', filters: ['x'], fetchedAt: '2026-08-03T10:00:00Z' };

describe('§R10.3 — a gated field NEVER surfaces a value', () => {
  it('drops the number when availability is gated', () => {
    const entry = mapMetricEntry('er', { value: 0.071, availability: 'gated' });
    expect(entry.gated).toBe(true);
    expect(entry.value).toBeNull();
  });

  it('keeps the value when availability is available or absent', () => {
    expect(mapMetricEntry('posts', { value: 12, availability: 'available' }).value).toBe(12);
    expect(mapMetricEntry('posts', { value: 12 }).value).toBe(12);
    expect(mapMetricEntry('posts', 12).value).toBe(12);
    expect(mapMetricEntry('posts', 12).gated).toBe(false);
  });

  it('plots NOTHING for a gated series, even with points on the wire', () => {
    const series = mapSeries({
      key: 'views',
      availability: 'gated',
      points: [
        { key: 'a', value: 1200 },
        { key: 'b', value: 1310 },
      ],
    });
    expect(series.gated).toBe(true);
    expect(series.points).toHaveLength(0);
  });

  it('maps the snapshot into the shared vocabulary with engagement gated', () => {
    const wire: AnalyticsSnapshotWireDTO = {
      channel_id: 'ch_tech',
      date: '2026-07-30',
      cost_today: { value: 4.82, availability: 'available' },
      published_today: { value: 3, availability: 'available' },
      views: { value: 999, availability: 'gated' },
      reactions: { value: null, availability: 'gated' },
    };
    const entries = mapSnapshotEntries(wire);
    expect(entries.map((e) => e.key)).toEqual(['cost', 'published', 'views', 'reactions']);
    // Neutral labels: this endpoint takes a range, so "today" would be wrong.
    expect(entries[0]?.label).toBe('Cost');
    expect(entries[1]?.label).toBe('Published');
    const views = entries[2];
    expect(views?.gated).toBe(true);
    expect(views?.value).toBeNull();
  });
});

describe('unknown keys survive by RAW name (the FS8/FS9 discipline)', () => {
  it('flags a key the console has no vocabulary for', () => {
    expect(labelFor('style_drift_index')).toEqual({ label: 'style_drift_index', rawKey: true });
    expect(labelFor('quality_score')).toEqual({ label: 'Quality score', rawKey: false });
  });

  it('renders an unknown metric rather than dropping it', () => {
    const panel = mapPanel({ metrics: { style_drift_index: { value: 0.13 } } }, PROV);
    expect(panel.metrics).toHaveLength(1);
    expect(panel.metrics[0]?.label).toBe('style_drift_index');
    expect(panel.metrics[0]?.rawKey).toBe(true);
    expect(panel.metrics[0]?.value).toBe(0.13);
  });

  it('prefers a wire-supplied label over the raw key', () => {
    const entry = mapMetricEntry('zzz', { value: 1, label: 'Backend label' });
    expect(entry.label).toBe('Backend label');
    expect(entry.rawKey).toBe(false);
  });
});

describe('§R11.9 — provenance states what is known and never invents', () => {
  it('carries the algorithm version only when the wire has one', () => {
    const withVersion: AnalyticsPanelWireDTO = { metrics: {}, algorithm_version: 'quality-v3' };
    const without: AnalyticsPanelWireDTO = { metrics: {} };
    expect(mapPanel(withVersion, PROV).provenance.algorithmVersion).toBe('quality-v3');
    expect(mapPanel(without, PROV).provenance.algorithmVersion).toBeNull();
  });

  it('records the endpoint and the filters that were actually sent', () => {
    const panel = mapPanel({ metrics: {} }, PROV);
    expect(panel.provenance.endpoint).toBe('/analytics/quality');
    expect(panel.provenance.filters).toEqual(['x']);
    expect(panel.provenance.fetchedAt).toBe('2026-08-03T10:00:00Z');
  });

  it('never claims an algorithm version for raw aggregations', () => {
    const panel = mapCostSeries([{ key: '2026-07-30', amount_usd: 6.93 }], 'day', PROV);
    expect(panel.provenance.algorithmVersion).toBeNull();
    expect(panel.series[0]?.points).toEqual([{ key: '2026-07-30', value: 6.93 }]);
    expect(panel.series[0]?.unit).toBe('USD');
  });

  it('describes the range honestly, including its absence', () => {
    expect(describeFilters({ from: '2026-07-01', to: '2026-07-31' })).toEqual([
      '2026-07-01 → 2026-07-31',
    ]);
    expect(describeFilters({ from: null, to: null })).toEqual(['no range sent']);
    expect(describeFilters({ from: null, to: null }, ['grouped by day'])).toEqual([
      'no range sent',
      'grouped by day',
    ]);
  });
});

describe('empty is empty, not zero', () => {
  it('reports an empty panel when nothing was served', () => {
    expect(isPanelEmpty(mapPanel({}, PROV))).toBe(true);
    expect(isPanelEmpty(mapCostSeries([], 'day', PROV))).toBe(true);
    expect(isPanelEmpty(mapPanel({ metrics: { posts: 0 } }, PROV))).toBe(false);
  });

  it('drops null points instead of plotting them as zero', () => {
    const series = mapSeries({
      key: 'published',
      points: [
        { key: 'a', value: 3 },
        { key: 'b', value: null },
      ],
    });
    expect(series.points).toEqual([{ key: 'a', value: 3 }]);
  });
});
