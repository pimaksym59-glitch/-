import Link from 'next/link';
import { Compass } from 'lucide-react';
import { EmptyState } from '@/shared/ui/empty-state';

export default function NotFound(): React.ReactElement {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-6 text-primary">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="The page you’re looking for doesn’t exist or has moved."
        action={
          <Link
            href="/dashboard"
            className="inline-flex h-9 items-center rounded-md bg-interactive px-4 text-sm font-medium text-on-accent transition-colors hover:bg-interactive-hover"
          >
            Go to dashboard
          </Link>
        }
      />
    </div>
  );
}
