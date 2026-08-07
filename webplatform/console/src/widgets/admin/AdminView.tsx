'use client';

/**
 * AdminView (FS12 T-FS12.5 — D3 §14). Governance on the three call groups the
 * contract carries: users/roles, session revocation and config versions.
 *
 * **RBAC inside a screen, not only around it.** The route opens on
 * `platform.manage` (owner + admin), but the API_SPEC matrix gives
 * *Users/Roles, API keys, Security* to **owner alone** — so the Users & Roles
 * tab renders a permission state for an admin rather than affordances the
 * server would refuse. That is the entry duty "403 renders a permission state,
 * never a crash" applied one level deeper than a route guard (SEC-7).
 *
 * Tabs live in the URL and Back reverses them (plan §3.5). The sessions and
 * config panels are LAZY: neither is needed to paint the screen.
 */
import dynamic from 'next/dynamic';
import { useQueryState } from 'nuqs';
import { useState } from 'react';
import { usePlatformUsers, type PlatformUserVM } from '@/entities/platform-user';
import type { ConfigVersionVM } from '@/entities/config-version';
import { useManageUsers } from '@/features/manage-users';
import { useCan } from '@/shared/providers';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabPanel } from '@/shared/ui/tabs';
import { AdminHonesty } from './AdminHonesty';
import { UsersPanel } from './UsersPanel';

const SessionsPanel = dynamic(() => import('./SessionsPanel').then((m) => m.SessionsPanel), {
  loading: () => <Skeleton height={160} />,
});
const ConfigVersionsPanel = dynamic(
  () => import('./ConfigVersionsPanel').then((m) => m.ConfigVersionsPanel),
  { loading: () => <Skeleton height={200} /> },
);
/** The dialog pulls the Radix Dialog module; keeping it out of the eager shell
 *  is what returns `/admin` under budget (measured at T-FS12.17). */
const CreateUserDialog = dynamic(
  () => import('@/features/manage-users').then((m) => m.CreateUserDialog),
  { loading: () => null },
);

export interface AdminInitial {
  readonly users: readonly PlatformUserVM[] | null;
  readonly configVersions: readonly ConfigVersionVM[] | null;
}

const TABS = [
  { value: 'users', label: 'Users & Roles' },
  { value: 'sessions', label: 'Sessions' },
  { value: 'config', label: 'Config Versions' },
] as const;

export function AdminView({ initial }: { readonly initial: AdminInitial }): React.ReactElement {
  const can = useCan();
  const canManageUsers = can('admin.users.manage');
  const [tab, setTab] = useQueryState('tab', { history: 'push' });
  const active = TABS.some((entry) => entry.value === tab) ? (tab as string) : 'users';

  const usersQuery = usePlatformUsers(initial.users ?? undefined);
  const users = useManageUsers();
  const [creating, setCreating] = useState(false);

  return (
    <section className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-6 py-8 md:px-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.015em] text-primary">
            Admin
          </h1>
          <p className="mt-1 max-w-[72ch] text-sm text-secondary">
            Who can do what, whose sessions are active, and what the configuration used to be. Every
            change here is audited server-side (§R10.8).
          </p>
        </div>
        {canManageUsers && active === 'users' ? (
          <Button variant="primary" onClick={() => setCreating(true)}>
            Create user
          </Button>
        ) : null}
      </header>

      <Tabs
        label="Admin sections"
        items={TABS.map((entry) => ({ value: entry.value, label: entry.label }))}
        value={active}
        onValueChange={(value) => void setTab(value === 'users' ? null : value)}
      >
        <TabPanel value="users">
          {!canManageUsers ? (
            <EmptyState
              title="Your role cannot manage users"
              description="The contract gives user and role management to the owner alone. This is a permission state, not an error — the rest of Admin is still available to you."
            />
          ) : usersQuery.isPending ? (
            <div className="flex flex-col gap-2">
              <Skeleton height={56} />
              <Skeleton height={56} />
            </div>
          ) : usersQuery.isError ? (
            <ErrorState
              title="Couldn’t load users"
              detail="GET /users did not answer."
              onRetry={() => void usersQuery.refetch()}
            />
          ) : (
            <UsersPanel
              users={usersQuery.data ?? []}
              rolePending={users.rolePending}
              revokePending={users.revokePending}
              onSetRole={users.setRole}
              onRevoke={users.revokeSessions}
            />
          )}
        </TabPanel>

        <TabPanel value="sessions">
          <SessionsPanel
            users={usersQuery.data ?? []}
            canManage={canManageUsers}
            revokePending={users.revokePending}
            onRevoke={users.revokeSessions}
          />
        </TabPanel>

        <TabPanel value="config">
          <ConfigVersionsPanel initial={initial.configVersions} />
        </TabPanel>
      </Tabs>

      <AdminHonesty />

      {creating ? (
        <CreateUserDialog
          open
          pending={users.createPending}
          onOpenChange={(open) => {
            if (!open) setCreating(false);
          }}
          onSubmit={(email, role) => users.createUser({ email, role }, () => setCreating(false))}
        />
      ) : null}
    </section>
  );
}
