'use client';

/**
 * UsersPanel (FS12) — the roster and the one write the contract documents for
 * it, a role change.
 *
 * Two honesty details worth stating:
 *  - an **unrecognised role renders raw** (the `parseStatus` discipline applied
 *    to the role enum) and cannot be edited through the role picker, because
 *    the console does not know what it means;
 *  - there is **no deactivate button**: the `users` table has a `status` column
 *    but the contract documents no write for it (FE-RV-15), and an affordance
 *    that might silently do nothing is worse than none.
 *
 * The role change is confirmed, never optimistic — the list re-reads and shows
 * what the server recorded (plan §5.2 D7).
 */
import { ROLES } from '@/shared/config/rbac';
import { ROLE_LABELS, countOwners, type PlatformUserVM } from '@/entities/platform-user';
import { Button } from '@/shared/ui/button';
import { Select } from '@/shared/ui/select';

export function UsersPanel({
  users,
  rolePending,
  revokePending,
  onSetRole,
  onRevoke,
}: {
  readonly users: readonly PlatformUserVM[];
  readonly rolePending: string | null;
  readonly revokePending: string | null;
  readonly onSetRole: (userId: string, role: string) => void;
  readonly onRevoke: (userId: string) => void;
}): React.ReactElement {
  const owners = countOwners(users);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-secondary">
        {String(users.length)} {users.length === 1 ? 'account' : 'accounts'} · {String(owners)}{' '}
        {owners === 1 ? 'owner' : 'owners'}. Roles are enforced by the backend; this list reflects
        them.
      </p>

      <ul aria-label="Users" className="flex flex-col gap-2">
        {users.map((user) => (
          <li
            key={user.id}
            className="onyx-raised flex flex-wrap items-center gap-3 rounded-xl border border-border-subtle p-4"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-medium text-primary">{user.email}</span>
              <span className="text-[13px] text-secondary">
                <span className="font-mono">{user.id}</span>
                {user.status ? ` · ${user.status}` : ''}
                {user.createdAt ? ` · created ${user.createdAt}` : ''}
              </span>
            </div>

            {user.role === null ? (
              <span className="rounded-full border border-border-default px-2 py-0.5 text-[11px] text-secondary">
                {user.rawRole} — unrecognised role
              </span>
            ) : (
              <div className="w-[11rem] shrink-0">
                <Select
                  label={`Role for ${user.email}`}
                  hideLabel
                  items={ROLES.map((value) => ({ value, label: ROLE_LABELS[value] }))}
                  value={user.role}
                  disabled={rolePending === user.id}
                  onValueChange={(value) => {
                    if (value !== user.role) onSetRole(user.id, value);
                  }}
                />
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              disabled={revokePending === user.id}
              onClick={() => onRevoke(user.id)}
            >
              Revoke sessions
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
