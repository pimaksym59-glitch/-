'use client';

/**
 * KeyInspector (FS12) — a key SLOT, never a key.
 *
 * Everything this view can say is identity and presence, because that is
 * everything `GET /api-keys` returns (§R10.4/§R12.2). There is no reveal, no
 * mask, no copy affordance and no "last four" — a mask is still key material,
 * and the contract promises none.
 */
import { useApiKeySlots } from '@/entities/api-key';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';

export function KeyInspector({ id }: { readonly id: string }): React.ReactElement {
  const query = useApiKeySlots();

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton height={20} width="60%" />
        <Skeleton height={80} />
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="p-4">
        <ErrorState
          title="Couldn’t load key slots"
          detail="GET /api-keys did not answer."
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }

  const slot = (query.data ?? []).find((entry) => entry.id === id) ?? null;
  if (!slot) {
    return (
      <div className="p-4">
        <p className="text-sm text-primary">No slot by this name is configured.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <h2 className="text-sm font-semibold text-primary">{slot.label}</h2>
        {slot.kind ? <p className="text-[13px] text-secondary">{slot.kind}</p> : null}
      </header>
      <dl className="flex flex-col gap-2 text-[13px]">
        <div className="flex justify-between gap-4">
          <dt className="text-secondary">Key stored</dt>
          <dd className="text-primary">
            {slot.configured === true ? 'Yes' : slot.configured === false ? 'No' : 'Not reported'}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-secondary">Last updated</dt>
          <dd className="text-primary">{slot.updatedAt ?? 'not reported'}</dd>
        </div>
      </dl>
      <p className="text-[13px] text-secondary">
        The key itself is never returned by the API and never rendered here — not in full and not
        masked. Rotation replaces it; nothing reads it back.
      </p>
    </div>
  );
}
