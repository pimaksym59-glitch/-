'use client';

/**
 * Dashboard onboarding empty state (D2 §15 / D3 §4): no channels yet → the
 * guided "Create your first channel" hero. Four-part EmptyState structure.
 */
import { useRouter } from 'next/navigation';
import { Radio } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';

export function DashboardEmpty(): React.ReactElement {
  const router = useRouter();
  return (
    <EmptyState
      icon={Radio}
      title="Create your first channel"
      description="A channel publishes autonomously once configured: it drafts, validates, illustrates and posts on schedule — and remembers its own voice."
      action={<Button onClick={() => router.push('/channels')}>Create your first channel</Button>}
      secondary="You can explore the rest of the console meanwhile — everything scopes to a channel."
      className="py-24"
    />
  );
}
