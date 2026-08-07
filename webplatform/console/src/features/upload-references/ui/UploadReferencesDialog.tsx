'use client';

/**
 * UploadReferencesDialog (FS9 T-FS9.7 — D2 §13.21 over the honest transport).
 * LAZY: mounted on intent only (plan §3.1). The per-file display maps the
 * honest phases: in flight = **Queued** (fetch exposes no upload progress, so
 * NO percentage is invented), accepted = **Verified** (the upload was
 * ACCEPTED — nothing is claimed about downstream processing, which the
 * contract does not report). Rejected files show their local reason.
 *
 * Copy states two backend truths: references are the identity-conditioning
 * INPUT (§R6.1 — not text, not a seed) and actors are fictional (§R6.2).
 */
import { useEffect } from 'react';
import type { ActorVM } from '@/entities/actor';
import { formatBytes } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { FileUpload, type UploadFileItem } from '@/shared/ui/file-upload';
import { useUploadReferences } from '../model/useUploadReferences';

const ACCEPT = '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp';
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export interface UploadReferencesDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly actor: ActorVM;
  readonly channelId: string | null;
}

export function UploadReferencesDialog({
  open,
  onOpenChange,
  actor,
  channelId,
}: UploadReferencesDialogProps): React.ReactElement {
  const { items, upload, retry, remove, rejectLocal, isUploading, acceptedCount, clear } =
    useUploadReferences(actor.id, channelId);

  // A fresh dialog session starts with a clean file list.
  useEffect(() => {
    if (open) clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on open only
  }, [open]);

  const files: readonly UploadFileItem[] = items.map((item) => ({
    id: item.id,
    name: item.file.name,
    sizeLabel: formatBytes(item.file.size),
    // Honest mapping (see docstring): in-flight = Queued (no invented %),
    // accepted = Verified (the UPLOAD succeeded), failed = reason + retry.
    status: item.phase === 'failed' ? 'error' : item.phase === 'accepted' ? 'verified' : 'queued',
    ...(item.error !== null ? { error: item.error } : {}),
  }));

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Reference images for ${actor.name}`}
      description="References are how the backend keeps this actor's face consistent (§R6.1) — identity conditioning, not a text description and not a seed."
      width="form"
      primaryAction={
        <Button disabled={isUploading} onClick={() => onOpenChange(false)}>
          {acceptedCount > 0 ? 'Done' : 'Close'}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <FileUpload
          label={`PNG, JPEG or WebP · up to ${formatBytes(MAX_SIZE_BYTES)}`}
          accept={ACCEPT}
          maxSizeBytes={MAX_SIZE_BYTES}
          files={files}
          onFilesSelected={upload}
          onRejected={rejectLocal}
          onRetry={retry}
          onRemove={remove}
        />
        {acceptedCount > 0 ? (
          <p role="status" className="text-[13px] text-secondary">
            {acceptedCount} reference{acceptedCount === 1 ? '' : 's'} accepted. The backend uses
            them on the next generation — this console reports the upload, not the processing.
          </p>
        ) : null}
        <p className="text-[13px] text-secondary">
          Actors are fictional characters (§R6.2). Do not upload photographs of real people.
        </p>
      </div>
    </Dialog>
  );
}
