'use client';

/**
 * TaskInspector (FS12) — the ADMIN projection of a task: the record plus the
 * intents the contract allows, plus the stage's one AI surface.
 *
 * **Why a second inspector type for the same resource.** FS5's `JobInspector`
 * is imported STATICALLY by `Inspector.tsx`, which sits in shell commons — so
 * its module is already in every route's First Load. Adding an RBAC branch and
 * three mutations to it would put all of that in commons too, taxing all 31
 * routes. Registering `task` as a separate LAZY row keeps the FS5 row
 * byte-identical and costs the other 30 routes nothing: the same
 * `analytics`/`analytics-report` reasoning applied to the Inspector registry
 * (plan §3.5/§3.6).
 */
import dynamic from 'next/dynamic';
import { useQueueTask } from '@/entities/job-queue';
import { QueueIntentActions } from '@/features/requeue-job';
import { useAccountPreferences } from '@/features/change-settings';
import { useCan } from '@/shared/providers';
import { StatusBadge } from '@/shared/ui/badge';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';

/** The AI panel is lazy inside a lazy row — it is never needed to read a task. */
const ExplainJobPanel = dynamic(
  () => import('@/features/explain-job').then((m) => m.ExplainJobPanel),
  { loading: () => null },
);

export function TaskInspector({ id }: { readonly id: string }): React.ReactElement {
  const can = useCan();
  const query = useQueueTask(id);
  // FS14 T-FS14.12 (D3 A2, plan §5.2 D10): progressive disclosure reaches a
  // second screen. Beginner sees the projection; Advanced and Power also see
  // the RAW record the console already holds — nothing is fetched for this and
  // nothing is invented, so the tier reveals fact rather than decoration
  // (the FS13 rule that a control which changes nothing must not ship).
  const { preferences } = useAccountPreferences();
  const showRaw = preferences.experience !== 'beginner';

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton height={20} width="70%" />
        <Skeleton height={120} />
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div className="p-4">
        <ErrorState
          title="Couldn’t load this task"
          detail={`GET /tasks/${id} did not answer.`}
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }

  const task = query.data;

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {task.status ? (
            <StatusBadge status={task.status} />
          ) : (
            <span className="inline-flex items-center rounded-full border border-border-default px-2 py-0.5 text-[11px] font-medium text-secondary">
              {task.rawStatusLabel}
            </span>
          )}
          <h2 className="text-sm font-semibold text-primary">{task.type}</h2>
        </div>
        <p className="break-all font-mono text-[11px] text-secondary">{task.id}</p>
      </header>

      <dl className="flex flex-col gap-2 text-[13px]">
        <div className="flex justify-between gap-4">
          <dt className="text-secondary">Wire status</dt>
          <dd className="font-mono text-primary">{task.rawStatus}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-secondary">Attempts</dt>
          <dd className="tabular-nums text-primary">{task.attempts}</dd>
        </div>
        {task.priority !== null ? (
          <div className="flex justify-between gap-4">
            <dt className="text-secondary">Priority</dt>
            <dd className="tabular-nums text-primary">{task.priority}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <dt className="text-secondary">Runs at</dt>
          <dd className="text-primary">{task.runAt ?? 'not scheduled'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-secondary">Channel</dt>
          <dd className="text-primary">{task.channelId ?? 'platform-wide'}</dd>
        </div>
      </dl>

      {task.error ? (
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
            Recorded error
          </h3>
          <p className="mt-1 whitespace-pre-wrap break-words text-[13px] text-primary">
            {task.error}
          </p>
        </section>
      ) : null}

      {showRaw ? (
        <section aria-labelledby="task-raw-heading">
          <h3
            id="task-raw-heading"
            className="text-[11px] font-semibold uppercase tracking-wider text-secondary"
          >
            Raw record
          </h3>
          <p className="mt-1 text-[12px] text-secondary">
            Shown because your experience level is {preferences.experience}. This is the mapped
            record the console holds — no extra request was made for it.
          </p>
          <pre className="mt-2 overflow-x-auto rounded-md bg-surface-inset p-3 font-mono text-[11px] leading-5 text-primary">
            {JSON.stringify(task, null, 2)}
          </pre>
        </section>
      ) : null}

      {can('platform.manage') ? (
        <QueueIntentActions task={task} />
      ) : (
        <p className="text-[13px] text-secondary">
          Your role can read the queue but not act on it — the contract reserves cancel, run and
          requeue for owner and admin.
        </p>
      )}

      {can('content.edit') ? <ExplainJobPanel task={task} /> : null}
    </div>
  );
}
