'use client';

import { clsx } from 'clsx';
import { FileText, RotateCcw, Trash2, UploadCloud } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { Badge } from '../badge/Badge';
import { ProgressBar } from '../progress-bar/ProgressBar';

/**
 * FileUpload (D2 §13.21). Dashed dropzone ("drag or browse"), per-file
 * progress, type/size validation with inline errors, retry/remove, success =
 * Verified chip. Presentational: upload transport is the caller's (FS7 wires
 * Knowledge ingestion); this component owns selection, validation and status
 * display. Keyboard: the browse button is the drop equivalent; progress is
 * announced via the progressbar semantics.
 */
export type UploadStatus = 'queued' | 'uploading' | 'error' | 'verified';

export interface UploadFileItem {
  readonly id: string;
  readonly name: string;
  readonly sizeLabel: string;
  readonly status: UploadStatus;
  readonly progress?: number;
  readonly error?: string;
}

export interface FileUploadProps {
  readonly label: string;
  /** Accepted types, e.g. ".pdf,.md,text/plain" (also used for validation). */
  readonly accept?: string;
  readonly maxSizeBytes?: number;
  readonly multiple?: boolean;
  readonly files: readonly UploadFileItem[];
  readonly onFilesSelected: (files: readonly File[]) => void;
  /** Called with files rejected locally (wrong type / too large). */
  readonly onRejected?: (rejected: readonly { file: File; reason: string }[]) => void;
  readonly onRetry?: (id: string) => void;
  readonly onRemove?: (id: string) => void;
  readonly disabled?: boolean;
  readonly className?: string;
}

function typeAllowed(file: File, accept: string | undefined): boolean {
  if (!accept) return true;
  const rules = accept.split(',').map((r) => r.trim().toLowerCase());
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();
  return rules.some((rule) => {
    if (rule.startsWith('.')) return name.endsWith(rule);
    if (rule.endsWith('/*')) return mime.startsWith(rule.slice(0, -1));
    return mime === rule;
  });
}

export function FileUpload({
  label,
  accept,
  maxSizeBytes,
  multiple = true,
  files,
  onFilesSelected,
  onRejected,
  onRetry,
  onRemove,
  disabled = false,
  className,
}: FileUploadProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const hintId = useId();

  function handleFiles(list: FileList | null): void {
    if (!list) return;
    const accepted: File[] = [];
    const rejected: { file: File; reason: string }[] = [];
    for (const file of Array.from(list)) {
      if (!typeAllowed(file, accept)) {
        rejected.push({ file, reason: 'Unsupported file type' });
      } else if (maxSizeBytes !== undefined && file.size > maxSizeBytes) {
        rejected.push({ file, reason: 'File is too large' });
      } else {
        accepted.push(file);
      }
    }
    if (accepted.length > 0) onFilesSelected(accepted);
    if (rejected.length > 0) onRejected?.(rejected);
  }

  return (
    <div className={clsx('flex flex-col gap-3', className)}>
      <div
        data-dragover={dragOver || undefined}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!disabled) handleFiles(e.dataTransfer.files);
        }}
        className={clsx(
          'flex flex-col items-center gap-2 rounded-xl border border-dashed border-border-strong px-6 py-8 text-center transition-colors duration-[120ms]',
          dragOver && 'border-[color:var(--interactive-default)] bg-interactive-subtle',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        <UploadCloud aria-hidden className="size-6 text-secondary" strokeWidth={1.5} />
        <p className="text-sm text-primary">
          Drag files here, or{' '}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-describedby={hintId}
            className="font-medium text-[color:var(--interactive-default)] underline underline-offset-2"
          >
            browse
          </button>
        </p>
        <p id={hintId} className="text-[13px] text-secondary">
          {label}
        </p>
        <input
          ref={inputRef}
          type="file"
          {...(accept !== undefined ? { accept } : {})}
          multiple={multiple}
          disabled={disabled}
          aria-label={label}
          className="sr-only"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {files.length > 0 ? (
        <ul aria-label="Selected files" className="flex flex-col gap-2">
          {files.map((file) => (
            <li
              key={file.id}
              data-status={file.status}
              className="flex items-center gap-3 rounded-lg border border-border-subtle bg-raised px-3 py-2"
            >
              <FileText aria-hidden className="size-4 shrink-0 text-secondary" strokeWidth={1.5} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-primary">{file.name}</span>
                  <span className="shrink-0 text-xs text-secondary">{file.sizeLabel}</span>
                  {file.status === 'verified' ? <Badge tone="success">Verified</Badge> : null}
                  {file.status === 'queued' ? <Badge tone="neutral">Queued</Badge> : null}
                </div>
                {file.status === 'uploading' ? (
                  <div className="mt-1.5">
                    <ProgressBar
                      label={`Uploading ${file.name}`}
                      value={file.progress ?? 0}
                      showValue
                    />
                  </div>
                ) : null}
                {file.status === 'error' ? (
                  <p role="alert" className="mt-0.5 text-[13px] text-danger">
                    {file.error ?? 'Upload failed'}
                  </p>
                ) : null}
              </div>
              {file.status === 'error' && onRetry ? (
                <button
                  type="button"
                  aria-label={`Retry ${file.name}`}
                  onClick={() => onRetry(file.id)}
                  className="inline-flex size-7 items-center justify-center rounded-md text-secondary transition-colors hover:bg-interactive-subtle hover:text-primary"
                >
                  <RotateCcw aria-hidden className="size-4" />
                </button>
              ) : null}
              {onRemove ? (
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => onRemove(file.id)}
                  className="inline-flex size-7 items-center justify-center rounded-md text-secondary transition-colors hover:bg-danger-bg hover:text-danger"
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
