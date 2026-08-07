'use client';

import { clsx } from 'clsx';
import { BadgeCheck, Flag } from 'lucide-react';
import { Tooltip } from '../../tooltip';

/**
 * VerificationBadge (D2 §14). The canonical badge-check for passed checks
 * (validation gates, image safety/phash); hover lists which checks passed.
 * Its counterpart **Needs Review** (warning/flag) is equally prominent for
 * at-least-once/ambiguous cases (§R7.4/§R8.4) — honesty is symmetrical.
 */
export type VerificationKind = 'verified' | 'needs-review';

export interface VerificationBadgeProps {
  readonly kind: VerificationKind;
  /** The checks behind the badge (shown on hover/focus). */
  readonly checks?: readonly string[];
  readonly className?: string;
}

export function VerificationBadge({
  kind,
  checks,
  className,
}: VerificationBadgeProps): React.ReactElement {
  const verified = kind === 'verified';
  const badge = (
    <span
      data-kind={kind}
      className={clsx(
        'inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-xs font-medium',
        verified
          ? 'border-[color:var(--status-success-fg)] text-success'
          : 'border-[color:var(--status-warning-fg)] bg-warning-bg text-warning',
        className,
      )}
    >
      {verified ? (
        <BadgeCheck aria-hidden className="size-3.5" strokeWidth={1.5} />
      ) : (
        <Flag aria-hidden className="size-3.5" strokeWidth={1.5} />
      )}
      {verified ? 'Verified' : 'Needs Review'}
    </span>
  );
  if (!checks || checks.length === 0) return badge;
  return (
    <Tooltip
      side="top"
      content={
        <ul className="flex flex-col gap-0.5">
          {checks.map((check) => (
            <li key={check} className="text-[13px]">
              {check}
            </li>
          ))}
        </ul>
      }
    >
      {badge}
    </Tooltip>
  );
}
