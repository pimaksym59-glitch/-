import Link from 'next/link';
import { Compass } from 'lucide-react';
import { ROUTES } from '@/shared/config/routes';
import { EmptyState } from '@/shared/ui/empty-state';

export default function NotFound(): React.ReactElement {
  return (
    <section className="mx-auto w-full max-w-[820px] px-6 py-16">
      <EmptyState
        icon={Compass}
        title="We couldn’t find that"
        description="This platform resource doesn’t exist or is no longer available."
        action={
          <Link
            href={ROUTES.health.path}
            className="inline-flex h-9 items-center rounded-md bg-interactive px-4 text-sm font-medium text-on-accent transition-colors hover:bg-interactive-hover"
          >
            Go to Health
          </Link>
        }
      />
    </section>
  );
}
