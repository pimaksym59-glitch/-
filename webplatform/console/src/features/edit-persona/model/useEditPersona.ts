'use client';

/**
 * Feature `edit-persona` (FS8 T-FS8.6) — the frozen §Personas mutations:
 * `PATCH /personas/{id}` (voice fields only) and `POST /personas/{id}/archive`.
 * Confirmed mutations, never optimistic (Stage 3 §8): a persona shapes every
 * future post, so the UI waits for the server's word.
 *
 * **Optimistic lock (§R4.2):** the wire's `version` is echoed on PATCH; a
 * conflict answers **409** and is surfaced as an honest "changed elsewhere"
 * state with a refresh affordance — never a silent overwrite.
 * **Audit (§R10.8):** the backend records who changed what; the UI SAYS that
 * rather than rendering a fake audit trail it cannot read.
 * RBAC: callers gate on `can('content.edit')` (SEC-7).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { personaPaths, type PersonaWireDTO } from '@/entities/persona';
import { queryKeys } from '@/shared/config/query-keys';
import { apiFetch } from '@/shared/lib/api';
import type { AppError } from '@/shared/lib/errors';
import { useToast } from '@/shared/providers';
import type { PersonaUpdateRequestWireDTO } from '@/shared/types';

export interface EditPersonaInput {
  readonly personaId: string;
  readonly channelId: string;
  readonly patch: PersonaUpdateRequestWireDTO;
}

export interface UseEditPersonaApi {
  readonly save: (input: EditPersonaInput) => void;
  readonly isSaving: boolean;
  /** True when the server refused the write because the persona moved on. */
  readonly conflict: boolean;
  readonly archive: (personaId: string, channelId: string) => void;
  readonly isArchiving: boolean;
}

export function useEditPersona(options?: { onSaved?: () => void }): UseEditPersonaApi {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = (personaId: string, channelId: string): void => {
    // Plan §3.2 — exactly two keys, nothing broader.
    void queryClient.invalidateQueries({ queryKey: queryKeys.persona(personaId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.personas(channelId) });
  };

  const saveMutation = useMutation<PersonaWireDTO, AppError, EditPersonaInput>({
    mutationFn: ({ personaId, patch }) =>
      apiFetch<PersonaWireDTO>(personaPaths.update(personaId), {
        method: 'PATCH',
        json: patch,
      }),
    retry: false,
    onSuccess: (_data, { personaId, channelId }) => {
      toast({
        kind: 'success',
        title: 'Persona updated',
        description: 'The change is recorded in the audit log and applies to future generations.',
      });
      invalidate(personaId, channelId);
      options?.onSaved?.();
    },
    onError: (error) => {
      if (error.kind === 'conflict') {
        toast({
          kind: 'danger',
          title: 'This persona changed elsewhere',
          description: 'Reload the persona to see the current voice, then apply your edit again.',
        });
        return;
      }
      toast({ kind: 'danger', title: 'Couldn’t update the persona', description: error.message });
    },
  });

  const archiveMutation = useMutation<
    PersonaWireDTO,
    AppError,
    { personaId: string; channelId: string }
  >({
    mutationFn: ({ personaId }) =>
      apiFetch<PersonaWireDTO>(personaPaths.archive(personaId), { method: 'POST' }),
    retry: false,
    onSuccess: (_data, { personaId, channelId }) => {
      toast({
        kind: 'success',
        title: 'Persona archived',
        description: 'It stays visible as history and stops shaping new generations.',
      });
      invalidate(personaId, channelId);
      options?.onSaved?.();
    },
    onError: (error) => {
      toast({ kind: 'danger', title: 'Couldn’t archive the persona', description: error.message });
    },
  });

  return {
    save: (input) => saveMutation.mutate(input),
    isSaving: saveMutation.isPending,
    conflict: saveMutation.error?.kind === 'conflict',
    archive: (personaId, channelId) => archiveMutation.mutate({ personaId, channelId }),
    isArchiving: archiveMutation.isPending,
  };
}
