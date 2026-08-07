import { describe, expect, it } from 'vitest';
import { paletteModeOf } from '@/widgets/command-palette';

describe('command palette modes (D1 §6.4)', () => {
  it('defaults to fuzzy-all', () => {
    expect(paletteModeOf('')).toEqual({ mode: 'all', query: '' });
    expect(paletteModeOf('dash')).toEqual({ mode: 'all', query: 'dash' });
  });

  it('recognises every prefix mode', () => {
    expect(paletteModeOf('>theme')).toEqual({ mode: 'commands', query: 'theme' });
    expect(paletteModeOf('@analytics')).toEqual({ mode: 'goto', query: 'analytics' });
    expect(paletteModeOf('#post')).toEqual({ mode: 'search', query: 'post' });
    expect(paletteModeOf('/summarise this')).toEqual({ mode: 'ai', query: 'summarise this' });
  });

  it('trims the query after the prefix', () => {
    expect(paletteModeOf('>   toggle ')).toEqual({ mode: 'commands', query: 'toggle' });
  });
});
