'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/config/query-keys';
import { apiFetch } from '@/shared/lib/api';
import { mapJob, type JobVM, type TaskWireDTO } from './model';

export async function fetchJobs(
  channelId: string | null,
  signal?: AbortSignal,
): Promise<readonly JobVM[]> {
  const search = channelId ? `?channel_id=${encodeURIComponent(channelId)}` : '';
  const wire = await apiFetch<readonly TaskWireDTO[]>(`/tasks${search}`, signal ? { signal } : {});
  return wire.map(mapJob);
}

export async function fetchJob(id: string, signal?: AbortSignal): Promise<JobVM> {
  const wire = await apiFetch<TaskWireDTO>(
    `/tasks/${encodeURIComponent(id)}`,
    signal ? { signal } : {},
  );
  return mapJob(wire);
}

export function useJobs(channelId: string | null, initialData?: readonly JobVM[]) {
  return useQuery<readonly JobVM[]>({
    queryKey: queryKeys.jobs('all', channelId),
    queryFn: ({ signal }) => fetchJobs(channelId, signal),
    ...(initialData !== undefined ? { initialData } : {}),
    staleTime: 15_000,
  });
}

export function useJob(id: string | null) {
  return useQuery<JobVM>({
    queryKey: queryKeys.job(id ?? 'none'),
    queryFn: ({ signal }) => fetchJob(id ?? '', signal),
    enabled: id !== null,
    staleTime: 15_000,
  });
}
