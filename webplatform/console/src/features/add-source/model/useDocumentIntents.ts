'use client';

/**
 * Document management intents (FS7 T-FS7.5 — the frozen §R9.3 calls):
 * re-ingest = `POST /documents/{id}/reindex` → **202 {task_id}** — a queue
 * intent (§R10.1), worded “queued”, NEVER “done”; delete = soft
 * `DELETE /documents/{id}`; assign = `POST /documents/{id}/assign`.
 * Confirmed mutations (never optimistic); invalidations follow plan §3.2 —
 * reindex additionally refreshes the FS5 jobs surface (the queued task is
 * real and visible there). RBAC: callers gate on `can('content.edit')`.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { documentPaths } from '@/entities/document';
import { queryKeys } from '@/shared/config/query-keys';
import { apiFetch } from '@/shared/lib/api';
import type { AppError } from '@/shared/lib/errors';
import { useToast } from '@/shared/providers';
import type { TaskIntentWireDTO } from '@/shared/types';

export interface UseDocumentIntentsApi {
  readonly reindex: (documentId: string) => void;
  readonly reindexPending: string | null;
  readonly deleteDocument: (documentId: string, onDeleted?: () => void) => void;
  readonly deletePending: string | null;
  readonly assign: (
    documentId: string,
    channelId: string,
    previousChannelId: string | null,
  ) => void;
  readonly assignPending: string | null;
}

export function useDocumentIntents(): UseDocumentIntentsApi {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidateDoc = (documentId: string): void => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.document(documentId) });
    void queryClient.invalidateQueries({ queryKey: ['documents', 'list'] });
  };

  const reindexMutation = useMutation<TaskIntentWireDTO, AppError, { documentId: string }>({
    mutationFn: ({ documentId }) =>
      apiFetch<TaskIntentWireDTO>(documentPaths.reindex(documentId), { method: 'POST' }),
    retry: false,
    onSuccess: (intent, { documentId }) => {
      // Honest 202 truth: queued, not done (§R10.1).
      toast({
        kind: 'info',
        title: 'Re-ingest queued',
        description: `The worker will rebuild this source (task ${intent.task_id}).`,
      });
      invalidateDoc(documentId);
      void queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (error) => {
      toast({ kind: 'danger', title: 'Re-ingest failed', description: error.message });
    },
  });

  const deleteMutation = useMutation<
    unknown,
    AppError,
    { documentId: string; onDeleted?: () => void }
  >({
    mutationFn: ({ documentId }) =>
      apiFetch(documentPaths.detail(documentId), { method: 'DELETE' }),
    retry: false,
    onSuccess: (_data, { documentId, onDeleted }) => {
      toast({
        kind: 'success',
        title: 'Document deleted',
        description: 'Soft-deleted from the knowledge base.',
      });
      // Plan §3.2: delete → REMOVE detail/versions from cache, refresh lists.
      queryClient.removeQueries({ queryKey: queryKeys.document(documentId) });
      queryClient.removeQueries({ queryKey: queryKeys.documentVersions(documentId) });
      void queryClient.invalidateQueries({ queryKey: ['documents', 'list'] });
      onDeleted?.();
    },
    onError: (error) => {
      toast({ kind: 'danger', title: 'Delete failed', description: error.message });
    },
  });

  const assignMutation = useMutation<
    unknown,
    AppError,
    { documentId: string; channelId: string; previousChannelId: string | null }
  >({
    mutationFn: ({ documentId, channelId }) =>
      apiFetch(documentPaths.assign(documentId), {
        method: 'POST',
        json: { channel_id: channelId },
      }),
    retry: false,
    onSuccess: (_data, { documentId, channelId, previousChannelId }) => {
      toast({
        kind: 'success',
        title: 'Channel assigned',
        description: 'The document now serves retrieval for the selected channel.',
      });
      // Plan §3.2: assign → detail + BOTH channels' lists.
      void queryClient.invalidateQueries({ queryKey: queryKeys.document(documentId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.documents(channelId) });
      if (previousChannelId && previousChannelId !== channelId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.documents(previousChannelId) });
      }
    },
    onError: (error) => {
      toast({ kind: 'danger', title: 'Assign failed', description: error.message });
    },
  });

  return {
    reindex: (documentId) => reindexMutation.mutate({ documentId }),
    reindexPending: reindexMutation.isPending ? reindexMutation.variables.documentId : null,
    deleteDocument: (documentId, onDeleted) =>
      deleteMutation.mutate(onDeleted ? { documentId, onDeleted } : { documentId }),
    deletePending: deleteMutation.isPending ? deleteMutation.variables.documentId : null,
    assign: (documentId, channelId, previousChannelId) =>
      assignMutation.mutate({ documentId, channelId, previousChannelId }),
    assignPending: assignMutation.isPending ? assignMutation.variables.documentId : null,
  };
}
