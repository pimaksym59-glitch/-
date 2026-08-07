/**
 * Local persistence primitive (FS6 T-FS6.3): versioned envelope round-trip,
 * corrupt-data safety, version invalidation. Components never use this
 * directly — the repository tests cover the domain layer.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { createPersistStore } from '@/shared/lib/persist';

beforeEach(() => {
  window.localStorage.clear();
});

describe('createPersistStore (FS6)', () => {
  it('round-trips a value under a namespaced key', () => {
    const store = createPersistStore<{ a: number }>({ key: 'test:one', version: 1 });
    expect(store.read()).toBeNull();
    expect(store.write({ a: 42 })).toBe(true);
    expect(store.read()).toEqual({ a: 42 });
    expect(window.localStorage.getItem('onyx:test:one')).toContain('"a":42');
    store.remove();
    expect(store.read()).toBeNull();
  });

  it('a version bump invalidates old records instead of mis-parsing them', () => {
    const v1 = createPersistStore<{ a: number }>({ key: 'test:v', version: 1 });
    v1.write({ a: 1 });
    const v2 = createPersistStore<{ a: number }>({ key: 'test:v', version: 2 });
    expect(v2.read()).toBeNull();
  });

  it('corrupt raw data reads as null, never throws', () => {
    window.localStorage.setItem('onyx:test:corrupt', '{not json');
    const store = createPersistStore<{ a: number }>({ key: 'test:corrupt', version: 1 });
    expect(store.read()).toBeNull();
  });
});
