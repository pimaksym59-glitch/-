'use client';

/**
 * Export affordances for the audit log (FS12). Two, and only two, because the
 * contract carries no export call (plan §5.2 D8):
 *   - **Copy link** — the current view IS the URL (plan §3.5), so sharing it
 *     reproduces the exact filtered slice for anyone whose role allows it;
 *   - **Download CSV** — a client-side serialization of the records already in
 *     the browser, named after the filters they were loaded under.
 *
 * Nothing here fetches. If a future backend adds an export endpoint, this menu
 * is where it lands; until then the honesty is in the copy.
 */
import { useState } from 'react';
import { useToast } from '@/shared/providers';
import type { AuditRecordVM } from '@/entities/audit';
import { Button } from '@/shared/ui/button';
import { csvFilename, toCsv } from '../model/toCsv';

export function ExportAuditMenu({
  records,
  entity,
  actor,
}: {
  readonly records: readonly AuditRecordVM[];
  readonly entity: string | null;
  readonly actor: string | null;
}): React.ReactElement {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  function copyLink(): void {
    void navigator.clipboard
      .writeText(window.location.href)
      .then(() =>
        toast({
          kind: 'success',
          title: 'Link copied',
          description: 'It reopens this exact filtered view, subject to the viewer’s role.',
        }),
      )
      .catch(() =>
        toast({
          kind: 'danger',
          title: 'Could not copy the link',
          description: 'Clipboard denied.',
        }),
      );
  }

  function download(): void {
    setBusy(true);
    try {
      const blob = new Blob([toCsv(records)], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = csvFilename(entity, actor);
      anchor.click();
      URL.revokeObjectURL(url);
      toast({
        kind: 'success',
        title: 'CSV downloaded',
        description: `${String(records.length)} loaded records. This is the slice on screen, not the whole log.`,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="ghost" size="sm" onClick={copyLink}>
        Copy link
      </Button>
      <Button
        variant="secondary"
        size="sm"
        disabled={busy || records.length === 0}
        onClick={download}
      >
        Download CSV
      </Button>
    </div>
  );
}
