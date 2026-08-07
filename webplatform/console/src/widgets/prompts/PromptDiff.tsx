'use client';

/**
 * Version diff (FS10 T-FS10.5 — D3 §10 "diff vs previous"). LAZY: mounted on
 * the comparison intent only (plan §3.1/§3.6).
 *
 * The comparison is a **pure client-side derivation** of two texts the contract
 * already serves (`diffVersions`, plan §5.2 D7): there is no diff endpoint,
 * none is invented, and no claim is made about how the backend compares
 * versions. The counts shown are the diff's own.
 *
 * **Why this renders the lines itself instead of the ONYX CodeBlock** (a
 * measured PATCH decision, not a preference): CodeBlock exists to syntax-
 * highlight CODE, and it reaches Shiki. FS10 would have been its first product
 * consumer, which made Shiki's per-grammar chunk graph reachable from the app
 * entry and grew the **webpack runtime chunk map** by ~3.9 kB gzipped — a cost
 * every route pays, measured as `/chat` 178 → 182 kB (over the 180 budget) with
 * the chunk SET unchanged. A prompt is prose, not code: `language="diff"` is
 * not even in CodeBlock's language list, so the highlighter would have fallen
 * back to a plain block regardless. This renders the same D2 §13.18 diff
 * semantics — success wash for additions, danger wash for removals — with the
 * frozen status tokens and no highlighter. Colour is never the only signal: a
 * visually-hidden word labels every changed line.
 */
import { X } from 'lucide-react';
import { diffVersions, type PromptVersionVM } from '@/entities/prompt';
import { Button } from '@/shared/ui/button';

type LineKind = 'added' | 'removed' | 'context';

function kindOf(line: string): LineKind {
  if (line.startsWith('+')) return 'added';
  if (line.startsWith('-')) return 'removed';
  return 'context';
}

const LINE_CLASS: Readonly<Record<LineKind, string>> = {
  added: 'bg-[color:var(--status-success-bg)] text-success',
  removed: 'bg-[color:var(--status-danger-bg)] text-danger',
  context: 'text-secondary',
};

const LINE_LABEL: Readonly<Record<LineKind, string>> = {
  added: 'Added line: ',
  removed: 'Removed line: ',
  context: '',
};

export function PromptDiff({
  before,
  after,
  onClose,
}: {
  readonly before: PromptVersionVM;
  readonly after: PromptVersionVM;
  readonly onClose: () => void;
}): React.ReactElement {
  const diff = diffVersions(before.text, after.text);
  const lines = diff.text.split('\n');

  return (
    <section
      aria-labelledby="prompt-diff-heading"
      className="flex flex-col gap-2 rounded-xl border border-border-default bg-surface p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="prompt-diff-heading" className="text-sm font-semibold text-primary">
          v{before.version} → v{after.version}
        </h3>
        <div className="flex items-center gap-3">
          <p className="text-[13px] text-secondary">
            {diff.identical
              ? 'These versions are identical.'
              : `${diff.added} line${diff.added === 1 ? '' : 's'} added · ${diff.removed} removed`}
          </p>
          <Button size="sm" variant="ghost" onClick={onClose} aria-label="Hide comparison">
            <X aria-hidden className="size-3.5" />
          </Button>
        </div>
      </div>

      {diff.coarse ? (
        <p className="text-[13px] text-secondary">
          These versions are too long for a line-by-line comparison, so they are shown as whole
          blocks.
        </p>
      ) : null}

      <pre className="overflow-x-auto rounded-lg border border-border-subtle bg-sunken p-3 font-mono text-[13px] leading-5">
        <code>
          {lines.map((line, index) => {
            const kind = kindOf(line);
            return (
              <span key={index} className={`block whitespace-pre-wrap px-1 ${LINE_CLASS[kind]}`}>
                {LINE_LABEL[kind] === '' ? null : (
                  <span className="sr-only">{LINE_LABEL[kind]}</span>
                )}
                {line === '' ? ' ' : line}
              </span>
            );
          })}
        </code>
      </pre>
    </section>
  );
}
