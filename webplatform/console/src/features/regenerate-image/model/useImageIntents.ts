'use client';

/**
 * Image intents (FS9 T-FS9.6 — the frozen §Images calls):
 *   regenerate = `POST /images/{id}/regenerate` → **202 {task_id}** — a queue
 *   intent (§R10.1), worded “queued”, NEVER “done”; delete = soft
 *   `DELETE /images/{id}` (§R4.4).
 *
 * Stage 3 §3 called this slot `generate-image`. The frozen contract carries no
 * image-create call (plan §5.2 D1), so the honest realization is regeneration:
 * the only generation intent a client can express. The cap (`IMAGE_MAX_REGEN`,
 * §R6.5) is enforced server-side — whatever the backend answers when it is
 * exhausted is surfaced as-is, never pre-guessed by the UI.
 *
 * Confirmed mutations (never optimistic — an image costs money to make);
 * invalidations follow plan §3.2, including the FS5 jobs surface because the
 * queued task is real work. RBAC: callers gate on `can('content.edit')`.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { imageKeys, imagePaths } from '@/entities/image';
import { apiFetch } from '@/shared/lib/api';
import type { AppError } from '@/shared/lib/errors';
import { useToast } from '@/shared/providers';
import type { TaskIntentWireDTO } from '@/shared/types';

export interface UseImageIntentsApi {
  readonly regenerate: (imageId: string) => void;
  readonly regeneratePending: string | null;
  readonly deleteImage: (imageId: string, onDeleted?: () => void) => void;
  readonly deletePending: string | null;
}

export function useImageIntents(channelId: string | null): UseImageIntentsApi {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidateImage = (imageId: string): void => {
    void queryClient.invalidateQueries({ queryKey: imageKeys.detail(imageId) });
    void queryClient.invalidateQueries({ queryKey: imageKeys.history(imageId) });
    void queryClient.invalidateQueries({ queryKey: imageKeys.similarity(imageId) });
    if (channelId) void queryClient.invalidateQueries({ queryKey: imageKeys.list(channelId) });
  };

  const regenerateMutation = useMutation<TaskIntentWireDTO, AppError, { imageId: string }>({
    mutationFn: ({ imageId }) =>
      apiFetch<TaskIntentWireDTO>(imagePaths.regenerate(imageId), { method: 'POST' }),
    retry: false,
    onSuccess: (intent, { imageId }) => {
      // Honest 202 truth: queued, not done (§R10.1).
      toast({
        kind: 'info',
        title: 'Regeneration queued',
        description: `The worker will produce a new image (task ${intent.task_id}).`,
      });
      invalidateImage(imageId);
      void queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (error) => {
      toast({ kind: 'danger', title: 'Regeneration failed', description: error.message });
    },
  });

  const deleteMutation = useMutation<
    unknown,
    AppError,
    { imageId: string; onDeleted?: () => void }
  >({
    mutationFn: ({ imageId }) => apiFetch(imagePaths.remove(imageId), { method: 'DELETE' }),
    retry: false,
    onSuccess: (_data, { imageId, onDeleted }) => {
      toast({
        kind: 'success',
        title: 'Image deleted',
        description: 'Soft-deleted — the backend keeps the record and its history.',
      });
      queryClient.removeQueries({ queryKey: imageKeys.detail(imageId) });
      queryClient.removeQueries({ queryKey: imageKeys.history(imageId) });
      queryClient.removeQueries({ queryKey: imageKeys.similarity(imageId) });
      if (channelId) void queryClient.invalidateQueries({ queryKey: imageKeys.list(channelId) });
      onDeleted?.();
    },
    onError: (error) => {
      toast({ kind: 'danger', title: 'Delete failed', description: error.message });
    },
  });

  return {
    regenerate: (imageId) => regenerateMutation.mutate({ imageId }),
    regeneratePending: regenerateMutation.isPending ? regenerateMutation.variables.imageId : null,
    deleteImage: (imageId, onDeleted) =>
      deleteMutation.mutate(onDeleted ? { imageId, onDeleted } : { imageId }),
    deletePending: deleteMutation.isPending ? deleteMutation.variables.imageId : null,
  };
}
