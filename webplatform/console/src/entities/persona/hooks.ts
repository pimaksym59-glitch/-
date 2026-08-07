'use client';

/**
 * Entity `persona` — query hooks (FS8). Channel-scoped keys (plan §3.2);
 * initialData carries a `forChannelId` guard upstream (the FS5 lesson).
 * Server state lives here and ONLY here — no persona field is ever mirrored
 * into Zustand (plan §3.4 no-double-ownership). Mutations live in
 * `features/edit-persona`.
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/config/query-keys';
import { apiFetch } from '@/shared/lib/api';
import { mapPersona, sortPersonas, type PersonaVM, type PersonaWireDTO } from './model';
import { personaPaths } from './paths';

export async function fetchPersonas(
  channelId: string,
  signal?: AbortSignal,
): Promise<readonly PersonaVM[]> {
  const wire = await apiFetch<readonly PersonaWireDTO[]>(
    personaPaths.list(channelId),
    signal ? { signal } : {},
  );
  return sortPersonas(wire.map(mapPersona));
}

export async function fetchPersona(id: string, signal?: AbortSignal): Promise<PersonaVM> {
  const wire = await apiFetch<PersonaWireDTO>(personaPaths.detail(id), signal ? { signal } : {});
  return mapPersona(wire);
}

export function usePersonas(channelId: string | null, initialData?: readonly PersonaVM[]) {
  return useQuery<readonly PersonaVM[]>({
    queryKey: queryKeys.personas(channelId ?? 'none'),
    queryFn: ({ signal }) => fetchPersonas(channelId ?? '', signal),
    enabled: channelId !== null,
    ...(initialData !== undefined ? { initialData } : {}),
    staleTime: 30_000,
  });
}

export function usePersona(id: string | null) {
  return useQuery<PersonaVM>({
    queryKey: queryKeys.persona(id ?? 'none'),
    queryFn: ({ signal }) => fetchPersona(id ?? '', signal),
    enabled: id !== null,
    staleTime: 30_000,
  });
}
