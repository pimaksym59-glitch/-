'use client';

/**
 * ProfileView (FS13 T-FS13.8 — D3 §24). Header + three tabs, the tab in the URL
 * so every view is a shareable link that Back reverses.
 *
 * The Activity tab (the only one that fetches) arrives through a SINGLE
 * `dynamic()` boundary together with the AI panel — one chunk, one entry in the
 * commons runtime map (the FS12 rule).
 *
 * The header is identity as `/auth/me` reports it. There is no edit affordance
 * anywhere on this screen, because the contract has no self-service account
 * write: D3 §24's "Edit profile" and "change avatar" are absences, and the
 * Account settings panel says so rather than this header implying it with a
 * disabled button.
 */
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/shared/providers';
import { Avatar } from '@/shared/ui/avatar';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabPanel } from '@/shared/ui/tabs';
import { toIdentity } from './identity';

const ActivityPanel = dynamic(
  () => import('./ActivityPanel').then((m) => ({ default: m.ActivityPanel })),
  { ssr: false, loading: () => <Skeleton className="h-40 w-full rounded-xl" /> },
);

const TAB_ITEMS = [
  { value: 'overview', label: 'Overview' },
  { value: 'sessions', label: 'Sessions' },
  { value: 'activity', label: 'Activity' },
];

const TABS = ['overview', 'sessions', 'activity'] as const;
type ProfileTab = (typeof TABS)[number];

function parseTab(value: string | null): ProfileTab {
  return TABS.includes(value as ProfileTab) ? (value as ProfileTab) : 'overview';
}

export function ProfileView({
  sessionsSlot,
}: {
  /** Server-rendered honesty content, passed in so it never enters this bundle. */
  readonly sessionsSlot: React.ReactNode;
}): React.ReactElement {
  const session = useSession();
  const identity = toIdentity(session);
  const router = useRouter();
  const params = useSearchParams();
  const tab = parseTab(params.get('tab'));

  function selectTab(next: string): void {
    const parsed = parseTab(next);
    // A tab is a place: push, so Back returns to the previous tab (§3.5).
    router.push(parsed === 'overview' ? '/profile' : `/profile?tab=${parsed}`);
  }

  return (
    <section className="mx-auto flex w-full max-w-[900px] flex-col gap-6 px-6 py-8 md:px-8">
      <header className="flex items-center gap-4">
        <Avatar name={identity?.displayName ?? '?'} size={64} decorative />
        <div className="min-w-0">
          <h1 className="truncate text-[28px] font-semibold leading-9 tracking-[-0.015em] text-primary">
            {identity?.displayName ?? 'Not signed in'}
          </h1>
          <p className="mt-0.5 truncate text-sm text-secondary">
            {identity ? `${identity.email} · ${identity.role}` : '—'}
          </p>
        </div>
      </header>

      <Tabs label="Profile sections" items={TAB_ITEMS} value={tab} onValueChange={selectTab}>
        <TabPanel value="overview">
          <div className="onyx-raised rounded-xl border border-border-subtle p-5">
            <h2 className="text-sm font-semibold text-primary">Identity</h2>
            <dl className="mt-3 flex flex-col gap-3">
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-[13px] text-secondary">Name shown</dt>
                <dd className="text-[13px] text-primary">{identity?.displayName ?? '—'}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-[13px] text-secondary">Email</dt>
                <dd className="text-[13px] text-primary">{identity?.email ?? '—'}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-[13px] text-secondary">Role</dt>
                <dd className="text-[13px] text-primary">{identity?.role ?? '—'}</dd>
              </div>
            </dl>
            <p className="mt-4 max-w-[72ch] text-[13px] leading-5 text-secondary">
              The user record has no name column, so the name shown falls back to your email
              address, and your initials are drawn from it. Roles are set by an owner and enforced
              by the backend. Nothing here is editable, because the API carries no self-service
              account write —{' '}
              <Link
                className="underline underline-offset-2 hover:text-primary"
                href="/settings/account"
              >
                Account settings
              </Link>{' '}
              explains what would change that.
            </p>
          </div>
        </TabPanel>

        <TabPanel value="sessions">{sessionsSlot}</TabPanel>

        <TabPanel value="activity">
          <ActivityPanel />
        </TabPanel>
      </Tabs>
    </section>
  );
}
