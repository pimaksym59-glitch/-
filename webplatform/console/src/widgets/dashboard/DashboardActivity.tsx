'use client';

/**
 * Recent activity (D3 §4 — ambient, LAZY per the performance row). Mapped from
 * recent Tasks *(assumed — the contract has no dedicated activity endpoint;
 * FE-RV-8 reconciles)*. Distinct from Audit (FS12).
 */
import { useJobs, type JobVM } from '@/entities/job';
import { useInspector } from '@/shared/hooks';
import { formatRelativeTime } from '@/shared/lib/format';
import { ActivityFeed } from '@/shared/ui/activity-feed';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';

const TYPE_ICON: Record<string, string> = {
  publish: 'send',
  generate_text: 'sparkles',
  generate_image: 'image',
  validate: 'badge-check',
};

const TYPE_LABEL: Record<string, string> = {
  publish: 'ran a publish job for',
  generate_text: 'generated a draft for',
  generate_image: 'generated an image for',
  validate: 'validated content for',
};

export function DashboardActivity({
  channelId,
  channelName,
  initial,
}: {
  readonly channelId: string;
  readonly channelName: string;
  readonly initial: readonly JobVM[] | null;
}): React.ReactElement {
  const jobs = useJobs(channelId, initial ?? undefined);
  const { inspect } = useInspector();

  if (jobs.isPending) return <Skeleton height={160} />;
  if (jobs.isError) {
    return (
      <ErrorState
        scope="section"
        title="Couldn’t load activity"
        onRetry={() => void jobs.refetch()}
      />
    );
  }

  const recent = jobs.data
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6);

  if (recent.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border-default p-4 text-sm text-secondary">
        No activity yet for this channel.
      </p>
    );
  }

  return (
    <ActivityFeed
      label="Recent activity"
      events={recent.map((job) => ({
        id: job.id,
        actor: 'Worker',
        action: TYPE_LABEL[job.type] ?? `ran ${job.type} for`,
        entity: channelName,
        icon: TYPE_ICON[job.type] ?? 'activity',
        dateTime: job.createdAt,
        timeLabel: formatRelativeTime(job.createdAt),
        onOpenEntity: () => inspect({ type: 'job', id: job.id }),
      }))}
    />
  );
}
