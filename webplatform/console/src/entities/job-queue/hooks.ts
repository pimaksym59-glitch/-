'use client';

/**
 * Entity `job-queue` — READ hooks (FS12). Entity-local keys rooted at
 * `'queue'` so the existing `['jobs']` prefix invalidations cannot reach them
 * (plan §3.2). Intents live in `features/requeue-job`: an entity never writes.
 *
 * **No polling.** The contract exposes no task stream, and a poll would imply a
 * freshness nobody promised (the FS11 rule applied to the queue). The list is
 * SWR-cached at the Stage 3 §8 window and refetched when an intent says so.
 */
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/shared/lib/api';
import type { TaskAdminWireDTO } from '@/shared/types';
import { queueKeys } from './keys';
import { mapQueueTask, sortQueueTasks, type QueueTaskVM } from './model';
import { queuePaths } from './paths';

/** Stage 3 §8 fixes the jobs list at a 15 s stale window. */
export const QUEUE_STALE_MS = 15_000;

export async function fetchQueueTasks(
  status: string | null,
  type: string | null,
  channelId: string | null,
  signal?: AbortSignal,
): Promise<readonly QueueTaskVM[]> {
  const wire = await apiFetch<readonly TaskAdminWireDTO[]>(
    queuePaths.list(status, type, channelId),
    signal ? { signal } : {},
  );
  return sortQueueTasks(wire.map(mapQueueTask));
}

export async function fetchQueueTask(id: string, signal?: AbortSignal): Promise<QueueTaskVM> {
  const wire = await apiFetch<TaskAdminWireDTO>(queuePaths.detail(id), signal ? { signal } : {});
  return mapQueueTask(wire);
}

export function useQueueTasks(
  status: string | null,
  type: string | null,
  channelId: string | null,
  initialData?: readonly QueueTaskVM[],
) {
  return useQuery<readonly QueueTaskVM[]>({
    queryKey: queueKeys.list(status, type, channelId),
    queryFn: ({ signal }) => fetchQueueTasks(status, type, channelId, signal),
    ...(initialData !== undefined ? { initialData } : {}),
    staleTime: QUEUE_STALE_MS,
  });
}

export function useQueueTask(id: string | null) {
  return useQuery<QueueTaskVM>({
    queryKey: queueKeys.detail(id ?? 'none'),
    queryFn: ({ signal }) => fetchQueueTask(id ?? '', signal),
    enabled: id !== null,
    staleTime: QUEUE_STALE_MS,
  });
}
