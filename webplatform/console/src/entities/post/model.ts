/**
 * Entity `post` — model (Stage 3 §4, FS5 needs-review subset). Statuses map
 * through the registry; the history line feeds the Inspector Timeline.
 */
import { parseStatus, type Status } from '@/shared/types/status';
import type { PostHistoryEntryWireDTO, PostWireDTO } from '@/shared/types';

export type { PostWireDTO, PostHistoryEntryWireDTO };

export interface PostVM {
  readonly id: string;
  readonly channelId: string;
  readonly rawStatus: string;
  readonly status: Status | null;
  readonly title: string;
  readonly preview: string | null;
  readonly createdAt: string;
}

export interface PostHistoryVM {
  readonly status: Status | null;
  readonly rawStatus: string;
  readonly at: string;
  readonly detail: string | null;
}

export function mapPost(wire: PostWireDTO): PostVM {
  return {
    id: wire.id,
    channelId: wire.channel_id,
    rawStatus: wire.status,
    status: parseStatus(wire.status),
    title: wire.title ?? '(untitled draft)',
    preview: wire.body_preview ?? null,
    createdAt: wire.created_at,
  };
}

export function mapPostHistory(wire: PostHistoryEntryWireDTO): PostHistoryVM {
  return {
    status: parseStatus(wire.status),
    rawStatus: wire.status,
    at: wire.at,
    detail: wire.detail ?? null,
  };
}
