'use client';

/**
 * ExplainVerificationPanel (FS9 T-FS9.9). User-invoked AI over ONE image
 * record + its similarity report via the frozen dry-run path (§R10.9) through
 * the EXISTING verbatim relay — the FS6 gateway/stream machinery is consumed
 * as-is, never modified (plan §3.3, invariants I3/I6). Nothing auto-runs; Stop
 * cancels upstream and preserves the partial; the answer carries Trust
 * (Generated · Source Available) and a **KnowledgeCard citing the actual image
 * record** (provenance, not model claims), Explainability with confidence
 * honestly absent, wire-only cost.
 *
 * The state split is deliberate (plan §3.4): the streamed text lives in the
 * transient assistant store; this component writes NOTHING to Query.
 */
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { ImageVM, SimilarityReportVM } from '@/entities/image';
import { DEFAULT_MODEL_ID } from '@/shared/config/models';
import { useInspector } from '@/shared/hooks';
import { formatCost } from '@/shared/lib/format';
import { useAssistantStream } from '@/shared/lib/stream';
import { ExplainabilityPanel, KnowledgeCard, StreamingMessage, TrustLabel } from '@/shared/ui/ai';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { buildImagePrompt, EXPLAIN_IMAGE_QUESTION } from '../model/buildImagePrompt';

const SNIPPET_MAX = 160;

/** The card's snippet — the image's own prompt, clamped. */
export function imageSnippet(image: ImageVM): string {
  const source = image.prompt ?? image.style ?? image.provider ?? image.id;
  return source.length > SNIPPET_MAX ? `${source.slice(0, SNIPPET_MAX - 1)}…` : source;
}

export function ExplainVerificationPanel({
  image,
  report,
}: {
  readonly image: ImageVM;
  readonly report: SimilarityReportVM | null;
}): React.ReactElement {
  const { inspect } = useInspector();
  const { slice, isActive, start, stop } = useAssistantStream(`image:${image.id}`);
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState<string | null>(null);

  function ask(text: string): void {
    if (isActive) return;
    const built = buildImagePrompt(image, report, text);
    setAsked(text.trim() === '' ? EXPLAIN_IMAGE_QUESTION : text.trim());
    void start({ prompt: built.prompt, model: DEFAULT_MODEL_ID });
  }

  // Explainability mirrors what was/would be sent — same pure builder, no drift.
  const built = buildImagePrompt(image, report, asked ?? question);

  return (
    <section
      aria-labelledby="explain-verification-heading"
      className="flex flex-col gap-3 rounded-xl border border-border-default bg-surface p-4"
    >
      <div className="flex items-center gap-2">
        <Sparkles aria-hidden className="size-4 text-ai" strokeWidth={1.5} />
        <h4 id="explain-verification-heading" className="text-sm font-semibold text-primary">
          Explain this image’s verification
        </h4>
      </div>
      <p className="text-[13px] text-secondary">
        Runs one dry-run generation grounded ONLY in this record and its similarity report — when
        you ask, never automatically. Cost is shown per run.
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
            label="Question about this image"
            hideLabel
            placeholder="e.g. Is this close to an earlier image?"
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
            {slice.status === 'done' ? 'Explain again' : 'Explain the checks'}
          </Button>
        </div>
      </form>

      {slice.status !== 'idle' ? (
        <div className="flex flex-col gap-3" data-testid="explain-verification-output">
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
              <KnowledgeCard
                title={`Image record ${image.id}`}
                snippet={imageSnippet(image)}
                source={image.provider ?? 'this channel'}
                onOpen={() => inspect({ type: 'image', id: image.id })}
              />
              <ExplainabilityPanel
                why={`You asked about image ${image.id}. Nothing runs automatically.`}
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
