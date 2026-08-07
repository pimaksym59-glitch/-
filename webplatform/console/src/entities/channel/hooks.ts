'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/config/query-keys';
import { apiFetch } from '@/shared/lib/api';
import { mapChannel, type ChannelVM, type ChannelWireDTO } from './model';

export async function fetchChannels(signal?: AbortSignal): Promise<readonly ChannelVM[]> {
  const wire = await apiFetch<readonly ChannelWireDTO[]>('/channels', signal ? { signal } : {});
  return wire.map(mapChannel);
}

export function useChannels(initialData?: readonly ChannelVM[]) {
  return useQuery<readonly ChannelVM[]>({
    queryKey: queryKeys.channels(),
    queryFn: ({ signal }) => fetchChannels(signal),
    ...(initialData !== undefined ? { initialData } : {}),
    staleTime: 30_000,
  });
}
