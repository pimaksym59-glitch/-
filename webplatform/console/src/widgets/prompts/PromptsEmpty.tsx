'use client';

/**
 * Prompt Library empty state — D2 §15 four-part structure (explanation ·
 * recommended action · primary CTA · a way to start working). The primary
 * action is the only write the contract has: create a first version (§R10.6).
 */
import { Library } from 'lucide-react';
import { useCan } from '@/shared/providers';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';

export function PromptsEmpty({
  onNewVersion,
}: {
  readonly onNewVersion: () => void;
}): React.ReactElement {
  const can = useCan();

  return (
    <EmptyState
      icon={Library}
      title="No prompts yet"
      description="Prompts are the reusable instructions the pipeline builds on — one chain of versions per prompt type, shared by every channel. Saving an edit creates a new version, so the history is never overwritten."
      action={
        can('content.edit') ? (
          <Button onClick={onNewVersion}>New version</Button>
        ) : (
          <p className="text-sm text-secondary">
            Your role reads this library — authoring versions is an editor operation.
          </p>
        )
      }
      secondary={
        <span className="text-sm text-secondary">
          Channel-specific voice lives in Memory; channel-specific facts live in Knowledge.
        </span>
      }
    />
  );
}
