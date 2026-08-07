/**
 * Entity `analytics` — the FS11 reporting model (plan §3.1/§5.2 D2/D7/D8).
 *
 * FS5's `model.ts` (the dashboard snapshot) is untouched and stays byte-identical;
 * everything here is additive and lives in its own module so the dashboard graph
 * does not grow (plan §3.3, invariant I2).
 *
 * Three rules are load-bearing and each is unit-proven:
 *
 * 1. **§R10.3/§R7.3 — a gated field never shows a value.** `availability:
 *    'gated'` wins over any number the wire carries: the VM keeps `value: null`
 *    and `gated: true`, and the UI renders the D2 §15 Gated card. Engagement
 *    (views/ER/CTR) is unavailable on Bot API without an MTProto adapter, and
 *    Appendix C leaves that at "нет" — so this is the screen's normal state,
 *    not an error.
 * 2. **Unknown keys survive by RAW name.** The contract documents no schema for
 *    quality/trends/reports, so an unrecognised key is rendered with its wire
 *    name and marked as such (the FS8 `style_features` / FS9 similarity
 *    precedent) rather than dropped or renamed into something it may not mean.
 * 3. **Provenance is what we know (§R11.9).** The console owns the endpoint, the
 *    filters it sent and the time it fetched. An **algorithm version is shown
 *    only if the response carries one**; otherwise the panel says the backend
 *    does not report one. Nothing about the computation is invented.
 */
import type {
  AnalyticsMetricWireDTO,
  AnalyticsPanelWireDTO,
  AnalyticsSeriesWireDTO,
  AnalyticsSnapshotWireDTO,
  CostEntryWireDTO,
} from '@/shared/types';
import type { CostGroupBy, DateRange } from './paths';

export interface MetricEntryVM {
  /** The wire key, always preserved. */
  readonly key: string;
  /** A known label, or the raw key when the console has no vocabulary for it. */
  readonly label: string;
  /** True when `label` IS the raw wire key (rendered with a quiet marker). */
  readonly rawKey: boolean;
  readonly value: number | null;
  readonly unit: string | null;
  readonly gated: boolean;
}

export interface SeriesPointVM {
  readonly key: string;
  readonly value: number;
}

export interface SeriesVM {
  readonly key: string;
  readonly label: string;
  readonly rawKey: boolean;
  readonly unit: string | null;
  readonly gated: boolean;
  /** Empty for a gated series — a gated metric has no plottable value. */
  readonly points: readonly SeriesPointVM[];
}

export interface ProvenanceVM {
  /** The endpoint that answered, exactly as called. */
  readonly endpoint: string;
  /** The filters this console actually sent (never the ones it wished it sent). */
  readonly filters: readonly string[];
  /** When the browser received it (ISO). */
  readonly fetchedAt: string;
  /** §R11.9 — null means the backend does not report one; never invented. */
  readonly algorithmVersion: string | null;
  /** The backend's own computation timestamp, when it carries one. */
  readonly computedAt: string | null;
}

export interface PanelVM {
  readonly metrics: readonly MetricEntryVM[];
  readonly series: readonly SeriesVM[];
  readonly provenance: ProvenanceVM;
}

/**
 * The only labels this console claims to understand — each traceable to a
 * documented backend concept (§R5.7 duplicate cascade · §R5.8 humanness ·
 * §R5.9 quality/readability · §R6.4 similarity · §R6.5 regeneration · §R11.8
 * cost). Everything else renders by raw key rather than being guessed at.
 */
const KNOWN_LABELS: Readonly<Record<string, string>> = {
  quality_score: 'Quality score',
  readability_score: 'Readability',
  duplicate_score: 'Duplicate score',
  humanness: 'Humanness',
  humanness_score: 'Humanness',
  similarity: 'Similarity',
  similarity_score: 'Similarity',
  regen_count: 'Regenerations',
  regenerations: 'Regenerations',
  rewrites: 'Rewrites',
  posts: 'Posts',
  published: 'Published',
  cost_usd: 'Cost (USD)',
  cost: 'Cost',
  views: 'Views',
  reactions: 'Reactions',
  er: 'Engagement rate',
  ctr: 'Click-through rate',
};

/** Known label, or the raw wire key flagged as raw. */
export function labelFor(key: string): { label: string; rawKey: boolean } {
  const known = KNOWN_LABELS[key];
  return known === undefined ? { label: key, rawKey: true } : { label: known, rawKey: false };
}

function isMetricObject(
  value: AnalyticsMetricWireDTO | number | null,
): value is AnalyticsMetricWireDTO {
  return typeof value === 'object' && value !== null;
}

