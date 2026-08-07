/**
 * Honest-absence surfaces (FS8 T-FS8.10, plan §5.2 D1). D3 §8 describes a
 * trace, a Global scope and pin / exclude-from-generation — the frozen
 * contract exposes no endpoint for any of them, and this console does not
 * simulate what it cannot read (the FS7 retrieval-honesty precedent, and the
 * FS5 gated-metric discipline before it).
 */
import { GitBranch, Globe, PinOff } from 'lucide-react';

type Variant = 'trace' | 'global' | 'controls';

const CONTENT: Readonly<Record<Variant, { icon: typeof GitBranch; title: string; body: string }>> =
  {
    trace: {
      icon: GitBranch,
      title: 'Influence trace',
      body:
        'Which memory and knowledge shaped a specific post is decided inside the backend pipeline at ' +
        'generation time. The contract exposes no attribution endpoint, so this console shows no trace ' +
        'rather than a guess — and never asks the model to invent one.',
    },
    global: {
      icon: Globe,
      title: 'Global memory is backend-owned',
      body:
        'Global memory (§R9.1) is cross-channel and single. The contract exposes no endpoint for it, so ' +
        'there is nothing honest to show here yet. Channel memory — persona, actors and published posts — ' +
        'is real and lives one tab away.',
    },
    controls: {
      icon: PinOff,
      title: 'Pinning and exclusion are backend controls',
      body:
        'Pinning an entry or excluding it from generation changes what the pipeline retrieves. The ' +
        'contract carries no such call, so this console does not offer a switch that would do nothing.',
    },
  };

export function MemoryHonesty({
  variant,
  className,
}: {
  readonly variant: Variant;
  readonly className?: string;
}): React.ReactElement {
  const { icon: Icon, title, body } = CONTENT[variant];
  const headingId = `memory-honesty-${variant}`;
  return (
    <section
      aria-labelledby={headingId}
      className={`rounded-xl border border-border-default bg-surface p-4 ${className ?? ''}`}
    >
      <div className="flex items-center gap-2">
        <Icon aria-hidden className="size-4 text-secondary" strokeWidth={1.5} />
        <h3 id={headingId} className="text-sm font-semibold text-primary">
          {title}
        </h3>
      </div>
      <p className="mt-2 text-sm text-secondary">{body}</p>
    </section>
  );
}
