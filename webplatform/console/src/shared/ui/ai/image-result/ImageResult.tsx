'use client';

import { clsx } from 'clsx';
import { Check, ChevronDown, ChevronRight, Download, Paperclip, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../../badge/Badge';
import { Button } from '../../button';
import { Skeleton } from '../../skeleton';

/**
 * ImageResult (D2 §14). A generated image in a rounded frame with calm
 * verification chips (Verified / Safety ok / Unique phash / Regen ×n, §R6),
 * prompt disclosure and actions: accept, regenerate, attach-to-post, download.
 * Batch view = a grid of these with per-image status (caller composes).
 */
export interface ImageResultProps {
  readonly src?: string;
  readonly alt: string;
  readonly state?: 'generating' | 'ready' | 'failed';
  readonly verified?: boolean;
  readonly safetyOk?: boolean;
  readonly uniquePhash?: boolean;
  readonly regenCount?: number;
  readonly prompt?: string;
  readonly errorText?: string;
  readonly onAccept?: () => void;
  readonly onRegenerate?: () => void;
  readonly onAttach?: () => void;
  readonly onDownload?: () => void;
  readonly className?: string;
}

export function ImageResult({
  src,
  alt,
  state = 'ready',
  verified = false,
  safetyOk = false,
  uniquePhash = false,
  regenCount = 0,
  prompt,
  errorText,
  onAccept,
  onRegenerate,
  onAttach,
  onDownload,
  className,
}: ImageResultProps): React.ReactElement {
  const [showPrompt, setShowPrompt] = useState(false);
  return (
    <figure
      data-state={state}
      className={clsx(
        'overflow-hidden rounded-xl border border-border-subtle bg-raised',
        className,
      )}
    >
      <div
        className={clsx(
          'relative aspect-square w-full',
          state === 'generating' && 'onyx-aurora-edge',
        )}
      >
        {state === 'generating' ? (
          <Skeleton width="100%" height="100%" rounded="sm" />
        ) : state === 'failed' ? (
          <div
            role="alert"
            className="flex size-full items-center justify-center p-4 text-center text-[13px] text-danger"
          >
            {errorText ?? 'Generation failed.'}
          </div>
        ) : src ? (
          // eslint-disable-next-line @next/next/no-img-element -- generated images have runtime URLs/dimensions; next/image is wired with real backends (FS9).
          <img src={src} alt={alt} className="size-full object-cover" />
        ) : null}
      </div>
      <figcaption className="flex flex-col gap-2 p-3">
        <div className="flex flex-wrap items-center gap-1">
          {verified ? <Badge tone="success">Verified</Badge> : null}
          {safetyOk ? <Badge tone="success">Safety ok</Badge> : null}
          {uniquePhash ? <Badge tone="neutral">Unique</Badge> : null}
          {regenCount > 0 ? <Badge tone="neutral">Regen ×{regenCount}</Badge> : null}
        </div>
        {prompt ? (
          <div>
            <button
              type="button"
              aria-expanded={showPrompt}
              onClick={() => setShowPrompt((v) => !v)}
              className="inline-flex items-center gap-1 text-[13px] font-medium text-secondary transition-colors hover:text-primary"
            >
              {showPrompt ? (
                <ChevronDown aria-hidden className="size-3.5" />
              ) : (
                <ChevronRight aria-hidden className="size-3.5" />
              )}
              Prompt
            </button>
            {showPrompt ? <p className="mt-1 text-[13px] text-secondary">{prompt}</p> : null}
          </div>
        ) : null}
        {state === 'ready' ? (
          <div className="flex items-center gap-1">
            {onAccept ? (
              <Button size="sm" onClick={onAccept}>
                <Check aria-hidden className="size-3.5" />
                Accept
              </Button>
            ) : null}
            {onRegenerate ? (
              <Button size="sm" variant="secondary" onClick={onRegenerate} aria-label="Regenerate">
                <RotateCcw aria-hidden className="size-3.5" />
              </Button>
            ) : null}
            {onAttach ? (
              <Button size="sm" variant="secondary" onClick={onAttach} aria-label="Attach to post">
                <Paperclip aria-hidden className="size-3.5" />
              </Button>
            ) : null}
            {onDownload ? (
              <Button size="sm" variant="ghost" onClick={onDownload} aria-label="Download">
                <Download aria-hidden className="size-3.5" />
              </Button>
            ) : null}
          </div>
        ) : null}
        {state === 'failed' && onRegenerate ? (
          <Button size="sm" variant="secondary" onClick={onRegenerate}>
            <RotateCcw aria-hidden className="size-3.5" />
            Try again
          </Button>
        ) : null}
      </figcaption>
    </figure>
  );
}
