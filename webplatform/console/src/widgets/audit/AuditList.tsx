'use client';

/**
 * AuditList (FS12). Rows built from ONYX primitives — see `TaskList` for the
 * measured reason DataTable is not used in this stage.
 *
 * The actor stays a **raw id**: `/users` is owner-only per the API_SPEC matrix,
 * so an analyst reading this log cannot resolve names, and inventing one would
 * be a fabrication (the FS10 raw-author precedent).
 */
import { useEffect, useState } from 'react';
import type { AuditRecordVM } from '@/entities/audit';
import { isTextEntryTarget } from '@/shared/config/shortcuts';
import { Button } from '@/shared/ui/button';

const CHANGE_LABEL: Record<AuditRecordVM['changeKind'], string> = {
  created: 'Created',
  updated: 'Updated',
  deleted: 'Deleted',
  unknown: 'Recorded',
};

export function AuditList({
  records,
  openId,
  onOpen,
  onInspect,
}: {
  readonly records: readonly AuditRecordVM[];
  readonly openId: string | null;
  readonly onOpen: (id: string) => void;
  readonly onInspect: (id: string) => void;
}): React.ReactElement {
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTextEntryTarget(event.target)) return;
      if (event.key === 'j') {
        event.preventDefault();
        setCursor((current) => Math.min(current + 1, records.length - 1));
      } else if (event.key === 'k') {
        event.preventDefault();
        setCursor((current) => Math.max(current - 1, 0));
      } else if (event.key === 'Enter') {
        const record = records[cursor];
        if (record) {
          event.preventDefault();
          onOpen(record.id);
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cursor, records, onOpen]);

  return (
    <ul aria-label="Audit records" className="flex flex-col gap-2">
      {records.map((record, index) => (
        <li
          key={record.id}
          className={`onyx-raised flex flex-col gap-2 rounded-xl border p-4 md:flex-row md:items-center ${
            index === cursor || record.id === openId
              ? 'border-border-strong'
              : 'border-border-subtle'
          }`}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-primary">{record.action}</span>
              <span className="rounded-full border border-border-default px-2 py-0.5 text-[11px] text-secondary">
                {CHANGE_LABEL[record.changeKind]}
              </span>
              <span className="text-[13px] text-secondary">{record.entity}</span>
            </div>
            <p className="text-[13px] text-secondary">
              {record.createdAt ?? 'no timestamp'} · actor{' '}
              <span className="font-mono">{record.actorId ?? 'unknown'}</span>
              {record.entityId ? (
                <>
                  {' '}
                  · <span className="font-mono">{record.entityId}</span>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpen(record.id)}>
              {record.id === openId ? 'Hide diff' : 'View diff'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onInspect(record.id)}>
              Inspect
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
