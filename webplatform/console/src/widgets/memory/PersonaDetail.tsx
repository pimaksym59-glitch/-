'use client';

/**
 * Persona detail (FS8 — D3 §8, LAZY leaf). The channel's WRITING identity:
 * voice fields plus the Style Memory features the backend derived (§R9.12 —
 * features, never stored texts). Guarded edit is offered only to
 * `content.edit`; the AI explain panel mounts on intent only.
 *
 * Persona ≠ Actor is visible here by construction: this pane never renders
 * appearance data, and the actor pane never renders voice data.
 */
import { ArrowLeft, PanelRight, Pencil, Sparkles } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { StyleFeatureList, usePersona, type PersonaVM } from '@/entities/persona';
import { useInspector } from '@/shared/hooks';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { MemoryHonesty } from './MemoryHonesty';

const ExplainStylePanel = dynamic(
  () => import('@/features/explain-style').then((m) => m.ExplainStylePanel),
  { loading: () => <Skeleton height={96} /> },
);

function VoiceRow({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string | null;
}): React.ReactElement | null {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 border-b border-border-subtle py-2 last:border-b-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-secondary">{label}</dt>
      <dd className="text-sm text-primary">{value}</dd>
    </div>
  );
}

export function PersonaDetail({
  personaId,
  channelName,
  onEdit,
}: {
  readonly personaId: string;
  readonly channelName: string;
  readonly onEdit?: (persona: PersonaVM) => void;
}): React.ReactElement {
  const router = useRouter();
  const { inspect } = useInspector();
  const persona = usePersona(personaId);
  const [asking, setAsking] = useState(false);

  if (persona.isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton height={24} width="55%" />
        <Skeleton height={14} width="35%" />
        <Skeleton height={200} />
      </div>
    );
  }
  if (persona.isError) {
    return (
      <ErrorState
        scope="section"
        title="Couldn’t load this persona"
        onRetry={() => void persona.refetch()}
      />
    );
  }

  const data = persona.data;

  return (
    <article className="flex min-w-0 flex-col gap-5">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 lg:hidden">
          <Button variant="ghost" size="sm" onClick={() => router.push('/memory')}>
            <ArrowLeft aria-hidden className="size-4" strokeWidth={1.5} />
            All memory
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 flex-1 text-xl font-semibold text-primary">{data.name}</h3>
          {data.archived ? <Badge tone="neutral">Archived</Badge> : null}
          <button
            type="button"
            aria-label={`Inspect ${data.name}`}
            onClick={() => inspect({ type: 'persona', id: data.id })}
            className="inline-flex size-8 items-center justify-center rounded-md text-secondary transition-colors hover:bg-interactive-subtle hover:text-primary"
          >
            <PanelRight aria-hidden className="size-4" strokeWidth={1.5} />
          </button>
        </div>
        <p className="text-[13px] text-secondary">
          The writing voice of {channelName}
          {data.archived ? ' · retired, kept for the record' : ''}
        </p>
      </header>

      {onEdit ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => onEdit(data)}>
            <Pencil aria-hidden className="size-4" strokeWidth={1.5} />
            Edit voice ( e )
          </Button>
        </div>
      ) : null}

      <section aria-labelledby="persona-voice">
        <h4
          id="persona-voice"
          className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-secondary"
        >
          Voice
        </h4>
        <dl className="flex flex-col rounded-lg border border-border-subtle px-3">
          <VoiceRow label="Character" value={data.character} />
          <VoiceRow label="Manner of speech" value={data.mannerOfSpeech} />
          <VoiceRow label="Storytelling" value={data.storytellingStyle} />
          <VoiceRow label="Greeting" value={data.greetingStyle} />
          <VoiceRow label="Farewell" value={data.farewellStyle} />
          <VoiceRow label="Audience relationship" value={data.audienceRelationship} />
          <VoiceRow label="Goals" value={data.goals} />
          <VoiceRow label="Biography" value={data.biography} />
        </dl>
        {data.favoriteWords.length > 0 || data.forbiddenExpressions.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-4">
            {data.favoriteWords.length > 0 ? (
              <p className="text-[13px] text-secondary">
                <span className="font-medium">Favours:</span> {data.favoriteWords.join(', ')}
              </p>
            ) : null}
            {data.forbiddenExpressions.length > 0 ? (
              <p className="text-[13px] text-secondary">
                <span className="font-medium">Avoids:</span> {data.forbiddenExpressions.join(', ')}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section aria-labelledby="persona-style">
        <h4
          id="persona-style"
          className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-secondary"
        >
          Style memory (derived)
        </h4>
        <StyleFeatureList features={data.styleFeatures} />
        <p className="mt-2 text-[13px] text-secondary">
          Derived by the backend from what this channel published — parameters, not stored posts
          (§R9.12). Read-only here.
        </p>
      </section>

      {onEdit ? (
        asking ? (
          <ExplainStylePanel persona={data} />
        ) : (
          <div>
            <Button variant="secondary" onClick={() => setAsking(true)}>
              <Sparkles aria-hidden className="size-4 text-ai" strokeWidth={1.5} />
              Explain this persona’s voice
            </Button>
          </div>
        )
      ) : null}

      <MemoryHonesty variant="trace" />
    </article>
  );
}
