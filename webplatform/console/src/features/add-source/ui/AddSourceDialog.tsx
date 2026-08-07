'use client';

/**
 * AddSourceDialog (FS7 T-FS7.5 — D2 §13.21 over the honest transport). LAZY:
 * mounted on intent only (plan §3.1). The per-file display maps the honest
 * phases: while the transport is in flight the file shows **Queued** — fetch
 * exposes no upload-progress events, so NO percentage is invented; **Verified**
 * marks the upload ACCEPTED (201 + assign), while ingestion truth (running →
 * completed/failed) lives on the LIST via polling; failures show the inline
 * reason + retry. Non-text sources are rejected locally with a reason.
 */
import { useEffect } from 'react';
import { formatBytes } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { FileUpload, type UploadFileItem } from '@/shared/ui/file-upload';
import { useAddSource } from '../model/useAddSource';

const ACCEPT = '.md,.txt,.pdf,.html,text/plain,text/markdown,application/pdf,text/html';
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export interface AddSourceDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly channelId: string;
  readonly channelName: string;
}

export function AddSourceDialog({
  open,
  onOpenChange,
  channelId,
  channelName,
}: AddSourceDialogProps): React.ReactElement {
  const { items, upload, retry, remove, rejectLocal, isUploading, acceptedCount, clear } =
    useAddSource(channelId);

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
    // accepted = Verified (the UPLOAD succeeded; ingestion truth is polled on
    // the list), failed = error with reason.
    status: item.phase === 'failed' ? 'error' : item.phase === 'accepted' ? 'verified' : 'queued',
    ...(item.error !== null ? { error: item.error } : {}),
  }));

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add source"
      description={`Uploads into “${channelName}” — the knowledge stays isolated to this channel (§R2.6).`}
      width="form"
      primaryAction={
        <Button disabled={isUploading} onClick={() => onOpenChange(false)}>
          {acceptedCount > 0 ? 'Done' : 'Close'}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <FileUpload
          label={`Markdown, text, HTML or PDF · up to ${formatBytes(MAX_SIZE_BYTES)}`}
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
            {acceptedCount === 1 ? 'Upload accepted' : `${acceptedCount} uploads accepted`} —
            ingestion continues server-side; the list shows live status until it’s ready.
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
