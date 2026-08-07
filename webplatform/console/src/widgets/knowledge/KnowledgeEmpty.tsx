'use client';

/**
 * Knowledge empty state — the D2 §15 canonical copy, four-part structure.
 * The primary CTA is edit-gated (SEC-7); the secondary entry opens the honest
 * retrieval explainer instead of pretending a preview exists.
 */
import { BookOpen } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { RetrievalHonesty } from './RetrievalHonesty';

export function KnowledgeEmpty({
  canEdit,
  onAddSource,
}: {
  readonly canEdit: boolean;
  readonly onAddSource: () => void;
}): React.ReactElement {
  const [showHow, setShowHow] = useState(false);

  return (
    <div className="flex flex-col items-center gap-2">
      <EmptyState
        icon={BookOpen}
        title="Teach the AI what you know"
        description="Add documents and it will use them, scoped to this channel."
        action={
          canEdit ? (
            <Button onClick={onAddSource}>Add source</Button>
          ) : (
            <p className="text-sm text-secondary">
              Adding sources is an editor operation — your role reads this workspace.
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
            See how retrieval works
          </button>
        }
      />
      {showHow ? <RetrievalHonesty className="max-w-md" /> : null}
    </div>
  );
}
