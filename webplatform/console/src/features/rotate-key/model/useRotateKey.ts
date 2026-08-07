'use client';

/**
 * Key rotation (FS12 T-FS12.11) — the project's FIRST secret-writing surface,
 * and the mechanism behind SEC-6 / §R10.4 / §R12.2.
 *
 * `PUT /api-keys` is the ONLY place a secret value legally exists in this
 * codebase, and it exists for exactly the lifetime of one request body:
 *
 *  - the value arrives as an argument, goes straight into `json`, and is never
 *    assigned to a variable that outlives the call;
 *  - it is **never** written to a draft, a store, a query cache, a query KEY, a
 *    cookie, a toast, an error message or a log;
 *  - the response is `204` — there is nothing to read back, and the slot VM has
 *    no field able to hold a value even if a wire volunteered one;
 *  - on error the AppError message is surfaced as-is, and the submitted value
 *    is never echoed into it (a rejected key must not be printed).
 *
 * Locked by `tests/unit/secret-writeonly.test.ts`, which greps this slice and
 * `entities/api-key` for any persistence of the value.
 *
 * Confirmed mutation, never optimistic: rotating a key changes what the
 * platform can do, and the UI reports only what the server accepted.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiKeyKeys, apiKeyPaths } from '@/entities/api-key';
import { apiFetch } from '@/shared/lib/api';
import type { AppError } from '@/shared/lib/errors';
import { useToast } from '@/shared/providers';
import type { ApiKeyWriteRequestWireDTO } from '@/shared/types';

export interface UseRotateKeyApi {
  readonly rotate: (name: string, value: string, onDone?: () => void) => void;
  readonly pending: boolean;
  readonly error: AppError | null;
}

export function useRotateKey(): UseRotateKeyApi {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation<
    unknown,
    AppError,
    { name: string; value: string; onDone?: () => void }
  >({
    mutationFn: ({ name, value }) =>
      apiFetch(apiKeyPaths.write(), {
        method: 'PUT',
        json: { name, value } satisfies ApiKeyWriteRequestWireDTO,
      }),
    retry: false,
    onSuccess: (_data, { name, onDone }) => {
      // The slot name is safe to print. The value is not, and is not available
      // here by construction — `onSuccess` receives nothing from the response.
      toast({
        kind: 'success',
        title: 'Key stored',
        description: `The backend accepted a new key for “${name}”. The console never reads a key back (§R10.4).`,
      });
      void queryClient.invalidateQueries({ queryKey: apiKeyKeys.list() });
      onDone?.();
    },
    onError: (error) => {
      // Deliberately the server's message only — never the submitted value.
      toast({ kind: 'danger', title: 'Key was not stored', description: error.message });
    },
  });

  return {
    rotate: (name, value, onDone) =>
      mutation.mutate(onDone ? { name, value, onDone } : { name, value }),
    pending: mutation.isPending,
    error: mutation.error,
  };
}
