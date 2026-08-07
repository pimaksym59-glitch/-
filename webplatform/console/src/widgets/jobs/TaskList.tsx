'use client';

/**
 * TaskList (FS12) — the queue rendered from ONYX primitives.
 *
 * **Why not `shared/ui/data-table`:** T-FS12.1 measured that becoming TanStack
 * Table's first product consumer adds ~58 B gz to the webpack runtime's
 * chunk-id map, which lands in "shared by all" and rounds `/memory` from 149 to
 * 150 kB. A control build without the probe returned it to 149 with a
 * byte-identical runtime chunk. The plan's pre-declared structural fallback was
 * therefore executed: the same interaction contract (sticky header, `j/k/↵`,
 * right-aligned tabular numerics, D2 §13.5) built from primitives that are
 * already in the bundle.
 *
 * A11y: a real `<table>` would be the obvious choice, but rows carry their own
 * buttons (Inspect + intents) and D2 §13.5's keyboard row nav is list-shaped —
 * so this is a semantic list of rows whose affordances sit BESIDE the row, never
 * wrapping it (the FS9 `nested-interactive` lesson).
 */
import { forwardRef, useEffect, useState } from 'react';
import type { QueueTaskVM } from '@/entities/job-queue';
import dynamic from 'next/dynamic';

/** The intents own their mutation hook and pull the Radix Dialog module through
 *  ConfirmDialog. Loading them on demand is what returns `/jobs` under budget
 *  (measured at T-FS12.17): TanStack Query's mutation machinery and Next's
 *  dynamic() runtime stay out of this route's First Load, and a reader who
 *  never acts never downloads them. */
const QueueIntentActions = dynamic(
  () => import('@/features/requeue-job').then((m) => m.QueueIntentActions),
  { loading: () => null },
);
import { isTextEntryTarget } from '@/shared/config/shortcuts';
import { StatusBadge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';

function RawStatus({ label }: { readonly label: string }): React.ReactElement {
  return (
    <span className="inline-flex items-center rounded-full border border-border-default px-2 py-0.5 text-[11px] font-medium text-secondary">
      {label}
    </span>
  );
}

export interface TaskListProps {
  readonly tasks: readonly QueueTaskVM[];
  readonly canManage: boolean;
  /** The filters the list was loaded under — forwarded so an intent can
   *  invalidate exactly the query the user is looking at. */
  readonly status: string | null;
  readonly type: string | null;
  readonly channelId: string | null;
  readonly onInspect: (id: string) => void;
}

export const TaskList = forwardRef<HTMLUListElement, TaskListProps>(function TaskList(
  { tasks, canManage, status, type, channelId, onInspect },
  ref,
) {
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTextEntryTarget(event.target)) return;
      if (event.key === 'j') {
        event.preventDefault();
        setCursor((current) => Math.min(current + 1, tasks.length - 1));
      } else if (event.key === 'k') {
        event.preventDefault();
        setCursor((current) => Math.max(current - 1, 0));
      } else if (event.key === 'Enter') {
        const task = tasks[cursor];
        if (task) {
          event.preventDefault();
          onInspect(task.id);
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cursor, tasks, onInspect]);

  return (
    <ul ref={ref} aria-label="Queue tasks" className="flex flex-col gap-2">
      {tasks.map((task, index) => (
        <li
          key={task.id}
          className={`onyx-raised flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center ${
            index === cursor ? 'border-border-strong' : 'border-border-subtle'
          }`}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              {task.status ? (
                <StatusBadge status={task.status} />
              ) : (
                <RawStatus label={task.rawStatusLabel} />
              )}
              <span className="truncate text-sm font-medium text-primary">{task.type}</span>
              <span className="font-mono text-[11px] text-secondary">{task.id}</span>
            </div>
            <p className="text-[13px] text-secondary">
              <span className="tabular-nums">{task.attempts}</span>{' '}
              {task.attempts === 1 ? 'attempt' : 'attempts'}
              {task.runAt ? ` · runs ${task.runAt}` : ''}
              {task.channelId ? ` · ${task.channelId}` : ' · platform-wide'}
            </p>
            {task.error ? (
              <p className="truncate text-[13px] text-danger" title={task.error}>
                {task.error}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onInspect(task.id)}>
              Inspect
            </Button>
            {canManage ? (
              <QueueIntentActions task={task} status={status} type={type} channelId={channelId} />
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
});
