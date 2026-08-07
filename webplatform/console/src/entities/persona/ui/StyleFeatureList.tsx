/**
 * Style Memory rows (§R9.12) — the persona's derived STYLE FEATURES, never the
 * texts they came from. A pure function of its props (plan §3.4: this is a
 * projection of the persona Query entry, not a state of its own): no local
 * state, no fetching, no confidence, no invented units. Unknown backend keys
 * render honestly by their raw key with a quiet marker.
 */
import type { StyleFeatureVM } from '../model';

export function StyleFeatureList({
  features,
}: {
  readonly features: readonly StyleFeatureVM[];
}): React.ReactElement {
  if (features.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border-default p-3 text-[13px] text-secondary">
        No style features derived yet. The backend extracts them as this channel publishes — they
        are parameters (sentence rhythm, dialogue frequency, transitions), never stored post texts.
      </p>
    );
  }

  return (
    <dl className="flex flex-col divide-y divide-border-subtle rounded-lg border border-border-subtle">
      {features.map((feature) => (
        <div key={feature.key} className="flex items-baseline justify-between gap-3 px-3 py-2">
          <dt className="text-[13px] text-secondary">
            {feature.label}
            {feature.unknown ? (
              <span className="ml-1.5 text-[11px] text-secondary" title="Key not in the known set">
                (raw key)
              </span>
            ) : null}
          </dt>
          <dd className="font-mono text-[13px] text-primary">{feature.value}</dd>
        </div>
      ))}
    </dl>
  );
}
