'use client';

/**
 * Entity `actor` — query hooks (FS8). Channel-scoped keys (plan §3.2).
 * READ-ONLY this stage: the contract's `POST /actors/{id}/references` is a
 * generation input (§R6.1) and belongs to FS9, so no mutation hook exists —
 * and therefore no invalidation writer touches these keys (plan §3.2).
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/config/query-keys';
import { apiFetch } from '@/shared/lib/api';
import { mapActor, type ActorVM, type ActorWireDTO } from './model';
import { actorPaths } from './paths';

export async function fetchActors(
  channelId: string,
  signal?: AbortSignal,
): Promise<readonly ActorVM[]> {
  const wire = await apiFetch<readonly ActorWireDTO[]>(
    actorPaths.list(channelId),
    signal ? { signal } : {},
  );
  return wire.map(mapActor);
}

export async function fetchActor(id: string, signal?: AbortSignal): Promise<ActorVM> {
  const wire = await apiFetch<ActorWireDTO>(actorPaths.detail(id), signal ? { signal } : {});
  return mapActor(wire);
}

export function useActors(channelId: string | null, initialData?: readonly ActorVM[]) {
  return useQuery<readonly ActorVM[]>({
    queryKey: queryKeys.actors(channelId ?? 'none'),
    queryFn: ({ signal }) => fetchActors(channelId ?? '', signal),
    enabled: channelId !== null,
    ...(initialData !== undefined ? { initialData } : {}),
    // Actors change rarely (visual identity) — a longer window than personas.
    staleTime: 60_000,
  });
}

export function useActor(id: string | null) {
  return useQuery<ActorVM>({
    queryKey: queryKeys.actor(id ?? 'none'),
    queryFn: ({ signal }) => fetchActor(id ?? '', signal),
    enabled: id !== null,
    staleTime: 60_000,
  });
}
