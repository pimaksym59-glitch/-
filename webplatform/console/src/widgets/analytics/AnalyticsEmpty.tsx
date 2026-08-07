'use client';

/**
 * Analytics empty state (FS11 T-FS11.5 — D2 §15's four parts: what lives here ·
 * what to do first · a primary CTA · a way in).
 *
 * This is the NO-CHANNEL case, not the no-data case: a range with no rows is a
 * per-panel empty (PanelFrame), because "this range is quiet" and "you have no
 * channels" are different truths and must not share copy.
 */
import { ChartLine } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';

export function AnalyticsEmpty(): React.ReactElement {
  const router = useRouter();
  return (
    <EmptyState
      icon={ChartLine}
      title="Analytics start with a channel"
      description="Cost, quality and publishing volume are measured per channel. Create one and its numbers appear here as the pipeline runs — engagement stays gated until a stats adapter exists."
      action={<Button onClick={() => router.push('/channels')}>Create a channel</Button>}
      secondary={
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="text-sm text-secondary underline-offset-4 hover:underline"
        >
          Back to the dashboard
        </button>
      }
    />
  );
}
