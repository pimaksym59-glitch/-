'use client';

/**
 * AskDocumentPanel (FS7 T-FS7.6). User-invoked AI over ONE document through
 * the frozen dry-run path (§R10.9) via the EXISTING verbatim relay — the
 * gateway/stream machinery is consumed as-is, never modified (plan §3.3).
 * Nothing auto-runs; Stop cancels upstream and preserves the partial; the
 * answer carries Trust (Generated · Source Available), a **Citation resolving
 * to the actual source document** (provenance truth, §5.2 D2), a KnowledgeCard
 * WITHOUT a retrieval score (none exists on the wire), Explainability
 * (confidence honestly absent) and wire-only cost. RBAC: mounted only for
 * `content.edit` (the reader gates it).
 */
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { DocumentDetailVM } from '@/entities/document';
import { DEFAULT_MODEL_ID } from '@/shared/config/models';
import { formatCost } from '@/shared/lib/format';
import { useAssistantStream } from '@/shared/lib/stream';
import { useInspector } from '@/shared/hooks';
import {
  Citation,
  ExplainabilityPanel,
  KnowledgeCard,
  StreamingMessage,
  TrustLabel,
} from '@/shared/ui/ai';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { buildDocumentPrompt, SUMMARIZE_QUESTION } from '../model/buildDocumentPrompt';

const SNIPPET_MAX = 160;

/** First non-heading content line, clamped — the citation/card snippet. */
export function snippetOf(content: string): string {
  const line =
    content
      .split('\n')
      .map((l) => l.replace(/^[#>\-*\s]+/, '').trim())
      .find((l) => l !== '') ?? '';
  return line.length > SNIPPET_MAX ? `${line.slice(0, SNIPPET_MAX - 1)}…` : line;
}

export function AskDocumentPanel({ doc }: { readonly doc: DocumentDetailVM }): React.ReactElement {
  const { inspect } = useInspector();
  const { slice, isActive, start, stop } = useAssistantStream(`document:${doc.id}`);
  const [question, setQuestion] = useState('');
  const [askedQuestion, setAskedQuestion] = useState<string | null>(null);

  const content = doc.content ?? '';

  function ask(text: string): void {
    if (isActive) return;
    const built = buildDocumentPrompt({
      docTitle: doc.title,
      docSource: doc.source,
      docVersion: doc.version,
      content,
      question: text,
    });
    setAskedQuestion(text.trim() === '' ? SUMMARIZE_QUESTION : text.trim());
    void start({ prompt: built.prompt, model: DEFAULT_MODEL_ID });
  }

  // Explainability mirrors what was/would be sent — same pure builder, no drift.
  const built = buildDocumentPrompt({
    docTitle: doc.title,
    docSource: doc.source,
    docVersion: doc.version,
    content,
    question: askedQuestion ?? question,
  });

  return (
    <section
      aria-labelledby="ask-document-heading"
      className="flex flex-col gap-3 rounded-xl border border-border-default bg-surface p-4"
    >
      <div className="flex items-center gap-2">
        <Sparkles aria-hidden className="size-4 text-ai" strokeWidth={1.5} />
        <h4 id="ask-document-heading" className="text-sm font-semibold text-primary">
          Ask about this document
        </h4>
      </div>
      <p className="text-[13px] text-secondary">
        Runs one dry-run generation grounded ONLY in this document’s text — when you ask, never
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
            label="Question about this document"
            hideLabel
            placeholder="e.g. What tone rules apply to numbers?"
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
            {slice.status === 'done' ? 'Summarize again' : 'Summarize document'}
          </Button>
        </div>
      </form>

      {slice.status !== 'idle' ? (
        <div className="flex flex-col gap-3" data-testid="ask-document-output">
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
            onRetry={() => ask(askedQuestion ?? '')}
          />
          {slice.status === 'done' ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <TrustLabel trust="generated" sourceAvailable />
                <span className="text-[13px] text-secondary">
                  Source
                  <Citation
                    index={1}
                    sourceTitle={doc.title}
                    snippet={snippetOf(content)}
                    onOpen={() => inspect({ type: 'document', id: doc.id })}
                  />
                  — the document you provided.
                </span>
              </div>
              <KnowledgeCard
                title={doc.title}
                snippet={snippetOf(content)}
                source={doc.source}
                onOpen={() => inspect({ type: 'document', id: doc.id })}
              />
              <ExplainabilityPanel
                why={`You asked about “${doc.title}”. Nothing runs automatically.`}
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
