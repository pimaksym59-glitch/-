'use client';

/**
 * JobsView (FS12 T-FS12.8 — D3 §17). The Task Monitor on the frozen
 * §Scheduler & Tasks calls: the queue as the backend reports it, filtered by
 * the contract's OWN parameters, with the three intents it carries.
 *
 * Honesty carried by this screen:
 *  - the contract's `task_status` has eight values and D2 §11 names five of
 *    them exactly; `deferred`, `cancelled` and `dead` render as **explicit raw
 *    labels**, never squeezed into "Failed" (plan §5.2 D14, owner-ruled);
 *  - every intent is a **202 queue intent** worded "queued", never "done";
 *  - there is **no live tail and no polling** — the contract exposes no task
 *    stream, so the view is SWR-cached and stamps when it last read.
 *
 * `?status=`, `?type=` and `?channel_id=` are the contract's own filters living
 * in the URL, so the view is a shareable link Back reverses (plan §3.5).
 *
 * The honest-absence block is NOT rendered here: it is static markup with no
 * interactivity, so the RSC page renders it on the server and it never enters
 * this route's client bundle. That move is what returned `/jobs` under the
 * 180 kB budget (measured at T-FS12.17) — structural, never a threshold.
 * Tables are built from ONYX primitives rather than the DataTable component:
 * T-FS12.1 measured that becoming TanStack Table's first consumer moves a
 * protected route, so the plan's structural fallback was executed.
 */
import { useQueryState } from 'nuqs';
import { useEffect, useRef } from 'react';
import {
  countAttention,
  useQueueTasks,
  TASK_STATUSES,
  TASK_TYPES,
  type QueueTaskVM,
} from '@/entities/job-queue';
import { isTextEntryTarget } from '@/shared/config/shortcuts';
import { useInspector } from '@/shared/hooks';
import { useCan } from '@/shared/providers';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorState } from '@/shared/ui/error-state';
import { Select } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { TaskList } from './TaskList';

export interface JobsInitial {
  /** null = the server-side fetch failed → the client island refetches. */
  readonly tasks: readonly QueueTaskVM[] | null;
}

const ANY = 'all';

export function JobsView({ initial }: { readonly initial: JobsInitial }): React.ReactElement {
  const can = useCan();
  const canManage = can('platform.manage');
  const { inspect } = useInspector();

  // The contract's own filters. Data-changing keys PUSH so Back reverses them
  // (the FS8 `?scope=` lesson, restated as FS11's rule).
  const [status, setStatus] = useQueryState('status', { history: 'push' });
  const [type, setType] = useQueryState('type', { history: 'push' });
  const [channelId, setChannelId] = useQueryState('channel_id', { history: 'push' });

  const query = useQueueTasks(status, type, channelId, initial.tasks ?? undefined);
  const listRef = useRef<HTMLUListElement | null>(null);

  // `f` focuses the filter (D3 §17). `j/k/↵` live on the list itself.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTextEntryTarget(event.target)) return;
      if (event.key === 'f') {
        event.preventDefault();
        document.querySelector<HTMLElement>('[data-jobs-filter] button')?.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const tasks = query.data ?? [];
  const attention = countAttention(tasks);

  return (
    <section className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-6 py-8 md:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.015em] text-primary">
          Jobs
        </h1>
        <p className="max-w-[72ch] text-sm text-secondary">
          The queue every manual action shares (§R10.1).{' '}
          {attention > 0
            ? `${String(attention)} ${attention === 1 ? 'task needs' : 'tasks need'} attention.`
            : 'Nothing is asking for attention right now.'}
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3" data-jobs-filter>
        <Select
          label="Status"
          items={[
            { value: ANY, label: 'Any status' },
            ...TASK_STATUSES.map((value) => ({ value, label: value })),
          ]}
          value={status ?? ANY}
          onValueChange={(value) => void setStatus(value === ANY ? null : value)}
        />
        <Select
          label="Type"
          items={[
            { value: ANY, label: 'Any type' },
            ...TASK_TYPES.map((value) => ({ value, label: value })),
          ]}
          value={type ?? ANY}
          onValueChange={(value) => void setType(value === ANY ? null : value)}
        />
        <Select
          label="Channel"
          items={[
            { value: ANY, label: 'All channels' },
            { value: 'ch_tech', label: 'ch_tech' },
            { value: 'ch_daily', label: 'ch_daily' },
            { value: 'ch_art', label: 'ch_art' },
          ]}
          value={channelId ?? ANY}
          onValueChange={(value) => void setChannelId(value === ANY ? null : value)}
          helper="The contract's own ?channel_id= filter."
        />
      </div>

      {query.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton height={44} />
          <Skeleton height={44} />
          <Skeleton height={44} />
        </div>
      ) : query.isError ? (
        <ErrorState
          title="Couldn’t load the queue"
          detail="GET /tasks did not answer."
          onRetry={() => void query.refetch()}
        />
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No jobs match these filters"
          description="Scheduled work appears here as the scheduler materializes it (§R8.1)."
        />
      ) : (
        <TaskList
          ref={listRef}
          tasks={tasks}
          canManage={canManage}
          status={status}
          type={type}
          channelId={channelId}
          onInspect={(id) => inspect({ type: 'task', id })}
        />
      )}
    </section>
  );
}
