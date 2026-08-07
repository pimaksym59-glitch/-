'use client';

/**
 * ConfigVersionsPanel (FS12) — the snapshot history (§R10.8), a **real diff**
 * between any two of them, and the guarded rollback.
 *
 * The diff is a pure client-side comparison of two SERVED `snapshot` payloads —
 * the FS10 precedent, where a prompt diff was derived from two served texts.
 * There is no diff endpoint and none is called. If the list does not carry
 * snapshots (an open FE-RV-15 question), the comparison is honestly unavailable
 * rather than empty.
 *
 * `?a=` and `?b=` put the comparison in the URL so it is shareable and Back
 * reverses it (plan §3.5).
 */
import { useQueryState } from 'nuqs';
import { useState } from 'react';
import {
  countChanges,
  diffSnapshots,
  useConfigVersions,
  type ConfigVersionVM,
} from '@/entities/config-version';
import { useRollbackConfig } from '@/features/rollback-config';
import { useCan } from '@/shared/providers';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';

const ROW_TONE: Record<string, string> = {
  added: 'border-l-2 border-l-success bg-success/5',
  removed: 'border-l-2 border-l-danger bg-danger/5',
  changed: 'border-l-2 border-l-warning bg-warning/5',
  unchanged: 'border-l-2 border-l-transparent',
};
const ROW_LABEL: Record<string, string> = {
  added: 'Added',
  removed: 'Removed',
  changed: 'Changed',
  unchanged: 'Unchanged',
};

export function ConfigVersionsPanel({
  initial,
}: {
  readonly initial: readonly ConfigVersionVM[] | null;
}): React.ReactElement {
  const can = useCan();
  const canManage = can('platform.manage');
  const query = useConfigVersions(initial ?? undefined);
  const rollback = useRollbackConfig();
  const [a, setA] = useQueryState('a', { history: 'push' });
  const [b, setB] = useQueryState('b', { history: 'push' });
  const [confirming, setConfirming] = useState<string | null>(null);

  if (query.isPending) return <Skeleton height={200} />;
  if (query.isError) {
    return (
      <ErrorState
        title="Couldn’t load config versions"
        detail="GET /config-versions did not answer."
        onRetry={() => void query.refetch()}
      />
    );
  }

  const versions = query.data ?? [];
  if (versions.length === 0) {
    return (
      <EmptyState
        title="No configuration snapshots yet"
        description="Snapshots are recorded as configuration changes (§R10.8). Until one exists there is nothing to compare or roll back to."
      />
    );
  }

  const left = versions.find((version) => version.id === a) ?? null;
  const right = versions.find((version) => version.id === b) ?? null;
  const comparable = left !== null && right !== null && left.hasSnapshot && right.hasSnapshot;
  const rows = comparable ? diffSnapshots(left.snapshot, right.snapshot) : [];

  return (
    <div className="flex flex-col gap-4">
      <ul aria-label="Configuration snapshots" className="flex flex-col gap-2">
        {versions.map((version) => (
          <li
            key={version.id}
            className="onyx-raised flex flex-wrap items-center gap-3 rounded-xl border border-border-subtle p-4"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-medium text-primary">
                {version.description ?? 'No description recorded'}
              </span>
              <span className="text-[13px] text-secondary">
                <span className="font-mono">{version.id}</span>
                {version.createdAt ? ` · ${version.createdAt}` : ''}
                {version.author ? (
                  <>
                    {' '}
                    · author <span className="font-mono">{version.author}</span>
                  </>
                ) : null}
                {version.hasSnapshot ? '' : ' · no snapshot payload on the wire'}
              </span>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={!version.hasSnapshot}
                onClick={() => void setA(version.id)}
              >
                Compare as before
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={!version.hasSnapshot}
                onClick={() => void setB(version.id)}
              >
                Compare as after
              </Button>
              {canManage ? (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={rollback.pending === version.id}
                  onClick={() => setConfirming(version.id)}
                >
                  Roll back to this
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {a !== null || b !== null ? (
        <section
          aria-labelledby="config-diff-heading"
          className="onyx-raised rounded-xl border border-border-subtle p-5"
        >
          <h2 id="config-diff-heading" className="text-sm font-semibold text-primary">
            Comparison
          </h2>
          {!comparable ? (
            <p className="mt-2 text-[13px] text-secondary">
              Pick a “before” and an “after” snapshot. A version whose payload the API did not
              return cannot be compared — the console will not guess what it contained.
            </p>
          ) : (
            <>
              <p className="mt-1 text-[13px] text-secondary">
                {String(countChanges(rows))} of {String(rows.length)} keys differ ·{' '}
                <span className="font-mono">{left.id}</span> →{' '}
                <span className="font-mono">{right.id}</span>
              </p>
              <ul className="mt-3 flex flex-col gap-1">
                {rows.map((row) => (
                  <li
                    key={row.key}
                    className={`flex flex-col gap-1 rounded-md px-3 py-2 md:flex-row md:items-baseline md:gap-4 ${ROW_TONE[row.kind] ?? ''}`}
                  >
                    <span className="sr-only">{ROW_LABEL[row.kind]}</span>
                    <span className="min-w-[14rem] font-mono text-[12px] text-primary">
                      {row.key}
                    </span>
                    <span className="font-mono text-[12px] text-secondary">
                      {row.before ?? 'not present'}
                    </span>
                    <span aria-hidden className="text-secondary">
                      →
                    </span>
                    <span className="font-mono text-[12px] text-primary">
                      {row.after ?? 'not present'}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      ) : null}

      {confirming ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setConfirming(null);
          }}
          title="Roll back to this snapshot?"
          description="The backend restores this configuration through the queue (§R10.1). There is no undo — rolling forward to another snapshot is the way back."
          confirmLabel="Queue rollback"
          destructive
          onConfirm={() => {
            rollback.rollback(confirming);
            setConfirming(null);
          }}
        />
      ) : null}
    </div>
  );
}
