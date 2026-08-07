'use client';

import { clsx } from 'clsx';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';
import { useState } from 'react';

/**
 * ExplainabilityPanel (D2 §14 / owner requirement 15). The deep form of AI
 * trust: why this output · what data was used · confidence · limits. Rendered
 * as a quiet collapsible panel under an AI block.
 */
export interface ExplainabilityPanelProps {
  readonly why: string;
  readonly dataUsed: string;
  /** 0..1 — rendered as a calm bar + percent. */
  readonly confidence?: number;
  readonly limits?: string;
  readonly defaultOpen?: boolean;
  readonly className?: string;
}

export function ExplainabilityPanel({
  why,
  dataUsed,
  confidence,
  limits,
  defaultOpen = false,
  className,
}: ExplainabilityPanelProps): React.ReactElement {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={clsx('rounded-lg border border-border-subtle bg-inset', className)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-secondary transition-colors hover:text-primary"
      >
        {open ? (
          <ChevronDown aria-hidden className="size-3.5" />
        ) : (
          <ChevronRight aria-hidden className="size-3.5" />
        )}
        <Info aria-hidden className="size-3.5" strokeWidth={1.5} />
        Why this output
      </button>
      {open ? (
        <dl className="flex flex-col gap-2 border-t border-border-subtle px-3 py-2.5 text-[13px]">
          <div>
            <dt className="font-medium text-secondary">Why</dt>
            <dd className="mt-0.5 text-primary">{why}</dd>
          </div>
          <div>
            <dt className="font-medium text-secondary">Data used</dt>
            <dd className="mt-0.5 text-primary">{dataUsed}</dd>
          </div>
          {confidence !== undefined ? (
            <div>
              <dt className="font-medium text-secondary">Confidence</dt>
              <dd className="mt-1 flex items-center gap-2">
                <span
                  role="img"
                  aria-label={`Confidence ${(confidence * 100).toFixed(0)} percent`}
                  className="h-1 w-32 overflow-hidden rounded-pill bg-[color:var(--surface-base)]"
                >
                  <span
                    className="block h-full rounded-pill bg-[color:var(--ai-accent)] opacity-70"
                    style={{ width: `${Math.min(100, Math.max(0, confidence * 100))}%` }}
                  />
                </span>
                <span className="font-mono text-xs text-secondary">
                  {(confidence * 100).toFixed(0)}%
                </span>
              </dd>
            </div>
          ) : null}
          {limits ? (
            <div>
              <dt className="font-medium text-secondary">Limits</dt>
              <dd className="mt-0.5 text-primary">{limits}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}
