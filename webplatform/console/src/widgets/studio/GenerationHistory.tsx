'use client';

/**
 * Generation history (FS9 T-FS9.5 — §R6.5 "все генерации"). Every attempt the
 * backend recorded: attempt number, the prompt it ran with, its seed, its
 * provider and its outcome. LAZY — it rides the detail chunk (plan §3.6).
 *
 * The regeneration cap (`IMAGE_MAX_REGEN`, §Appendix B) is enforced by the
 * BACKEND; this view states that as a fact and shows the real attempt count
 * rather than inventing a "2 of 3 left" counter the contract cannot back (the
 * FS8 "audited server-side" precedent).
 */
import { useImageHistory, regenCount } from '@/entities/image';
import { formatRelativeTime } from '@/shared/lib/format';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { Timeline, type TimelineItem } from '@/shared/ui/timeline';

export function GenerationHistory({ imageId }: { readonly imageId: string }): React.ReactElement {
  const history = useImageHistory(imageId);

  if (history.isPending) return <Skeleton height={140} />;
  if (history.isError) {
    return (
      <ErrorState
        scope="section"
        title="Couldn’t load the generation history"
        onRetry={() => void history.refetch()}
      />
    );
  }

  const attempts = history.data ?? [];
  if (attempts.length === 0) {
    return (
      <p className="text-[13px] text-secondary">
        The backend recorded no generation attempts for this record.
      </p>
    );
  }

  // Unknown wire results stay visible as raw text (the registry rule) — the
  // Timeline renders only vocabulary entries, nothing is coerced.
  const items: TimelineItem[] = attempts.flatMap((attempt) =>
    attempt.status === null
      ? []
      : [
          {
            id: attempt.id,
            status: attempt.status,
            title: `Attempt ${attempt.attempt}`,
            dateTime: attempt.createdAt,
            timeLabel: formatRelativeTime(attempt.createdAt),
            badge: true,
            ...(attempt.provider
              ? {
                  detail:
                    attempt.seed !== null
                      ? `${attempt.provider} · seed ${attempt.seed}`
                      : attempt.provider,
                }
              : {}),
          },
        ],
  );
  const unparsed = attempts.filter((attempt) => attempt.status === null);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-secondary">
        {attempts.length} attempt{attempts.length === 1 ? '' : 's'} recorded ·{' '}
        {regenCount(attempts)} regeneration{regenCount(attempts) === 1 ? '' : 's'}. The backend caps
        regeneration per its own limit (§R6.5) — this console shows what it recorded, not a quota it
        cannot read.
      </p>
      {items.length > 0 ? <Timeline label="Generation attempts" items={items} /> : null}
      {unparsed.length > 0 ? (
        <ul className="flex flex-col gap-1" aria-label="Attempts with an unrecognised result">
          {unparsed.map((attempt) => (
            <li key={attempt.id} className="text-[13px] text-secondary">
              Attempt {attempt.attempt} · result reported as{' '}
              <span className="font-medium text-primary">{attempt.rawResult ?? 'unknown'}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
