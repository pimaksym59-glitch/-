'use client';

/**
 * Image Studio empty state — D2 §15 four-part structure (explanation ·
 * recommended action · primary CTA · a way to start working). Images are not
 * uploaded here: they are PRODUCED by the pipeline (§R2.5), so the primary
 * action points at the pipeline, and the identity inputs this workspace really
 * owns (§R6.1 references) are the secondary path.
 */
import { Images } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCan } from '@/shared/providers';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';

export function StudioEmpty({
  channelName,
  onOpenReferences,
}: {
  readonly channelName: string;
  readonly onOpenReferences: () => void;
}): React.ReactElement {
  const router = useRouter();
  const can = useCan();

  return (
    <EmptyState
      icon={Images}
      title="No images for this channel yet"
      description={`Images appear here once ${channelName} runs a post through the pipeline — with the actor references you provide keeping the look consistent.`}
      action={
        can('content.edit') ? (
          <Button onClick={() => router.push('/chat')}>Draft a post</Button>
        ) : (
          <p className="text-sm text-secondary">
            Your role reads this workspace — producing images is an editor operation.
          </p>
        )
      }
      secondary={
        <button
          type="button"
          onClick={onOpenReferences}
          className="font-medium text-[color:var(--interactive-default)] hover:underline"
        >
          Set up actor references
        </button>
      }
    />
  );
}
