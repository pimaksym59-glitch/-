'use client';

/**
 * Queue intents (FS12 T-FS12.8 — the frozen §Scheduler & Tasks calls):
 *   cancel  = `POST /tasks/{id}/cancel`   → 202, status `cancelled`
 *   run     = `POST /tasks/{id}/run`      → 202, a manual run
 *   requeue = `POST /tasks/{id}/requeue`  → 202, DLQ `dead` to `pending` (§R8.11)
 *
 * All three are **queue intents** (§R10.1): the panel is a client of the same
 * queue the workers read, never a second execution path. They are worded
 * "queued", never "done", and they are **confirmed, never optimistic** — a
 * requeue puts real work back on a real queue.
 *
 * **Invalidation is explicit and one-directional** (plan §3.2). The admin queue
 * lives under the `['queue', …]` root precisely so the existing bare-prefix
 * `['jobs']` invalidations shipped by `review-post`, `insert-to-channel` and
 * `add-source` cannot sweep it by accident. The coupling that IS wanted — a
 * cancelled publish should refresh the dashboard's schedule timeline — is
 * declared here, in one place, on purpose.
 *
 * RBAC: callers gate on `can('platform.manage')`, matching the contract's
 * *«Scheduler/Tasks (cancel/requeue/run) — owner/admin»* row. The backend
 * remains the boundary.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queueKeys, queuePaths } from '@/entities/job-queue';
import { apiFetch } from '@/shared/lib/api';
import type { AppError } from '@/shared/lib/errors';
import { useToast } from '@/shared/providers';
import type { TaskIntentResponseWireDTO } from '@/shared/types';

export type QueueIntent = 'cancel' | 'run' | 'requeue';

const INTENT_COPY: Record<QueueIntent, { readonly title: string; readonly body: string }> = {
  cancel: { title: 'Cancellation queued', body: 'The worker will stop picking this task up.' },
  run: { title: 'Run queued', body: 'The task was put back on the queue for an immediate run.' },
  requeue: {
    title: 'Requeue queued',
    body: 'The dead-letter task returned to the queue as pending (§R8.11).',
  },
};

export interface UseQueueIntentsApi {
  readonly send: (taskId: string, intent: QueueIntent) => void;
  readonly pending: string | null;
}

export function useQueueIntents(
  status: string | null,
  type: string | null,
  channelId: string | null,
): UseQueueIntentsApi {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation<
    TaskIntentResponseWireDTO,
    AppError,
    { taskId: string; intent: QueueIntent }
  >({
    mutationFn: ({ taskId, intent }) =>
      apiFetch<TaskIntentResponseWireDTO>(queuePaths[intent](taskId), { method: 'POST' }),
    retry: false,
    onSuccess: (response, { taskId, intent }) => {
      const copy = INTENT_COPY[intent];
      toast({
        kind: 'info',
        title: copy.title,
        // The server's own word for the new state when it sends one; never a
        // state the UI decided on its behalf.
        description: response.status
          ? `${copy.body} Reported status: ${response.status}.`
          : copy.body,
      });
      void queryClient.invalidateQueries({ queryKey: queueKeys.detail(taskId) });
      void queryClient.invalidateQueries({ queryKey: queueKeys.list(status, type, channelId) });
      // Declared cross-surface refresh: the dashboard timeline reads the same
      // tasks resource under the FS5 `['jobs']` root (plan §3.2).
      void queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (error) => {
      toast({ kind: 'danger', title: 'Intent rejected', description: error.message });
    },
  });

  return {
    send: (taskId, intent) => mutation.mutate({ taskId, intent }),
    pending: mutation.isPending ? (mutation.variables?.taskId ?? null) : null,
  };
}
