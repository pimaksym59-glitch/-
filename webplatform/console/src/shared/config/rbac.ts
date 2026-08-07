/**
 * RBAC matrix mirror (§R10.5). The backend is the ONLY security boundary
 * (§F3.2/§F7.2); this matrix exists purely to REFLECT permissions in the UI
 * (hide forbidden actions, render permission states). Five roles.
 *
 * FS1 seeds a representative permission set; full permissions are extended
 * additively as feature slices land (FS4+). `can()` logic lives in
 * shared/lib/rbac (this file is data only).
 */

export const ROLES = ['owner', 'admin', 'editor', 'analyst', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  'workspace.view',
  'content.view',
  'content.edit',
  'content.publish',
  'analytics.view',
  'platform.view',
  'platform.manage',
  'admin.users.manage',
  'admin.providers.manage',
  'settings.manage',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ALL: readonly Permission[] = PERMISSIONS;

/** Role → granted permissions. Owner is a superset; viewer is read-only. */
export const RBAC_MATRIX: Record<Role, readonly Permission[]> = {
  owner: ALL,
  // FS12 PATCH (plan §5.2 D11) — the FS1 seed granted `admin` both
  // `admin.users.manage` and `admin.providers.manage`, which CONTRADICTS the
  // frozen API_SPEC matrix row *«Users/Roles, API keys, Security | owner ✓ |
  // admin – »* and D3 §14 (*"Admin limited (no user/key management, per
  // matrix)"*). Both are removed so the mirror matches the contract. This is a
  // UI-reflection correction only — the backend has always been the boundary
  // (§R10.5/SEC-7), and an admin who reaches those surfaces now sees the
  // honest permission state instead of an affordance the server would refuse.
  admin: [
    'workspace.view',
    'content.view',
    'content.edit',
    'content.publish',
    'analytics.view',
    'platform.view',
    'platform.manage',
    'settings.manage',
  ],
  editor: [
    'workspace.view',
    'content.view',
    'content.edit',
    'content.publish',
    'analytics.view',
    'settings.manage',
  ],
  analyst: ['workspace.view', 'content.view', 'analytics.view', 'platform.view', 'settings.manage'],
  viewer: ['workspace.view', 'content.view', 'analytics.view', 'settings.manage'],
};
