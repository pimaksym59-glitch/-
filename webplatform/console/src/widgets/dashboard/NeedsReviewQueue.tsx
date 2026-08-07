'use client';

/**
 * Needs-Review queue (D3 §4 — "attention-needed first"). `j`/`k` move between
 * rows, `↵` opens the Inspector (the FS3 DataTable list-navigation precedent);
 * review actions are queue intents and appear ONLY for roles with
 * `content.publish` (SEC-7).
 */
import { useNeedsReview, type PostVM } from '@/entities/post';
import { ReviewActions, useReview } from '@/features/review-post';
import { useInspector } from '@/shared/hooks';
import { formatRelativeTime } from '@/shared/lib/format';
import { useCan } from '@/shared/providers';
import { StatusBadge } from '@/shared/ui/badge';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';

export function NeedsReviewQueue({
  channelId,
  initial,
}: {
  readonly channelId: string;
  readonly initial: readonly PostVM[] | null;
}): React.ReactElement {
  const posts = useNeedsReview(channelId, initial ?? undefined);
  const can = useCan();
  const { review, pendingId } = useReview(channelId);
  const { inspect } = useInspector();

  if (posts.isPending) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} height={56} />
        ))}
      </div>
    );
  }
  if (posts.isError) {
    return (
      <ErrorState
        scope="section"
        title="Couldn’t load the review queue"
        onRetry={() => void posts.refetch()}
      />
    );
  }
  if (posts.data.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border-default p-4 text-sm text-secondary">
        Nothing needs review. New drafts land here when approval mode flags them.
      </p>
    );
  }

  function onRowKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number): void {
    if (event.key !== 'j' && event.key !== 'k') return;
    event.preventDefault();
    const next = event.key === 'j' ? index + 1 : index - 1;
    const target = event.currentTarget
      .closest('ul')
      ?.querySelector<HTMLButtonElement>(`button[data-row-index="${next}"]`);
    target?.focus();
  }

  return (
    <ul aria-label="Needs review" className="flex flex-col">
      {posts.data.map((post, index) => (
        <li
          key={post.id}
          className="flex items-center gap-3 border-b border-border-subtle py-2.5 last:border-b-0"
        >
          <button
            type="button"
            data-row-index={index}
            onClick={() => inspect({ type: 'post', id: post.id })}
            onKeyDown={(event) => onRowKeyDown(event, index)}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-interactive-subtle focus-visible:bg-interactive-subtle"
          >
            {post.status ? <StatusBadge status={post.status} /> : null}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-primary">{post.title}</span>
              {post.preview ? (
                <span className="block truncate text-[13px] text-secondary">{post.preview}</span>
              ) : null}
            </span>
            <time dateTime={post.createdAt} className="shrink-0 text-xs text-secondary">
              {formatRelativeTime(post.createdAt)}
            </time>
          </button>
          {can('content.publish') ? (
            <ReviewActions postId={post.id} onReview={review} pending={pendingId === post.id} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}
