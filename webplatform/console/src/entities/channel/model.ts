/**
 * Entity `channel` — model (Stage 3 §4). The wire DTO lives in
 * `shared/types/dto.ts` (single definition so the fixture dataset stays
 * layer-legal); this module owns the ViewModel + mapper. The bot token
 * reference NEVER reaches the VM (§F7.4 — secrets are write-only).
 */
import type { ChannelWireDTO } from '@/shared/types';

export type { ChannelWireDTO };

export interface ChannelVM {
  readonly id: string;
  readonly name: string;
  /** Raw wire status; `paused` is the only vocabulary-mapped state. */
  readonly status: string;
  readonly paused: boolean;
  readonly description: string | null;
}

export function mapChannel(wire: ChannelWireDTO): ChannelVM {
  return {
    id: wire.id,
    name: wire.name,
    status: wire.status,
    paused: wire.status === 'paused',
    description: wire.description ?? null,
  };
}
