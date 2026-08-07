/**
 * ONYX Status vocabulary (D2 §11) — the single cross-screen status language.
 * A new state is registered HERE first, then used everywhere (invariant: no
 * cross-screen drift). Tone maps to semantic status tokens; icon names are
 * from the single lucide family (D2 §10).
 */

export const STATUS = {
  loading: 'loading',
  streaming: 'streaming',
  queued: 'queued',
  running: 'running',
  completed: 'completed',
  failed: 'failed',
  needsReview: 'needs_review',
  verified: 'verified',
  draft: 'draft',
  published: 'published',
  scheduled: 'scheduled',
  paused: 'paused',
} as const;

export type Status = (typeof STATUS)[keyof typeof STATUS];

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'ai';

export interface StatusMeta {
  readonly label: string;
  readonly tone: StatusTone;
  /** lucide-react icon name (D2 §10 fixed semantic icons). */
  readonly icon: string;
}

/** Registry-driven parse: wire strings map to the vocabulary or to null —
 * unknown backend statuses are surfaced honestly, never coerced. */
export function parseStatus(value: string): Status | null {
  return (Object.values(STATUS) as readonly string[]).includes(value) ? (value as Status) : null;
}

export const STATUS_META: Record<Status, StatusMeta> = {
  [STATUS.loading]: { label: 'Loading', tone: 'neutral', icon: 'loader' },
  [STATUS.streaming]: { label: 'Streaming', tone: 'ai', icon: 'audio-waveform' },
  [STATUS.queued]: { label: 'Queued', tone: 'neutral', icon: 'clock' },
  [STATUS.running]: { label: 'Running', tone: 'info', icon: 'activity' },
  [STATUS.completed]: { label: 'Completed', tone: 'success', icon: 'check-circle' },
  [STATUS.failed]: { label: 'Failed', tone: 'danger', icon: 'octagon-alert' },
  [STATUS.needsReview]: { label: 'Needs Review', tone: 'warning', icon: 'flag' },
  [STATUS.verified]: { label: 'Verified', tone: 'success', icon: 'badge-check' },
  [STATUS.draft]: { label: 'Draft', tone: 'neutral', icon: 'pencil' },
  [STATUS.published]: { label: 'Published', tone: 'success', icon: 'send' },
  [STATUS.scheduled]: { label: 'Scheduled', tone: 'info', icon: 'calendar-clock' },
  [STATUS.paused]: { label: 'Paused', tone: 'neutral', icon: 'pause' },
};
