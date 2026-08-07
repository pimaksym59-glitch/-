'use client';

/**
 * Prompt-version inspector (FS10 T-FS10.7) behind the unchanged FS2
 * `?inspect=prompt:<rowId>` contract. A compact projection of ONE version row:
 * its type, its number in the chain, when it was created, the author id, the
 * model/result the backend recorded, and the text.
 *
 * There is **no `GET /prompts/{id}`** in the contract, so the row is resolved
 * from its own version chain (`GET /prompts/{id}/versions`) — the same call the
 * detail pane uses, so the two share a cache entry.
 *
 * No Active/Draft badge (no activation state exists), no variables count (no
 * such field), no delete and no promote (no such calls) — plan §5.2 D2/D3/D5.
 * LAZY registry row: `InspectorPanel` sits in the shell commons, so a static
 * import would tax EVERY route's First Load (the FS7/FS8/FS9 precedent).
 */
import { usePromptVersions } from '@/entities/prompt';
import { formatDate } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';

export function PromptInspector({ id }: { readonly id: string }): React.ReactElement {
  const chain = usePromptVersions(id);

  if (chain.isPending) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton height={20} width="70%" />
        <Skeleton height={120} />
      </div>
    );
  }
  if (chain.isError) {
    return (
      <div className="p-4">
        <ErrorState
          scope="section"
          title="Couldn’t load this prompt version"
          onRetry={() => void chain.refetch()}
        />
      </div>
    );
  }

  const versions = chain.data;
  const version = versions.find((entry) => entry.id === id) ?? versions[0];
  if (!version) {
    return (
      <div className="p-4">
        <ErrorState scope="section" title="This prompt version is no longer in the library" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">Prompt</p>
        <h2 className="mt-1 text-sm font-semibold text-primary">
          {version.typeLabel}
          <span className="ml-2 font-mono text-xs text-secondary">v{version.version}</span>
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge tone="neutral">
            {versions.length} version{versions.length === 1 ? '' : 's'} in this chain
          </Badge>
          {version.typeKnown ? null : <Badge tone="neutral">raw type “{version.type}”</Badge>}
        </div>
      </header>

      <section aria-labelledby="inspector-prompt-text">
        <h3
          id="inspector-prompt-text"
          className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-secondary"
        >
          Text
        </h3>
        <pre className="whitespace-pre-wrap break-words rounded-lg border border-border-subtle bg-inset p-3 font-sans text-[13px] leading-6 text-primary">
          {version.text}
        </pre>
      </section>

      <dl className="flex flex-col gap-1 text-[13px]">
        <div className="flex justify-between gap-3 border-b border-border-subtle py-1">
          <dt className="text-secondary">Created</dt>
          <dd className="text-right text-primary">
            {version.createdAt ? formatDate(version.createdAt) : 'not recorded'}
          </dd>
        </div>
        <div className="flex justify-between gap-3 border-b border-border-subtle py-1">
          <dt className="text-secondary">Author id</dt>
          <dd className="break-all text-right font-mono text-[12px] text-primary">
            {version.authorId ?? 'not recorded'}
          </dd>
        </div>
        {version.model !== null ? (
          <div className="flex justify-between gap-3 border-b border-border-subtle py-1">
            <dt className="text-secondary">Model on the row</dt>
            <dd className="text-right text-primary">{version.model}</dd>
          </div>
        ) : null}
        {version.result !== null ? (
          <div className="flex justify-between gap-3 border-b border-border-subtle py-1">
            <dt className="text-secondary">Result on the row</dt>
            <dd className="text-right text-primary">{version.result}</dd>
          </div>
        ) : null}
      </dl>

      <p className="text-[13px] text-secondary">
        Prompts are platform-wide and append-only: an edit creates a new version and nothing here
        can be renamed, promoted or deleted — the contract exposes no such call.
      </p>
    </div>
  );
}
