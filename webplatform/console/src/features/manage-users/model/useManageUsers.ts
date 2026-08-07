'use client';

/**
 * User governance (FS12 T-FS12.6 — the frozen §Users calls):
 *   create        = `POST /users`                    → 201 with the created row
 *   set role      = `PATCH /users/{id}` `{role}`      → 200
 *   revoke        = `POST /auth/sessions/revoke` `{user_id}` → 204
 *
 * Three deliberate absences, each a contract fact rather than a preference:
 *  - **Create, not invite.** The contract has no invitation or email flow, so
 *    nothing here claims one was sent (plan §5.2 D7).
 *  - **No deactivate.** The `users` table has a `status` column but the
 *    contract documents no write for it (FE-RV-15); the affordance does not
 *    exist until the wire proves it.
 *  - **No optimistic role change.** D3 §14 suggests one ("optimistic role
 *    change reconciles"); a role is a governance artifact (§R10.5/§R11.4
 *    discipline), so every write here is CONFIRMED and the UI shows the
 *    server's answer, never a hopeful one.
 *
 * RBAC: callers gate on `can('admin.users.manage')` — owner only, per the
 * API_SPEC matrix row *«Users/Roles, API keys, Security»* (plan §5.2 D11).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { platformUserKeys, platformUserPaths } from '@/entities/platform-user';
import { apiFetch } from '@/shared/lib/api';
import type { AppError } from '@/shared/lib/errors';
import { useToast } from '@/shared/providers';
import type {
  PlatformUserCreateRequestWireDTO,
  PlatformUserRoleRequestWireDTO,
  PlatformUserWireDTO,
  RevokeSessionsRequestWireDTO,
} from '@/shared/types';

export interface UseManageUsersApi {
  readonly createUser: (input: PlatformUserCreateRequestWireDTO, onDone?: () => void) => void;
  readonly createPending: boolean;
  readonly createError: AppError | null;
  readonly setRole: (userId: string, role: string) => void;
  readonly rolePending: string | null;
  readonly revokeSessions: (userId: string) => void;
  readonly revokePending: string | null;
}

export function useManageUsers(): UseManageUsersApi {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidateUsers = (): void => {
    void queryClient.invalidateQueries({ queryKey: platformUserKeys.list() });
  };

  const createMutation = useMutation<
    PlatformUserWireDTO,
    AppError,
    { input: PlatformUserCreateRequestWireDTO; onDone?: () => void }
  >({
    mutationFn: ({ input }) =>
      apiFetch<PlatformUserWireDTO>(platformUserPaths.create(), {
        method: 'POST',
        json: input,
      }),
    retry: false,
    onSuccess: (created, { onDone }) => {
      // 201 truth: the account exists now. No "invitation sent" wording,
      // because the contract sends nothing.
      toast({
        kind: 'success',
        title: 'User created',
        description: `${created.email} was created with the ${created.role} role.`,
      });
      invalidateUsers();
      onDone?.();
    },
    onError: (error) => {
      toast({ kind: 'danger', title: 'Could not create the user', description: error.message });
    },
  });

  const roleMutation = useMutation<PlatformUserWireDTO, AppError, { userId: string; role: string }>(
    {
      mutationFn: ({ userId, role }) =>
        apiFetch<PlatformUserWireDTO>(platformUserPaths.role(userId), {
          method: 'PATCH',
          json: { role } satisfies PlatformUserRoleRequestWireDTO,
        }),
      retry: false,
      onSuccess: (_user, { userId, role }) => {
        toast({
          kind: 'success',
          title: 'Role updated',
          description: `The backend recorded the change to ${role}. It is audited server-side (§R10.8).`,
        });
        void queryClient.invalidateQueries({ queryKey: platformUserKeys.detail(userId) });
        invalidateUsers();
      },
      onError: (error) => {
        toast({ kind: 'danger', title: 'Could not change the role', description: error.message });
      },
    },
  );

  const revokeMutation = useMutation<unknown, AppError, { userId: string }>({
    mutationFn: ({ userId }) =>
      apiFetch(platformUserPaths.revokeSessions(), {
        method: 'POST',
        json: { user_id: userId } satisfies RevokeSessionsRequestWireDTO,
      }),
    retry: false,
    onSuccess: () => {
      toast({
        kind: 'success',
        title: 'Sessions revoked',
        description:
          'The backend ended this user’s sessions (§R10.4). The console cannot list sessions — the contract exposes no inventory.',
      });
      // Nothing to invalidate: there is no session query to refresh (D6).
    },
    onError: (error) => {
      toast({ kind: 'danger', title: 'Could not revoke sessions', description: error.message });
    },
  });

  return {
    createUser: (input, onDone) => createMutation.mutate(onDone ? { input, onDone } : { input }),
    createPending: createMutation.isPending,
    createError: createMutation.error,
    setRole: (userId, role) => roleMutation.mutate({ userId, role }),
    rolePending: roleMutation.isPending ? (roleMutation.variables?.userId ?? null) : null,
    revokeSessions: (userId) => revokeMutation.mutate({ userId }),
    revokePending: revokeMutation.isPending ? (revokeMutation.variables?.userId ?? null) : null,
  };
}
