/**
 * Local persistence primitive (FS6 T-FS6.3 — the Stage 2 §7 Draft-state
 * owner's storage). Namespaced, versioned, corrupt-safe JSON records over
 * localStorage with an in-memory fallback (SSR / storage-denied browsers).
 *
 * This module is INFRASTRUCTURE only: domain code goes through its repository
 * (e.g. `entities/conversation`'s ConversationRepository) — components never
 * touch localStorage directly (owner's FS6 condition 1).
 */
const PREFIX = 'onyx';

interface Envelope<T> {
  readonly v: number;
  readonly data: T;
}

export interface PersistStore<T> {
  read(): T | null;
  /** False when the write did not fit (caller evicts and retries). */
  write(value: T): boolean;
  remove(): void;
}

const memory = new Map<string, string>();

function backend(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // storage denied — fall through to memory
  }
  return {
    getItem: (k) => memory.get(k) ?? null,
    setItem: (k, v) => void memory.set(k, v),
    removeItem: (k) => void memory.delete(k),
  };
}

export function createPersistStore<T>(options: {
  readonly key: string;
  readonly version: number;
}): PersistStore<T> {
  const fullKey = `${PREFIX}:${options.key}`;
  return {
    read(): T | null {
      const raw = backend().getItem(fullKey);
      if (raw === null) return null;
      try {
        const envelope = JSON.parse(raw) as Envelope<T>;
        // A version bump invalidates old records (schema migrations are a
        // future concern; losing local drafts is stated honestly in the UI).
        if (envelope.v !== options.version) return null;
        return envelope.data;
      } catch {
        return null;
      }
    },
    write(value: T): boolean {
      const envelope: Envelope<T> = { v: options.version, data: value };
      try {
        backend().setItem(fullKey, JSON.stringify(envelope));
        return true;
      } catch {
        return false; // quota — caller evicts
      }
    },
    remove(): void {
      backend().removeItem(fullKey);
    },
  };
}
