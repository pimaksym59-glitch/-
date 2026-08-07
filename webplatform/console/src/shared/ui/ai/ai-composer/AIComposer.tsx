'use client';

import { clsx } from 'clsx';
import { Paperclip, Send, Sparkles, Square } from 'lucide-react';
import { useId, useRef } from 'react';
import { Button, type ButtonProps } from '../../button';
import { META_TEXT_TONE_CLASS } from '../../tone';

/**
 * AIComposer (D2 §13.15/§14). Growable textarea, attach, model/route selector
 * slot, send (⌘↵), Stop while streaming; token/cost whisper. Presentational —
 * the value/stream state lives at the call site (FS6). Sticky-bottom placement
 * is the screen's concern.
 */
export interface AIComposerProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly onSend: () => void;
  readonly streaming?: boolean;
  readonly onStop?: () => void;
  readonly onAttach?: () => void;
  /** Model/route selector slot (a `Select` with a hidden label, typically). */
  readonly modelSelector?: React.ReactNode;
  /** e.g. "~420 tokens · ~$0.003". */
  readonly costWhisper?: string;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly className?: string;
}

export function AIComposer({
  value,
  onValueChange,
  onSend,
  streaming = false,
  onStop,
  onAttach,
  modelSelector,
  costWhisper,
  placeholder = 'Ask your AI…',
  disabled = false,
  className,
}: AIComposerProps): React.ReactElement {
  const id = useId();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !streaming && value.trim()) {
      e.preventDefault();
      onSend();
    }
  }

  function autogrow(): void {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  return (
    <div
      className={clsx(
        'rounded-xl border border-border-default bg-raised p-2 transition-colors focus-within:border-border-strong',
        className,
      )}
    >
      <label htmlFor={id} className="sr-only">
        {placeholder}
      </label>
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          autogrow();
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="max-h-52 w-full resize-none bg-transparent px-2 py-1.5 text-sm text-primary outline-none placeholder:text-secondary"
      />
      <div className="flex items-center gap-2 px-1 pt-1">
        {onAttach ? (
          <button
            type="button"
            aria-label="Attach"
            onClick={onAttach}
            disabled={disabled}
            className="inline-flex size-7 items-center justify-center rounded-md text-secondary transition-colors hover:bg-interactive-subtle hover:text-primary"
          >
            <Paperclip aria-hidden className="size-4" />
          </button>
        ) : null}
        {modelSelector}
        {/* 12px real text — `secondary` per the FS5 §6.4 small-text rule. */}
        {costWhisper ? (
          <span className={clsx('font-mono text-xs', META_TEXT_TONE_CLASS.secondary)}>
            {costWhisper}
          </span>
        ) : null}
        <span className="ml-auto">
          {streaming ? (
            <Button size="sm" variant="secondary" onClick={onStop} aria-label="Stop generating">
              <Square aria-hidden className="size-3 fill-current" />
              Stop
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ai"
              onClick={onSend}
              disabled={disabled || value.trim().length === 0}
              aria-keyshortcuts="Meta+Enter Control+Enter"
            >
              <Send aria-hidden className="size-3.5" />
              Send
            </Button>
          )}
        </span>
      </div>
    </div>
  );
}

/**
 * AIActionButton (Stage 3 §2) — the canonical AI-flavored action trigger
 * (generate/ask). A Button `ai` variant with the Sparkles mark; Aurora only on
 * genuine AI moments.
 */
export type AIActionButtonProps = Omit<ButtonProps, 'variant'>;

export function AIActionButton({ children, ...rest }: AIActionButtonProps): React.ReactElement {
  return (
    <Button variant="ai" {...rest}>
      <Sparkles aria-hidden className="size-3.5" />
      {children}
    </Button>
  );
}
