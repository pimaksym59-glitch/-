/**
 * RegisterNotice (FS4). The frozen contract has NO `/auth/register` — accounts
 * are provisioned by an owner/admin (`POST /users`, FS12). This screen states
 * that honestly (§R10.3 spirit) instead of faking a signup flow. Self-serve
 * registration would be a backend MAJOR — flagged in the FS4 plan, not
 * invented here.
 */
import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import { EmptyState } from '@/shared/ui/empty-state';

export function RegisterNotice(): React.ReactElement {
  return (
    <main id="main-content" className="onyx-raised w-[min(440px,92vw)] rounded-2xl p-8">
      <EmptyState
        icon={UserPlus}
        title="Access is by invitation"
        description="Console accounts are created by your workspace owner or admin. Ask them for an invitation, then sign in with the credentials you receive."
        action={
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-md bg-interactive px-5 text-sm font-medium text-on-accent transition-[background-color] duration-[120ms] hover:bg-interactive-hover"
          >
            Go to sign in
          </Link>
        }
        className="py-4"
      />
    </main>
  );
}
