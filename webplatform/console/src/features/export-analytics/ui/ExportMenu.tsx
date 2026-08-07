'use client';

/**
 * Export / share (FS11 T-FS11.7 — D3 §12 "Export/Share (URL-encoded state)").
 *
 * The frozen contract has **no export endpoint**, so nothing here calls the API:
 *
 * - **Copy link** IS the export D3 asks for — the whole view (range, facet,
 *   period, inspector target) lives in the URL, so the link reproduces exactly
 *   what the sender sees, for any role allowed to read it.
 * - **Download CSV** serializes the series already loaded in this browser, with
 *   gated series excluded and NAMED as excluded (§R10.3).
 *
 * No server-side report, no "email this", no scheduled export — none exists.
 */
import { Copy, Download } from 'lucide-react';
import type { SeriesVM } from '@/entities/analytics-report';
import { useToast } from '@/shared/providers';
import { Button } from '@/shared/ui/button';
import { toCsv } from '../model/toCsv';

export function ExportMenu({
  series,
  filename,
  rangeLabel,
}: {
  readonly series: readonly SeriesVM[];
  readonly filename: string;
  readonly rangeLabel: string;
}): React.ReactElement {
  const { toast } = useToast();

  async function copyLink(): Promise<void> {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Link copied',
        description: `Anyone with access sees this exact view (${rangeLabel}).`,
        kind: 'success',
      });
    } catch {
      toast({
        title: 'Couldn’t copy the link',
        description: 'Your browser blocked clipboard access — copy it from the address bar.',
        kind: 'warning',
      });
    }
  }

  function downloadCsv(): void {
    const { csv, excluded, rowCount } = toCsv(series);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(href);
    toast({
      title: `Exported ${String(rowCount)} rows`,
      description:
        excluded.length === 0
          ? `From what this page loaded (${rangeLabel}) — no server export was requested.`
          : `Gated series were left out (${excluded.join(', ')}) — they carry no values to export.`,
      kind: 'success',
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" size="sm" onClick={() => void copyLink()}>
        <Copy aria-hidden className="size-4" strokeWidth={1.5} />
        Copy link
      </Button>
      <Button variant="secondary" size="sm" onClick={downloadCsv} disabled={series.length === 0}>
        <Download aria-hidden className="size-4" strokeWidth={1.5} />
        Download CSV
      </Button>
    </div>
  );
}
