'use client';

/**
 * The Activity tab (FS13 T-FS13.9 — D3 §24) — the stage's one real read, plus
 * the one AI surface, in a SINGLE lazy module (the FS12 rule about `dynamic()`
 * entries in the commons runtime map).
 *
 * Three rules shape it:
 *  1. **Actor-scoped or absent.** `ActivityList` takes a non-nullable id; if
 *     `/auth/me` carries none, this file renders an absence instead. It never
 *     falls back to the unfiltered log.
 *  2. **Audit read is owner/admin/analyst.** The frozen matrix excludes editor
 *     and viewer, so they meet a permission state INSIDE the screen — the entry
 *     duty applied one level below the route guard (FS12's rule).
 *  3. **The action is the wire's own word.** An unrecognised action renders by
 *     its raw name; nothing is renamed, grouped or scored.
 */
import { useState } from 'react';
import { diffAuditRecord, type AuditRecordVM } from '@/entities/audit';
import { ExplainActivityPanel } from '@/features/explain-activity';
import { useCan, useSession } from '@/shared/providers';
import { useInspector } from '@/shared/hooks';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { toIdentity } from './identity';
import { useMyActivity } from './useMyActivity';

function formatWhen(iso: string | null): string {
  if (!iso) return 'time not recorded';
  const [date, rest] = iso.split('T');
  return `${date ?? iso}${rest ? ` ${rest.slice(0, 5)} UTC` : ''}`;
}

function summarize(record: AuditRecordVM): string {
  const rows = diffAuditRecord(record);
  const changed = rows.filter((row) => row.kind !== 'unchanged');
  if (changed.length === 0) return 'no field-level detail recorded';
  return changed
    .slice(0, 3)
    .map((row) => row.key)
    .join(', ');
}

function ActivityList({
  userId,
  canExplain,
}: {
  readonly userId: string;
  readonly canExplain: boolean;
}): React.ReactElement {
  const { records, isPending, isError } = useMyActivity(userId);
  const { inspect } = useInspector();
  const [askOpen, setAskOpen] = useState(false);

  if (isPending) return <Skeleton className="h-40 w-full rounded-xl" />;
  if (isError) {
    return (
      <ErrorState
        scope="section"
        title="Your activity could not be loaded"
        detail="The audit log did not answer. Nothing has been lost — this view only reads."
      />
    );
  }

  if (records.length === 0) {
    return (
      <EmptyState
        title="No recent activity."
        description="Actions you take that the platform records — role changes, key rotations, configuration edits, document changes — will appear here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-secondary">
          {records.length} recorded {records.length === 1 ? 'action' : 'actions'}, newest first.
        </p>
        {canExplain ? (
          <Button variant="secondary" size="sm" onClick={() => setAskOpen((v) => !v)}>
            {askOpen ? 'Hide summary' : 'Summarize with AI'}
          </Button>
        ) : null}
      </div>

      {askOpen && canExplain ? <ExplainActivityPanel records={records} /> : null}

      <ul aria-label="Your recent activity" className="flex flex-col">
        {records.map((record) => (
          <li
            key={record.id}
            className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border-subtle py-3 last:border-b-0"
          >
            <button
              type="button"
              onClick={() => inspect({ type: 'audit', id: record.id })}
              className="rounded text-[13px] font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2"
            >
              {record.action}
            </button>
            <span className="text-[13px] text-secondary">
              {record.entity}
              {record.entityId ? ` · ${record.entityId}` : ''}
            </span>
            <span className="text-[13px] text-secondary">{summarize(record)}</span>
            <span className="ml-auto text-[13px] tabular-nums text-secondary">
              {formatWhen(record.createdAt)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ActivityPanel(): React.ReactElement {
  const session = useSession();
  const can = useCan();
  // Through `toIdentity`, which normalises a BLANK id to null. Reading
  // `session.userId` directly would let `''` past this guard, and
  // `auditPaths.list` drops a falsy actor from the query string — turning a
  // personal feed into the platform-wide audit log. Caught by
  // `tests/component/AccountScreens.test.tsx`; the normalisation lives in one
  // place so the two call sites cannot disagree.
  const userId = toIdentity(session)?.userId ?? null;

  if (!can('platform.view')) {
    return (
      <EmptyState
        title="Your role cannot read the activity record"
        description="The audit log is readable by owners, admins and analysts. This is enforced by the backend; the console only reflects it."
      />
    );
  }

  if (userId === null) {
    return (
      <EmptyState
        title="Your activity cannot be scoped to you"
        description="The session response carried no user id, and the audit log can only be filtered by one. Showing the whole platform's record here would be a different screen — Audit — and not yours, so this panel shows nothing instead."
      />
    );
  }

  return <ActivityList userId={userId} canExplain={can('content.edit')} />;
}
