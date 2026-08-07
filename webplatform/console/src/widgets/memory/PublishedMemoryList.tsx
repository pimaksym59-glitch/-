'use client';

/**
 * Content memory (FS8 — §R9.1 `memory kind=published_post`): what the channel
 * has ALREADY said. Read through the frozen posts endpoint the FS5 queue
 * already uses — no new entity, no invented "memory entry" shape. LAZY leaf.
 * `↵` opens the existing FS5 post Inspector (history Timeline included), so
 * the pipeline story stays in one place.
 */
import { usePublishedPosts } from '@/entities/post';
import { useInspector } from '@/shared/hooks';
import { formatRelativeTime } from '@/shared/lib/format';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';

export function PublishedMemoryList({
  channelId,
}: {
  readonly channelId: string;
}): React.ReactElement {
  const posts = usePublishedPosts(channelId);
  const { inspect } = useInspector();

  if (posts.isPending) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 2 }, (_, i) => (
          <Skeleton key={i} height={44} />
        ))}
      </div>
    );
  }
  if (posts.isError) {
    return (
      <ErrorState
        scope="section"
        title="Couldn’t load published posts"
        onRetry={() => void posts.refetch()}
      />
    );
  }
  if (posts.data.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border-default p-3 text-[13px] text-secondary">
        Nothing published yet. Memory of content starts with the first published post.
      </p>
    );
  }

  return (
    <ul aria-label="Published posts" className="flex flex-col">
      {posts.data.map((post) => (
        <li key={post.id} className="border-b border-border-subtle py-2 last:border-b-0">
          <button
            type="button"
            onClick={() => inspect({ type: 'post', id: post.id })}
            className="flex w-full min-w-0 items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-interactive-subtle focus-visible:bg-interactive-subtle"
          >
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
        </li>
      ))}
    </ul>
  );
}
