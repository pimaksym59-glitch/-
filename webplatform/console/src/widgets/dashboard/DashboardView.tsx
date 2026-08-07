'use client';

/**
 * DashboardView (FS5 T-FS5.8 — D3 §4 composition). Attention-needed first
 * (Needs Review), then plan (schedule), then health/cost, then ambient
 * activity. Channel-scoped through the UI store; RSC initial data seeds the
 * queries (initialData → SWR revalidation). RBAC: review actions only with
 * `content.publish`; analyst/viewer read the same page read-only.
 */
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import type { ChannelVM } from '@/entities/channel';
import { useChannels } from '@/entities/channel';
import { useUiStore, selectActiveChannel } from '@/shared/lib/store';
import { useSession } from '@/shared/providers';
import { AIActionButton } from '@/shared/ui/ai';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { DashboardEmpty } from './DashboardEmpty';
import { MetricTiles, type MetricTilesInitial } from './MetricTiles';
import { NeedsReviewQueue } from './NeedsReviewQueue';
import { ScheduleTimeline } from './ScheduleTimeline';

/** Ambient feed is lazy per D3 §4's performance row. */
const DashboardActivity = dynamic(
  () => import('./DashboardActivity').then((m) => m.DashboardActivity),
  { loading: () => <Skeleton height={160} /> },
);

/** The AI summary card is lazy too — its streaming surface must not weigh on
 * the dashboard's First Load (owner's FS6 condition 6). */
const DashboardSummary = dynamic(
  () => import('./DashboardSummary').then((m) => m.DashboardSummary),
  { loading: () => <Skeleton height={96} /> },
);

export interface DashboardInitial extends MetricTilesInitial {
  /** null = the server-side channels fetch failed → the client island refetches. */
  readonly channels: readonly ChannelVM[] | null;
  /**
   * The channel the server-side scoped data was fetched FOR. Channel-scoped
   * initialData must never seed another channel's query keys (a switch would
   * show the wrong channel's numbers until staleTime expires).
   */
  readonly forChannelId: string | null;
}

export function DashboardView({
  initial,
}: {
  readonly initial: DashboardInitial;
}): React.ReactElement {
  const session = useSession();
  const router = useRouter();
  const channels = useChannels(initial.channels ?? undefined);
  const activeChannelId = useUiStore(selectActiveChannel);
  const setActiveChannel = useUiStore((state) => state.setActiveChannel);
  const queueRef = useRef<HTMLDivElement | null>(null);

  const list = channels.data ?? [];
  const active: ChannelVM | null =
    list.find((channel) => channel.id === activeChannelId) ?? list[0] ?? null;

  // Cookie had no channel yet → adopt the first one so scoping is stable.
  useEffect(() => {
    if (!activeChannelId && active) setActiveChannel(active.id);
  }, [activeChannelId, active, setActiveChannel]);

  // Channels are the page backbone: pending/error here are page-level and
  // honest — the onboarding hero renders ONLY for a confirmed empty list.
  if (channels.isPending) {
    return <Skeleton height={240} />;
  }
  if (channels.isError) {
    return (
      <ErrorState
        scope="page"
        title="Couldn’t load your channels"
        onRetry={() => void channels.refetch()}
      />
    );
  }
  if (list.length === 0) {
    return <DashboardEmpty />;
  }
  if (!active) {
    return <Skeleton height={240} />;
  }

  // Channel-scoped seeds apply ONLY to the channel the server fetched for;
  // cost-by-day is channel-independent and stays seeded.
  const seeded = initial.forChannelId === active.id;
  const scoped: MetricTilesInitial = seeded
    ? initial
    : { analytics: null, costs: initial.costs, jobs: null, needsReview: null };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary">
            {session ? `Good day, ${session.displayName.split(' ')[0] ?? ''}` : 'Dashboard'}
          </h1>
          <p className="mt-1 text-sm text-secondary">
            {active.name} · what’s happening and what needs you.
          </p>
        </div>
        <AIActionButton onClick={() => router.push('/chat')}>Compose</AIActionButton>
      </header>

      <MetricTiles
        channelId={active.id}
        initial={scoped}
        onDrillNeedsReview={() => {
          queueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          queueRef.current?.querySelector<HTMLButtonElement>('button[data-row-index="0"]')?.focus();
        }}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section ref={queueRef} aria-labelledby="dash-review">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 id="dash-review" className="text-sm font-semibold text-primary">
              Needs review
            </h2>
            {/* FS14 T-FS14.3 (D3 Part C #1): approving a post is a QUEUE INTENT
                — the worker does the rest — and before this the chain ended
                here, with a toast naming a task id and nowhere to see it.
                It reuses the router this view already holds: importing
                `next/link` for it measured `/dashboard` 168 → 172 kB, and a
                control build with only that import removed returned the route
                to 168 (FS14_REPORT §4). */}
            <button
              type="button"
              onClick={() => router.push('/jobs')}
              className="text-[13px] text-secondary underline-offset-4 hover:text-primary hover:underline"
            >
              Queued work in Jobs
            </button>
          </div>
          <NeedsReviewQueue channelId={active.id} initial={scoped.needsReview} />
        </section>
        <section aria-labelledby="dash-schedule">
          <h2 id="dash-schedule" className="mb-3 text-sm font-semibold text-primary">
            Upcoming schedule
          </h2>
          <ScheduleTimeline channelId={active.id} initial={scoped.jobs} />
        </section>
      </div>

      {/* FS6: the REAL user-invoked AI summary (replaces the FS5 honest seam). */}
      <DashboardSummary channelId={active.id} channelName={active.name} />

      <section aria-labelledby="dash-activity">
        <h2 id="dash-activity" className="mb-3 text-sm font-semibold text-primary">
          Recent activity
        </h2>
        <DashboardActivity channelId={active.id} channelName={active.name} initial={scoped.jobs} />
      </section>
    </div>
  );
}
