/**
 * FS10 T-FS10.10 — `diffVersions` (plan §5.2 D7). The diff is a PURE
 * derivation of two texts the contract already serves: no endpoint, no
 * dependency, and no claim about how the backend compares versions. The output
 * is unified-style (`+` added · `-` removed · leading space unchanged) so the
 * frozen ONYX CodeBlock diff mode renders it without interpretation.
 */
import { describe, expect, it } from 'vitest';
import { diffVersions } from '@/entities/prompt';

describe('diffVersions', () => {
  it('reports identical texts without inventing changes', () => {
    const diff = diffVersions('a\nb', 'a\nb');
    expect(diff.identical).toBe(true);
    expect(diff.added).toBe(0);
    expect(diff.removed).toBe(0);
    expect(diff.text).toBe(' a\n b');
    expect(diff.coarse).toBe(false);
  });

  it('marks an added line with + and keeps context with a leading space', () => {
    const diff = diffVersions('a\nc', 'a\nb\nc');
    expect(diff.text.split('\n')).toEqual([' a', '+b', ' c']);
    expect(diff.added).toBe(1);
    expect(diff.removed).toBe(0);
  });

  it('marks a removed line with -', () => {
    const diff = diffVersions('a\nb\nc', 'a\nc');
    expect(diff.text.split('\n')).toEqual([' a', '-b', ' c']);
    expect(diff.added).toBe(0);
    expect(diff.removed).toBe(1);
  });

  it('shows a changed line as one removal plus one addition', () => {
    const diff = diffVersions('keep\nold line\nkeep2', 'keep\nnew line\nkeep2');
    expect(diff.added).toBe(1);
    expect(diff.removed).toBe(1);
    expect(diff.text).toContain('-old line');
    expect(diff.text).toContain('+new line');
    expect(diff.text).toContain(' keep2');
  });

  it('handles empty sides honestly', () => {
    expect(diffVersions('', 'a').added).toBe(1);
    expect(diffVersions('a', '').removed).toBe(1);
  });

  it('falls back to a COARSE block comparison beyond the line cap, and says so', () => {
    const long = Array.from({ length: 601 }, (_, i) => `line ${i}`).join('\n');
    const diff = diffVersions(long, `${long}\nextra`);
    expect(diff.coarse).toBe(true);
    expect(diff.identical).toBe(false);
    // Every line is accounted for — nothing is silently dropped.
    expect(diff.removed).toBe(601);
    expect(diff.added).toBe(602);
  });

  it('is pure: the same inputs always produce the same output', () => {
    const a = 'one\ntwo';
    const b = 'one\ntwo\nthree';
    expect(diffVersions(a, b)).toEqual(diffVersions(a, b));
  });
});
