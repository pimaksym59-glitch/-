import type { Metadata } from 'next';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { ROUTES } from '@/shared/config/routes';
import { EmptyState } from '@/shared/ui/empty-state';

export const metadata: Metadata = { title: 'No access', robots: { index: false } };

/**
 * Permission state (D4 §8 / §F7.2). A forbidden route renders **this**, never a
 * crash and never a blank screen. The middleware rewrites here so the original
 * URL is preserved and the user can be granted access without re-navigating.
 */
export default async function ForbiddenPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}): Promise<React.ReactElement> {
  const { from } = await searchParams;

  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-6 text-primary">
      <EmptyState
        icon={Lock}
        title="You don’t have access to this screen"
        description={
          from
            ? `Your role can’t open ${from}. Ask an owner or admin to grant the permission.`
            : 'Your role can’t open this screen. Ask an owner or admin to grant the permission.'
        }
        action={
          <Link
            href={ROUTES.dashboard.path}
            className="inline-flex h-9 items-center rounded-md bg-interactive px-4 text-sm font-medium text-on-accent transition-colors hover:bg-interactive-hover"
          >
            Back to dashboard
          </Link>
        }
        secondary="Access is enforced by the server; the interface only reflects it."
      />
    </div>
  );
}
