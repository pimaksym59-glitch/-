'use client';

import { clsx } from 'clsx';
import { Diff, FlaskConical, Rocket } from 'lucide-react';
import { Badge } from '../../badge/Badge';
import { Button } from '../../button';
import { META_TEXT_TONE_CLASS } from '../../tone';

/**
 * PromptCard (D2 §14). A prompt/version summary: name, version, active badge,
 * variables count, last edited; diff affordance; "Run in Playground" and
 * guarded "Promote to active". RBAC guards promotion at the call site — when
 * the caller lacks the permission it simply doesn't pass `onPromote` (SEC-7).
 *
 * **FS10 MINOR extension (D4 §13 "add freely", owner-approved as plan §5.2 D6
 * option 1).** Two props became optional so a caller whose backend contract
 * does not carry those fields can render the card without fabricating them:
 *
 *  - `variablesCount?` — omit it and the meta line simply drops the clause.
 *    The frozen `/prompts` contract has no variables field and documents no
 *    templating syntax, so a `0` would be a claim, not a fact.
 *  - `active?: boolean | null` — pass **null** to render NO badge at all. The
 *    contract exposes no activation state (no promote call, no `is_active`
 *    column), so neither "Active" nor "Draft" would be true.
 *
 * Both are backward compatible: every existing call site passes a number and a
 * boolean (or nothing, keeping the previous `false` default), and their
 * rendering is byte-identical to before.
 */
export interface PromptCardProps {
  readonly name: string;
  readonly version: string;
  /** `null` ⇒ the source has no activation state; render no badge (FS10). */
  readonly active?: boolean | null;
  /** Omit when the source carries no variables data (FS10). */
  readonly variablesCount?: number;
  readonly lastEditedLabel: string;
  readonly onDiff?: () => void;
  readonly onRunInPlayground?: () => void;
  readonly onPromote?: () => void;
  readonly className?: string;
}

export function PromptCard({
  name,
  version,
  active = false,
  variablesCount,
  lastEditedLabel,
  onDiff,
  onRunInPlayground,
  onPromote,
  className,
}: PromptCardProps): React.ReactElement {
  return (
    <div className={clsx('rounded-xl border border-border-subtle bg-raised p-4', className)}>
      <div className="flex items-center gap-2">
        <span className="truncate text-sm font-semibold text-primary">{name}</span>
        <span className="font-mono text-xs text-secondary">{version}</span>
        {active === null ? null : active ? (
          <Badge tone="success">Active</Badge>
        ) : (
          <Badge tone="neutral">Draft</Badge>
        )}
        {onDiff ? (
          <button
            type="button"
            onClick={onDiff}
            aria-label={`View diff for ${name} ${version}`}
            className="ml-auto inline-flex size-7 items-center justify-center rounded-md text-secondary transition-colors hover:bg-interactive-subtle hover:text-primary"
          >
            <Diff aria-hidden className="size-4" />
          </button>
        ) : null}
      </div>
      {/* 12px REAL text, so it uses `secondary`, not `tertiary`: rendered axe
          measured 3.78:1 on dark the first time this card carried real data
          (FS10). Same class of defect as FS1/FS2/FS5 — a *usage* fix, never a
          token-value change (Design Freeze intact). The tone mechanism permits
          `tertiary` for "decorative meta"; this line is neither decorative nor
          duplicated, which is the D4 §12/§13 candidate FS5 already flagged. */}
      <p className={clsx('mt-1 text-xs', META_TEXT_TONE_CLASS.secondary)}>
        {variablesCount === undefined
          ? `edited ${lastEditedLabel}`
          : `${variablesCount} variable${variablesCount === 1 ? '' : 's'} · edited ${lastEditedLabel}`}
      </p>
      <div className="mt-3 flex items-center gap-2">
        {onRunInPlayground ? (
          <Button size="sm" variant="secondary" onClick={onRunInPlayground}>
            <FlaskConical aria-hidden className="size-3.5" />
            Run in Playground
          </Button>
        ) : null}
        {onPromote ? (
          <Button size="sm" variant="ai" onClick={onPromote} disabled={active === true}>
            <Rocket aria-hidden className="size-3.5" />
            Promote to active
          </Button>
        ) : null}
      </div>
    </div>
  );
}
