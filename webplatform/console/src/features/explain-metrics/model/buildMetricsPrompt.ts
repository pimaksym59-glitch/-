/**
 * Metrics prompt builder (FS11 T-FS11.9) — a PURE function so the plan's
 * §5.2 D10 condition is unit-provable: the prompt contains ONLY the series and
 * metric entries this page actually loaded, plus the filters that were sent and
 * the user's question — and **NOTHING else**. No other channel, no post text,
 * no knowledge document, no persona, no prompt row.
 *
 * Two exclusions are load-bearing and unit-proven:
 *
 * 1. **Gated metrics never enter the prompt** — even when the wire smuggled a
 *    number next to `availability: 'gated'` (the FS6 `buildSummaryPrompt`
 *    proof, re-applied). They are named in the limitations instead, so the
 *    model is told they exist and were withheld.
 * 2. **The instruction forbids the three fabrications this surface could drift
 *    into**: a CAUSE ("cost rose because…"), an ANOMALY verdict (no endpoint,
 *    no wire flag — §5.2 D3), and any engagement claim (§R7.3 — the data is not
 *    there). D3 §12 asks the AI to "explain changes"; the contract can only
 *    support describing the numbers it served.
 */
import type { MetricEntryVM, SeriesVM } from '@/entities/analytics-report';

export interface MetricsPrompt {
  readonly prompt: string;
  /** Explainability "data used" — exactly what went into the prompt. */
  readonly dataUsed: string;
  /** Explainability "limits" — scope, gating and the forbidden claims. */
  readonly limitations: string;
  /** Labels withheld because they are gated (surfaced in the UI too). */
  readonly withheld: readonly string[];
}

export const EXPLAIN_METRICS_QUESTION =
  'Describe what these numbers show over the selected range in 3 short bullet points.';

export interface MetricsInput {
  readonly rangeLabel: string;
  readonly channelLabel: string;
  readonly filters: readonly string[];
  readonly metrics: readonly MetricEntryVM[];
  readonly series: readonly SeriesVM[];
}

export function buildMetricsPrompt(input: MetricsInput, question: string): MetricsPrompt {
  const asked = question.trim() === '' ? EXPLAIN_METRICS_QUESTION : question.trim();

  // §R10.3 — gated entries are dropped here, not merely hidden in the UI.
  const openMetrics = input.metrics.filter((metric) => !metric.gated && metric.value !== null);
  const openSeries = input.series.filter((entry) => !entry.gated && entry.points.length > 0);
  const withheld = [
    ...input.metrics.filter((metric) => metric.gated).map((metric) => metric.label),
    ...input.series.filter((entry) => entry.gated).map((entry) => entry.label),
  ];

  const metricLines = openMetrics.map(
    (metric) => `- ${metric.label}: ${String(metric.value)}${metric.unit ? ` ${metric.unit}` : ''}`,
  );
  const seriesLines = openSeries.map(
    (entry) =>
      `- ${entry.label}${entry.unit ? ` (${entry.unit})` : ''}: ` +
      entry.points.map((point) => `${point.key}=${String(point.value)}`).join(', '),
  );

  const prompt = [
    'Describe a set of analytics numbers using ONLY the data below.',
    'Do not explain WHY anything changed and do not name a cause — the data does not contain causes.',
    'Do not call anything an anomaly, a spike, a regression or a problem; there is no anomaly',
    'detection in this data. Do not mention views, reactions, engagement, reach or CTR — those',
    'metrics are unavailable and are not included here. Do not forecast or extrapolate.',
    'If the data does not answer the question, say so plainly.',
    '',
    `Scope: ${input.channelLabel}, ${input.rangeLabel}.`,
    `Filters sent to the API: ${input.filters.length > 0 ? input.filters.join('; ') : 'none'}.`,
    '',
    'Metrics:',
    ...(metricLines.length > 0 ? metricLines : ['- (no metric values loaded)']),
    '',
    'Series:',
    ...(seriesLines.length > 0 ? seriesLines : ['- (no series loaded)']),
    '',
    `Question: ${asked}`,
  ].join('\n');

  const counted = `${String(openMetrics.length)} metric${openMetrics.length === 1 ? '' : 's'} and ${String(openSeries.length)} series`;

  return {
    prompt,
    dataUsed: `${counted} this page loaded for ${input.channelLabel} over ${input.rangeLabel}, plus the filters sent to the API. Nothing else entered the prompt: no other channel, no post text, no knowledge document, no persona, no prompt row.`,
    limitations:
      withheld.length === 0
        ? 'The answer is generated and unverified, grounded only in the numbers on this page. It cannot explain why anything changed, flag anomalies or forecast — the contract exposes no causes, no anomaly detection and no forecast.'
        : `The answer is generated and unverified, grounded only in the numbers on this page. Gated metrics were withheld entirely (${withheld.join(', ')}) — they are unavailable without a stats adapter (§R7.3). It cannot explain why anything changed, flag anomalies or forecast — the contract exposes no causes, no anomaly detection and no forecast.`,
    withheld,
  };
}
