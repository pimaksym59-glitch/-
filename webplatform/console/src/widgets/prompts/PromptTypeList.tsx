'use client';

/**
 * The prompt list (FS10 T-FS10.5 — D3 §10 "prompt list"). One row per prompt
 * TYPE, because that is the identity the contract carries (no `name` column,
 * and `?type=` is its only filter). Each row is the ONYX **PromptCard** (D2
 * §14) fed with REAL data — its first real data in the product.
 *
 * Honesty rules encoded here:
 *  - **`active={null}`**: the contract exposes no activation state, so no
 *    Active/Draft badge is rendered (plan §5.2 D2 · the FS10 D4 §13 MINOR).
 *  - **no `variablesCount`**: there is no variables field and no documented
 *    templating syntax (§5.2 D5) — the prop is omitted, never zeroed.
 *  - **no `onPromote`**: no promote endpoint exists (§5.2 D2).
 *  - **no `onRunInPlayground`**: the AI Playground is a later screen; a button
 *    that leads to a stub is worse than its absence.
 *  - an unrecognised `type` is shown by its **raw value** with a quiet marker.
 *
 * Keyboard: `j/k` move between rows, `↵`/click opens the type (route segment,
 * §3.5), the Inspector affordance uses the FS2 `?inspect=` contract. The card
 * is never wrapped in a button — it owns its own diff control (the FS9
 * `nested-interactive` lesson).
 */
import { clsx } from 'clsx';
import { PanelRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { PromptGroupVM } from '@/entities/prompt';
import { useInspector } from '@/shared/hooks';
import { formatDate } from '@/shared/lib/format';
import { PromptCard } from '@/shared/ui/ai';
import { Badge } from '@/shared/ui/badge';

function onRowKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number): void {
  if (event.key !== 'j' && event.key !== 'k') return;
  event.preventDefault();
  const next = event.key === 'j' ? index + 1 : index - 1;
  const target = event.currentTarget
    .closest('ul')
    ?.querySelector<HTMLButtonElement>(`button[data-row-index="${next}"]`);
  target?.focus();
}

export function PromptTypeList({
  groups,
  activeType,
  query,
  onDiff,
}: {
  readonly groups: readonly PromptGroupVM[];
  readonly activeType: string | null;
  readonly query: string;
  readonly onDiff: (group: PromptGroupVM) => void;
}): React.ReactElement {
  const router = useRouter();
  const { inspect } = useInspector();

  if (groups.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border-default p-4 text-[13px] text-secondary">
        {query === ''
          ? 'No prompts match this filter.'
          : `No prompt matches “${query}”. This filters the loaded list — it is not a backend search.`}
      </p>
    );
  }

  return (
    <ul aria-label="Prompt types" className="flex flex-col gap-3">
      {groups.map((group, index) => (
        <li
          key={group.type}
          className={clsx(
            'min-w-0 rounded-xl',
            group.type === activeType && 'ring-2 ring-[color:var(--focus-ring)]',
          )}
        >
          <PromptCard
            name={group.label}
            version={`v${group.latest.version}`}
            // The contract has no activation state and no variables field:
            // null renders NO badge, and the count is omitted, not zeroed.
            active={null}
            lastEditedLabel={
              group.latest.createdAt ? formatDate(group.latest.createdAt) : 'an unknown date'
            }
            {...(group.versionCount > 1 ? { onDiff: () => onDiff(group) } : {})}
          />
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-secondary">
              {group.versionCount} version{group.versionCount === 1 ? '' : 's'}
            </span>
            {group.known ? null : (
              <Badge tone="neutral">unrecognised type “{group.type}” (raw)</Badge>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              data-row-index={index}
              aria-current={group.type === activeType ? 'true' : undefined}
              onClick={() => router.push(`/prompts/${encodeURIComponent(group.type)}`)}
              onKeyDown={(event) => onRowKeyDown(event, index)}
              className="min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-[13px] font-medium text-secondary transition-colors hover:bg-interactive-subtle hover:text-primary focus-visible:bg-interactive-subtle"
            >
              Open prompt {group.label}
            </button>
            <button
              type="button"
              aria-label={`Inspect prompt version ${group.latest.id}`}
              onClick={() => inspect({ type: 'prompt', id: group.latest.id })}
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
