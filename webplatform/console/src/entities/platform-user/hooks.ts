'use client';

/**
 * Entity `platform-user` — query hooks (FS12). Entity-local keys, no channel
 * scope anywhere (governance is platform-wide). Mutations live in
 * `features/manage-users`: an entity never writes.
 */
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/shared/lib/api';
import type { PlatformUserWireDTO } from '@/shared/types';
import { platformUserKeys } from './keys';
import { mapPlatformUser, sortUsers, type PlatformUserVM } from './model';
import { platformUserPaths } from './paths';

/** Stage 3 §8 fixes admin lists at a 30 s stale window. */
export const PLATFORM_USER_STALE_MS = 30_000;

export async function fetchPlatformUsers(signal?: AbortSignal): Promise<readonly PlatformUserVM[]> {
  const wire = await apiFetch<readonly PlatformUserWireDTO[]>(
    platformUserPaths.list(),
    signal ? { signal } : {},
  );
  return sortUsers(wire.map(mapPlatformUser));
}

export function usePlatformUsers(initialData?: readonly PlatformUserVM[]) {
  return useQuery<readonly PlatformUserVM[]>({
    queryKey: platformUserKeys.list(),
    queryFn: ({ signal }) => fetchPlatformUsers(signal),
    ...(initialData !== undefined ? { initialData } : {}),
    staleTime: PLATFORM_USER_STALE_MS,
  });
}
