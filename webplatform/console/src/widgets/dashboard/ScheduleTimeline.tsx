'use client';

/**
 * Upcoming schedule (D3 §4) — queued publish slots rendered on the ONYX
 * Timeline. Read-only here; schedule editing is FS12.
 */
import { selectUpcomingPublish, useJobs, type JobVM } from '@/entities/job';
import { formatDate } from '@/shared/lib/format';
import { STATUS } from '@/shared/types/status';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { Timeline } from '@/shared/ui/timeline';

export function ScheduleTimeline({
  channelId,
  initial,
}: {
  readonly channelId: string;
  readonly initial: readonly JobVM[] | null;
}): React.ReactElement {
  const jobs = useJobs(channelId, initial ?? undefined);

  if (jobs.isPending) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton height={20} width="40%" />
        <Skeleton height={64} />
      </div>
    );
  }
  if (jobs.isError) {
    return (
      <ErrorState
        scope="section"
        title="Couldn’t load the schedule"
        onRetry={() => void jobs.refetch()}
      />
    );
  }

  const upcoming = selectUpcomingPublish(jobs.data);
  if (upcoming.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border-default p-4 text-sm text-secondary">
        No upcoming slots. Scheduled publishes will appear here.
      </p>
    );
  }

  return (
    <Timeline
      label="Upcoming schedule"
      items={upcoming.map((job) => ({
        id: job.id,
        status: STATUS.scheduled,
        title: 'Scheduled publish',
        dateTime: job.runAt ?? job.createdAt,
        timeLabel: formatDate(job.runAt ?? job.createdAt),
        badge: true,
      }))}
    />
  );
}
