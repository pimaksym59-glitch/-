'use client';

/**
 * The results grid (FS9 T-FS9.5 — D3 §9 "results grid"). Each card is the ONYX
 * **ImageResult** (D2 §14) fed with REAL record data — its first real data in
 * the product.
 *
 * Honesty rules encoded here:
 *  - **no `src`**: the contract serves no binary (§R6.8 / plan §5.2 D2), so the
 *    frame stays empty and the caption says why. No placeholder art.
 *  - **no `onAccept` / `onAttach`**: those calls do not exist (§5.2 D4), and a
 *    control that cannot act is worse than its absence.
 *  - **no safety chip**: the contract carries no safety field (§5.2 D5).
 *  - `verified` and `uniquePhash` come from the record's own status and its
 *    stored phash — never from a guess.
 *
 * Keyboard: `j/k` move between cards, `↵`/click opens the record (route
 * segment, §3.5), the Inspector affordance uses the FS2 `?inspect=` contract.
 * Paging is the contract's own list paging (no virtualizer — that module is
 * /chat-scoped and must stay there, plan §6.1).
 */
import { clsx } from 'clsx';
import { PanelRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ImageVM } from '@/entities/image';
import { useInspector } from '@/shared/hooks';
import { ImageResult } from '@/shared/ui/ai';
import { Badge } from '@/shared/ui/badge';
import { StatusBadge } from '@/shared/ui/badge';

export const STUDIO_PAGE_SIZE = 12;

function onCardKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number): void {
  if (event.key !== 'j' && event.key !== 'k') return;
  event.preventDefault();
  const next = event.key === 'j' ? index + 1 : index - 1;
  const target = event.currentTarget
    .closest('ul')
    ?.querySelector<HTMLButtonElement>(`button[data-row-index="${next}"]`);
  target?.focus();
}

export function ImageGrid({
  images,
  activeImageId,
  query,
}: {
  readonly images: readonly ImageVM[];
  readonly activeImageId: string | null;
  readonly query: string;
}): React.ReactElement {
  const router = useRouter();
  const { inspect } = useInspector();

  if (images.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border-default p-4 text-[13px] text-secondary">
        {query === ''
          ? 'No image records in this channel yet.'
          : `No image matches “${query}”. This filters the loaded list — it is not a backend search.`}
      </p>
    );
  }

  return (
    <ul aria-label="Image records" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {images.map((image, index) => (
        <li
          key={image.id}
          className={clsx(
            'min-w-0 rounded-xl',
            image.id === activeImageId && 'ring-2 ring-[color:var(--focus-ring)]',
          )}
        >
          {/* The card itself is NOT interactive: `ImageResult` owns its own
              prompt disclosure, and nesting that inside a button is a real
              WCAG 4.1.2 violation (axe `nested-interactive`, found by the FS9
              gate). The row below carries the affordances — the FS7
              DocumentList pattern. */}
          <ImageResult
            alt={`Image record ${image.id}`}
            state={image.failed ? 'failed' : image.working ? 'generating' : 'ready'}
            verified={image.verified}
            uniquePhash={image.phash !== null}
            {...(image.prompt !== null ? { prompt: image.prompt } : {})}
            {...(image.failed ? { errorText: 'The last generation attempt failed.' } : {})}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {image.status !== null ? (
              <StatusBadge status={image.status} />
            ) : image.rawStatus !== null ? (
              // Unknown wire status — surfaced raw, never coerced into the
              // vocabulary and never used to start polling.
              <Badge tone="neutral">{image.rawStatus}</Badge>
            ) : null}
            {image.resolution ? (
              <span className="text-[11px] text-secondary">{image.resolution}</span>
            ) : null}
            <span className="text-[11px] text-secondary">
              {image.hasStoredFile ? 'Stored in object storage' : 'No stored file'}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              data-row-index={index}
              aria-current={image.id === activeImageId ? 'true' : undefined}
              onClick={() => router.push(`/studio/${image.id}`)}
              onKeyDown={(event) => onCardKeyDown(event, index)}
              className="min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-[13px] font-medium text-secondary transition-colors hover:bg-interactive-subtle hover:text-primary focus-visible:bg-interactive-subtle"
            >
              Open image record {image.id}
            </button>
            <button
              type="button"
              aria-label={`Inspect image record ${image.id}`}
              onClick={() => inspect({ type: 'image', id: image.id })}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-secondary transition-colors hover:bg-interactive-subtle hover:text-primary"
            >
              <PanelRight aria-hidden className="size-4" strokeWidth={1.5} />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
