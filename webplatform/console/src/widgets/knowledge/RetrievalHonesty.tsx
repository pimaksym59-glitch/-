/**
 * Retrieval honesty surface (FS7 plan §5.2 D1). The D3 §7 “Retrieval Preview”
 * region rendered as a VISIBLE honest seam: the frozen contract exposes no
 * retrieval/chunk endpoint, so this console explains the truth instead of
 * simulating scores. The FS5 gated-tile discipline applied to retrieval.
 */
import { SearchCheck } from 'lucide-react';

export function RetrievalHonesty({
  className,
}: {
  readonly className?: string;
}): React.ReactElement {
  return (
    <section
      aria-labelledby="retrieval-honesty-heading"
      className={`rounded-xl border border-border-default bg-surface p-4 ${className ?? ''}`}
    >
      <div className="flex items-center gap-2">
        <SearchCheck aria-hidden className="size-4 text-secondary" strokeWidth={1.5} />
        <h3 id="retrieval-honesty-heading" className="text-sm font-semibold text-primary">
          Retrieval preview
        </h3>
      </div>
      <p className="mt-2 text-sm text-secondary">
        Retrieval runs inside the backend at generation time, scoped to this channel. This console
        never simulates it — a per-query preview (matched chunks, scores) arrives with a retrieval
        endpoint. Until then, completed documents above are exactly what the AI can draw from.
      </p>
    </section>
  );
}
