'use client';

/**
 * Post inspector view (FS5 T-FS5.9). The first real entity behind the FS2
 * `?inspect=post:<id>` contract: title/preview + StatusBadge, the pipeline
 * history Timeline, and the review queue-intents — offered ONLY to roles with
 * `content.publish` (SEC-7) and only while the post still needs review.
 */
import { usePost, usePostHistory } from '@/entities/post';
import { ReviewActions, useReview } from '@/features/review-post';
import { formatDate, formatRelativeTime } from '@/shared/lib/format';
import { useCan } from '@/shared/providers';
import { STATUS } from '@/shared/types/status';
import { StatusBadge } from '@/shared/ui/badge';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { Timeline, type TimelineItem } from '@/shared/ui/timeline';

export function PostInspector({ id }: { readonly id: string }): React.ReactElement {
  const post = usePost(id);
  const history = usePostHistory(id);
  const can = useCan();
  const { review, pendingId } = useReview(post.data?.channelId ?? null);

  if (post.isPending) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton height={20} width="70%" />
        <Skeleton height={14} width="45%" />
        <Skeleton height={120} />
      </div>
    );
  }
  if (post.isError) {
    return (
      <div className="p-4">
        <ErrorState
          scope="section"
          title="Couldn’t load this post"
          onRetry={() => void post.refetch()}
        />
      </div>
    );
  }

  const data = post.data;
  // Unknown wire statuses stay visible as raw text (registry rule) — the
  // Timeline renders only vocabulary entries, nothing is coerced.
  const items: TimelineItem[] = (history.data ?? []).flatMap((entry, index) =>
    entry.status === null
      ? []
      : [
          {
            id: `${entry.rawStatus}-${index}`,
            status: entry.status,
            title: entry.rawStatus === data.rawStatus ? 'Current state' : 'State change',
            dateTime: entry.at,
            timeLabel: formatRelativeTime(entry.at),
            badge: true,
            ...(entry.detail ? { detail: entry.detail } : {}),
          },
        ],
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">Post</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 flex-1 text-sm font-semibold text-primary">{data.title}</h2>
          {data.status ? (
            <StatusBadge status={data.status} />
          ) : (
            <span className="text-xs text-secondary">{data.rawStatus}</span>
          )}
        </div>
        <time dateTime={data.createdAt} className="mt-1 block text-xs text-secondary">
          {formatDate(data.createdAt)}
        </time>
      </header>

      {data.preview ? <p className="text-sm text-secondary">{data.preview}</p> : null}

      {can('content.publish') && data.status === STATUS.needsReview ? (
        <ReviewActions postId={data.id} onReview={review} pending={pendingId === data.id} />
      ) : null}

      <section aria-labelledby="inspector-post-history">
        <h3
          id="inspector-post-history"
          className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-secondary"
        >
          History
        </h3>
        {history.isPending ? (
          <Skeleton height={96} />
        ) : history.isError ? (
          <ErrorState
            scope="section"
            title="Couldn’t load the history"
            onRetry={() => void history.refetch()}
          />
        ) : items.length === 0 ? (
          <p className="text-[13px] text-secondary">No history recorded for this post.</p>
        ) : (
          <Timeline label="Post history" items={items} />
        )}
      </section>
    </div>
  );
}
