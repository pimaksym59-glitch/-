/**
 * Shortcut registry split lock (FS8 T-FS8.1 — the commons offload).
 * `shortcuts.ts` is imported by ShortcutProvider AND by every screen that owns
 * scoped keys, so it sits in the shell commons: the display catalogue must NOT
 * live there, or every new row costs bytes on `/chat`'s 1.0 kB of headroom.
 * These tests lock the split and the registry-driven invariant (the cheat-sheet
 * is generated from the catalogue, never hand-maintained).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { G_CHORDS, isTextEntryTarget } from '@/shared/config/shortcuts';
import { SHORTCUTS, SHORTCUT_SCOPE_LABEL } from '@/shared/config/shortcuts-catalog';

const SRC = join(__dirname, '..', '..', 'src');
const HANDLER_SIDE = join(SRC, 'shared', 'config', 'shortcuts.ts');

describe('shortcut registry split (FS8 T-FS8.1)', () => {
  it('the commons module carries ONLY the handler side', () => {
    const source = readFileSync(HANDLER_SIDE, 'utf8');
    // The catalogue data must not be declared here any more…
    expect(source).not.toMatch(/export const SHORTCUTS\b/);
    expect(source).not.toMatch(/export const SHORTCUT_SCOPE_LABEL\b/);
    // …and it must not be re-exported either (that would pull it back in).
    expect(source).not.toMatch(/export .*from '\.\/shortcuts-catalog'/);
    // The handler side is still complete.
    expect(source).toMatch(/export const G_CHORDS\b/);
    expect(source).toMatch(/export function isTextEntryTarget\b/);
    expect(typeof isTextEntryTarget).toBe('function');
    expect(Object.keys(G_CHORDS).length).toBeGreaterThan(0);
  });

  it('only the lazy cheat-sheet consumes the catalogue', () => {
    const consumers = [
      'widgets/shortcut-cheatsheet/ShortcutCheatsheet.tsx',
      'shared/config/shortcuts-catalog.ts',
    ];
    const offenders: string[] = [];
    const walk = (dir: string, rel = ''): void => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const relPath = rel ? `${rel}/${entry}` : entry;
        if (statSync(full).isDirectory()) {
          walk(full, relPath);
        } else if (/\.(ts|tsx)$/.test(entry)) {
          const text = readFileSync(full, 'utf8');
          if (
            /from '@\/shared\/config\/shortcuts-catalog'/.test(text) &&
            !consumers.includes(relPath)
          ) {
            offenders.push(relPath);
          }
        }
      }
    };
    walk(SRC);
    expect(offenders).toEqual([]);
  });

  it('the cheat-sheet stays GENERATED: every catalogue row has a labelled scope', () => {
    expect(SHORTCUTS.length).toBeGreaterThan(0);
    for (const shortcut of SHORTCUTS) {
      expect(SHORTCUT_SCOPE_LABEL[shortcut.scope]).toBeTruthy();
      expect(shortcut.keys.length).toBeGreaterThan(0);
      expect(shortcut.label.length).toBeGreaterThan(0);
    }
    expect(new Set(SHORTCUTS.map((s) => s.id)).size).toBe(SHORTCUTS.length);
  });

  it('registers the FS8 memory scope (search + guarded edit), active', () => {
    const memory = SHORTCUTS.filter((s) => s.scope === 'memory');
    expect(memory.map((s) => s.id).sort()).toEqual(['memory-edit', 'memory-search']);
    expect(memory.every((s) => s.active)).toBe(true);
    expect(SHORTCUT_SCOPE_LABEL.memory).toBe('Memory');
  });
});
