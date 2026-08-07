/**
 * Entity `api-key` — model (FS12, D3 §15). The frozen contract says of this
 * group: *«`GET|PUT /api-keys` (write-only, §R12.2) — значения не
 * возвращаются»*, and §R10.4 says secrets are write-only fields that are never
 * displayed.
 *
 * **The VM has no field capable of holding a secret.** That is the mechanism,
 * not a convention: a leak would have to add a property, which
 * `tests/unit/secret-writeonly.test.ts` fails on. The slot carries identity and
 * PRESENCE only — enough to say "a key is configured for this provider" and
 * nothing more. If a live wire ever volunteered a value, this mapper drops it.
 *
 * There is no `masked` field either: a mask (`sk-...abcd`) is still key
 * material, and the contract does not promise one. "Configured" is the honest
 * maximum.
 */
import type { ApiKeySlotWireDTO } from '@/shared/types';

export type { ApiKeySlotWireDTO };

export interface ApiKeySlotVM {
  /** Stable identity for the slot, whichever field the wire uses. */
  readonly id: string;
  /** The label shown to the user — always a wire string, never invented. */
  readonly label: string;
  /** The provider/kind the wire names, when it names one. */
  readonly kind: string | null;
  /** Presence only. `null` when the wire does not say. */
  readonly configured: boolean | null;
  readonly updatedAt: string | null;
}

export function mapApiKeySlot(wire: ApiKeySlotWireDTO, index: number): ApiKeySlotVM {
  const identity = wire.name ?? wire.provider ?? wire.kind ?? null;
  return {
    id: identity ?? `slot-${String(index)}`,
    label: identity ?? 'Unnamed slot',
    kind: wire.kind ?? wire.provider ?? null,
    configured: wire.configured ?? null,
    updatedAt: wire.updated_at ?? null,
  };
}

export function sortApiKeySlots(slots: readonly ApiKeySlotVM[]): readonly ApiKeySlotVM[] {
  return slots.slice().sort((a, b) => a.label.localeCompare(b.label));
}

/** How many slots hold a key — stated as a fact, with `null` counted as
 *  unknown rather than as "not configured". */
export function countConfigured(slots: readonly ApiKeySlotVM[]): {
  readonly configured: number;
  readonly unknown: number;
} {
  let configured = 0;
  let unknown = 0;
  for (const slot of slots) {
    if (slot.configured === true) configured += 1;
    else if (slot.configured === null) unknown += 1;
  }
  return { configured, unknown };
}
