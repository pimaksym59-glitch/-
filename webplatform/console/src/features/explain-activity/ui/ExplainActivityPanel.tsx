'use client';

/**
 * ExplainActivityPanel (FS13 T-FS13.10 — D3 §24's "AI summarizes your recent
 * activity"). User-invoked AI over the records ALREADY LOADED on this tab, via
 * the frozen dry-run path (§R10.9) through the UNCHANGED FS6 relay.
 *
 * Nothing auto-runs. Stop cancels upstream and preserves the partial. The
 * answer carries Trust (Generated · Source Available, because the source is the
 * user's own audit records), Explainability with **confidence honestly absent**
 * (the contract carries no confidence field), and wire-only cost. It writes
 * NOTHING to Query.
 *
 * D3 §24 also asks this row for "security tips". It does not give them: the
 * audit log records actions, not posture, so a tip would be a recommendation
 * with no data behind it. That refusal is enforced in the prompt and proven by
 * `tests/unit/activity-prompt.test.ts`, not left to the model's discretion.
 */
import { Sparkles } from 'lucide-react';
import type { AuditRecordVM } from '@/entities/audit';
import { DEFAULT_MODEL_ID } from '@/shared/config/models';
import { formatCost } from '@/shared/lib/format';
import { useAssistantStream } from '@/shared/lib/stream';
import { ExplainabilityPanel, KnowledgeCard, StreamingMessage, TrustLabel } from '@/shared/ui/ai';
import { Button } from '@/shared/ui/button';
import { ACTIVITY_PROMPT_LIMIT, buildActivityPrompt } from '../model/buildActivityPrompt';

export function ExplainActivityPanel({
  records,
}: {
  readonly records: readonly AuditRecordVM[];
}): React.ReactElement {
  const { slice, isActive, start, stop } = useAssistantStream('activity:self');
  const used = Math.min(records.length, ACTIVITY_PROMPT_LIMIT);

  function ask(): void {
    if (isActive) return;
    void start({ prompt: buildActivityPrompt(records), model: DEFAULT_MODEL_ID });
  }

  return (
    <section
      aria-labelledby="explain-activity-heading"
      className="flex flex-col gap-3 rounded-xl border border-border-default bg-surface p-4"
    >
      <div className="flex items-center gap-2">
        <Sparkles aria-hidden className="size-4 text-ai" strokeWidth={1.5} />
        <h3 id="explain-activity-heading" className="text-sm font-semibold text-primary">
          Summarize your activity
        </h3>
      </div>
      <p className="text-[13px] text-secondary">
        Runs one dry-run generation grounded only in the {used} record
        {used === 1 ? '' : 's'} loaded on this tab — when you ask, never automatically. It cannot
        see anything else, so it will not tell you whether your account is secure.
      </p>

      <div>
        <Button
          type="button"
          variant="ai"
          disabled={isActive}
          loading={slice.status === 'thinking'}
          onClick={ask}
        >
          {slice.status === 'done' ? 'Summarize again' : 'Summarize activity'}
        </Button>
      </div>

      {slice.status !== 'idle' ? (
        <div className="flex flex-col gap-3" data-testid="explain-activity-output">
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
            onRetry={ask}
          />
          {slice.status === 'done' ? (
            <>
              <TrustLabel trust="generated" sourceAvailable />
              <KnowledgeCard
                title={`Your audit records (${String(used)} shown)`}
                snippet="Actions the platform recorded for your user id, newest first."
                source="audit-log"
              />
              <ExplainabilityPanel
                why="You asked for a summary of the records on this tab. Nothing runs automatically."
                dataUsed={`${String(used)} audit record${used === 1 ? '' : 's'} already loaded on this tab — each one's time, action, entity, change kind and the names of the fields that changed. Nothing else was sent.`}
                limits={
                  'This is one loaded page of records, not your full history. The audit log records what changed, not why, so no cause, intent or risk is inferred. No security assessment or recommendation is produced — the data does not support one. The response carries no confidence value, so none is shown.'
                }
              />
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
