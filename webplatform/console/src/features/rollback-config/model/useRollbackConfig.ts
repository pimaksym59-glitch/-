'use client';

/**
 * Config rollback (FS12 T-FS12.7) — `POST /config-versions/{id}/rollback`
 * (§R10.8). The contract's response is a queue intent, so the UI reports
 * **queued truth** (§R10.1): the snapshot was accepted for restore, not
 * "restored".
 *
 * Guarded and confirmed: a rollback rewrites platform configuration, which is
 * the most consequential write in the stage. There is no optimistic path and no
 * undo affordance — the honest undo is rolling forward to another snapshot,
 * which the same screen already offers.
 *
 * RBAC: callers gate on `can('platform.manage')`.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { configVersionKeys, configVersionPaths } from '@/entities/config-version';
import { apiFetch } from '@/shared/lib/api';
import type { AppError } from '@/shared/lib/errors';
import { useToast } from '@/shared/providers';
import type { TaskIntentResponseWireDTO } from '@/shared/types';

export interface UseRollbackConfigApi {
  readonly rollback: (versionId: string) => void;
  readonly pending: string | null;
}

export function useRollbackConfig(): UseRollbackConfigApi {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation<TaskIntentResponseWireDTO, AppError, { versionId: string }>({
    mutationFn: ({ versionId }) =>
      apiFetch<TaskIntentResponseWireDTO>(configVersionPaths.rollback(versionId), {
        method: 'POST',
      }),
    retry: false,
    onSuccess: (intent, { versionId }) => {
      toast({
        kind: 'info',
        title: 'Rollback queued',
        description: intent.task_id
          ? `Snapshot ${versionId} was accepted for restore (task ${intent.task_id}).`
          : `Snapshot ${versionId} was accepted for restore.`,
      });
      void queryClient.invalidateQueries({ queryKey: configVersionKeys.list() });
    },
    onError: (error) => {
      toast({ kind: 'danger', title: 'Rollback rejected', description: error.message });
    },
  });

  return {
    rollback: (versionId) => mutation.mutate({ versionId }),
    pending: mutation.isPending ? (mutation.variables?.versionId ?? null) : null,
  };
}
