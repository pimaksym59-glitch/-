'use client';

/**
 * Feature `insert-to-channel` (FS6 T-FS6.5) — the first chat→pipeline bridge.
 * `POST /channels/{id}/posts` creates a REAL manual draft (**201**, API_SPEC
 * §Posts); optionally `POST /posts/{id}/generate` queues text generation
 * (**202** — a queue intent, §R10.1, worded as "queued", never "done").
 * Confirmed mutation, not optimistic; invalidates posts + jobs so the FS5
 * dashboard surfaces pick the draft up. RBAC: callers gate on
 * `can('content.edit')` (SEC-7 — never offered to analyst/viewer).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/shared/lib/api';
import type { AppError } from '@/shared/lib/errors';
import { useToast } from '@/shared/providers';
import type { PostCreateRequestWireDTO, PostWireDTO, TaskIntentWireDTO } from '@/shared/types';

export interface InsertInput {
  readonly channelId: string;
  readonly title: string;
  readonly body: string;
  readonly generate: boolean;
}

export interface InsertResult {
  readonly post: PostWireDTO;
  readonly taskId: string | null;
}

export interface UseInsertApi {
  readonly insert: (input: InsertInput) => Promise<InsertResult>;
  readonly isPending: boolean;
}

export function useInsertToChannel(options?: { onCreated?: () => void }): UseInsertApi {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation<InsertResult, AppError, InsertInput>({
    mutationFn: async ({ channelId, title, body, generate }) => {
      const request: PostCreateRequestWireDTO = { title, body };
      const post = await apiFetch<PostWireDTO>(`/channels/${encodeURIComponent(channelId)}/posts`, {
        method: 'POST',
        json: request,
      });
      let taskId: string | null = null;
      if (generate) {
        const intent = await apiFetch<TaskIntentWireDTO>(
          `/posts/${encodeURIComponent(post.id)}/generate`,
          { method: 'POST' },
        );
        taskId = intent.task_id;
      }
      return { post, taskId };
    },
    retry: false,
    onSuccess: ({ post, taskId }) => {
      // 201 truth: the draft EXISTS; generation (if asked) is only QUEUED.
      toast({
        kind: 'success',
        title: 'Draft created',
        description: taskId
          ? `“${post.title ?? 'Untitled'}” saved · generation queued (task ${taskId}).`
          : `“${post.title ?? 'Untitled'}” saved as a draft.`,
      });
      void queryClient.invalidateQueries({ queryKey: ['posts'] });
      void queryClient.invalidateQueries({ queryKey: ['jobs'] });
      options?.onCreated?.();
    },
    onError: (error) => {
      toast({ kind: 'danger', title: 'Couldn’t create the draft', description: error.message });
    },
  });

  return {
    insert: (input) => mutation.mutateAsync(input),
    isPending: mutation.isPending,
  };
}
