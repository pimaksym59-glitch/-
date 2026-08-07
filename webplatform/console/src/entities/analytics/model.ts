/**
 * Entity `analytics` — model (Stage 3 §4). §R10.3 is load-bearing here:
 * a gated metric keeps `value: null` + `availability: 'gated'` and the UI
 * renders the honest Gated state — zeros are NEVER shown for gated data.
 */
import type { AnalyticsSnapshotWireDTO, CostEntryWireDTO, MetricWireDTO } from '@/shared/types';

export type { AnalyticsSnapshotWireDTO, CostEntryWireDTO };

export interface MetricVM {
  readonly value: number | null;
  readonly gated: boolean;
}

export interface AnalyticsVM {
  readonly channelId: string;
  readonly date: string;
  readonly costToday: MetricVM;
  readonly publishedToday: MetricVM;
  readonly views: MetricVM;
  readonly reactions: MetricVM;
}

export interface CostPointVM {
  readonly label: string;
  readonly amountUsd: number;
}

function mapMetric(wire: MetricWireDTO): MetricVM {
  return {
    value: wire.availability === 'gated' ? null : wire.value,
    gated: wire.availability === 'gated',
  };
}

export function mapAnalytics(wire: AnalyticsSnapshotWireDTO): AnalyticsVM {
  return {
    channelId: wire.channel_id,
    date: wire.date,
    costToday: mapMetric(wire.cost_today),
    publishedToday: mapMetric(wire.published_today),
    views: mapMetric(wire.views),
    reactions: mapMetric(wire.reactions),
  };
}

export function mapCost(wire: readonly CostEntryWireDTO[]): readonly CostPointVM[] {
  return wire.map((entry) => ({ label: entry.key.slice(5), amountUsd: entry.amount_usd }));
}
