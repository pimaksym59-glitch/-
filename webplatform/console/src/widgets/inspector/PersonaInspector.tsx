'use client';

/**
 * Persona inspector view (FS8 T-FS8.7) behind the unchanged FS2
 * `?inspect=persona:<id>` contract: the writing identity at a glance — voice
 * summary, derived Style Memory (§R9.12) and the guarded edit entry for
 * `content.edit` roles (SEC-7). Influence/trace is honestly absent (§5.2 D1).
 */
import { BookOpen, Pencil } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { StyleFeatureList, usePersona } from '@/entities/persona';
import { useInspector } from '@/shared/hooks';
import { useCan } from '@/shared/providers';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';

const EditPersonaDialog = dynamic(
  () => import('@/features/edit-persona').then((m) => m.EditPersonaDialog),
  { loading: () => null },
);

export function PersonaInspector({ id }: { readonly id: string }): React.ReactElement {
  const router = useRouter();
  const can = useCan();
  const { close } = useInspector();
  const persona = usePersona(id);
  const [editing, setEditing] = useState(false);

  if (persona.isPending) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton height={20} width="70%" />
        <Skeleton height={14} width="45%" />
        <Skeleton height={120} />
      </div>
    );
  }
  if (persona.isError) {
    return (
      <div className="p-4">
        <ErrorState
          scope="section"
          title="Couldn’t load this persona"
          onRetry={() => void persona.refetch()}
        />
      </div>
    );
  }

  const data = persona.data;
  const canEdit = can('content.edit');

  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">Persona</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 flex-1 text-sm font-semibold text-primary">{data.name}</h2>
          {data.archived ? <Badge tone="neutral">Archived</Badge> : null}
        </div>
        {data.mannerOfSpeech ? (
          <p className="mt-1 text-[13px] text-secondary">{data.mannerOfSpeech}</p>
        ) : null}
      </header>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            close();
            router.push(`/memory/${data.id}`);
          }}
        >
          <BookOpen aria-hidden className="size-4" strokeWidth={1.5} />
          Open in Memory
        </Button>
        {canEdit ? (
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            <Pencil aria-hidden className="size-4" strokeWidth={1.5} />
            Edit voice
          </Button>
        ) : null}
      </div>

      <section aria-labelledby="inspector-persona-style">
        <h3
          id="inspector-persona-style"
          className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-secondary"
        >
          Style memory
        </h3>
        <StyleFeatureList features={data.styleFeatures} />
      </section>

      {editing ? (
        <EditPersonaDialog
          open={editing}
          onOpenChange={setEditing}
          persona={data}
          channelId={data.channelId}
        />
      ) : null}
    </div>
  );
}
