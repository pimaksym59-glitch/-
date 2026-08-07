'use client';

import { clsx } from 'clsx';
import { Copy, GitBranch, Quote, RotateCcw, Send, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Markdown } from '../../markdown/lazy';
import { META_TEXT_TONE_CLASS } from '../../tone';
import { ThinkingState } from '../thinking-state/ThinkingState';

/**
 * StreamingMessage (D2 §14 — the flagship AI surface). Assistant bubble that
 * renders tokens progressively with the Iris caret at the write head and a 1px
 * Aurora edge while streaming; sticky Stop; "jump to latest" pill when the
 * user scrolled up; model/route + cost whisper; hover/focus actions (copy,
 * retry, branch, insert-to-channel, cite). Presentational — the stream itself
 * arrives via props (FS6 wires `useAssistantStream`).
 */
export type StreamingMessageState = 'thinking' | 'streaming' | 'done' | 'error';

export interface StreamingMessageProps {
  readonly state: StreamingMessageState;
  readonly text: string;
  /** e.g. "claude-opus-4-8 · draft route". */
  readonly modelWhisper?: string;
  /** e.g. "$0.004 · 1.2s". */
  readonly costWhisper?: string;
  readonly errorText?: string;
  readonly onStop?: () => void;
  readonly onCopy?: () => void;
  readonly onRetry?: () => void;
  readonly onBranch?: () => void;
  readonly onInsertToChannel?: () => void;
  readonly onCite?: () => void;
  readonly onCitation?: (index: number) => void;
  readonly className?: string;
}

export function StreamingMessage({
  state,
  text,
  modelWhisper,
  costWhisper,
  errorText,
  onStop,
  onCopy,
  onRetry,
  onBranch,
  onInsertToChannel,
  onCite,
  onCitation,
  className,
}: StreamingMessageProps): React.ReactElement {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [pinned, setPinned] = useState(true);

  // Auto-scroll while streaming unless the user scrolled up (jump pill).
  useEffect(() => {
    if (state === 'streaming' && pinned && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [text, state, pinned]);

  const actions: readonly {
    label: string;
    icon: React.ReactNode;
    onClick?: (() => void) | undefined;
  }[] = [
    { label: 'Copy', icon: <Copy aria-hidden className="size-3.5" />, onClick: onCopy },
    { label: 'Retry', icon: <RotateCcw aria-hidden className="size-3.5" />, onClick: onRetry },
    { label: 'Branch', icon: <GitBranch aria-hidden className="size-3.5" />, onClick: onBranch },
    {
      label: 'Insert to channel',
      icon: <Send aria-hidden className="size-3.5" />,
      onClick: onInsertToChannel,
    },
    { label: 'Cite', icon: <Quote aria-hidden className="size-3.5" />, onClick: onCite },
  ];

  return (
    <div className={clsx('group relative', className)}>
      <div
        data-state={state}
        className={clsx(
          'relative rounded-xl bg-raised p-4',
          state === 'streaming' && 'onyx-aurora-edge',
        )}
      >
        {state === 'thinking' ? (
          <ThinkingState />
        ) : state === 'error' ? (
          <p role="alert" className="text-sm text-danger">
            {errorText ?? 'Generation failed.'}
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="ml-2 font-medium underline underline-offset-2 hover:text-primary"
              >
                Retry
              </button>
            ) : null}
          </p>
        ) : (
          <div
            ref={scrollRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              setPinned(el.scrollHeight - el.scrollTop - el.clientHeight < 24);
            }}
            className="max-h-[480px] overflow-y-auto"
            aria-live={state === 'streaming' ? 'polite' : undefined}
          >
            {state === 'streaming' ? (
              <p className="whitespace-pre-wrap text-[15px] leading-7 text-primary">
                {text}
                <span
                  aria-hidden
                  className="onyx-caret ml-0.5 inline-block h-4 w-0.5 align-middle"
                />
              </p>
            ) : (
              <Markdown {...(onCitation ? { onCitation } : {})}>{text}</Markdown>
            )}
          </div>
        )}
        {state === 'streaming' && !pinned ? (
          <button
            type="button"
            onClick={() => {
              setPinned(true);
              scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
            }}
            className="onyx-floating absolute bottom-3 left-1/2 -translate-x-1/2 rounded-pill px-3 py-1 text-[13px] font-medium text-primary"
          >
            Jump to latest
          </button>
        ) : null}
      </div>

      <div className="mt-1.5 flex items-center gap-3">
        {/* Whispers are 12px REAL text — the FS5 §6.4 rule applies: `secondary`
            (rendered axe fails `tertiary` at this size). */}
        {modelWhisper ? (
          <span className={clsx('text-xs', META_TEXT_TONE_CLASS.secondary)}>{modelWhisper}</span>
        ) : null}
        {costWhisper ? (
          <span className={clsx('font-mono text-xs', META_TEXT_TONE_CLASS.secondary)}>
            {costWhisper}
          </span>
        ) : null}
        {state === 'streaming' && onStop ? (
          <button
            type="button"
            onClick={onStop}
            className="ml-auto inline-flex items-center gap-1 rounded-md border border-border-default px-2 py-0.5 text-[13px] font-medium text-primary transition-colors hover:border-border-strong"
          >
            <Square aria-hidden className="size-3 fill-current" />
            Stop
          </button>
        ) : null}
        {state === 'done' ? (
          <span className="ml-auto flex items-center gap-1 opacity-0 transition-opacity duration-[120ms] focus-within:opacity-100 group-hover:opacity-100">
            {actions
              .filter((a) => a.onClick)
              .map((a) => (
                <button
                  key={a.label}
                  type="button"
                  aria-label={a.label}
                  onClick={a.onClick}
                  className="inline-flex size-7 items-center justify-center rounded-md text-secondary transition-colors hover:bg-interactive-subtle hover:text-primary"
                >
                  {a.icon}
                </button>
              ))}
          </span>
        ) : null}
      </div>
    </div>
  );
}
