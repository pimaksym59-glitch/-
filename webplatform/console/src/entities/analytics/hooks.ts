'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/config/query-keys';
import { apiFetch } from '@/shared/lib/api';
import {
  mapAnalytics,
  mapCost,
  type AnalyticsSnapshotWireDTO,
  type AnalyticsVM,
  type CostEntryWireDTO,
  type CostPointVM,
} from './model';

export async function fetchAnalytics(
  channelId: string,
  signal?: AbortSignal,
): Promise<AnalyticsVM> {
  const wire = await apiFetch<AnalyticsSnapshotWireDTO>(
    `/analytics/channels/${encodeURIComponent(channelId)}`,
    signal ? { signal } : {},
  );
  return mapAnalytics(wire);
}

export async function fetchCostByDay(signal?: AbortSignal): Promise<readonly CostPointVM[]> {
  const wire = await apiFetch<readonly CostEntryWireDTO[]>(
    '/cost?group_by=day',
    signal ? { signal } : {},
  );
  return mapCost(wire);
}

export function useAnalytics(channelId: string | null, initialData?: AnalyticsVM) {
  return useQuery<AnalyticsVM>({
    queryKey: queryKeys.analytics(channelId ?? 'none'),
    queryFn: ({ signal }) => fetchAnalytics(channelId ?? '', signal),
    enabled: channelId !== null,
    ...(initialData !== undefined ? { initialData } : {}),
    staleTime: 30_000,
  });
}

export function useCost(initialData?: readonly CostPointVM[]) {
  return useQuery<readonly CostPointVM[]>({
    queryKey: queryKeys.cost(),
    queryFn: ({ signal }) => fetchCostByDay(signal),
    ...(initialData !== undefined ? { initialData } : {}),
    staleTime: 60_000,
  });
}
