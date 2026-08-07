'use client';

/**
 * RegenerateAction (FS9 T-FS9.6). The pair of write intents an image record
 * supports: **Regenerate** (202 queue intent, §R6.5) and **Delete** (soft,
 * §R4.4, behind a confirm — destructive actions are never optimistic and never
 * a bare shortcut, D1 §6.5).
 *
 * Rendered ONLY when the caller's `can('content.edit')` allows it (SEC-7 —
 * forbidden actions are never listed). There is deliberately no "Accept" and
 * no "Attach to post": the contract has no call behind them (plan §5.2 D4).
 */
import { RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/dialog';

export interface RegenerateActionProps {
  readonly imageId: string;
  readonly onRegenerate: (imageId: string) => void;
  readonly onDelete: (imageId: string) => void;
  readonly regenerating: boolean;
  readonly deleting: boolean;
  readonly size?: 'sm' | 'md';
}

export function RegenerateAction({
  imageId,
  onRegenerate,
  onDelete,
  regenerating,
  deleting,
  size = 'sm',
}: RegenerateActionProps): React.ReactElement {
  const [confirming, setConfirming] = useState(false);

  return (
    <span className="inline-flex items-center gap-1.5">
      <Button
        size={size}
        variant="secondary"
        loading={regenerating}
        onClick={() => onRegenerate(imageId)}
      >
        <RotateCcw aria-hidden className="size-3.5" />
        Regenerate
      </Button>
      <Button
        size={size}
        variant="ghost"
        disabled={deleting || regenerating}
        onClick={() => setConfirming(true)}
        aria-label="Delete image record"
      >
        <Trash2 aria-hidden className="size-3.5" />
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Delete this image record?"
        description="It is soft-deleted: the backend keeps the record and its generation history, and it stops appearing in this workspace."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          setConfirming(false);
          onDelete(imageId);
        }}
      />
    </span>
  );
}
