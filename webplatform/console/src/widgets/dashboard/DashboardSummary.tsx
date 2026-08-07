'use client';

/**
 * “What changed today?” — the REAL AI summary card (FS6 T-FS6.9, replaces the
 * FS5 honest seam). Owner's binding conditions hold by construction:
 *  - runs ONLY on an explicit user action (nothing on mount, no auto-run);
 *  - the prompt is built by the pure `buildSummaryPrompt` — gated metrics
 *    never enter it and are named in Limits;
 *  - Trust + Explainability accompany the output; cost/model come from the
 *    wire; confidence is NOT rendered (the contract carries none — honesty
 *    over invention).
 */
import { useAnalytics, useCost } from '@/entities/analytics';
import { useJobs } from '@/entities/job';
import { useNeedsReview } from '@/entities/post';
import { formatCost } from '@/shared/lib/format';
import { useAssistantStream } from '@/shared/lib/stream';
import { useCan } from '@/shared/providers';
import { AIActionButton, ExplainabilityPanel, StreamingMessage, TrustLabel } from '@/shared/ui/ai';
import { buildSummaryPrompt } from './summary-prompt';

export function DashboardSummary({
  channelId,
  channelName,
}: {
  readonly channelId: string;
  readonly channelName: string;
}): React.ReactElement {
  const can = useCan();
  // Cached by the tiles' queries — no extra fetches happen here.
  const analytics = useAnalytics(channelId);
  const costs = useCost();
  const jobs = useJobs(channelId);
  const needsReview = useNeedsReview(channelId);
  const { slice, isActive, start, stop } = useAssistantStream(`summary:${channelId}`);

  const canGenerate = can('content.edit');

  const generate = (): void => {
    const built = buildSummaryPrompt({
      channelName,
      analytics: analytics.data ?? null,
      costs: costs.data ?? null,
      jobs: jobs.data ?? null,
      needsReview: needsReview.data ?? null,
    });
    void start({ prompt: built.prompt, model: 'claude-haiku-4-5' });
  };

  // Explainability reflects what WOULD have been / was sent — recomputed from
  // the same pure builder so the two can never drift.
  const built = buildSummaryPrompt({
    channelName,
    analytics: analytics.data ?? null,
    costs: costs.data ?? null,
    jobs: jobs.data ?? null,
    needsReview: needsReview.data ?? null,
  });

  return (
    <section
      aria-labelledby="dash-ai"
      className="rounded-xl border border-border-default bg-surface p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="dash-ai" className="text-sm font-semibold text-primary">
          “What changed today?”
        </h2>
        {canGenerate ? (
          <AIActionButton
            size="sm"
            onClick={generate}
            disabled={isActive}
            loading={slice.status === 'thinking'}
          >
            {slice.status === 'done' ? 'Regenerate' : 'Generate summary'}
          </AIActionButton>
        ) : null}
      </div>

      {!canGenerate ? (
        <p className="mt-2 text-sm text-secondary">
          The AI summary is an editor action — your role reads the dashboard without invoking
          generation.
        </p>
      ) : slice.status === 'idle' ? (
        <p className="mt-2 text-sm text-secondary">
          Runs one dry-run generation over today’s {channelName} metrics — only when you ask, never
          automatically. Cost is shown per run.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-3" data-testid="dashboard-summary-output">
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
            onRetry={generate}
          />
          {slice.status === 'done' ? (
            <>
              <TrustLabel trust="generated" sourceAvailable />
              <ExplainabilityPanel
                why={`You asked for a summary of today's metrics for “${channelName}”. Nothing runs automatically.`}
                dataUsed={built.dataUsed}
                limits={built.limitations}
              />
            </>
          ) : null}
        </div>
      )}
    </section>
  );
}
