'use client';

/**
 * AuditInspector (FS12) — one audited record with its before→after rows.
 * Resolved from the loaded page: there is no `GET /audit-log/{id}`, so nothing
 * is fetched per record (plan §5.2 D8).
 */
import { diffAuditRecord, useAuditRecords } from '@/entities/audit';
import { useAccountPreferences } from '@/features/change-settings';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';

export function AuditInspector({ id }: { readonly id: string }): React.ReactElement {
  const query = useAuditRecords(null, null);
  // FS14 T-FS14.12 (D3 A2, plan §5.2 D10): Beginner reads the field-level
  // diff; Advanced and Power also read the raw before/after payloads the
  // record already carries. Nothing is fetched and nothing is derived.
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
  if (query.isError) {
    return (
      <div className="p-4">
        <ErrorState
          title="Couldn’t load the audit log"
          detail="GET /audit-log did not answer."
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }

  const record = (query.data ?? []).find((entry) => entry.id === id) ?? null;
  if (!record) {
    return (
      <div className="p-4">
        <p className="text-sm text-primary">This record is not in the loaded page.</p>
        <p className="mt-2 text-[13px] text-secondary">
          The contract has no per-record endpoint; widen the filters on the Audit screen to load it.
        </p>
      </div>
    );
  }

  const rows = diffAuditRecord(record);

  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <h2 className="text-sm font-semibold text-primary">{record.action}</h2>
        <p className="text-[13px] text-secondary">
          {record.entity}
          {record.entityId ? ` · ${record.entityId}` : ''}
        </p>
        <p className="mt-1 text-[13px] text-secondary">
          {record.createdAt ?? 'no timestamp'} · actor{' '}
          <span className="font-mono">{record.actorId ?? 'unknown'}</span>
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="text-[13px] text-secondary">
          This entry carries no field-level payload on either side.
        </p>
      ) : (
        <ul className="flex flex-col gap-2 text-[12px]">
          {rows.map((row) => (
            <li key={row.key} className="flex flex-col gap-0.5">
              <span className="font-mono text-primary">{row.key}</span>
              <span className="font-mono text-secondary">
                {row.before ?? 'not present'} → {row.after ?? 'not present'}
              </span>
            </li>
          ))}
        </ul>
      )}
      {showRaw ? (
        <section aria-labelledby="audit-raw-heading">
          <h3
            id="audit-raw-heading"
            className="text-[11px] font-semibold uppercase tracking-wider text-secondary"
          >
            Raw payloads
          </h3>
          <p className="mt-1 text-[12px] text-secondary">
            Shown because your experience level is {preferences.experience}. These are the two jsonb
            sides exactly as the record carries them — the diff above is derived from them.
          </p>
          <pre className="mt-2 overflow-x-auto rounded-md bg-surface-inset p-3 font-mono text-[11px] leading-5 text-primary">
            {JSON.stringify({ before: record.before, after: record.after }, null, 2)}
          </pre>
        </section>
      ) : null}

      <p className="text-[13px] text-secondary">
        The audit log is immutable — this view can read it and nothing else (§R10.8).
      </p>
    </div>
  );
}
