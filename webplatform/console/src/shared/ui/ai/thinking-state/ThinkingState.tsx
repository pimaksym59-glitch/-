'use client';

import { clsx } from 'clsx';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

/**
 * ThinkingState (D2 §14). Pre-token state: a compact "Thinking…" row with an
 * Aurora shimmer bar (never a spinner — §F3.3) and an optional expandable
 * reasoning/steps disclosure. Reduced-motion collapses the shimmer to static
 * (themes.css handles the animation kill).
 */
export interface ThinkingStep {
  readonly id: string;
  readonly label: string;
}

export interface ThinkingStateProps {
  readonly label?: string;
  readonly steps?: readonly ThinkingStep[];
  readonly className?: string;
}

export function ThinkingState({
  label = 'Thinking…',
  steps,
  className,
}: ThinkingStateProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <div role="status" aria-live="polite" className={clsx('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-3">
        <span className="text-sm text-secondary">{label}</span>
        <span
          aria-hidden
          className="onyx-skeleton h-1 w-24 rounded-pill"
          style={{ background: 'var(--ai-wash)' }}
        />
        {steps && steps.length > 0 ? (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-[13px] font-medium text-secondary transition-colors hover:text-primary"
          >
            {open ? (
              <ChevronDown aria-hidden className="size-3.5" />
            ) : (
              <ChevronRight aria-hidden className="size-3.5" />
            )}
            Steps
          </button>
        ) : null}
      </div>
      {open && steps ? (
        <ol className="ml-1 flex flex-col gap-1 border-l border-border-subtle pl-3">
          {steps.map((step) => (
            <li key={step.id} className="text-[13px] text-secondary">
              {step.label}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
