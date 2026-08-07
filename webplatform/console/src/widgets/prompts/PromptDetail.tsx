'use client';

/**
 * Prompt detail (FS10 T-FS10.5 — D3 §10 "version editor / version list").
 * LAZY: mounted only when a type is selected (plan §3.1/§3.6).
 *
 * The chain comes from the contract's own `GET /prompts/{id}/versions`, with
 * the already-loaded list as the instant fallback — so if the live wire turns
 * out to return only the newest row per type, this pane is already reading the
 * authoritative source (FE-RV-13).
 *
 * Honesty rules encoded here:
 *  - the version text is rendered **as stored**, in a plain reading block: no
 *    syntax highlighting (a prompt is prose, not code) and **no variable
 *    highlighting** (§5.2 D5 — no variables exist in the contract);
 *  - `model` and `result` are shown **only when the wire carries them**;
 *  - the author is the **raw id** (§5.2 D1);
 *  - there is no promote, no rename and no delete, because no such call exists
 *    (§5.2 D2/D3) — the only write offered is "New version".
 */
import { GitCompare, Plus, Sparkles } from 'lucide-react';
import dynamic from 'next/dynamic';
import {
  previousVersion,
  usePromptVersions,
  type PromptGroupVM,
  type PromptVersionVM,
} from '@/entities/prompt';
import { formatDate } from '@/shared/lib/format';
import { useCan } from '@/shared/providers';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { PromptsHonesty } from './PromptsHonesty';

/** Heavier leaves stay lazy (plan §3.6): the diff pulls the frozen CodeBlock
 *  (and therefore Shiki), the test panel pulls the AI surface. */
const PromptDiff = dynamic(() => import('./PromptDiff').then((m) => m.PromptDiff), {
  loading: () => <Skeleton height={180} />,
});
const TestPromptPanel = dynamic(
  () => import('@/features/test-prompt').then((m) => m.TestPromptPanel),
  { loading: () => <Skeleton height={160} /> },
);

function VersionRow({
  version,
  selected,
  onSelect,
}: {
  readonly version: PromptVersionVM;
  readonly selected: boolean;
  readonly onSelect: () => void;
}): React.ReactElement {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? 'true' : undefined}
        className={`flex w-full flex-col items-start gap-0.5 rounded-md border-l-2 px-3 py-2 text-left transition-colors ${
          selected
            ? 'border-l-[color:var(--interactive-default)] bg-interactive-subtle'
            : 'border-l-transparent hover:bg-interactive-subtle'
        }`}
      >
        <span className="text-[13px] font-medium text-primary">v{version.version}</span>
        <span className="text-[11px] text-secondary">
          {version.createdAt ? formatDate(version.createdAt) : 'date not recorded'}
        </span>
      </button>
    </li>
  );
}

export function PromptDetail({
  group,
  selected,
  compareWith,
  onSelectVersion,
  onCompare,
  onNewVersion,
}: {
  readonly group: PromptGroupVM;
  readonly selected: PromptVersionVM;
  readonly compareWith: number | null;
  readonly onSelectVersion: (version: number) => void;
  readonly onCompare: (version: number | null) => void;
  readonly onNewVersion: () => void;
}): React.ReactElement {
  const can = useCan();
  const canEdit = can('content.edit');
  const chain = usePromptVersions(group.latest.id);
  const versions = chain.data ?? group.versions;
  const previous = previousVersion({ ...group, versions }, selected.version);
  const comparison =
    compareWith === null ? null : (versions.find((v) => v.version === compareWith) ?? null);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-primary">
            {group.label}
            <span className="ml-2 font-mono text-sm text-secondary">v{selected.version}</span>
          </h2>
          <p className="mt-1 text-[13px] text-secondary">
            {versions.length} version{versions.length === 1 ? '' : 's'} ·{' '}
            {selected.createdAt
              ? `created ${formatDate(selected.createdAt)}`
              : 'creation date not recorded'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit ? (
            <Button size="sm" onClick={onNewVersion}>
              <Plus aria-hidden className="size-3.5" />
              New version
            </Button>
          ) : null}
          {previous ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onCompare(comparison ? null : previous.version)}
            >
              <GitCompare aria-hidden className="size-3.5" />
              {comparison ? 'Hide comparison' : `Compare with v${previous.version}`}
            </Button>
          ) : null}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,9rem)_1fr]">
        <nav aria-label="Version history" className="min-w-0">
          {chain.isPending && group.versions.length === 0 ? (
            <Skeleton height={120} />
          ) : (
            <ol className="flex flex-col gap-1">
              {versions.map((version) => (
                <VersionRow
                  key={version.id}
                  version={version}
                  selected={version.version === selected.version}
                  onSelect={() => onSelectVersion(version.version)}
                />
              ))}
            </ol>
          )}
        </nav>

        <div className="flex min-w-0 flex-col gap-4">
          <section aria-labelledby="prompt-text-heading">
            <h3 id="prompt-text-heading" className="sr-only">
              Prompt text, version {selected.version}
            </h3>
            {/* Stored text, verbatim. Not a code block (no Shiki here — that
                chunk loads only for a diff) and not variable-highlighted. */}
            <pre className="max-w-[72ch] whitespace-pre-wrap break-words rounded-lg border border-border-subtle bg-inset p-4 font-sans text-[13px] leading-6 text-primary">
              {selected.text}
            </pre>
          </section>

          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
            <div className="flex justify-between gap-3 border-b border-border-subtle py-1">
              <dt className="text-secondary">Prompt type</dt>
              <dd className="text-right text-primary">
                {group.known ? group.label : `${group.type} (raw)`}
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-border-subtle py-1">
              <dt className="text-secondary">Author id</dt>
              <dd className="break-all text-right font-mono text-[12px] text-primary">
                {selected.authorId ?? 'not recorded'}
              </dd>
            </div>
            {selected.model !== null ? (
              <div className="flex justify-between gap-3 border-b border-border-subtle py-1">
                <dt className="text-secondary">Model recorded on the row</dt>
                <dd className="text-right text-primary">{selected.model}</dd>
              </div>
            ) : null}
            {selected.result !== null ? (
              <div className="flex justify-between gap-3 border-b border-border-subtle py-1">
                <dt className="text-secondary">Result recorded on the row</dt>
                <dd className="text-right text-primary">{selected.result}</dd>
              </div>
            ) : null}
          </dl>

          {group.known ? null : (
            <Badge tone="neutral">
              This prompt type is not one the console recognises — shown by its raw value
            </Badge>
          )}

          {comparison ? (
            <PromptDiff before={comparison} after={selected} onClose={() => onCompare(null)} />
          ) : null}

          {canEdit ? (
            <TestPromptPanel version={selected} typeLabel={group.label} />
          ) : (
            <p className="flex items-center gap-2 text-[13px] text-secondary">
              <Sparkles aria-hidden className="size-4" strokeWidth={1.5} />
              Testing a version is an editor operation.
            </p>
          )}

          <PromptsHonesty variant="activation" />
          <PromptsHonesty variant="variables" />
        </div>
      </div>
    </div>
  );
}
