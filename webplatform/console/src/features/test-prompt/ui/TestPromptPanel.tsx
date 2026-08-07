'use client';

/**
 * TestPromptPanel (FS10 T-FS10.8). User-invoked dry-run of ONE prompt version
 * via the frozen `POST /studio/dry-run` (§R10.9) through the **EXISTING**
 * verbatim relay — the FS6 gateway/stream machinery is consumed as-is, never
 * modified (plan §3.3, invariants I3/I6).
 *
 * The owner's D8 boundaries, encoded:
 *  - **test only** — no AI-generated prompt draft, no "refine this prompt", no
 *    model comparison (that is `POST /studio/compare`, the Playground's call);
 *  - **no auto-save** — the output is displayed, never written into a version;
 *    saving is the human's explicit act in the composer (§R11.4);
 *  - nothing auto-runs; Stop cancels upstream and preserves the partial;
 *  - Trust (Generated · Source Available), a card citing **the version row**,
 *    Explainability with confidence honestly absent, wire-only cost.
 *
 * State split (plan §3.4): the streamed text lives in the transient assistant
 * store; this component writes NOTHING to Query.
 */
import { FlaskConical } from 'lucide-react';
import { useState } from 'react';
import type { PromptVersionVM } from '@/entities/prompt';
import { DEFAULT_MODEL_ID } from '@/shared/config/models';
import { useInspector } from '@/shared/hooks';
import { formatCost } from '@/shared/lib/format';
import { useAssistantStream } from '@/shared/lib/stream';
import { ExplainabilityPanel, KnowledgeCard, StreamingMessage, TrustLabel } from '@/shared/ui/ai';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { buildPromptRun } from '../model/buildPromptRun';

const SNIPPET_MAX = 160;

/** The card's snippet — the version's own text, clamped. */
export function versionSnippet(version: PromptVersionVM): string {
  const source = version.text;
  return source.length > SNIPPET_MAX ? `${source.slice(0, SNIPPET_MAX - 1)}…` : source;
}

export function TestPromptPanel({
  version,
  typeLabel,
}: {
  readonly version: PromptVersionVM;
  readonly typeLabel: string;
}): React.ReactElement {
  const { inspect } = useInspector();
  const { slice, isActive, start, stop } = useAssistantStream(`prompt:${version.id}`);
  const [sample, setSample] = useState('');
  const [ran, setRan] = useState<string | null>(null);

  function run(text: string): void {
    if (isActive) return;
    const built = buildPromptRun(version, text);
    setRan(text.trim());
    void start({ prompt: built.prompt, model: DEFAULT_MODEL_ID });
  }

  // Explainability mirrors what was/would be sent — same pure builder, no drift.
  const built = buildPromptRun(version, ran ?? sample);

  return (
    <section
      aria-labelledby="test-prompt-heading"
      className="flex flex-col gap-3 rounded-xl border border-border-default bg-surface p-4"
    >
      <div className="flex items-center gap-2">
        <FlaskConical aria-hidden className="size-4 text-ai" strokeWidth={1.5} />
        <h4 id="test-prompt-heading" className="text-sm font-semibold text-primary">
          Test this version
        </h4>
      </div>
      <p className="text-[13px] text-secondary">
        Runs v{version.version} of the {typeLabel} prompt once as an isolated dry-run — when you
        ask, never automatically. It publishes nothing and writes nothing to channel memory
        (§R10.9). Cost is shown per run.
      </p>

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          run(sample);
        }}
      >
        <div className="min-w-0 flex-1">
          <Input
            label="Optional sample input"
            hideLabel
            placeholder="Optional: a topic or sample input for this run"
            value={sample}
            onChange={(e) => setSample(e.target.value)}
            disabled={isActive}
          />
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="submit"
            variant="ai"
            disabled={isActive}
            loading={slice.status === 'thinking'}
          >
            {slice.status === 'done' ? 'Run again' : 'Run test'}
          </Button>
        </div>
      </form>

      {slice.status !== 'idle' ? (
        <div className="flex flex-col gap-3" data-testid="test-prompt-output">
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
            onRetry={() => run(ran ?? '')}
          />
          {slice.status === 'done' ? (
            <>
              <TrustLabel trust="generated" sourceAvailable />
              <KnowledgeCard
                title={`${typeLabel} · v${version.version}`}
                snippet={versionSnippet(version)}
                // SHORT by necessity, not by taste: the card's source slot is
                // `ml-auto shrink-0`, so a long string squeezes the `truncate`
                // title to zero width and the provenance becomes invisible
                // (caught by the E2E gate at 1280px). The row id is the honest
                // provenance token and fits; the ONYX component is untouched
                // (the FS7/FS9 rule — fix the call site, never the primitive).
                source={version.id}
                onOpen={() => inspect({ type: 'prompt', id: version.id })}
              />
              <ExplainabilityPanel
                why={`You ran v${version.version} of the ${typeLabel} prompt. Nothing runs automatically, and this output is not saved anywhere.`}
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
