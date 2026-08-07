'use client';

/**
 * Memory empty state — the D3 §8 canonical copy, D2 §15 four-part structure.
 * Memory is not something you upload (that is Knowledge, §R9.3): it GROWS from
 * publishing, so the primary action points at the pipeline, not at an importer.
 */
import { Brain } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCan } from '@/shared/providers';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { MemoryHonesty } from './MemoryHonesty';

export function MemoryEmpty({ channelName }: { readonly channelName: string }): React.ReactElement {
  const router = useRouter();
  const can = useCan();
  const [showHow, setShowHow] = useState(false);

  return (
    <div className="flex flex-col items-center gap-2">
      <EmptyState
        icon={Brain}
        title="Memory grows as you publish"
        description={`Here's what will shape ${channelName}'s voice: the persona it writes as, the actors it shows, and every post it has already published.`}
        action={
          can('content.edit') ? (
            <Button onClick={() => router.push('/chat')}>Draft the first post</Button>
          ) : (
            <p className="text-sm text-secondary">
              Your role reads this workspace — publishing is an editor operation.
            </p>
          )
        }
        secondary={
          <button
            type="button"
            onClick={() => setShowHow((v) => !v)}
            aria-expanded={showHow}
            className="font-medium text-[color:var(--interactive-default)] hover:underline"
          >
            What memory does the backend keep?
          </button>
        }
      />
      {showHow ? <MemoryHonesty variant="trace" className="max-w-md" /> : null}
    </div>
  );
}
