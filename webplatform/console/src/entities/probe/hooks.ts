'use client';

/**
 * Entity `probe` — READ hooks (FS12). Readiness reuses the FS1 commons key
 * `queryKeys.health()` (zero new rows anywhere); liveness uses the entity-local
 * key.
 *
 * **Re-check is a refetch, not a fabricated probe run.** The contract has no
 * "run the probes" call — `GET /health/ready` reports what the backend already
 * knows — so the UI's Re-check button re-reads the endpoint and says exactly
 * that. No polling: an interval would imply a freshness nobody promised
 * (the FS11 rule); the view stamps the fetched-at time instead.
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/config/query-keys';
import { apiFetch } from '@/shared/lib/api';
import type { HealthProbeWireDTO } from '@/shared/types';
import { probeKeys } from './keys';
import { mapReadiness, type ReadinessVM } from './model';
import { probePaths } from './paths';

export const PROBE_STALE_MS = 10_000;

export async function fetchReadiness(signal?: AbortSignal): Promise<ReadinessVM> {
  const wire = await apiFetch<HealthProbeWireDTO>(probePaths.ready(), signal ? { signal } : {});
  return mapReadiness(wire);
}

export async function fetchLiveness(signal?: AbortSignal): Promise<ReadinessVM> {
  const wire = await apiFetch<HealthProbeWireDTO>(probePaths.live(), signal ? { signal } : {});
  return mapReadiness(wire);
}

export function useReadiness(initialData?: ReadinessVM) {
  return useQuery<ReadinessVM>({
    queryKey: queryKeys.health(),
    queryFn: ({ signal }) => fetchReadiness(signal),
    ...(initialData !== undefined ? { initialData } : {}),
    staleTime: PROBE_STALE_MS,
  });
}

export function useLiveness() {
  return useQuery<ReadinessVM>({
    queryKey: probeKeys.live(),
    queryFn: ({ signal }) => fetchLiveness(signal),
    staleTime: PROBE_STALE_MS,
  });
}
