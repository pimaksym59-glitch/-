'use client';

/**
 * ExplainJobPanel (FS12 T-FS12.15). User-invoked AI over ONE task record via
 * the frozen dry-run path (§R10.9) through the EXISTING verbatim relay — the
 * FS6 gateway/stream machinery is consumed as-is, never modified (plan §3.3).
 * Nothing auto-runs; Stop cancels upstream and preserves the partial; the
 * answer carries Trust (Generated · Source Available) and a KnowledgeCard
 * citing the actual task record (provenance, not model claims), Explainability
 * with confidence honestly absent, wire-only cost.
 *
 * RBAC: rendered only for `content.edit` (the owner's D12 ruling). The streamed
 * text lives in the transient assistant store; this component writes NOTHING to
 * Query (plan §3.4).
 */
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { QueueTaskVM } from '@/entities/job-queue';
import { DEFAULT_MODEL_ID } from '@/shared/config/models';
import { formatCost } from '@/shared/lib/format';
import { useAssistantStream } from '@/shared/lib/stream';
import { ExplainabilityPanel, KnowledgeCard, StreamingMessage, TrustLabel } from '@/shared/ui/ai';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { buildJobPrompt, EXPLAIN_JOB_QUESTION } from '../model/buildJobPrompt';

const SNIPPET_MAX = 160;

export function taskSnippet(task: QueueTaskVM): string {
  const source =
    task.error ?? `${task.type} · ${task.rawStatus} · ${String(task.attempts)} attempts`;
  return source.length > SNIPPET_MAX ? `${source.slice(0, SNIPPET_MAX - 1)}…` : source;
}

export function ExplainJobPanel({ task }: { readonly task: QueueTaskVM }): React.ReactElement {
  const { slice, isActive, start, stop } = useAssistantStream(`task:${task.id}`);
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState<string | null>(null);

  function ask(text: string): void {
    if (isActive) return;
    const built = buildJobPrompt(task, text);
    setAsked(text.trim() === '' ? EXPLAIN_JOB_QUESTION : text.trim());
    void start({ prompt: built.prompt, model: DEFAULT_MODEL_ID });
  }

  // Explainability mirrors what was/would be sent — same pure builder, no drift.
  const built = buildJobPrompt(task, asked ?? question);

  return (
    <section
      aria-labelledby="explain-job-heading"
      className="flex flex-col gap-3 rounded-xl border border-border-default bg-surface p-4"
    >
      <div className="flex items-center gap-2">
        <Sparkles aria-hidden className="size-4 text-ai" strokeWidth={1.5} />
        <h3 id="explain-job-heading" className="text-sm font-semibold text-primary">
          Explain this task
        </h3>
      </div>
      <p className="text-[13px] text-secondary">
        Runs one dry-run generation grounded ONLY in this task record — when you ask, never
        automatically. It has no access to logs, so it cannot name a cause the record does not
        carry.
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
            label="Question about this task"
            hideLabel
            placeholder="e.g. What does this error field mean?"
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
            {slice.status === 'done' ? 'Explain again' : 'Explain this task'}
          </Button>
        </div>
      </form>

      {slice.status !== 'idle' ? (
        <div className="flex flex-col gap-3" data-testid="explain-job-output">
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
                title={`Task record ${task.id}`}
                snippet={taskSnippet(task)}
                source={task.type}
              />
              <ExplainabilityPanel
                why={`You asked about task ${task.id}. Nothing runs automatically.`}
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
