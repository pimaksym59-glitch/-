'use client';

import { clsx } from 'clsx';
import { BookOpen, EyeOff, FileInput } from 'lucide-react';

/**
 * KnowledgeCard (D2 §14). A document/chunk preview: title, snippet with match
 * highlight (`<mark>` via the `highlight` term), source, retrieval score as a
 * calm bar; actions open / insert / exclude. Used in retrieval preview and
 * citations.
 */
export interface KnowledgeCardProps {
  readonly title: string;
  readonly snippet: string;
  /** Term to highlight inside the snippet (case-insensitive, literal). */
  readonly highlight?: string;
  readonly source: string;
  /** Retrieval score 0..1 rendered as a calm bar. */
  readonly score?: number;
  readonly onOpen?: () => void;
  readonly onInsert?: () => void;
  readonly onExclude?: () => void;
  readonly className?: string;
}

function highlightSnippet(snippet: string, term: string | undefined): React.ReactNode {
  if (!term) return snippet;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = snippet.split(new RegExp(`(${escaped})`, 'ig'));
  return parts.map((part, i) =>
    part.toLowerCase() === term.toLowerCase() ? (
      <mark key={i} className="rounded-xs bg-[color:var(--ai-wash)] px-0.5 text-primary">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export function KnowledgeCard({
  title,
  snippet,
  highlight,
  source,
  score,
  onOpen,
  onInsert,
  onExclude,
  className,
}: KnowledgeCardProps): React.ReactElement {
  return (
    <div className={clsx('rounded-lg border border-border-subtle bg-raised p-3', className)}>
      <div className="flex items-center gap-2">
        <BookOpen aria-hidden className="size-3.5 shrink-0 text-secondary" strokeWidth={1.5} />
        <span className="truncate text-sm font-semibold text-primary">{title}</span>
        <span className="ml-auto shrink-0 text-xs text-secondary">{source}</span>
      </div>
      <p className="mt-1.5 text-[13px] leading-5 text-secondary">
        {highlightSnippet(snippet, highlight)}
      </p>
      {score !== undefined ? (
        <div
          role="img"
          aria-label={`Retrieval score ${(score * 100).toFixed(0)} percent`}
          className="mt-2 h-1 w-full overflow-hidden rounded-pill bg-inset"
        >
          <div
            className="h-full rounded-pill bg-[color:var(--ai-accent)] opacity-70"
            style={{ width: `${Math.min(100, Math.max(0, score * 100))}%` }}
          />
        </div>
      ) : null}
      {(onOpen ?? onInsert ?? onExclude) ? (
        <div className="mt-2 flex items-center gap-1">
          {onOpen ? (
            <button
              type="button"
              onClick={onOpen}
              className="rounded-md px-2 py-1 text-[13px] font-medium text-primary transition-colors hover:bg-interactive-subtle"
            >
              Open
            </button>
          ) : null}
          {onInsert ? (
            <button
              type="button"
              onClick={onInsert}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13px] font-medium text-primary transition-colors hover:bg-interactive-subtle"
            >
              <FileInput aria-hidden className="size-3.5" />
              Insert
            </button>
          ) : null}
          {onExclude ? (
            <button
              type="button"
              onClick={onExclude}
              className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13px] font-medium text-secondary transition-colors hover:bg-interactive-subtle hover:text-primary"
            >
              <EyeOff aria-hidden className="size-3.5" />
              Exclude
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
