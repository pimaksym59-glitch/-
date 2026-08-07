/**
 * can(role, permission) — UI RBAC reflection helper (Stage 2 §8 SEC-7).
 * Mirrors the backend matrix (§R10.5) to HIDE forbidden actions and render
 * permission states. This is NOT a security boundary — the backend enforces
 * (§F3.2/§F7.2). A 403 becomes a permission state, never a crash.
 */
import { RBAC_MATRIX, type Permission, type Role } from '@/shared/config/rbac';

export function can(role: Role, permission: Permission): boolean {
  return RBAC_MATRIX[role].includes(permission);
}

export function canAny(role: Role, permissions: readonly Permission[]): boolean {
  return permissions.some((p) => can(role, p));
}

export function canAll(role: Role, permissions: readonly Permission[]): boolean {
  return permissions.every((p) => can(role, p));
}
