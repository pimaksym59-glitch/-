/**
 * Entity `job` — model (Stage 3 §4). Wraps the Tasks contract (§R8/§R10.6).
 * Statuses map through the registry (`parseStatus`) — unknown wire statuses
 * stay visible as raw text, never coerced into a wrong badge.
 */
import { parseStatus, type Status } from '@/shared/types/status';
import type { TaskWireDTO } from '@/shared/types';

export type { TaskWireDTO };

export interface JobVM {
  readonly id: string;
  readonly type: string;
  readonly rawStatus: string;
  readonly status: Status | null;
  readonly channelId: string | null;
  readonly attempts: number;
  readonly runAt: string | null;
  readonly createdAt: string;
  readonly error: string | null;
}

export function mapJob(wire: TaskWireDTO): JobVM {
  return {
    id: wire.id,
    type: wire.type,
    rawStatus: wire.status,
    status: parseStatus(wire.status),
    channelId: wire.channel_id ?? null,
    attempts: wire.attempts,
    runAt: wire.run_at ?? null,
    createdAt: wire.created_at,
    error: wire.error ?? null,
  };
}

/** Upcoming publish slots for the schedule timeline (queued, ordered). */
export function selectUpcomingPublish(jobs: readonly JobVM[]): readonly JobVM[] {
  return jobs
    .filter((job) => job.type === 'publish' && job.rawStatus === 'queued' && job.runAt)
    .slice()
    .sort((a, b) => (a.runAt ?? '').localeCompare(b.runAt ?? ''));
}
