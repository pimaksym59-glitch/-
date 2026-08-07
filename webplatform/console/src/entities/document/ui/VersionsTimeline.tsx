/**
 * Version history as a D2 §13.23 Timeline (FS7 — §R9.10). The CURRENT version
 * carries the document's real ingest status; earlier versions were ingested
 * historically and render `completed`. A current status outside the vocabulary
 * falls back to a plain row (registry rule — nothing coerced).
 */
import { formatBytes, formatRelativeTime } from '@/shared/lib/format';
import { STATUS, type Status } from '@/shared/types/status';
import { Timeline, type TimelineItem } from '@/shared/ui/timeline';
import type { DocumentVersionVM } from '../model';

export function VersionsTimeline({
  versions,
  currentVersion,
  currentStatus,
}: {
  readonly versions: readonly DocumentVersionVM[];
  readonly currentVersion: number;
  readonly currentStatus: Status | null;
}): React.ReactElement {
  if (versions.length === 0) {
    return <p className="text-[13px] text-secondary">No versions recorded for this document.</p>;
  }

  const unmapped: DocumentVersionVM[] = [];
  const items: TimelineItem[] = versions.flatMap((entry) => {
    const status = entry.version === currentVersion ? currentStatus : STATUS.completed;
    if (status === null) {
      unmapped.push(entry);
      return [];
    }
    return [
      {
        id: `v${entry.version}`,
        status,
        title:
          entry.version === currentVersion ? `v${entry.version} · current` : `v${entry.version}`,
        dateTime: entry.createdAt,
        timeLabel: formatRelativeTime(entry.createdAt),
        detail: formatBytes(entry.sizeBytes),
      },
    ];
  });

  return (
    <div className="flex flex-col gap-2">
      {unmapped.map((entry) => (
        <p key={entry.version} className="text-[13px] text-secondary">
          v{entry.version} · {formatBytes(entry.sizeBytes)} · status outside the vocabulary
        </p>
      ))}
      {items.length > 0 ? <Timeline label="Version history" items={items} /> : null}
    </div>
  );
}
