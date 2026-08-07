'use client';

/**
 * ConfigInspector (FS12) — one configuration snapshot, resolved from the loaded
 * history. There is no `GET /config-versions/{id}` in the contract, so nothing
 * is fetched per row; if the list did not carry a `snapshot` payload, the view
 * says so rather than showing an empty object (plan §5.2 D7).
 */
import { renderValue, useConfigVersions } from '@/entities/config-version';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';

export function ConfigInspector({ id }: { readonly id: string }): React.ReactElement {
  const query = useConfigVersions();

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton height={20} width="70%" />
        <Skeleton height={120} />
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="p-4">
        <ErrorState
          title="Couldn’t load config versions"
          detail="GET /config-versions did not answer."
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }

  const version = (query.data ?? []).find((entry) => entry.id === id) ?? null;
  if (!version) {
    return (
      <div className="p-4">
        <p className="text-sm text-primary">This snapshot is not in the loaded history.</p>
      </div>
    );
  }

  const entries = version.snapshot ? Object.entries(version.snapshot).sort() : [];

  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <h2 className="text-sm font-semibold text-primary">
          {version.description ?? 'No description recorded'}
        </h2>
        <p className="break-all font-mono text-[11px] text-secondary">{version.id}</p>
        <p className="mt-1 text-[13px] text-secondary">
          {version.createdAt ?? 'no timestamp'}
          {version.author ? ` · author ${version.author}` : ''}
        </p>
      </header>

      {version.hasSnapshot ? (
        <ul className="flex flex-col gap-1 text-[12px]">
          {entries.map(([key, value]) => (
            <li key={key} className="flex justify-between gap-4">
              <span className="font-mono text-secondary">{key}</span>
              <span className="font-mono text-primary">{renderValue(value)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-secondary">
          The API returned this version without its snapshot payload, so its contents are unknown
          here — and are not guessed.
        </p>
      )}
    </div>
  );
}
