'use client';

/**
 * Dashboard metric tiles (D3 §4). Each tile family is backed by its OWN query,
 * so one failing metric never breaks the page — the failing family renders a
 * section-scope ErrorState, the rest keep working. The engagement tile is the
 * §R10.3 showcase: gated ⇒ the honest D2 §15 gated copy, never zeros.
 */
import { useAnalytics, useCost, type AnalyticsVM, type CostPointVM } from '@/entities/analytics';
import { useJobs, selectUpcomingPublish, type JobVM } from '@/entities/job';
import { useNeedsReview, type PostVM } from '@/entities/post';
import { formatCost, formatNumber } from '@/shared/lib/format';
import { ErrorState } from '@/shared/ui/error-state';
import { MetricCard } from '@/shared/ui/metric-card';
import { Sparkline } from '@/shared/ui/chart/lazy';

export interface MetricTilesInitial {
  readonly analytics: AnalyticsVM | null;
  readonly costs: readonly CostPointVM[] | null;
  readonly jobs: readonly JobVM[] | null;
  readonly needsReview: readonly PostVM[] | null;
}

export function MetricTiles({
  channelId,
  initial,
  onDrillNeedsReview,
}: {
  readonly channelId: string;
  readonly initial: MetricTilesInitial;
  readonly onDrillNeedsReview: () => void;
}): React.ReactElement {
  const analytics = useAnalytics(channelId, initial.analytics ?? undefined);
  const costs = useCost(initial.costs ?? undefined);
  const jobs = useJobs(channelId, initial.jobs ?? undefined);
  const needsReview = useNeedsReview(channelId, initial.needsReview ?? undefined);

  const scheduledCount = jobs.data ? selectUpcomingPublish(jobs.data).length : null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {analytics.isError ? (
        <div className="sm:col-span-2">
          <ErrorState
            scope="section"
            title="Couldn’t load today’s metrics"
            onRetry={() => void analytics.refetch()}
          />
        </div>
      ) : (
        <>
          <MetricCard
            label="Cost today"
            value={analytics.data ? formatCost(analytics.data.costToday.value ?? 0) : '—'}
            loading={analytics.isPending}
            source="Cost API"
            sparkline={
              costs.data ? (
                <Sparkline values={costs.data.map((point) => point.amountUsd)} />
              ) : undefined
            }
          />
          <MetricCard
            label="Published today"
            value={analytics.data ? formatNumber(analytics.data.publishedToday.value ?? 0) : '—'}
            loading={analytics.isPending}
          />
        </>
      )}

      {jobs.isError ? (
        <ErrorState
          scope="section"
          title="Couldn’t load the schedule"
          onRetry={() => void jobs.refetch()}
        />
      ) : (
        <MetricCard
          label="Scheduled"
          value={scheduledCount === null ? '—' : formatNumber(scheduledCount)}
          loading={jobs.isPending}
        />
      )}

      {needsReview.isError ? (
        <ErrorState
          scope="section"
          title="Couldn’t load the review queue"
          onRetry={() => void needsReview.refetch()}
        />
      ) : (
        <MetricCard
          label="Needs Review"
          value={needsReview.data ? formatNumber(needsReview.data.length) : '—'}
          loading={needsReview.isPending}
          onDrill={onDrillNeedsReview}
        />
      )}

      {/* Engagement — the honest gated tile (§R10.3 / D2 §15 canonical copy). */}
      <div className="sm:col-span-2 xl:col-span-4">
        {analytics.data?.views.gated ? (
          <div
            data-testid="gated-engagement"
            className="rounded-xl border border-dashed border-border-default p-4"
          >
            <p className="text-[13px] font-medium text-secondary">Engagement</p>
            <p className="mt-1 text-sm text-primary">
              Engagement metrics need a stats adapter. Cost, quality, system and diversity are
              available now.
            </p>
          </div>
        ) : analytics.data ? (
          <MetricCard
            label="Views today"
            value={formatNumber(analytics.data.views.value ?? 0)}
            loading={analytics.isPending}
          />
        ) : null}
      </div>
    </div>
  );
}
