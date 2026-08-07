'use client';

/**
 * The Prompt Library's ONLY write (FS10 T-FS10.6): `POST /prompts` — a **new
 * version** (§R10.6 "Правка = новая версия"). The contract has no PATCH, no
 * DELETE and no promote call, so this feature exposes nothing else.
 *
 * **Confirmed, never optimistic.** §R11.4 makes changing a prompt an
 * administrative act (the bandit may not touch prompts; only an administrator
 * may), so the UI waits for the server's 201 and reports the version the
 * backend actually assigned — it never pre-renders a version number of its own.
 *
 * The toast states 201 truth ("saved as v4"), never 202 queue wording: this
 * write is not a queue intent. Invalidations follow plan §3.2 and touch
 * **prompt keys only** — no document, persona, actor, image, location, post or
 * job key is invalidated from here (locked by tests).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { promptKeys, promptPaths, type PromptVersionVM } from '@/entities/prompt';
import { mapPrompt } from '@/entities/prompt';
import { apiFetch } from '@/shared/lib/api';
import type { AppError } from '@/shared/lib/errors';
import { useToast } from '@/shared/providers';
import type { PromptCreateRequestWireDTO, PromptWireDTO } from '@/shared/types';
import { clearPromptDraft } from './promptDraft';

export interface CreateVersionInput {
  readonly type: string;
  readonly text: string;
  /** The row the chain was read from, so its versions query can be refreshed. */
  readonly chainRowId?: string | null;
}

export interface UseCreatePromptVersionApi {
  readonly create: (
    input: CreateVersionInput,
    onCreated?: (created: PromptVersionVM) => void,
  ) => void;
  readonly isPending: boolean;
  readonly error: AppError | null;
}

export function useCreatePromptVersion(): UseCreatePromptVersionApi {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation<
    PromptVersionVM,
    AppError,
    { input: CreateVersionInput; onCreated?: (created: PromptVersionVM) => void }
  >({
    mutationFn: async ({ input }) => {
      const body: PromptCreateRequestWireDTO = { type: input.type, text: input.text };
      const wire = await apiFetch<PromptWireDTO>(promptPaths.create(), {
        method: 'POST',
        json: body,
      });
      return mapPrompt(wire);
    },
    retry: false,
    onSuccess: (created, { input, onCreated }) => {
      toast({
        kind: 'success',
        title: `Saved as v${created.version}`,
        description: 'An edit is a new version — the previous ones stay in the history.',
      });
      clearPromptDraft(input.type);
      void queryClient.invalidateQueries({ queryKey: promptKeys.list() });
      void queryClient.invalidateQueries({ queryKey: promptKeys.byType(input.type) });
      if (input.chainRowId) {
        void queryClient.invalidateQueries({ queryKey: promptKeys.versions(input.chainRowId) });
      }
      void queryClient.invalidateQueries({ queryKey: promptKeys.versions(created.id) });
      onCreated?.(created);
    },
    onError: (error) => {
      toast({ kind: 'danger', title: 'Couldn’t save this version', description: error.message });
    },
  });

  return {
    create: (input, onCreated) => mutation.mutate(onCreated ? { input, onCreated } : { input }),
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
