import { describe, expect, it } from 'vitest';
import { formatInspect, parseInspect, parseSidebar } from '@/shared/config/shell';
import { G_CHORDS, isTextEntryTarget } from '@/shared/config/shortcuts';
import { SHORTCUTS } from '@/shared/config/shortcuts-catalog';
import { ROUTES } from '@/shared/config/routes';

describe('sidebar cookie parsing', () => {
  it('falls back to the default for unknown values', () => {
    expect(parseSidebar('rail')).toBe('rail');
    expect(parseSidebar('expanded')).toBe('expanded');
    expect(parseSidebar('nonsense')).toBe('expanded');
    expect(parseSidebar(undefined)).toBe('expanded');
  });
});

describe('inspector URL contract', () => {
  it('round-trips a target', () => {
    const target = { type: 'document', id: 'doc-42' };
    expect(parseInspect(formatInspect(target))).toEqual(target);
  });

  it('keeps colons inside the id', () => {
    expect(parseInspect('log:2026-07-29T10:00:00Z')).toEqual({
      type: 'log',
      id: '2026-07-29T10:00:00Z',
    });
  });

  it('rejects malformed values', () => {
    expect(parseInspect(null)).toBeNull();
    expect(parseInspect('')).toBeNull();
    expect(parseInspect('noseparator')).toBeNull();
    expect(parseInspect(':missingtype')).toBeNull();
    expect(parseInspect('missingid:')).toBeNull();
  });
});

describe('shortcut registry', () => {
  it('maps every g-chord to a real route', () => {
    for (const routeKey of Object.values(G_CHORDS)) {
      expect(ROUTES[routeKey]).toBeDefined();
    }
  });

  it('has unique shortcut ids', () => {
    const ids = SHORTCUTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('documents every active global shortcut with keys', () => {
    for (const shortcut of SHORTCUTS) {
      expect(shortcut.keys.length).toBeGreaterThan(0);
      expect(shortcut.label.length).toBeGreaterThan(0);
    }
  });
});

describe('isTextEntryTarget', () => {
  it('detects text-entry elements so chords do not hijack typing', () => {
    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    const div = document.createElement('div');
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    // jsdom does not derive isContentEditable from the attribute.
    Object.defineProperty(editable, 'isContentEditable', { value: true });

    expect(isTextEntryTarget(input)).toBe(true);
    expect(isTextEntryTarget(textarea)).toBe(true);
    expect(isTextEntryTarget(editable)).toBe(true);
    expect(isTextEntryTarget(div)).toBe(false);
    expect(isTextEntryTarget(null)).toBe(false);
  });
});
