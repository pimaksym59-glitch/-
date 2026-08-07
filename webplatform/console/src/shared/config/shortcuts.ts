/**
 * Keyboard registry — the HANDLER side (D1 §6.5): the chord map, the shared
 * types and the text-entry guard. This module is imported by ShortcutProvider
 * and by every screen that owns scoped keys, so it lives in the shell commons
 * and is deliberately kept TINY.
 *
 * The display side (the full `SHORTCUTS` catalogue + scope labels, which the
 * `⌘/` cheat-sheet is generated from) lives in `shortcuts-catalog.ts` and ships
 * only inside that lazy overlay's chunk — FS8 T-FS8.1, the commons offload that
 * protects `/chat`'s 1.0 kB of First Load headroom. Registry-driven UI is
 * unchanged: one source per concern, never a hand-maintained copy.
 */
import type { RouteKey } from './routes';

export type ShortcutScope =
  | 'global'
  | 'navigation'
  | 'chat'
  | 'knowledge'
  | 'memory'
  // FS9: a TYPE-only member — erased at build, so the commons pay zero bytes;
  // the studio rows and their label ship inside the lazy catalogue.
  | 'studio'
  // FS10: same mechanism for the Prompt Library (zero commons bytes).
  | 'prompts'
  // FS11: same mechanism for Analytics (zero commons bytes).
  | 'analytics'
  // FS12: same mechanism for the Platform & Admin group — one scope covering
  // Jobs, Audit, Health and Providers, since their keys are the same three
  // (`f` filter, `j/k/↵`, `r` re-check/requeue). Type-only ⇒ zero commons bytes.
  | 'platform'
  | 'lists'
  | 'detail';

export interface ShortcutDef {
  readonly id: string;
  readonly keys: readonly string[];
  readonly label: string;
  readonly scope: ShortcutScope;
  /** True when the shortcut is a `g`-chord (press `g`, then the key). */
  readonly chord?: boolean;
  /** Implemented in FS2; false for shortcuts owned by a later stage. */
  readonly active: boolean;
}

/** `g` + key → route (D1 §6.5 GitHub/Linear model). */
export const G_CHORDS: Readonly<Record<string, RouteKey>> = {
  d: 'dashboard',
  c: 'chat',
  k: 'knowledge',
  m: 'memory',
  i: 'studio',
  p: 'prompts',
  a: 'analytics',
  b: 'channels',
};

/** True when the event target is a text-entry surface (chords must not fire). */
export function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable === true
  );
}
