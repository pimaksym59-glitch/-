'use client';

/**
 * AuditView (FS12 T-FS12.9 — D3 §19). The formal record of who did what
 * (§R10.8), read-only by construction: the slice has no mutation hook, and a
 * test fails if one appears.
 *
 * Contract-shaped honesty:
 *  - the only documented filters are `?entity=` and `?actor=`, so **no time
 *    range is sent**; D3 §19's time filter would need a parameter the wire does
 *    not accept (plan §5.2 D8);
 *  - facet values are collected from the LOADED page, because there is no
 *    facet-values endpoint — the UI says so rather than implying completeness;
 *  - export is a client-side CSV of what is on screen; there is no export call.
 *
 * The record diff is a pure comparison of the two served jsonb payloads. A null
 * `before` reads as “created”, never as an empty object.
 */
import dynamic from 'next/dynamic';
import { useQueryState } from 'nuqs';
import { collectFacet, useAuditRecords, type AuditRecordVM } from '@/entities/audit';
import { ExportAuditMenu } from '@/features/export-audit';
import { useInspector } from '@/shared/hooks';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorState } from '@/shared/ui/error-state';
import { Select } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { AuditHonesty } from './AuditHonesty';
import { AuditList } from './AuditList';

/** The record diff is LAZY — one importer, opened on demand (plan §3.1/§3.6). */
const RecordDiff = dynamic(() => import('./RecordDiff').then((m) => m.RecordDiff), {
  loading: () => <Skeleton height={160} />,
});

export interface AuditInitial {
  readonly records: readonly AuditRecordVM[] | null;
}

const ANY = 'all';

export function AuditView({ initial }: { readonly initial: AuditInitial }): React.ReactElement {
  const [entity, setEntity] = useQueryState('entity', { history: 'push' });
  const [actor, setActor] = useQueryState('actor', { history: 'push' });
  const [open, setOpen] = useQueryState('record', { history: 'push' });
  const { inspect } = useInspector();

  const query = useAuditRecords(entity, actor, initial.records ?? undefined);
  const records = query.data ?? [];
  const openRecord = records.find((record) => record.id === open) ?? null;

  return (
    <section className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-6 py-8 md:px-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.015em] text-primary">
            Audit
          </h1>
          <p className="mt-1 max-w-[72ch] text-sm text-secondary">
            Every audited action the backend recorded (§R10.8). The log is immutable — this screen
            can read it and nothing else.
          </p>
        </div>
        <ExportAuditMenu records={records} entity={entity} actor={actor} />
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <Select
          label="Entity"
          items={[
            { value: ANY, label: 'Any entity' },
            ...collectFacet(records, 'entity').map((value) => ({ value, label: value })),
          ]}
          value={entity ?? ANY}
          onValueChange={(value) => void setEntity(value === ANY ? null : value)}
          helper="The contract's own ?entity= filter."
        />
        <Select
          label="Actor"
          items={[
            { value: ANY, label: 'Any actor' },
            ...collectFacet(records, 'actor').map((value) => ({ value, label: value })),
          ]}
          value={actor ?? ANY}
          onValueChange={(value) => void setActor(value === ANY ? null : value)}
          helper="Values come from the loaded page — there is no facet endpoint."
        />
      </div>

      {query.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton height={56} />
          <Skeleton height={56} />
          <Skeleton height={56} />
        </div>
      ) : query.isError ? (
        <ErrorState
          title="Couldn’t load the audit log"
          detail="GET /audit-log did not answer."
          onRetry={() => void query.refetch()}
        />
      ) : records.length === 0 ? (
        <EmptyState
          title="No audited actions for these filters"
          description="Widen the filters, or check that the actions you expect are ones the backend audits."
        />
      ) : (
        <AuditList
          records={records}
          openId={open}
          onOpen={(id) => void setOpen(id)}
          onInspect={(id) => inspect({ type: 'audit', id })}
        />
      )}

      {openRecord ? <RecordDiff record={openRecord} /> : null}

      <AuditHonesty />
    </section>
  );
}
