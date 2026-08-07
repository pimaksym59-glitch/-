/**
 * Toast muting — the READ side (FS13 D5 Option B).
 *
 * **Why this lives in `shared/` at all**, when every other line of FS13 is
 * route-local: the preference has to be consulted where toasts are EMITTED,
 * which is `NotificationProvider` — one of the frozen seven. FSD forbids a
 * provider importing a feature (`shared` imports nothing internal, and the
 * direction is one-way), so the read side cannot live in
 * `features/change-settings`. This module is the smallest thing that closes
 * that gap: no storage primitive, no state, no subscription — one cookie read.
 *
 * **Why a cookie rather than the feature's localStorage payload.** Reading
 * localStorage from commons would drag the persist primitive into every route's
 * bundle. A cookie is already how this codebase carries browser-local
 * preferences that something outside the owning screen must see (theme,
 * density, sidebar, active channel), it needs no import, and toasts are a
 * client-only surface so no SSR stamping is required — `app/layout.tsx` stays
 * byte-identical and the no-FOUC duty is untouched.
 *
 * **`danger` is unmutable by construction**, not by configuration: the check
 * returns false for it before looking at anything. D4 §9 forbids a critical
 * outcome resting on a channel the user can switch off, and a rule enforced by
 * a branch cannot be undone by a hand-edited cookie.
 */
export const MUTED_TOASTS_COOKIE = 'onyx-muted-toasts';

/** The kind that can never be silenced, named once so both sides agree. */
export const UNMUTABLE_TOAST_KIND = 'danger';

export function readMutedToastKinds(): readonly string[] {
  if (typeof document === 'undefined') return [];
  const match = new RegExp(`(?:^|;\\s*)${MUTED_TOASTS_COOKIE}=([^;]*)`).exec(document.cookie);
  if (!match?.[1]) return [];
  return decodeURIComponent(match[1])
    .split(',')
    .filter((kind) => kind !== '' && kind !== UNMUTABLE_TOAST_KIND);
}

export function isToastKindMuted(kind: string): boolean {
  if (kind === UNMUTABLE_TOAST_KIND) return false;
  return readMutedToastKinds().includes(kind);
}
