'use client';

/**
 * ExplainStylePanel (FS8 T-FS8.9). User-invoked AI over ONE persona record via
 * the frozen dry-run path (§R10.9) through the EXISTING verbatim relay — the
 * FS6 gateway/stream machinery is consumed as-is, never modified (plan §3.3,
 * invariant I3/I6). Nothing auto-runs; Stop cancels upstream and preserves the
 * partial; the answer carries Trust (Generated · Source Available) and a
 * **MemoryCard citing the actual persona record** (provenance, not model
 * claims), Explainability with confidence honestly absent, wire-only cost.
 *
 * The state split is deliberate (plan §3.4): the streamed text lives in the
 * transient assistant store; this component writes NOTHING to Query.
 */
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { PersonaVM } from '@/entities/persona';
import { DEFAULT_MODEL_ID } from '@/shared/config/models';
import { useInspector } from '@/shared/hooks';
import { formatCost } from '@/shared/lib/format';
import { useAssistantStream } from '@/shared/lib/stream';
import { ExplainabilityPanel, MemoryCard, StreamingMessage, TrustLabel } from '@/shared/ui/ai';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { buildPersonaPrompt, EXPLAIN_QUESTION } from '../model/buildPersonaPrompt';

const SUMMARY_MAX = 160;

/** The card's content line — the persona's own voice summary, clamped. */
export function personaSummary(persona: PersonaVM): string {
  const source = persona.mannerOfSpeech ?? persona.character ?? persona.biography ?? persona.name;
  return source.length > SUMMARY_MAX ? `${source.slice(0, SUMMARY_MAX - 1)}…` : source;
}

export function ExplainStylePanel({
  persona,
}: {
  readonly persona: PersonaVM;
}): React.ReactElement {
  const { inspect } = useInspector();
  const { slice, isActive, start, stop } = useAssistantStream(`persona:${persona.id}`);
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState<string | null>(null);

  function ask(text: string): void {
    if (isActive) return;
    const built = buildPersonaPrompt(persona, text);
    setAsked(text.trim() === '' ? EXPLAIN_QUESTION : text.trim());
    void start({ prompt: built.prompt, model: DEFAULT_MODEL_ID });
  }

  // Explainability mirrors what was/would be sent — same pure builder, no drift.
  const built = buildPersonaPrompt(persona, asked ?? question);

  return (
    <section
      aria-labelledby="explain-style-heading"
      className="flex flex-col gap-3 rounded-xl border border-border-default bg-surface p-4"
    >
      <div className="flex items-center gap-2">
        <Sparkles aria-hidden className="size-4 text-ai" strokeWidth={1.5} />
        <h4 id="explain-style-heading" className="text-sm font-semibold text-primary">
          Explain this persona’s voice
        </h4>
      </div>
      <p className="text-[13px] text-secondary">
        Runs one dry-run generation grounded ONLY in this persona’s record — when you ask, never
        automatically. Cost is shown per run.
      </p>

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          if (question.trim() !== '') ask(question);
        }}
      >
        <div className="min-w-0 flex-1">
          <Input
            label="Question about this persona"
            hideLabel
            placeholder="e.g. How formal is this voice?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isActive}
          />
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="submit" variant="secondary" disabled={isActive || question.trim() === ''}>
            Ask
          </Button>
          <Button
            type="button"
            variant="ai"
            disabled={isActive}
            loading={slice.status === 'thinking'}
            onClick={() => ask('')}
          >
            {slice.status === 'done' ? 'Explain again' : 'Explain the voice'}
          </Button>
        </div>
      </form>

      {slice.status !== 'idle' ? (
        <div className="flex flex-col gap-3" data-testid="explain-style-output">
          <StreamingMessage
            state={
              slice.status === 'thinking'
                ? 'thinking'
                : slice.status === 'streaming'
                  ? 'streaming'
                  : slice.status === 'error'
                    ? 'error'
                    : 'done'
            }
            text={slice.text}
            {...(slice.result ? { modelWhisper: slice.result.model } : {})}
            {...(slice.result ? { costWhisper: formatCost(slice.result.costUsd) } : {})}
            {...(slice.error ? { errorText: slice.error.message } : {})}
            onStop={stop}
            onRetry={() => ask(asked ?? '')}
          />
          {slice.status === 'done' ? (
            <>
              <TrustLabel trust="generated" sourceAvailable />
              <MemoryCard
                scope="This channel"
                kind="Persona"
                content={personaSummary(persona)}
                whyItMatters={`This is the record the answer was grounded in — ${persona.styleFeatures.length} derived style features included.`}
                onOpenExplorer={() => inspect({ type: 'persona', id: persona.id })}
              />
              <ExplainabilityPanel
                why={`You asked about “${persona.name}”. Nothing runs automatically.`}
                dataUsed={built.dataUsed}
                limits={built.limitations}
              />
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
