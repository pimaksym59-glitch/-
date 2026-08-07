'use client';

import { clsx } from 'clsx';
import { ExternalLink } from 'lucide-react';
import { Popover } from '../../popover/Popover';

/**
 * Citation (D2 §14). A numbered chip `[n]` inline; activating it shows a
 * source preview popover; "Open source" hands off to the Knowledge/Memory
 * drawer (channel-isolated, §R2.6) via `onOpen`. Builds trust in AI claims.
 */
export interface CitationProps {
  readonly index: number;
  readonly sourceTitle: string;
  readonly snippet?: string;
  readonly onOpen?: () => void;
  readonly className?: string;
}

export function Citation({
  index,
  sourceTitle,
  snippet,
  onOpen,
  className,
}: CitationProps): React.ReactElement {
  return (
    <Popover
      side="top"
      trigger={
        <button
          type="button"
          aria-label={`Citation ${index}: ${sourceTitle}`}
          className={clsx(
            'mx-0.5 inline-flex size-4 items-center justify-center rounded-sm bg-interactive-subtle align-super font-mono text-[10px] font-semibold text-[color:var(--ai-accent)] transition-colors hover:bg-[color:var(--ai-wash)]',
            className,
          )}
        >
          {index}
        </button>
      }
      className="max-w-72"
    >
      <p className="text-[13px] font-semibold text-primary">{sourceTitle}</p>
      {snippet ? <p className="mt-1 text-[13px] text-secondary">{snippet}</p> : null}
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-[color:var(--interactive-default)] hover:underline"
        >
          <ExternalLink aria-hidden className="size-3.5" />
          Open source
        </button>
      ) : null}
    </Popover>
  );
}
