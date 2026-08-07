/**
 * Shared segment-level loading + error fallbacks (Stage 2 §5, D2 §16).
 * Skeletons are **shaped like their final content** (list / detail / chart per
 * Stage 3 §5) — never a blocking spinner, never a generic block.
 */
'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';

function Frame({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-8 md:px-8" aria-busy="true">
      <Skeleton width={220} height={32} className="mb-6" />
      {children}
    </section>
  );
}

/** Lists (jobs, logs, audit, channels, prompts…): stacked rows. */
export function ListSkeleton(): React.ReactElement {
  return (
    <Frame>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} height={64} rounded="lg" />
        ))}
      </div>
    </Frame>
  );
}

/** Detail/reader surfaces (knowledge, memory, settings, profile): text lines. */
export function DetailSkeleton(): React.ReactElement {
  return (
    <Frame>
      <div className="flex max-w-[820px] flex-col gap-3">
        <Skeleton height={20} width="90%" />
        <Skeleton height={20} width="75%" />
        <Skeleton height={20} width="82%" />
        <Skeleton height={160} rounded="lg" className="mt-3" />
        <Skeleton height={20} width="68%" className="mt-3" />
      </div>
    </Frame>
  );
}

/** Analytics/billing: metric row + chart axis area (D2 §12). */
export function ChartSkeleton(): React.ReactElement {
  return (
    <Frame>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} height={88} rounded="lg" />
        ))}
      </div>
      <Skeleton height={260} rounded="lg" />
    </Frame>
  );
}

/** Default segment skeleton (dashboard-like composition). */
export function SegmentSkeleton(): React.ReactElement {
  return <ListSkeleton />;
}

export function SegmentError({ reset }: { reset: () => void }): React.ReactElement {
  return (
    <section className="mx-auto w-full max-w-[820px] px-6 py-16">
      <EmptyState
        icon={AlertTriangle}
        title="This section hit a problem"
        description="An unexpected error occurred while rendering this screen. You can retry."
        action={
          <Button variant="secondary" onClick={reset}>
            Try again
          </Button>
        }
      />
    </section>
  );
}
