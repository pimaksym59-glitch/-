'use client';

/**
 * Job (task) inspector view (FS5 T-FS5.9). `?inspect=job:<id>` renders the
 * queue truth for one task: type, StatusBadge (unknown wire statuses stay raw
 * text), attempts, run-at timing and the error class when the worker failed.
 * Read-only — job actions are FS12 (Platform & Admin) scope.
 */
import { useJob } from '@/entities/job';
import { formatDate } from '@/shared/lib/format';
import { StatusBadge } from '@/shared/ui/badge';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';

function Row({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border-subtle py-2 last:border-b-0">
      <dt className="text-[13px] text-secondary">{label}</dt>
      <dd className="text-right text-sm text-primary">{children}</dd>
    </div>
  );
}

export function JobInspector({ id }: { readonly id: string }): React.ReactElement {
  const job = useJob(id);

  if (job.isPending) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton height={20} width="60%" />
        <Skeleton height={140} />
      </div>
    );
  }
  if (job.isError) {
    return (
      <div className="p-4">
        <ErrorState
          scope="section"
          title="Couldn’t load this job"
          onRetry={() => void job.refetch()}
        />
      </div>
    );
  }

  const data = job.data;
  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">Job</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 flex-1 break-all text-sm font-semibold text-primary">{data.id}</h2>
          {data.status ? (
            <StatusBadge status={data.status} />
          ) : (
            <span className="text-xs text-secondary">{data.rawStatus}</span>
          )}
        </div>
      </header>

      <dl>
        <Row label="Type">{data.type}</Row>
        <Row label="Attempts">{data.attempts}</Row>
        <Row label="Run at">
          {data.runAt ? (
            <time dateTime={data.runAt}>{formatDate(data.runAt)}</time>
          ) : (
            <span className="text-secondary">—</span>
          )}
        </Row>
        <Row label="Created">
          <time dateTime={data.createdAt}>{formatDate(data.createdAt)}</time>
        </Row>
      </dl>

      {data.error ? (
        <section aria-labelledby="inspector-job-error">
          <h3
            id="inspector-job-error"
            className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-secondary"
          >
            Error
          </h3>
          <p className="rounded-lg border border-[color:var(--status-danger-fg)] bg-danger-bg p-3 text-[13px] text-primary">
            {data.error}
          </p>
        </section>
      ) : null}
    </div>
  );
}
