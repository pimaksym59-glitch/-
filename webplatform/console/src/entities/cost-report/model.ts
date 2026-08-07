/**
 * Entity `cost-report` — model (FS12, D3 §21 Billing). The one reliable money
 * signal the contract exposes is `GET /cost?group_by=` (§R11.8), computed from
 * `api_usage`/`image_usage`.
 *
 * **Nothing here forecasts, projects or estimates.** §R11.8 names cost
 * forecasting as backend analytics work that is deferred by design, and the
 * owner ruled at FS11 that the console does not invent forecasts. This slice
 * sums what was served and stops — no run-rate, no projection to month end, no
 * "expected spend". The Billing screen states the absence instead.
 */
import type { CostEntryWireDTO } from '@/shared/types';

export type { CostEntryWireDTO };

/** The contract's own `group_by` facet values, verbatim. */
export const COST_GROUPS = ['day', 'channel', 'model', 'provider'] as const;
export type CostGroup = (typeof COST_GROUPS)[number];

export function parseCostGroup(value: string | null | undefined): CostGroup {
  return (COST_GROUPS as readonly string[]).includes(value ?? '') ? (value as CostGroup) : 'day';
}

export interface CostRowVM {
  /** The wire's own key — a date, channel id, model or provider name. */
  readonly key: string;
  readonly amountUsd: number;
  /** Share of the served total, 0–1. A projection of loaded data only. */
  readonly share: number;
}

export interface CostReportVM {
  readonly group: CostGroup;
  readonly rows: readonly CostRowVM[];
  readonly totalUsd: number;
}

export function mapCostReport(group: CostGroup, wire: readonly CostEntryWireDTO[]): CostReportVM {
  const total = wire.reduce((sum, entry) => sum + entry.amount_usd, 0);
  const rows = wire.map((entry) => ({
    key: entry.key,
    amountUsd: entry.amount_usd,
    share: total > 0 ? entry.amount_usd / total : 0,
  }));
  // A day series reads chronologically; every other facet reads largest-first.
  const sorted =
    group === 'day'
      ? rows.slice().sort((a, b) => a.key.localeCompare(b.key))
      : rows.slice().sort((a, b) => b.amountUsd - a.amountUsd);
  return { group, rows: sorted, totalUsd: total };
}

export const COST_GROUP_LABELS: Record<CostGroup, string> = {
  day: 'Day',
  channel: 'Channel',
  model: 'Model',
  provider: 'Provider',
};
