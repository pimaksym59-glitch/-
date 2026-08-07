'use client';

import { clsx } from 'clsx';
import { ChevronDown, ChevronRight, Wrench } from 'lucide-react';
import { useState } from 'react';
import { StatusBadge } from '../../badge/Badge';
import { META_TEXT_TONE_CLASS } from '../../tone';
import { STATUS, type Status } from '@/shared/types/status';

/**
 * ToolCall (D2 §14). Inline card for an AI capability invocation (retrieve
 * knowledge, generate image, run validation): header (tool + status),
 * collapsible input/output summary, duration whisper. Read-only,
 * provenance-forward.
 */
export type ToolCallStatus = Extract<Status, 'running' | 'completed' | 'failed'>;

export interface ToolCallProps {
  readonly tool: string;
  readonly status: ToolCallStatus;
  readonly inputSummary?: string;
  readonly outputSummary?: string;
  readonly durationLabel?: string;
  readonly className?: string;
}

export function ToolCall({
  tool,
  status,
  inputSummary,
  outputSummary,
  durationLabel,
  className,
}: ToolCallProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const hasDetail = Boolean(inputSummary ?? outputSummary);
  return (
    <div
      data-status={status}
      className={clsx('rounded-lg border border-border-subtle bg-inset px-3 py-2', className)}
    >
      <div className="flex items-center gap-2">
        {hasDetail ? (
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? `Collapse ${tool} details` : `Expand ${tool} details`}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex size-5 items-center justify-center rounded-sm text-secondary hover:bg-interactive-subtle hover:text-primary"
          >
            {open ? (
              <ChevronDown aria-hidden className="size-3.5" />
            ) : (
              <ChevronRight aria-hidden className="size-3.5" />
            )}
          </button>
        ) : (
          <Wrench aria-hidden className="size-3.5 text-secondary" strokeWidth={1.5} />
        )}
        <span className="text-[13px] font-medium text-primary">{tool}</span>
        <StatusBadge
          status={
            status === 'running'
              ? STATUS.running
              : status === 'completed'
                ? STATUS.completed
                : STATUS.failed
          }
        />
        {durationLabel ? (
          <span className={clsx('ml-auto font-mono text-xs', META_TEXT_TONE_CLASS.tertiary)}>
            {durationLabel}
          </span>
        ) : null}
      </div>
      {open && hasDetail ? (
        <dl className="mt-2 flex flex-col gap-1 border-t border-border-subtle pt-2 text-[13px]">
          {inputSummary ? (
            <div className="flex gap-2">
              <dt className="shrink-0 font-medium text-secondary">Input</dt>
              <dd className="min-w-0 text-secondary">{inputSummary}</dd>
            </div>
          ) : null}
          {outputSummary ? (
            <div className="flex gap-2">
              <dt className="shrink-0 font-medium text-secondary">Output</dt>
              <dd className="min-w-0 text-primary">{outputSummary}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}
