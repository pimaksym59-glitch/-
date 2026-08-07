'use client';

/**
 * RecordDiff (FS12) — the before→after view of one audited record.
 *
 * Rendered from the D2 §13.18 add/remove semantics with **screen-reader labels
 * on every row**, so colour is never the only signal (the FS10 diff precedent).
 * It renders its own rows rather than reaching for the ONYX CodeBlock: that
 * module is Shiki's only door, has no product consumer today, and FS10 measured
 * what becoming its first consumer costs every route.
 *
 * A `null` side is stated as such — “not present before this action” — never
 * padded into an empty object to make the two columns look symmetrical.
 */
import { diffAuditRecord, type AuditRecordVM } from '@/entities/audit';

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

export function RecordDiff({ record }: { readonly record: AuditRecordVM }): React.ReactElement {
  const rows = diffAuditRecord(record);
  const changed = rows.filter((row) => row.kind !== 'unchanged');

  return (
    <section
      aria-labelledby="audit-diff-heading"
      className="onyx-raised flex flex-col gap-3 rounded-xl border border-border-subtle p-5"
    >
      <div>
        <h2 id="audit-diff-heading" className="text-sm font-semibold text-primary">
          {record.action}
        </h2>
        <p className="mt-1 text-[13px] text-secondary">
          {record.changeKind === 'created'
            ? 'This record was created — there is no “before”, and none is invented.'
            : record.changeKind === 'deleted'
              ? 'This record was deleted — there is no “after”.'
              : `${String(changed.length)} of ${String(rows.length)} fields changed.`}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-[13px] text-secondary">
          The audit entry carries no field-level payload on either side.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {rows.map((row) => (
            <li
              key={row.key}
              className={`flex flex-col gap-1 rounded-md px-3 py-2 md:flex-row md:items-baseline md:gap-4 ${ROW_TONE[row.kind] ?? ''}`}
            >
              <span className="sr-only">{ROW_LABEL[row.kind]}</span>
              <span className="min-w-[14rem] font-mono text-[12px] text-primary">{row.key}</span>
              <span className="font-mono text-[12px] text-secondary">
                {row.before ?? <em className="not-italic">not present</em>}
              </span>
              <span aria-hidden className="text-secondary">
                →
              </span>
              <span className="font-mono text-[12px] text-primary">
                {row.after ?? <em className="not-italic">not present</em>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
