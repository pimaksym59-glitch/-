'use client';

/**
 * ExplainMetricsPanel (FS11 T-FS11.9, plan §5.2 D10). User-invoked AI over the
 * numbers this page ALREADY loaded, via the frozen dry-run path (§R10.9)
 * through the EXISTING verbatim relay — the FS6 gateway/stream machinery is
 * consumed as-is, never modified (plan §3.3, invariants I3/I6). Nothing
 * auto-runs; Stop cancels upstream and preserves the partial; the answer
 * carries Trust (Generated · Source Available), a card citing the panels it
 * read, Explainability with confidence honestly absent, and wire-only cost.
 *
 * What it may NOT do is the point (D3 §12 asked for "AI explains changes"):
 * no cause, no anomaly verdict, no forecast, no engagement claim. Those are
 * forbidden inside the pure builder, not merely discouraged in copy.
 *
 * The state split is deliberate (plan §3.4): the streamed text lives in the
 * transient assistant store; this component writes NOTHING to Query.
 */
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { MetricEntryVM, SeriesVM } from '@/entities/analytics-report';
import { DEFAULT_MODEL_ID } from '@/shared/config/models';
import { formatCost } from '@/shared/lib/format';
import { useAssistantStream } from '@/shared/lib/stream';
import { ExplainabilityPanel, KnowledgeCard, StreamingMessage, TrustLabel } from '@/shared/ui/ai';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { buildMetricsPrompt, EXPLAIN_METRICS_QUESTION } from '../model/buildMetricsPrompt';

export function ExplainMetricsPanel({
  channelId,
  channelLabel,
  rangeLabel,
  filters,
  metrics,
  series,
}: {
  readonly channelId: string;
  readonly channelLabel: string;
  readonly rangeLabel: string;
  readonly filters: readonly string[];
  readonly metrics: readonly MetricEntryVM[];
  readonly series: readonly SeriesVM[];
}): React.ReactElement {
  const { slice, isActive, start, stop } = useAssistantStream(
    `analytics:${channelId}:${rangeLabel}`,
  );
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState<string | null>(null);

  const input = { rangeLabel, channelLabel, filters, metrics, series };

  function ask(text: string): void {
    if (isActive) return;
    const built = buildMetricsPrompt(input, text);
    setAsked(text.trim() === '' ? EXPLAIN_METRICS_QUESTION : text.trim());
    void start({ prompt: built.prompt, model: DEFAULT_MODEL_ID });
  }

  // Explainability mirrors what was/would be sent — same pure builder, no drift.
  const built = buildMetricsPrompt(input, asked ?? question);

  return (
    <section
      aria-labelledby="explain-metrics-heading"
      className="flex flex-col gap-3 rounded-xl border border-border-default bg-surface p-4"
    >
      <div className="flex items-center gap-2">
        <Sparkles aria-hidden className="size-4 text-ai" strokeWidth={1.5} />
        <h2 id="explain-metrics-heading" className="text-sm font-semibold text-primary">
          Explain these numbers
        </h2>
      </div>
      <p className="text-[13px] text-secondary">
        Runs one dry-run generation grounded ONLY in the values on this page — when you ask, never
        automatically. It describes what the numbers show; it cannot tell you why they changed,
        because the data carries no causes.
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
            label="Question about these numbers"
            hideLabel
            placeholder="e.g. How did cost move across this range?"
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
            {slice.status === 'done' ? 'Describe again' : 'Describe the numbers'}
          </Button>
        </div>
      </form>

      {slice.status !== 'idle' ? (
        <div className="flex flex-col gap-3" data-testid="explain-metrics-output">
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
                title={`${channelLabel} · ${rangeLabel}`}
                snippet={built.dataUsed}
                source="this page"
              />
              <ExplainabilityPanel
                why={`You asked about the numbers loaded for ${rangeLabel}. Nothing runs automatically.`}
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
