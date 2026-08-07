/**
 * Wire → SessionDTO mapper — the single place that touches the `/auth/me`
 * wire shape (`{user, role}`, API_SPEC §Auth). If FE-RV-7 finds different
 * field casing on the live backend, only this file changes.
 */
import { parseRole } from '@/shared/config/auth';
import type { AuthMeWireDTO, SessionDTO } from '@/shared/types';

export function mapAuthMe(wire: AuthMeWireDTO): SessionDTO | null {
  const role = parseRole(wire.role);
  if (!role) return null;
  return {
    userId: wire.user.id,
    email: wire.user.email,
    displayName: wire.user.display_name ?? wire.user.email,
    role,
    mfaEnabled: wire.user.mfa_enabled ?? false,
  };
}
