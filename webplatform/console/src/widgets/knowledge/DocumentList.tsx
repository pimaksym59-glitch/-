'use client';

/**
 * Document list (FS7 — D3 §7 list pane). Rows: title · source · size · ingest
 * StatusBadge · updated. `j/k` move focus, `↵`/click INSPECTS (D3 `↵ inspect`;
 * the NeedsReviewQueue precedent), the explicit “Open” affordance reads the
 * document. Unknown wire statuses render as raw text — never coerced.
 */
import { clsx } from 'clsx';
import { BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { DocumentVM } from '@/entities/document';
import { useInspector } from '@/shared/hooks';
import { formatBytes, formatRelativeTime } from '@/shared/lib/format';
import { StatusBadge } from '@/shared/ui/badge';

export function DocumentList({
  documents,
  activeDocId,
}: {
  readonly documents: readonly DocumentVM[];
  readonly activeDocId: string | null;
}): React.ReactElement {
  const { inspect } = useInspector();
  const router = useRouter();

  function onRowKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number): void {
    if (event.key !== 'j' && event.key !== 'k') return;
    event.preventDefault();
    const next = event.key === 'j' ? index + 1 : index - 1;
    const target = event.currentTarget
      .closest('ul')
      ?.querySelector<HTMLButtonElement>(`button[data-row-index="${next}"]`);
    target?.focus();
  }

  return (
    <ul aria-label="Documents" className="flex flex-col">
      {documents.map((doc, index) => (
        <li
          key={doc.id}
          className="flex items-center gap-2 border-b border-border-subtle py-2 last:border-b-0"
        >
          <button
            type="button"
            data-row-index={index}
            aria-current={doc.id === activeDocId ? 'true' : undefined}
            onClick={() => inspect({ type: 'document', id: doc.id })}
            onKeyDown={(event) => onRowKeyDown(event, index)}
            className={clsx(
              'flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-interactive-subtle focus-visible:bg-interactive-subtle',
              doc.id === activeDocId && 'bg-interactive-subtle',
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-primary">{doc.title}</span>
              <span className="block truncate text-[13px] text-secondary">
                {doc.source} · {formatBytes(doc.sizeBytes)} · updated{' '}
                {formatRelativeTime(doc.updatedAt)}
              </span>
            </span>
            {doc.status ? (
              <StatusBadge status={doc.status} />
            ) : (
              <span className="shrink-0 text-xs text-secondary">{doc.rawStatus}</span>
            )}
          </button>
          <button
            type="button"
            aria-label={`Open ${doc.title}`}
            onClick={() => router.push(`/knowledge/${doc.id}`)}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-secondary transition-colors hover:bg-interactive-subtle hover:text-primary"
          >
            <BookOpen aria-hidden className="size-4" strokeWidth={1.5} />
          </button>
        </li>
      ))}
    </ul>
  );
}
