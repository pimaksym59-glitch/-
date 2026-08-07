'use client';

/**
 * UserInspector (FS12) — one account, read from the roster already in cache
 * where possible. There is **no `GET /users/{id}`** in the contract, so this
 * view resolves from the list rather than inventing a detail call
 * (plan §5.2 D7). Secrets are structurally absent: the VM has no field for
 * `password_hash` or `mfa_secret_ref`.
 */
import { usePlatformUsers, ROLE_LABELS } from '@/entities/platform-user';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';

export function UserInspector({ id }: { readonly id: string }): React.ReactElement {
  const query = usePlatformUsers();

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton height={20} width="70%" />
        <Skeleton height={100} />
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="p-4">
        <ErrorState
          title="Couldn’t load users"
          detail="GET /users did not answer."
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }

  const user = (query.data ?? []).find((entry) => entry.id === id) ?? null;
  if (!user) {
    return (
      <div className="p-4">
        <p className="text-sm text-primary">This account is not in the loaded roster.</p>
        <p className="mt-2 text-[13px] text-secondary">
          The contract has no per-user endpoint, so there is nothing else to fetch for it.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <h2 className="text-sm font-semibold text-primary">{user.email}</h2>
        <p className="break-all font-mono text-[11px] text-secondary">{user.id}</p>
      </header>
      <dl className="flex flex-col gap-2 text-[13px]">
        <div className="flex justify-between gap-4">
          <dt className="text-secondary">Role</dt>
          <dd className="text-primary">
            {user.role ? ROLE_LABELS[user.role] : `${user.rawRole} (unrecognised)`}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-secondary">Status</dt>
          <dd className="text-primary">{user.status ?? 'not reported'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-secondary">Created</dt>
          <dd className="text-primary">{user.createdAt ?? 'not reported'}</dd>
        </div>
      </dl>
      <p className="text-[13px] text-secondary">
        Sessions cannot be listed — the contract exposes revocation only. Credentials and MFA
        secrets are never returned by the API and never rendered here (§R10.4).
      </p>
    </div>
  );
}
