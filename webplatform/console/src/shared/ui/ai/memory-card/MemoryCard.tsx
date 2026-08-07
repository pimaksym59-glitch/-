'use client';

import { clsx } from 'clsx';
import { Brain, ExternalLink } from 'lucide-react';
import { Badge } from '../../badge/Badge';

/**
 * MemoryCard (D2 §14). Surfaces a memory entry (scope, kind, style feature)
 * with a "why this matters" line and a link to Memory Explorer. Used inline in
 * chat/compose and in the Memory pillar.
 */
export interface MemoryCardProps {
  readonly scope: string;
  readonly kind: string;
  readonly content: string;
  readonly whyItMatters?: string;
  readonly onOpenExplorer?: () => void;
  readonly className?: string;
}

export function MemoryCard({
  scope,
  kind,
  content,
  whyItMatters,
  onOpenExplorer,
  className,
}: MemoryCardProps): React.ReactElement {
  return (
    <div
      className={clsx(
        'rounded-lg border border-border-subtle bg-raised p-3',
        'border-l-2 border-l-[color:var(--ai-accent)]',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Brain aria-hidden className="size-3.5 text-[color:var(--ai-accent)]" strokeWidth={1.5} />
        <Badge tone="ai">{kind}</Badge>
        <span className="text-xs text-secondary">{scope}</span>
        {onOpenExplorer ? (
          <button
            type="button"
            onClick={onOpenExplorer}
            aria-label="Open in Memory Explorer"
            className="ml-auto inline-flex size-6 items-center justify-center rounded-md text-secondary transition-colors hover:bg-interactive-subtle hover:text-primary"
          >
            <ExternalLink aria-hidden className="size-3.5" />
          </button>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-primary">{content}</p>
      {whyItMatters ? (
        <p className="mt-1 text-[13px] text-secondary">Why this matters: {whyItMatters}</p>
      ) : null}
    </div>
  );
}
