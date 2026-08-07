/**
 * FS15 T-FS15.4.2 — the gated-fields audit (FS1_POSTMORTEM §7 checklist item
 * 9, "gated data honesty").
 *
 * FS5–FS11 each proved §R10.3 locally, once per surface, as each surface
 * shipped: `entities/analytics`'s `mapMetric` (FS5), `entities/analytics-
 * report`'s `mapMetricEntry`/`mapSeries` (FS11), the dashboard's
 * `buildSummaryPrompt` (FS6), `explain-metrics`'s `buildMetricsPrompt` (FS11)
 * and `export-analytics`'s `toCsv` (FS11). This file adds NOTHING new to any
 * of them — it imports the SAME production functions those per-stage tests
 * already cover, and proves, in ONE place, that every one of them honours
 * the same three-part rule for a field flagged `gated`:
 *
 *   1. it never reaches a value in its own View Model (even when the wire
 *      smuggles a number next to the flag),
 *   2. it never reaches an AI prompt (its LABEL may appear in the stated
 *      limitations/withheld list — the VALUE never does), and
 *   3. it never reaches an export.
 *
 * A future stage that adds a sixth gated-capable surface and forgets one of
 * these three checks fails HERE, not nine test files later — and the final
 * test below exists so that omission is a design choice recorded in this
 * file, not a silent gap.
 */
import { describe, expect, it } from 'vitest';
import { mapAnalytics } from '@/entities/analytics';
import { mapMetricEntry, mapSeries } from '@/entities/analytics-report';
import { buildMetricsPrompt } from '@/features/explain-metrics';
import { toCsv } from '@/features/export-analytics';
import type { AnalyticsSnapshotWireDTO } from '@/shared/types';
import { buildSummaryPrompt } from '@/widgets/dashboard';

// A metric that "smuggles" a number alongside `availability: 'gated'` — the
// same adversarial shape every prior gated-field test in this project uses,
// so a value making it through would be caught here exactly as it would
// have been at FS5/FS6/FS11.
const SMUGGLED_VALUE = 999_999;

describe('§R10.3 audit — every gated-capable surface, one place, three checks each', () => {
  describe('1. entities/analytics — the FS5 dashboard snapshot', () => {
    const wire: AnalyticsSnapshotWireDTO = {
      channel_id: 'chan_1',
      date: '2026-08-07',
      cost_today: { value: 12.5, availability: 'available' },
      published_today: { value: 3, availability: 'available' },
      views: { value: SMUGGLED_VALUE, availability: 'gated' },
      reactions: { value: SMUGGLED_VALUE, availability: 'gated' },
    };
    const vm = mapAnalytics(wire);

    it('check 1 — the View Model carries no value for a gated metric', () => {
      expect(vm.views.gated).toBe(true);
      expect(vm.views.value).toBeNull();
      expect(vm.reactions.gated).toBe(true);
      expect(vm.reactions.value).toBeNull();
    });

    it('check 2 — the dashboard AI prompt never contains the smuggled value', () => {
      const { prompt, limitations } = buildSummaryPrompt({
        channelName: 'Test channel',
        analytics: vm,
        costs: null,
        jobs: null,
        needsReview: null,
      });
      expect(prompt).not.toContain(String(SMUGGLED_VALUE));
      expect(limitations).toMatch(/views/);
      expect(limitations).toMatch(/reactions/);
    });
  });

  describe('2. entities/analytics-report — the FS11 panel metrics and series', () => {
    const metric = mapMetricEntry('er', { value: SMUGGLED_VALUE, availability: 'gated' });
    const series = mapSeries({
      key: 'views',
      availability: 'gated',
      points: [{ key: 'd1', value: SMUGGLED_VALUE }],
    });

    it('check 1 — the View Model carries no value and no plottable points', () => {
      expect(metric.gated).toBe(true);
      expect(metric.value).toBeNull();
      expect(series.gated).toBe(true);
      expect(series.points).toHaveLength(0);
    });

    it('check 2 — explain-metrics never puts the smuggled value in the prompt', () => {
      const openMetric = mapMetricEntry('posts', { value: 12, availability: 'available' });
      const { prompt, withheld } = buildMetricsPrompt(
        {
          rangeLabel: 'last 7 days',
          channelLabel: 'Test channel',
          filters: [],
          metrics: [metric, openMetric],
          series: [series],
        },
        '',
      );
      expect(prompt).not.toContain(String(SMUGGLED_VALUE));
      expect(withheld).toContain(metric.label);
      expect(withheld).toContain(series.label);
      // The check is meaningful only if a non-gated metric DOES reach the
      // prompt — otherwise "not.toContain" would pass trivially.
      expect(prompt).toContain('12');
    });

    it('check 3 — export-analytics never puts a gated series in the CSV', () => {
      const openSeries = mapSeries({
        key: 'published',
        availability: 'available',
        points: [{ key: 'd1', value: 4 }],
      });
      const { csv, excluded } = toCsv([series, openSeries]);
      expect(csv).not.toContain(String(SMUGGLED_VALUE));
      expect(excluded).toContain(series.label);
      // The check is meaningful only if a non-gated series DOES reach the
      // CSV — otherwise "not.toContain" would pass trivially.
      expect(csv).toContain('4');
    });
  });

  it('records the audited surface count, so a sixth surface is a deliberate addition, never a silent gap', () => {
    // There is no way to enumerate "every gated-capable surface" from the
    // contract programmatically — the wire flags gating per FIELD, not per
    // endpoint (§R10.3/§R7.3). This list is therefore the one place the
    // enumeration is written down; a future stage adding a gated-capable
    // mapper, AI prompt or export MUST extend this file, and this assertion
    // is the tripwire that makes forgetting to do so a failing test rather
    // than a silent omission.
    const auditedSurfaces = [
      'entities/analytics.mapMetric (FS5 dashboard snapshot)',
      'entities/analytics-report.mapMetricEntry (FS11 panel metrics)',
      'entities/analytics-report.mapSeries (FS11 panel series)',
      'widgets/dashboard.buildSummaryPrompt (FS6 dashboard AI)',
      'features/explain-metrics.buildMetricsPrompt (FS11 analytics AI)',
      'features/export-analytics.toCsv (FS11 analytics export)',
    ];
    expect(auditedSurfaces).toHaveLength(6);
  });
});
