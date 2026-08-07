'use client';

/**
 * ReviewActions (FS5). The approve/reject pair for a needs-review post.
 * Rendered ONLY when the caller's `can('content.publish')` allows it (SEC-7 —
 * forbidden actions are never listed). Buttons reflect the queued truth.
 */
import { Check, X } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import type { ReviewAction } from '../model/useReview';

export interface ReviewActionsProps {
  readonly postId: string;
  readonly onReview: (postId: string, action: ReviewAction) => void;
  readonly pending: boolean;
  readonly size?: 'sm' | 'md';
}

export function ReviewActions({
  postId,
  onReview,
  pending,
  size = 'sm',
}: ReviewActionsProps): React.ReactElement {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Button
        size={size}
        variant="secondary"
        loading={pending}
        onClick={() => onReview(postId, 'approve')}
      >
        <Check aria-hidden className="size-3.5" />
        Approve
      </Button>
      <Button
        size={size}
        variant="ghost"
        disabled={pending}
        onClick={() => onReview(postId, 'reject')}
        aria-label="Reject post"
      >
        <X aria-hidden className="size-3.5" />
        Reject
      </Button>
    </span>
  );
}
