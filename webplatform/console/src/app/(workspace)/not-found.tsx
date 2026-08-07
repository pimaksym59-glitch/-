import Link from 'next/link';
import { Compass } from 'lucide-react';
import { ROUTES } from '@/shared/config/routes';
import { EmptyState } from '@/shared/ui/empty-state';

/** Segment-scoped not-found — keeps the shell and navigation intact (D2 §16). */
export default function NotFound(): React.ReactElement {
  return (
    <section className="mx-auto w-full max-w-[820px] px-6 py-16">
      <EmptyState
        icon={Compass}
        title="We couldn’t find that"
        description="The item you’re looking for doesn’t exist, moved, or isn’t part of this channel."
        action={
          <Link
            href={ROUTES.dashboard.path}
            className="inline-flex h-9 items-center rounded-md bg-interactive px-4 text-sm font-medium text-on-accent transition-colors hover:bg-interactive-hover"
          >
            Back to dashboard
          </Link>
        }
      />
    </section>
  );
}
