'use client';

/**
 * PromptLibraryView (FS10 T-FS10.5 — D3 §10 composition). The prompt library
 * built from what the frozen contract actually carries (plan §2): the version
 * chains the backend stores, a real diff between any two of them, and the one
 * write the API has — a new version. What it cannot back (activation,
 * deletion, variables, per-channel prompts, author names, model comparison)
 * renders as honest seams (`PromptsHonesty`), never simulated.
 *
 * **Platform-wide by construction.** This component never reads the active
 * channel and never mounts a channel-keyed query — the `prompts` table has no
 * `channel_id` (plan §5.2 D1, owner requirement A). Switching channels
 * therefore changes nothing here, and that is a structural fact rather than a
 * behaviour to remember.
 *
 * Shell + list paint instantly; the detail pane, the diff, the composer and the
 * AI panel are LAZY (plan §3.1). RBAC: the route opens on `content.view`; the
 * write and the AI panel gate on `content.edit` per affordance (SEC-7).
 * Keyboard (D3 §10): `/` focus search · `n` new version (guarded) · `d` compare
 * the open version with the previous one · `j/k/↵` on the list.
 */
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { useEffect, useRef, useState } from 'react';
import {
  filterPromptGroups,
  findGroup,
  findVersion,
  previousVersion,
  usePrompts,
  usePromptsByType,
  type PromptGroupVM,
} from '@/entities/prompt';
import { isTextEntryTarget } from '@/shared/config/shortcuts';
import { useCan } from '@/shared/providers';
import { Button } from '@/shared/ui/button';
import { ErrorState } from '@/shared/ui/error-state';
import { SearchInput } from '@/shared/ui/search-input';
import { Skeleton } from '@/shared/ui/skeleton';
import { PromptsEmpty } from './PromptsEmpty';
import { PromptsHonesty } from './PromptsHonesty';
import { PromptTypeList } from './PromptTypeList';

/** Heavy leaves are LAZY (plan §3.1/§3.6 — one importer each). */
const PromptDetail = dynamic(() => import('./PromptDetail').then((m) => m.PromptDetail), {
  loading: () => (
    <div className="flex flex-col gap-3">
      <Skeleton height={24} width="45%" />
      <Skeleton height={14} width="30%" />
      <Skeleton height={220} />
    </div>
  ),
});
const VersionComposer = dynamic(
  () => import('@/features/manage-prompt').then((m) => m.VersionComposer),
  { loading: () => null },
);

export interface PromptsInitial {
  /** null = the server-side fetch failed → the client island refetches. */
  readonly groups: readonly PromptGroupVM[] | null;
}