/** §R10.3: `gated` wins over any value the wire carries. */
export function mapMetricEntry(
  key: string,
  wire: AnalyticsMetricWireDTO | number | null,
): MetricEntryVM {
  const { label, rawKey } = labelFor(key);
  if (!isMetricObject(wire)) {
    return { key, label, rawKey, value: wire, unit: null, gated: false };
  }
  const gated = wire.availability === 'gated';
  return {
    key,
    label: wire.label ?? label,
    rawKey: wire.label ? false : rawKey,
    value: gated ? null : wire.value,
    unit: wire.unit ?? null,
    gated,
  };
}

/** §R10.3: a gated series plots nothing — no zeros, no empty-looking line. */
export function mapSeries(wire: AnalyticsSeriesWireDTO): SeriesVM {
  const { label, rawKey } = labelFor(wire.key);
  const gated = wire.availability === 'gated';
  return {
    key: wire.key,
    label: wire.label ?? label,
    rawKey: wire.label ? false : rawKey,
    unit: wire.unit ?? null,
    gated,
    points: gated
      ? []
      : wire.points
          .filter((point): point is { key: string; value: number } => point.value !== null)
          .map((point) => ({ key: point.key, value: point.value })),
  };
}

export interface ProvenanceInput {
  readonly endpoint: string;
  readonly filters: readonly string[];
  readonly fetchedAt: string;
}

export function mapPanel(wire: AnalyticsPanelWireDTO, provenance: ProvenanceInput): PanelVM {
  const metrics = Object.entries(wire.metrics ?? {}).map(([key, value]) =>
    mapMetricEntry(key, value),
  );
  return {
    metrics,
    series: (wire.series ?? []).map(mapSeries),
    provenance: {
      endpoint: provenance.endpoint,
      filters: provenance.filters,
      fetchedAt: provenance.fetchedAt,
      algorithmVersion: wire.algorithm_version ?? null,
      computedAt: wire.computed_at ?? null,
    },
  };
}

/** The `/cost` facets are plain `{key, amount_usd}` rows — one honest series. */
export function mapCostSeries(
  wire: readonly CostEntryWireDTO[],
  groupBy: CostGroupBy,
  provenance: ProvenanceInput,
): PanelVM {
  const label = COST_FACET_LABEL[groupBy];
  return {
    metrics: [],
    series: [
      {
        key: `cost_by_${groupBy}`,
        label,
        rawKey: false,
        unit: 'USD',
        gated: false,
        points: wire.map((entry) => ({ key: entry.key, value: entry.amount_usd })),
      },
    ],
    provenance: {
      endpoint: provenance.endpoint,
      filters: provenance.filters,
      fetchedAt: provenance.fetchedAt,
      // `/cost` is a raw aggregation, not a computed analysis — the contract
      // documents no algorithm version for it and none is invented.
      algorithmVersion: null,
      computedAt: null,
    },
  };
}

/**
 * The channel snapshot, mapped into the SAME metric vocabulary every other
 * panel uses. FS5's `mapAnalytics` produces the dashboard's four fixed fields;
 * this screen needs them as generic entries so the gated ones (views,
 * reactions) flow through the identical §R10.3 path as any other gated metric.
 *
 * The labels are deliberately neutral: the wire calls them `cost_today` /
 * `published_today`, but this call accepts `?from=&to=`, so "today" would be
 * wrong for any range that is not today. Whether the backend actually applies
 * the range here is FE-RV-14's question — the provenance line states the
 * filters that were sent, and nothing claims more than that.
 */
export function mapSnapshotEntries(wire: AnalyticsSnapshotWireDTO): readonly MetricEntryVM[] {
  return [
    { ...mapMetricEntry('cost', wire.cost_today), label: 'Cost', rawKey: false },
    { ...mapMetricEntry('published', wire.published_today), label: 'Published', rawKey: false },
    mapMetricEntry('views', wire.views),
    mapMetricEntry('reactions', wire.reactions),
  ];
}

export const COST_FACET_LABEL: Readonly<Record<CostGroupBy, string>> = {
  day: 'Cost by day',
  channel: 'Cost by channel',
  model: 'Cost by model',
  provider: 'Cost by provider',
};

/** The filters this console actually sent — the honest half of §R11.9. */
export function describeFilters(
  range: DateRange,
  extra: readonly string[] = [],
): readonly string[] {
  const parts: string[] = [];
  if (range.from && range.to) parts.push(`${range.from} → ${range.to}`);
  else if (range.from) parts.push(`from ${range.from}`);
  else if (range.to) parts.push(`to ${range.to}`);
  else parts.push('no range sent');
  return [...parts, ...extra];
}

/** True when a panel returned nothing to show (an honest empty, never an error). */
export function isPanelEmpty(panel: PanelVM): boolean {
  return panel.metrics.length === 0 && panel.series.every((entry) => entry.points.length === 0);
}
