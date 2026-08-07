'use client';

/**
 * Chat empty state (FS6 T-FS6.6 — D2 §15 "Chat empty"). New-chat hero with
 * STATIC prompt suggestions (design copy — the `/prompts` library arrives in
 * FS10 and is not faked here). Picking one prefills the composer.
 */
import { MessageSquare } from 'lucide-react';
import { EmptyState } from '@/shared/ui/empty-state';

const SUGGESTIONS: readonly string[] = [
  'Draft a post about our latest release',
  'Rewrite this in my channel’s voice: …',
  'Give me 5 headline angles for today’s topic',
];

export function ChatEmpty({
  onPick,
}: {
  readonly onPick: (suggestion: string) => void;
}): React.ReactElement {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      <EmptyState
        icon={MessageSquare}
        title="Start a conversation"
        description="Draft, refine and analyze with the AI — then insert results straight into a channel’s pipeline."
      />
      <ul aria-label="Prompt suggestions" className="mt-2 flex flex-col items-center gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <li key={suggestion}>
            <button
              type="button"
              onClick={() => onPick(suggestion)}
              className="rounded-pill border border-border-default px-4 py-1.5 text-[13px] text-secondary transition-colors hover:border-border-strong hover:text-primary"
            >
              {suggestion}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
