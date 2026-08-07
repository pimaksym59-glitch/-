/**
 * Account preferences — THE single storage toucher of FS13 (plan §1 T-FS13.3).
 *
 * The `ConversationRepository` discipline (FS6 owner condition 1) at feature
 * scale, as `promptDraft.ts` applied it at FS10: components never touch
 * storage, and every read/write of a preference goes through this module. It is
 * the one swap point if a preferences endpoint ever appears (FE-RV-16).
 *
 * **Why these preferences live in the browser at all.** The frozen contract
 * carries NO preferences resource — no `GET/PUT /preferences`, no per-user
 * settings object — and the frozen `users` table has no preferences column
 * (`id · email · role · password_hash · mfa_secret_ref · status`). So this is
 * not a cache of an account setting; it IS the setting, and it lives in this
 * browser. Every panel that renders one says so, because a browser-local value
 * presented as an account value is the same class of lie as a fabricated
 * metric (§R10.3 applied to controls).
 *
 * **Theme and density are deliberately NOT here.** They keep the FS1 cookie
 * mechanism that `app/layout.tsx` reads during SSR to flip tokens before paint
 * (no FOUC). Moving them into localStorage would break that duty and would
 * edit commons; `ThemeProvider` already exposes the setters this stage needs.
 *
 * **`danger` can never be muted** (D4 §9: a critical outcome must never rest on
 * a suppressible channel). It is not in `MutableToastKind`, `sanitize()` strips
 * it defensively even if a hand-edited payload names it, and the READ side
 * (`shared/lib/notifications`) refuses it again before consulting anything.
 *
 * **Why the muted kinds are ALSO mirrored to a cookie.** The preference has to
 * be consulted where toasts are emitted — `NotificationProvider`, one of the
 * frozen seven — and FSD forbids a provider importing a feature. The read side
 * therefore lives in `shared/lib/notifications` and reads a cookie, which needs
 * no import and no storage primitive in commons. This module remains the single
 * WRITER: the cookie is an output of `writePreferences`, never an input, and
 * the localStorage payload stays the record of truth.
 */
import { MUTED_TOASTS_COOKIE, UNMUTABLE_TOAST_KIND } from '@/shared/lib/notifications';
import { createPersistStore } from '@/shared/lib/persist';

export const EXPERIENCE_LEVELS = ['beginner', 'advanced', 'power'] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

/** The toast kinds a user may silence. `danger` is absent BY CONSTRUCTION. */
export const MUTABLE_TOAST_KINDS = ['success', 'info', 'warning', 'ai'] as const;
export type MutableToastKind = (typeof MUTABLE_TOAST_KINDS)[number];

export interface AccountPreferences {
  readonly experience: ExperienceLevel;
  readonly mutedToastKinds: readonly MutableToastKind[];
}

export const DEFAULT_PREFERENCES: AccountPreferences = {
  experience: 'beginner',
  mutedToastKinds: [],
};

/** Bumping this invalidates stored records; losing them is stated in the UI. */
const PREFERENCES_VERSION = 1;
export const PREFERENCES_STORAGE_KEY = 'onyx:account-prefs';

const store = createPersistStore<AccountPreferences>({
  key: 'account-prefs',
  version: PREFERENCES_VERSION,
});

function isExperience(value: unknown): value is ExperienceLevel {
  return EXPERIENCE_LEVELS.includes(value as ExperienceLevel);
}

function isMutableToastKind(value: unknown): value is MutableToastKind {
  return MUTABLE_TOAST_KINDS.includes(value as MutableToastKind);
}

/**
 * Any stored payload is untrusted input: a version bump, a hand edit or a
 * future schema can all produce something unusable. Unknown values degrade to
 * the default rather than throwing or being rendered raw.
 */
export function sanitize(value: unknown): AccountPreferences {
  if (typeof value !== 'object' || value === null) return DEFAULT_PREFERENCES;
  const record = value as Partial<Record<keyof AccountPreferences, unknown>>;
  const experience = isExperience(record.experience)
    ? record.experience
    : DEFAULT_PREFERENCES.experience;
  const rawMuted = Array.isArray(record.mutedToastKinds) ? record.mutedToastKinds : [];
  const mutedToastKinds = MUTABLE_TOAST_KINDS.filter(
    (kind) => rawMuted.includes(kind) && isMutableToastKind(kind),
  );
  return { experience, mutedToastKinds };
}

export function readPreferences(): AccountPreferences {
  return sanitize(store.read());
}

/** One year, matching the other browser-local preference cookies (FS1). */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Mirror the muted kinds to the cookie the emitter reads. `danger` is filtered
 * on the way out as well as on the way in — three independent refusals for the
 * one rule that must not bend.
 */
function mirrorMutedToCookie(kinds: readonly MutableToastKind[]): void {
  if (typeof document === 'undefined') return;
  const value = kinds.filter((kind) => String(kind) !== UNMUTABLE_TOAST_KIND).join(',');
  document.cookie = `${MUTED_TOASTS_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=${String(COOKIE_MAX_AGE)}; samesite=lax`;
}

/* --------------------------------------------------------------------------
 * A module-level cache + subscription, so the panels can use
 * `useSyncExternalStore` instead of a mount effect. That matters for honesty as
 * much as for tidiness: the server snapshot is the DEFAULT, the client snapshot
 * is the stored value, and React reconciles them after hydration — no rendered
 * preference is ever a guess about what the browser holds.
 * ------------------------------------------------------------------------ */

let cache: AccountPreferences | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribePreferences(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** Client snapshot — stable identity so `useSyncExternalStore` does not loop. */
export function getPreferences(): AccountPreferences {
  cache ??= readPreferences();
  return cache;
}

/** Server snapshot — always the defaults; storage does not exist on the server. */
export function getServerPreferences(): AccountPreferences {
  return DEFAULT_PREFERENCES;
}

export function writePreferences(next: Partial<AccountPreferences>): AccountPreferences {
  const clean = sanitize({ ...getPreferences(), ...next });
  store.write(clean);
  mirrorMutedToCookie(clean.mutedToastKinds);
  cache = clean;
  emit();
  return clean;
}

export function resetPreferences(): AccountPreferences {
  store.remove();
  mirrorMutedToCookie(DEFAULT_PREFERENCES.mutedToastKinds);
  cache = DEFAULT_PREFERENCES;
  emit();
  return DEFAULT_PREFERENCES;
}

/** Test seam only — drops the in-memory cache so a spec can re-read storage. */
export function __resetPreferencesCacheForTests(): void {
  cache = null;
}
