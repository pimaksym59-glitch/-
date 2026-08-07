'use client';

/** Entity `config-version` — READ hooks only (FS12). The rollback mutation
 *  lives in `features/rollback-config`: an entity never writes. */
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/shared/lib/api';
import type { ConfigVersionWireDTO } from '@/shared/types';
import { configVersionKeys } from './keys';
import { mapConfigVersion, sortConfigVersions, type ConfigVersionVM } from './model';
import { configVersionPaths } from './paths';

export const CONFIG_VERSION_STALE_MS = 60_000;

export async function fetchConfigVersions(
  signal?: AbortSignal,
): Promise<readonly ConfigVersionVM[]> {
  const wire = await apiFetch<readonly ConfigVersionWireDTO[]>(
    configVersionPaths.list(),
    signal ? { signal } : {},
  );
  return sortConfigVersions(wire.map(mapConfigVersion));
}

export function useConfigVersions(initialData?: readonly ConfigVersionVM[]) {
  return useQuery<readonly ConfigVersionVM[]>({
    queryKey: configVersionKeys.list(),
    queryFn: ({ signal }) => fetchConfigVersions(signal),
    ...(initialData !== undefined ? { initialData } : {}),
    staleTime: CONFIG_VERSION_STALE_MS,
  });
}
