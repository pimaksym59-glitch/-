'use client';

/**
 * Entity `analytics` — the FS11 reporting hooks (plan §3.2/§3.4).
 *
 * Every one of them is a READ: the frozen §Analytics & Cost group exposes no
 * write at all, so this module contains **no mutation, no `invalidateQueries`
 * and no `setQueryData`** — the stage's invalidate graph is empty by
 * construction (invariant I5).
 *
 * Keys are entity-local and range-scoped (`./keys`), so a range change is a NEW
 * key rather than an invalidation: the previous range stays cached and Back
 * returns to it instantly (D3 §12 "Cached: last range").
 *
 * There is **no polling anywhere**. D3 §12 imagines "live counters", but the
 * contract exposes no analytics stream and no push; inventing a poll would
 * imply a freshness the backend never promised (the FS7 "no invented progress"
 * rule applied to time). Panels are SWR-cached with an explicit refresh and a
 * fetched-at whisper instead.
 */
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/shared/lib/api';
import type {
  AnalyticsPanelWireDTO,
  AnalyticsSnapshotWireDTO,
  CostEntryWireDTO,
} from '@/shared/types';
import { analyticsKeys } from './keys';
import { analyticsPaths, type CostGroupBy, type DateRange, type ReportPeriod } from './paths';
import {
  describeFilters,
  mapCostSeries,
  mapPanel,
  mapSnapshotEntries,
  type PanelVM,
} from './report-model';

/** Stage 3 §8: analytics reads are SWR with a 60 s stale window. */
const STALE = 60_000;

/** The browser's own receipt time — the honest half of §R11.9 provenance. */
function now(): string {
  return new Date().toISOString();
}

export async function fetchRangeSnapshot(
  channelId: string,
  range: DateRange,
  signal?: AbortSignal,
): Promise<PanelVM> {
  const endpoint = analyticsPaths.snapshot(channelId, range);
  const wire = await apiFetch<AnalyticsSnapshotWireDTO>(endpoint, signal ? { signal } : {});
  return {
    metrics: mapSnapshotEntries(wire),
    series: [],
    provenance: {
      endpoint,
      filters: describeFilters(range, [`channel ${channelId}`]),
      fetchedAt: now(),
      // A snapshot is a served reading, not a computed analysis — the contract
      // documents no algorithm version for it and none is invented.
      algorithmVersion: null,
      computedAt: null,
    },
  };
}

export function useRangeSnapshot(
  channelId: string | null,
  range: DateRange,
  initialData?: PanelVM,
) {
  return useQuery<PanelVM>({
    queryKey: analyticsKeys.snapshot(channelId ?? 'none', range),
    queryFn: ({ signal }) => fetchRangeSnapshot(channelId ?? '', range, signal),
    enabled: channelId !== null,
    ...(initialData !== undefined ? { initialData } : {}),
    staleTime: STALE,
  });
}

export async function fetchCostBy(
  groupBy: CostGroupBy,
  range: DateRange,
  signal?: AbortSignal,
): Promise<PanelVM> {
  const endpoint = analyticsPaths.cost(groupBy, range);
  const wire = await apiFetch<readonly CostEntryWireDTO[]>(endpoint, signal ? { signal } : {});
  return mapCostSeries(wire, groupBy, {
    endpoint,
    filters: describeFilters(range, [`grouped by ${groupBy}`]),
    fetchedAt: now(),
  });
}

export function useCostBy(groupBy: CostGroupBy, range: DateRange, initialData?: PanelVM) {
  return useQuery<PanelVM>({
    queryKey: analyticsKeys.costBy(groupBy, range),
    queryFn: ({ signal }) => fetchCostBy(groupBy, range, signal),
    ...(initialData !== undefined ? { initialData } : {}),
    staleTime: STALE,
  });
}

async function fetchPanel(
  endpoint: string,
  filters: readonly string[],
  signal?: AbortSignal,
): Promise<PanelVM> {
  const wire = await apiFetch<AnalyticsPanelWireDTO>(endpoint, signal ? { signal } : {});
  return mapPanel(wire, { endpoint, filters, fetchedAt: now() });
}

export function useQualityPanel(range: DateRange) {
  return useQuery<PanelVM>({
    queryKey: analyticsKeys.quality(range),
    queryFn: ({ signal }) =>
      fetchPanel(analyticsPaths.quality(range), describeFilters(range), signal),
    staleTime: STALE,
  });
}

export function useTrendsPanel(range: DateRange) {
  return useQuery<PanelVM>({
    queryKey: analyticsKeys.trends(range),
    queryFn: ({ signal }) =>
      fetchPanel(analyticsPaths.trends(range), describeFilters(range), signal),
    staleTime: STALE,
  });
}

export function useReportPanel(period: ReportPeriod) {
  return useQuery<PanelVM>({
    queryKey: analyticsKeys.report(period),
    queryFn: ({ signal }) =>
      // The report endpoint takes no range — the filter line says exactly that
      // rather than implying the range was applied server-side.
      fetchPanel(analyticsPaths.report(period), [`${period} report`, 'range not sent'], signal),
    staleTime: STALE,
  });
}
