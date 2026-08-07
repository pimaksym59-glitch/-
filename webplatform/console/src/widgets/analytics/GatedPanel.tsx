'use client';

/**
 * The Gated card (FS11 T-FS11.5 — D2 §15 canonical copy, §R10.3/§R7.3).
 *
 * This is the most load-bearing honesty surface in the product, and the reason
 * D3 §12 puts the reliable panels FIRST: Telegram's Bot API does not return
 * views, reactions, ER or CTR (§R7.3), and the platform's MTProto stats adapter
 * is an open decision whose default is **"нет"** (Appendix C). So engagement is
 * not "missing data" or "an error" — it is a known, explained absence.
 *
 * What this component must never do: show a zero, show a dash that could read
 * as "none", or draw an empty chart that implies no activity. It states what is
 * unavailable, why, and what would unlock it.
 */
import { Lock } from 'lucide-react';

export function GatedPanel({
  title,
  metrics,
  className,
}: {
  readonly title: string;
  /** The gated metric labels, named so the absence is specific. */
  readonly metrics: readonly string[];
  readonly className?: string;
}): React.ReactElement {
  const headingId = `analytics-gated-${title.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <section
      aria-labelledby={headingId}
      data-testid="gated-panel"
      className={`flex min-w-0 flex-col gap-3 rounded-xl border border-border-default bg-surface p-4 ${className ?? ''}`}
    >
      <div className="flex items-center gap-2">
        <Lock aria-hidden className="size-4 text-secondary" strokeWidth={1.5} />
        <h2 id={headingId} className="text-sm font-semibold text-primary">
          {title}
        </h2>
        <span className="rounded-pill bg-surface-inset px-2 py-0.5 text-[12px] font-medium text-secondary">
          Gated
        </span>
      </div>

      <p className="text-sm text-secondary">
        Engagement metrics need a stats adapter. Telegram’s Bot API does not report per-post views,
        reactions, engagement rate or click-through, so this console shows no value for them rather
        than a zero that would read as “nobody saw it”.
      </p>

      {metrics.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {metrics.map((metric) => (
            <li key={metric} className="flex items-baseline justify-between gap-4 text-sm">
              <span className="text-primary">{metric}</span>
              <span className="text-[13px] text-secondary">unavailable</span>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="text-[12px] text-secondary">
        Cost, quality, trends and publishing volume on this page are internal measurements and are
        always available.
      </p>
    </section>
  );
}
