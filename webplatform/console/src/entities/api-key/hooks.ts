'use client';

/**
 * Entity `api-key` — READ hooks (FS12). The rotation mutation lives in
 * `features/rotate-key`: an entity never writes, and in this slice that rule
 * carries extra weight — the write is the only place a secret exists.
 */
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/shared/lib/api';
import type { ApiKeySlotWireDTO } from '@/shared/types';
import { apiKeyKeys } from './keys';
import { mapApiKeySlot, sortApiKeySlots, type ApiKeySlotVM } from './model';
import { apiKeyPaths } from './paths';

export const API_KEY_STALE_MS = 60_000;

export async function fetchApiKeySlots(signal?: AbortSignal): Promise<readonly ApiKeySlotVM[]> {
  const wire = await apiFetch<readonly ApiKeySlotWireDTO[]>(
    apiKeyPaths.list(),
    signal ? { signal } : {},
  );
  return sortApiKeySlots(wire.map(mapApiKeySlot));
}

export function useApiKeySlots(initialData?: readonly ApiKeySlotVM[]) {
  return useQuery<readonly ApiKeySlotVM[]>({
    queryKey: apiKeyKeys.list(),
    queryFn: ({ signal }) => fetchApiKeySlots(signal),
    ...(initialData !== undefined ? { initialData } : {}),
    staleTime: API_KEY_STALE_MS,
  });
}
