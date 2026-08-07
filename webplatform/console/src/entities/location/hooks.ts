'use client';

/**
 * Entity `location` — query hooks (FS9). Read-only; scene names change rarely,
 * so the list is cached generously. No mutation hook exists this stage by
 * design (plan §8).
 */
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/shared/lib/api';
import { locationKeys } from './keys';
import { mapLocation, type LocationVM, type LocationWireDTO } from './model';
import { locationPaths } from './paths';

export async function fetchLocations(
  channelId: string,
  signal?: AbortSignal,
): Promise<readonly LocationVM[]> {
  const wire = await apiFetch<readonly LocationWireDTO[]>(
    locationPaths.list(channelId),
    signal ? { signal } : {},
  );
  return wire.map(mapLocation);
}

export function useLocations(channelId: string | null) {
  return useQuery<readonly LocationVM[]>({
    queryKey: locationKeys.list(channelId ?? 'none'),
    queryFn: ({ signal }) => fetchLocations(channelId ?? '', signal),
    enabled: channelId !== null,
    staleTime: 300_000,
  });
}
