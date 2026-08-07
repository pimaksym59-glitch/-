/**
 * Entity `platform-user` — model (FS12, D3 §14). Mirrors the `users` table
 * through `GET /users` (§R10.5).
 *
 * **Secrets are structurally impossible here.** `password_hash` and
 * `mfa_secret_ref` exist in the table and are not mirrored, not mapped and not
 * rendered: the VM has no field able to hold one (SEC-6 / §R10.4). A wire that
 * volunteered a secret would be dropped by this mapper, which is proved by
 * `tests/unit/secret-writeonly.test.ts`.
 *
 * An unrecognised `role` is surfaced by its RAW value (the `parseStatus`
 * discipline applied to the role enum) — never coerced into a wrong role and
 * never dropped.
 */
import { ROLES, type Role } from '@/shared/config/rbac';
import type { PlatformUserWireDTO } from '@/shared/types';

export type { PlatformUserWireDTO };

export interface PlatformUserVM {
  readonly id: string;
  readonly email: string;
  /** The recognised role, or null when the wire carries something else. */
  readonly role: Role | null;
  /** Always the wire value — what an unknown role renders as. */
  readonly rawRole: string;
  /** The table's `status` column, shown raw when present (FE-RV-15). */
  readonly status: string | null;
  readonly createdAt: string | null;
}

export function parseRole(value: string): Role | null {
  return (ROLES as readonly string[]).includes(value) ? (value as Role) : null;
}

export function mapPlatformUser(wire: PlatformUserWireDTO): PlatformUserVM {
  return {
    id: wire.id,
    email: wire.email,
    role: parseRole(wire.role),
    rawRole: wire.role,
    status: wire.status ?? null,
    createdAt: wire.created_at ?? null,
  };
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  analyst: 'Analyst',
  viewer: 'Viewer',
};

/** Owners first, then the matrix order, then email — a stable governance read. */
export function sortUsers(users: readonly PlatformUserVM[]): readonly PlatformUserVM[] {
  const rank = (u: PlatformUserVM): number => {
    const index = (ROLES as readonly string[]).indexOf(u.rawRole);
    return index === -1 ? ROLES.length : index;
  };
  return users.slice().sort((a, b) => rank(a) - rank(b) || a.email.localeCompare(b.email));
}

/** How many owners exist — the Admin screen states it as a plain fact. */
export function countOwners(users: readonly PlatformUserVM[]): number {
  return users.filter((u) => u.rawRole === 'owner').length;
}
