/**
 * FS13 T-FS13.3 — the ONE storage toucher.
 *
 * These preferences are not a cache of an account setting; the frozen contract
 * has no preferences resource, so they ARE the setting and they live in this
 * browser. That makes the stored payload untrusted input — a version bump, a
 * hand edit or a future schema can all produce something unusable — and the
 * module's job is to degrade to defaults rather than throw, render raw or
 * silently accept a value it does not understand (the `parseStatus` discipline
 * shipped since FS5, applied to local storage).
 *
 * The rule this file guards hardest: **`danger` can never be muted.**
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { MUTED_TOASTS_COOKIE } from '@/shared/lib/notifications';
import {
  DEFAULT_PREFERENCES,
  MUTABLE_TOAST_KINDS,
  __resetPreferencesCacheForTests,
  getPreferences,
  readPreferences,
  resetPreferences,
  sanitize,
  writePreferences,
} from '@/features/change-settings';

beforeEach(() => {
  window.localStorage.clear();
  document.cookie = `${MUTED_TOASTS_COOKIE}=; path=/; max-age=0`;
  __resetPreferencesCacheForTests();
});

describe('defaults', () => {
  it('starts at beginner with nothing muted', () => {
    expect(readPreferences()).toEqual(DEFAULT_PREFERENCES);
    expect(DEFAULT_PREFERENCES.experience).toBe('beginner');
    expect(DEFAULT_PREFERENCES.mutedToastKinds).toEqual([]);
  });
});

describe('sanitize — an untrusted payload degrades, never throws', () => {
  it('handles the shapes storage can actually produce', () => {
    expect(sanitize(null)).toEqual(DEFAULT_PREFERENCES);
    expect(sanitize(undefined)).toEqual(DEFAULT_PREFERENCES);
    expect(sanitize('nonsense')).toEqual(DEFAULT_PREFERENCES);
    expect(sanitize(42)).toEqual(DEFAULT_PREFERENCES);
    expect(sanitize([])).toEqual(DEFAULT_PREFERENCES);
    expect(sanitize({})).toEqual(DEFAULT_PREFERENCES);
  });

  it('falls back per field rather than discarding the whole record', () => {
    expect(sanitize({ experience: 'power', mutedToastKinds: 'not-an-array' })).toEqual({
      experience: 'power',
      mutedToastKinds: [],
    });
    expect(sanitize({ experience: 'wizard', mutedToastKinds: ['info'] })).toEqual({
      experience: 'beginner',
      mutedToastKinds: ['info'],
    });
  });

  it('drops unknown toast kinds instead of rendering them raw', () => {
    expect(sanitize({ mutedToastKinds: ['info', 'telepathy'] }).mutedToastKinds).toEqual(['info']);
  });

  it('REFUSES to mute danger, however the payload spells it', () => {
    expect(sanitize({ mutedToastKinds: ['danger'] }).mutedToastKinds).toEqual([]);
    expect(sanitize({ mutedToastKinds: ['danger', 'info'] }).mutedToastKinds).toEqual(['info']);
    expect(MUTABLE_TOAST_KINDS as readonly string[]).not.toContain('danger');
  });
});

describe('write / read / reset', () => {
  it('round-trips through storage', () => {
    writePreferences({ experience: 'advanced' });
    __resetPreferencesCacheForTests();
    expect(readPreferences().experience).toBe('advanced');
  });

  it('merges partial updates instead of replacing the record', () => {
    writePreferences({ experience: 'power' });
    writePreferences({ mutedToastKinds: ['warning'] });
    expect(getPreferences()).toEqual({ experience: 'power', mutedToastKinds: ['warning'] });
  });

  it('reset returns the defaults and clears storage', () => {
    writePreferences({ experience: 'power', mutedToastKinds: ['ai'] });
    expect(resetPreferences()).toEqual(DEFAULT_PREFERENCES);
    __resetPreferencesCacheForTests();
    expect(readPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('survives a corrupt record without throwing', () => {
    window.localStorage.setItem('onyx:account-prefs', '{not json');
    __resetPreferencesCacheForTests();
    expect(() => readPreferences()).not.toThrow();
    expect(readPreferences()).toEqual(DEFAULT_PREFERENCES);
  });
});

describe('the cookie mirror (D5-B write side)', () => {
  it('mirrors muted kinds so the toast emitter can read them', () => {
    writePreferences({ mutedToastKinds: ['info', 'ai'] });
    expect(document.cookie).toContain(`${MUTED_TOASTS_COOKIE}=`);
    expect(decodeURIComponent(document.cookie)).toContain('info,ai');
  });

  it('never writes danger into the cookie', () => {
    writePreferences({ mutedToastKinds: ['danger', 'info'] as never });
    expect(decodeURIComponent(document.cookie)).not.toContain('danger');
  });

  it('clears the cookie on reset', () => {
    writePreferences({ mutedToastKinds: ['warning'] });
    resetPreferences();
    expect(decodeURIComponent(document.cookie)).not.toContain('warning');
  });
});
