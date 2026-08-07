/**
 * Entity `actor` — model (Stage 3 §4, FS8 Memory). The channel's VISUAL
 * identity, kept strictly separate from the persona's writing identity
 * (Persona ≠ Actor — the backend's own §R4.7 discipline, restated in D3 §8).
 *
 * The wire is *(assumed)* pending FE-RV-11; THIS mapper is the single
 * adjustment point. Generation internals never reach the ViewModel:
 * `face_embedding` (vector(512), §R6.7) and `reference_images_folder`
 * (§R6.1) are deliberately absent from `ActorVM` — references are an FS9
 * Image-Studio concern, not memory legibility.
 */
import { parseStatus, type Status } from '@/shared/types/status';
import type { ActorWireDTO } from '@/shared/types';

export type { ActorWireDTO };

export interface ActorVM {
  readonly id: string;
  readonly channelId: string;
  readonly name: string;
  readonly gender: string | null;
  readonly age: number | null;
  readonly build: string | null;
  readonly hair: string | null;
  readonly hairColor: string | null;
  readonly eyes: string | null;
  readonly clothingStyle: string | null;
  readonly appearanceDescription: string | null;
  /** The prompt-facing description — visible because it explains generation. */
  readonly promptDescription: string | null;
  readonly rawStatus: string | null;
  readonly status: Status | null;
  readonly archived: boolean;
}

export function mapActor(wire: ActorWireDTO): ActorVM {
  const rawStatus = wire.status ?? null;
  return {
    id: wire.id,
    channelId: wire.channel_id,
    name: wire.name,
    gender: wire.gender ?? null,
    age: wire.age ?? null,
    build: wire.build ?? null,
    hair: wire.hair ?? null,
    hairColor: wire.hair_color ?? null,
    eyes: wire.eyes ?? null,
    clothingStyle: wire.clothing_style ?? null,
    appearanceDescription: wire.appearance_description ?? null,
    promptDescription: wire.prompt_description ?? null,
    rawStatus,
    status: rawStatus !== null ? parseStatus(rawStatus) : null,
    archived: rawStatus === 'archived',
  };
}

/** Client-side LIST filtering (name/appearance contains) — presentation only. */
export function filterActors(actors: readonly ActorVM[], query: string): readonly ActorVM[] {
  const q = query.trim().toLowerCase();
  if (q === '') return actors;
  return actors.filter(
    (actor) =>
      actor.name.toLowerCase().includes(q) ||
      (actor.appearanceDescription ?? '').toLowerCase().includes(q),
  );
}
