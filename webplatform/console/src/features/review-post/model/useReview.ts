'use client';

/**
 * Feature `review-post` (FS5 T-FS5.6). Approve/reject are QUEUE INTENTS
 * (§R10.1): the contract answers `202 {task_id}` — acknowledged, executed by
 * the worker. Mutations are therefore CONFIRMED, never optimistic (Stage 3
 * §8), the UI says "queued", and both `posts` and `jobs` are invalidated so
 * the queue + activity reflect the intent. RBAC: callers gate on `can()` —
 * analyst/viewer are never offered these actions (SEC-7).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/shared/lib/api';
import type { AppError } from '@/shared/lib/errors';
import { useToast } from '@/shared/providers';
import type { TaskIntentWireDTO } from '@/shared/types';

export type ReviewAction = 'approve' | 'reject';

async function postIntent(postId: string, action: ReviewAction): Promise<TaskIntentWireDTO> {
  return apiFetch<TaskIntentWireDTO>(`/posts/${encodeURIComponent(postId)}/${action}`, {
    method: 'POST',
  });
}

export interface UseReviewResult {
  readonly review: (postId: string, action: ReviewAction) => void;
  readonly isPending: boolean;
  readonly pendingId: string | null;
}

export function useReview(channelId: string | null): UseReviewResult {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation<
    TaskIntentWireDTO,
    AppError,
    { postId: string; action: ReviewAction }
  >({
    mutationFn: ({ postId, action }) => postIntent(postId, action),
    retry: false,
    onSuccess: (intent, { action }) => {
      // Honest 202 truth: queued, not done (§R10.1).
      toast({
        kind: 'info',
        title: action === 'approve' ? 'Approval queued' : 'Rejection queued',
        description: `The worker will process it (task ${intent.task_id}).`,
      });
      void queryClient.invalidateQueries({ queryKey: ['posts'] });
      void queryClient.invalidateQueries({ queryKey: ['jobs'] });
      if (channelId) {
        void queryClient.invalidateQueries({ queryKey: ['analytics', channelId] });
      }
    },
    onError: (error) => {
      toast({ kind: 'danger', title: 'Review action failed', description: error.message });
    },
  });

  return {
    review: (postId, action) => mutation.mutate({ postId, action }),
    isPending: mutation.isPending,
    pendingId: mutation.isPending ? mutation.variables.postId : null,
  };
}
