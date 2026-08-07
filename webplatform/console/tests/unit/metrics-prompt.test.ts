/**
 * FS11 T-FS11.11 — the `buildMetricsPrompt` proof (plan §5.2 D10).
 *
 * D3 §12 asked the AI to "explain changes" ("cost up 18% — driven by image
 * regens"). The contract serves numbers, not causes, and the FS6 owner
 * condition forbids self-generated anomaly flags. This file is where that
 * boundary is enforced rather than promised: the prompt contains ONLY the
 * loaded non-gated values plus the filters, and its instruction forbids causes,
 * anomalies, engagement and forecasts.
 */
import { describe, expect, it } from 'vitest';
import type { MetricEntryVM, SeriesVM } from '@/entities/analytics-report';
import { buildMetricsPrompt, EXPLAIN_METRICS_QUESTION } from '@/features/explain-metrics';

const metrics: readonly MetricEntryVM[] = [
  {
    key: 'quality_score',
    label: 'Quality score',
    rawKey: false,
    value: 82.4,
    unit: '/100',
    gated: false,
  },
  // A gated entry that still carries a number — the smuggled-value case.
  { key: 'er', label: 'Engagement rate', rawKey: false, value: 0.071, unit: null, gated: true },
];

const series: readonly SeriesVM[] = [
  {
    key: 'cost_by_day',
    label: 'Cost by day',
    rawKey: false,
    unit: 'USD',
    gated: false,
    points: [
      { key: '2026-07-29', value: 6.8 },
      { key: '2026-07-30', value: 6.93 },
    ],
  },
  { key: 'views', label: 'Views', rawKey: false, unit: null, gated: true, points: [] },
];

const input = {
  rangeLabel: '2026-07-05 → 2026-08-03',
  channelLabel: 'Tech Digest',
  filters: ['2026-07-05 → 2026-08-03', 'grouped by day'],
  metrics,
  series,
};

describe('the prompt carries the loaded numbers and NOTHING else', () => {
  it('includes the non-gated metric and series values with the filters', () => {
    const { prompt } = buildMetricsPrompt(input, 'How did cost move?');
    expect(prompt).toContain('Quality score: 82.4 /100');
    expect(prompt).toContain('2026-07-29=6.8');
    expect(prompt).toContain('grouped by day');
    expect(prompt).toContain('Tech Digest');
    expect(prompt).toContain('Question: How did cost move?');
  });

  it('falls back to the canonical question when none is typed', () => {
    expect(buildMetricsPrompt(input, '   ').prompt).toContain(EXPLAIN_METRICS_QUESTION);
  });

  it('contains no post text, persona, knowledge, prompt row or other channel', () => {
    const { prompt } = buildMetricsPrompt(input, '');
    for (const foreign of ['persona', 'document', 'knowledge', 'Daily Brief', 'prompt_type']) {
      expect(prompt.toLowerCase()).not.toContain(foreign.toLowerCase());
    }
  });
});

describe('§R10.3 — a gated metric NEVER enters the prompt, even with a number', () => {
  it('omits the gated value and names it as withheld instead', () => {
    const built = buildMetricsPrompt(input, '');
    expect(built.prompt).not.toContain('0.071');
    expect(built.prompt).not.toContain('Engagement rate: ');
    expect(built.withheld).toEqual(['Engagement rate', 'Views']);
    expect(built.limitations).toContain('Engagement rate');
  });

  it('states no gating when nothing is gated', () => {
    const open = buildMetricsPrompt(
      {
        ...input,
        metrics: metrics.filter((metric) => !metric.gated),
        series: series.filter((entry) => !entry.gated),
      },
      '',
    );
    expect(open.withheld).toEqual([]);
    expect(open.limitations).not.toContain('withheld');
  });
});

describe('the instruction forbids the three drifts this surface could take', () => {
  it('forbids causes, anomalies, engagement and forecasting', () => {
    const { prompt } = buildMetricsPrompt(input, '');
    expect(prompt).toContain('Do not explain WHY anything changed');
    expect(prompt).toContain('Do not call anything an anomaly');
    expect(prompt).toContain('Do not mention views, reactions, engagement');
    expect(prompt).toContain('Do not forecast or extrapolate');
  });

  it('describes its own limits without claiming confidence', () => {
    const { limitations, dataUsed } = buildMetricsPrompt(input, '');
    expect(limitations).toContain('generated and unverified');
    expect(limitations).toContain('no causes');
    expect(dataUsed).toContain('1 metric and 1 series');
    expect(limitations.toLowerCase()).not.toContain('confidence');
  });
});