export function PromptLibraryView({
  initial,
  type,
  version,
}: {
  readonly initial: PromptsInitial;
  readonly type: string | null;
  readonly version: number | null;
}): React.ReactElement {
  const can = useCan();
  const router = useRouter();
  const canEdit = can('content.edit');

  const library = usePrompts(initial.groups ?? undefined);
  const [q, setQ] = useQueryState('q');
  // The contract's OWN filter (`GET /prompts?type=`) — a server-side facet,
  // deliberately distinct from the client-side `?q=` list filter.
  const [facet, setFacet] = useQueryState('type');
  // A comparison is a real state change, so it PUSHES history and Back
  // reverses it (list filters stay `replace` — the FS8 `?scope=` lesson).
  const [compare, setCompare] = useQueryState('compare', { history: 'push' });
  const facetQuery = usePromptsByType(facet);
  const [composerOpen, setComposerOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);

  const allGroups = library.data ?? [];
  // The detail always resolves from the FULL library, so a facet can never hide
  // the record the URL points at.
  const openGroup = findGroup(allGroups, type);
  const openVersion = findVersion(openGroup, version);
  const previous =
    openGroup && openVersion ? previousVersion(openGroup, openVersion.version) : null;

  // Screen-scoped keys (rows registered in shortcuts-catalog.ts; handlers live
  // here — the FS5…FS9 pattern). Chords never fire from text entry.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTextEntryTarget(event.target)) return;
      if (event.key === '/') {
        event.preventDefault();
        searchRef.current?.querySelector('input')?.focus();
      } else if (event.key === 'n' && canEdit) {
        event.preventDefault();
        setComposerOpen(true);
      } else if (event.key === 'd' && previous) {
        event.preventDefault();
        void setCompare(String(previous.version));
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canEdit, previous, setCompare]);

  if (library.isPending) return <Skeleton height={240} />;
  if (library.isError) {
    return (
      <ErrorState
        scope="page"
        title="Couldn’t load the prompt library"
        onRetry={() => void library.refetch()}
      />
    );
  }

  const listSource = facet !== null ? (facetQuery.data ?? []) : allGroups;
  const visible = filterPromptGroups(listSource, q ?? '');
  const nothingYet = library.isSuccess && allGroups.length === 0;
  const facets = allGroups.map((group) => ({ value: group.type, label: group.label }));
  const compareVersion = compare === null ? null : Number.parseInt(compare, 10);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Prompt Library</h1>
          <p className="mt-1 text-sm text-secondary">
            The versioned instructions the pipeline builds on. Shared by every channel — an edit is
            always a new version, so nothing is overwritten.
          </p>
        </div>
        {canEdit ? (
          <Button onClick={() => setComposerOpen(true)}>New version</Button>
        ) : (
          <p className="text-sm text-secondary">
            Your role reads this library — authoring versions is an editor operation.
          </p>
        )}
      </header>

      {nothingYet ? (
        <div className="flex flex-col items-center gap-4">
          <PromptsEmpty onNewVersion={() => setComposerOpen(true)} />
          <PromptsHonesty variant="platformWide" className="max-w-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[2fr_3fr]">
          <section
            aria-labelledby="prompts-list-heading"
            className={
              type ? 'hidden min-w-0 flex-col gap-3 xl:flex' : 'flex min-w-0 flex-col gap-3'
            }
          >
            <h2 id="prompts-list-heading" className="sr-only">
              Prompt types
            </h2>
            <div ref={searchRef}>
              <SearchInput
                label="Search prompts"
                hideLabel
                placeholder="Filter by type, text or recorded model…  ( / )"
                value={q ?? ''}
                onChange={(e) => void setQ(e.target.value === '' ? null : e.target.value)}
              />
            </div>

            {/* The contract's own `?type=` filter (§Prompts) — a real server
                call, kept visibly distinct from the local text filter above. */}
            <div role="group" aria-label="Filter by prompt type" className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={facet === null}
                onClick={() => void setFacet(null)}
                className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  facet === null
                    ? 'bg-interactive-subtle text-primary'
                    : 'text-secondary hover:bg-interactive-subtle hover:text-primary'
                }`}
              >
                All types
              </button>
              {facets.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  aria-pressed={facet === entry.value}
                  onClick={() => void setFacet(facet === entry.value ? null : entry.value)}
                  className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    facet === entry.value
                      ? 'bg-interactive-subtle text-primary'
                      : 'text-secondary hover:bg-interactive-subtle hover:text-primary'
                  }`}
                >
                  {entry.label}
                </button>
              ))}
            </div>

            {facet !== null && facetQuery.isPending ? (
              <Skeleton height={160} />
            ) : facet !== null && facetQuery.isError ? (
              <ErrorState
                scope="section"
                title="Couldn’t filter by that type"
                onRetry={() => void facetQuery.refetch()}
              />
            ) : (
              <PromptTypeList
                groups={visible}
                activeType={type}
                query={q ?? ''}
                onDiff={(group) => {
                  const target = previousVersion(group, group.latest.version);
                  router.push(`/prompts/${encodeURIComponent(group.type)}`);
                  if (target) void setCompare(String(target.version));
                }}
              />
            )}

            {/* Below xl the detail pane is hidden, so the platform-wide truth
                is stated here too — every viewport gets it (the FS9 lesson). */}
            {type === null ? <PromptsHonesty variant="platformWide" className="xl:hidden" /> : null}
          </section>

          <section aria-labelledby="prompts-detail-heading" className="min-w-0">
            <h2 id="prompts-detail-heading" className="sr-only">
              Prompt detail
            </h2>
            {openGroup && openVersion ? (
              <PromptDetail
                group={openGroup}
                selected={openVersion}
                compareWith={
                  compareVersion !== null && Number.isFinite(compareVersion) ? compareVersion : null
                }
                onSelectVersion={(next) =>
                  router.push(
                    `/prompts/${encodeURIComponent(openGroup.type)}/versions/${String(next)}`,
                  )
                }
                onCompare={(next) => void setCompare(next === null ? null : String(next))}
                onNewVersion={() => setComposerOpen(true)}
              />
            ) : type !== null ? (
              <ErrorState
                scope="section"
                title="No prompt of that type"
                detail="The library has no versions for this type — check the address, or go back to the list."
                onRetry={() => router.push('/prompts')}
                retryLabel="Back to the library"
              />
            ) : (
              <div className="hidden flex-col gap-4 xl:flex">
                <p className="rounded-lg border border-dashed border-border-default p-6 text-sm text-secondary">
                  Select a prompt to read its versions, compare any two of them and test one as an
                  isolated dry-run.
                </p>
                <PromptsHonesty variant="platformWide" />
                <PromptsHonesty variant="lifecycle" />
                <PromptsHonesty variant="author" />
              </div>
            )}
          </section>
        </div>
      )}

      {canEdit ? (
        <VersionComposer
          open={composerOpen}
          onOpenChange={setComposerOpen}
          groups={allGroups}
          presetType={openGroup?.type ?? null}
          presetFrom={openVersion}
          onCreated={(created) =>
            router.push(
              `/prompts/${encodeURIComponent(created.type)}/versions/${String(created.version)}`,
            )
          }
        />
      ) : null}
    </div>
  );
}
