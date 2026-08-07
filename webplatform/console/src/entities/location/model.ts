/**
 * Entity `location` — model (FS9, §R6.3 scene inputs). Read-only this stage:
 * the contract carries `GET|POST /channels/{id}/locations` and
 * `GET|PATCH /locations/{id}`, but creating or editing a location is channel
 * setup (FS12/FS13), not image production — FS9 only RESOLVES an image's
 * `location_id` into a name so the scene metadata is legible.
 *
 * The wire is *(assumed)* pending FE-RV-12; THIS mapper is the single
 * adjustment point. An unresolved id is never hidden — the widget shows the
 * raw id instead of pretending the scene is unknown.
 */
import type { LocationWireDTO } from '@/shared/types';

export type { LocationWireDTO };

export interface LocationVM {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly channelId: string | null;
}

export function mapLocation(wire: LocationWireDTO): LocationVM {
  return {
    id: wire.id,
    name: wire.name,
    description: wire.description ?? null,
    channelId: wire.channel_id ?? null,
  };
}

/** Resolve a scene id to a display label; unknown ids stay honest (raw id). */
export function resolveLocationName(
  locations: readonly LocationVM[],
  locationId: string | null,
): string | null {
  if (locationId === null) return null;
  return locations.find((location) => location.id === locationId)?.name ?? locationId;
}
