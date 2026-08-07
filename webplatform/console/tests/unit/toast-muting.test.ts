/**
 * FS13 D5-B — the toast-mute READ side.
 *
 * This module is the stage's second commons edit, and it exists because FSD
 * forbids the alternative: the preference has to be consulted where toasts are
 * emitted (`NotificationProvider`, one of the frozen seven), and a provider
 * cannot import a feature. Its measured cost is recorded in the size addendum
 * — `/audit` 174→175 and `/providers` 153→154, isolated by control build C.
 *
 * Since it is the thing that decides whether a user is TOLD something, the rule
 * it must never bend is tested from several directions: `danger` is refused
 * before the cookie is even read, refused again if a hand-edited cookie names
 * it, and absent from the writable union in the first place.
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  MUTED_TOASTS_COOKIE,
  UNMUTABLE_TOAST_KIND,
  isToastKindMuted,
  readMutedToastKinds,
} from '@/shared/lib/notifications';

function setCookie(value: string): void {
  document.cookie = `${MUTED_TOASTS_COOKIE}=${encodeURIComponent(value)}; path=/`;
}

afterEach(() => {
  document.cookie = `${MUTED_TOASTS_COOKIE}=; path=/; max-age=0`;
});

describe('reading the preference', () => {
  it('reports nothing muted when the cookie is absent', () => {
    expect(readMutedToastKinds()).toEqual([]);
    expect(isToastKindMuted('info')).toBe(false);
  });

  it('reports nothing muted when the cookie is empty', () => {
    setCookie('');
    expect(readMutedToastKinds()).toEqual([]);
  });

  it('mutes exactly the kinds the cookie names', () => {
    setCookie('info,ai');
    expect(isToastKindMuted('info')).toBe(true);
    expect(isToastKindMuted('ai')).toBe(true);
    expect(isToastKindMuted('success')).toBe(false);
    expect(isToastKindMuted('warning')).toBe(false);
  });

  it('is unaffected by other cookies sharing the jar', () => {
    document.cookie = 'onyx-theme=light; path=/';
    document.cookie = 'onyx-density=compact; path=/';
    setCookie('warning');
    expect(isToastKindMuted('warning')).toBe(true);
    expect(isToastKindMuted('info')).toBe(false);
  });
});

describe('danger can never be muted', () => {
  it('refuses danger even when the cookie explicitly names it', () => {
    setCookie('danger');
    expect(isToastKindMuted('danger')).toBe(false);
    expect(readMutedToastKinds()).not.toContain('danger');
  });

  it('refuses danger while honouring the rest of a mixed cookie', () => {
    setCookie('danger,info');
    expect(isToastKindMuted('danger')).toBe(false);
    expect(isToastKindMuted('info')).toBe(true);
  });

  it('names the unmutable kind once, so both sides cannot drift', () => {
    expect(UNMUTABLE_TOAST_KIND).toBe('danger');
  });
});
